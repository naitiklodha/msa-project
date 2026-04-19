import requests
import time
import json
import uuid

import os

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")  # Kong Gateway

def test_full_flow():
    print("--- Starting End-to-End Integration Test ---")
    
    # 1. Register a new user
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "password123"
    print(f"1. Registering user: {email}")
    reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password
    })
    if reg_resp.status_code != 201:
        print(f"Failed to register: {reg_resp.text}")
        return
    
    # 2. Login to get JWT
    print("2. Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if login_resp.status_code != 200:
        print(f"Failed to login: {login_resp.text}")
        return
    
    token = login_resp.json().get("accessToken")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 3. Upload a document
    print("3. Uploading document to RAG service...")
    # Creating a dummy text file
    files = {'file': ('test.txt', 'This is a test document about microservices architecture and RAG systems.')}
    upload_resp = requests.post(f"{BASE_URL}/documents/upload/breakdown-with-questions", headers=headers, files=files)
    if upload_resp.status_code != 200:
        print(f"Failed to upload: {upload_resp.text}")
        return
    
    upload_data = upload_resp.json()
    doc_id = upload_data.get("document_id")
    topics = upload_data.get("topics", [])
    print(f"Upload successful. Doc ID: {doc_id}. Found {len(topics)} topics.")
    
    if not topics:
        print("No topics generated. Cannot proceed with quiz.")
        return
    
    chunk_id = topics[0].get("chunk_id")
    
    # 4. Start a quiz session
    print(f"4. Starting quiz for chunk: {chunk_id}")
    start_resp = requests.post(f"{BASE_URL}/documents/quiz/start", headers=headers, params={
        "document_id": doc_id,
        "chunk_id": chunk_id
    })
    if start_resp.status_code != 200:
        print(f"Failed to start quiz: {start_resp.text}")
        return
    
    session_id = start_resp.json().get("session_id")
    q_count = start_resp.json().get("question_count")
    print(f"Quiz started. Session: {session_id}, Questions: {q_count}")

    # 5. Answer questions
    print("5. Answering questions...")
    for i in range(q_count):
        next_resp = requests.get(f"{BASE_URL}/documents/quiz/{session_id}/next", headers=headers)
        if next_resp.status_code != 200:
            break
        
        q_data = next_resp.json()
        if q_data.get("completed"):
            break
            
        question = q_data.get("question")
        q_id = question.get("id")
        print(f"  Answering question {i+1}: {q_id}")
        
        # Always answer correctly for testing
        sub_resp = requests.post(f"{BASE_URL}/documents/quiz/submit", headers=headers, params={
            "question_id": q_id,
            "was_correct": True,
            "session_id": session_id
        })
        if sub_resp.status_code != 200:
            print(f"  Failed to submit: {sub_resp.text}")

    # 6. Complete quiz and trigger score update
    print("6. Completing quiz...")
    comp_resp = requests.post(f"{BASE_URL}/documents/quiz/{session_id}/complete", headers=headers)
    if comp_resp.status_code != 200:
        print(f"Failed to complete quiz: {comp_resp.text}")
        return
    
    final_score = comp_resp.json()
    print(f"Quiz completed! Result: {final_score}")

    # 7. Verify score in game-service
    print("7. Verifying score in game-service (waiting for Kafka event)...")
    time.sleep(2) # Give Kafka some time
    
    game_resp = requests.get(f"{BASE_URL}/game/stats", headers=headers)
    if game_resp.status_code == 200:
        stats = game_resp.json()
        print(f"Current User Stats: {stats}")
        if stats.get("totalScore", 0) > 0:
            print("SUCCESS: Score updated correctly!")
        else:
            print("WARNING: Score is still 0. Kafka consumer might be slow or not running.")
    else:
        print(f"Could not fetch stats: {game_resp.text}")

if __name__ == "__main__":
    test_full_flow()
