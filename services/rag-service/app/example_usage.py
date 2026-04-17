"""
Example usage of the RAG Service for combined topic breakdown and question generation.

This file demonstrates how to:
1. Upload a document and get topic breakdown with questions
2. Use individual endpoints
3. Process the responses
"""

import requests
import json

# Configuration
RAG_SERVICE_URL = "http://localhost:8000"

def test_breakdown_with_questions(file_path: str):
    """
    Test the combined endpoint: upload document, get breakdown with questions
    """
    print("=" * 80)
    print("Testing: Upload Document with Breakdown & Questions")
    print("=" * 80)
    
    with open(file_path, "rb") as f:
        files = {"file": f}
        response = requests.post(
            f"{RAG_SERVICE_URL}/documents/upload/breakdown-with-questions",
            files=files
        )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✓ File: {data['file_name']}")
        print(f"✓ Type: {data['file_type']}")
        print(f"✓ Content Length: {data['content_length']} chars")
        print(f"✓ Total Parts: {data['number_of_parts']}\n")
        
        for part in data['parts']:
            print(f"\n{'─' * 80}")
            print(f"PART {part['part_number']}: {part['title']}")
            print(f"Study Time: {part['time_minutes']} minutes")
            print(f"{'─' * 80}")
            print(f"Outline:\n{part['outline'][:200]}...\n")
            
            questions = part['questions']
            print(f"Questions ({len(questions)} total):")
            for j, q in enumerate(questions, 1):
                print(f"\n  Q{j}. {q['question']}")
                print(f"     Difficulty: {q['difficulty']}")
                for k, opt in enumerate(q['options']):
                    marker = " ✓" if k == q['correct_index'] else ""
                    print(f"     {chr(97+k)}. {opt}{marker}")
        
        return True
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        return False


def test_separate_endpoints(file_path: str):
    """
    Test individual endpoints separately
    """
    print("\n" + "=" * 80)
    print("Testing: Separate Endpoints")
    print("=" * 80)
    
    # First, get the breakdown
    print("\n1. Getting topic breakdown...")
    with open(file_path, "rb") as f:
        files = {"file": f}
        response = requests.post(
            f"{RAG_SERVICE_URL}/documents/upload/summary",
            files=files
        )
    
    if response.status_code != 200:
        print(f"✗ Error getting breakdown: {response.status_code}")
        return False
    
    breakdown_data = response.json()
    print(f"✓ Got {breakdown_data['summary'].get('number_of_parts', 0)} parts")
    
    # Then, generate questions for first part
    if breakdown_data['summary'].get('parts'):
        first_part = breakdown_data['summary']['parts'][0]
        print(f"\n2. Generating questions for first part: {first_part['title']}")
        
        response = requests.post(
            f"{RAG_SERVICE_URL}/documents/generate-questions",
            json={
                "part_content": first_part['outline'],
                "part_title": first_part['title']
            }
        )
        
        if response.status_code == 200:
            questions_data = response.json()
            print(f"✓ Generated {len(questions_data['questions'])} questions")
            print(f"  Questions: {questions_data['questions'][:2]}")
        else:
            print(f"✗ Error generating questions: {response.status_code}")
            return False
    
    return True


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python example_usage.py <path_to_pdf_or_txt>")
        print("\nExample:")
        print("  python example_usage.py document.pdf")
        print("  python example_usage.py article.txt")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    print("\n🚀 RAG Service - Example Usage\n")
    
    # Test combined endpoint
    success1 = test_breakdown_with_questions(file_path)
    
    # Test separate endpoints
    success2 = test_separate_endpoints(file_path)
    
    if success1 and success2:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed")
