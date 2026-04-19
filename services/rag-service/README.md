# RAG Service

The Retrieval-Augmented Generation (RAG) service handles document processing, chunking, embedding storage, and intelligent quiz generation.

## Features
- **Document Processing**: Supports PDF, DOCX, PPTX, and TXT.
- **Persistent Storage**: Stores document metadata and chunks in Postgres (with `pgvector`).
- **Caching**: Uses Redis for fast topic and question retrieval.
- **Intelligent Quiz**: Generates questions based on document content using Gemini AI.
- **Event-Driven**: Emits `QUIZ_COMPLETED` events to Kafka to update user scores in the `game-service`.

## Setup & Running

### Prerequisites
- Docker and Docker Compose
- Google API Key (Gemini)

### Environment Variables
The service requires the following environment variables (usually passed via `docker-compose.yml` or `.env`):
- `POSTGRES_URL`: Connection string for Postgres (with pgvector).
- `GOOGLE_API_KEY`: Your Gemini API key.
- `JWT_SECRET`: The same secret used by `auth-service` to decode user tokens.
- `REDIS_URL`: URL for the Redis cache.
- `KAFKA_BROKERS`: List of Kafka brokers (e.g., `kafka:9092`).

### Running with Docker
From the project root:
```bash
docker-compose up -d rag-service
```

## Testing the End-to-End Flow

We have provided a comprehensive test script `test_e2e_flow.py` in the project root to verify the entire lifecycle from user creation to score update.

### Steps to Test:

1. **Ensure all services are running**:
   ```bash
   docker-compose up -d
   ```

2. **Run the E2E Test Script**:
   ```bash
   python test_e2e_flow.py
   ```

### Manual Testing Flow:

If you want to test manually via `curl` or Postman:

1. **Register & Login**:
   Obtain a JWT token from the `auth-service` via `POST /auth/login`.

2. **Upload Document**:
   ```bash
   curl -X POST http://localhost:8000/documents/upload/breakdown-with-questions \
     -H "Authorization: Bearer <YOUR_TOKEN>" \
     -F "file=@your_document.pdf"
   ```
   Take note of the `document_id` and the `chunk_id` from the topics returned.

3. **Start Quiz**:
   ```bash
   curl -X POST "http://localhost:8000/documents/quiz/start?document_id=<DOC_ID>&chunk_id=<CHUNK_ID>" \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```
   Save the `session_id`.

4. **Submit Answers**:
   For each question:
   ```bash
   curl -X POST "http://localhost:8000/documents/quiz/submit?question_id=<Q_ID>&was_correct=true&session_id=<SESSION_ID>" \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```

5. **Complete Quiz**:
   ```bash
   curl -X POST "http://localhost:8000/documents/quiz/<SESSION_ID>/complete" \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```
   This triggers a Kafka event.

6. **Verify Score**:
   Check `http://localhost:8000/game/stats` to see if the user's score has increased.

## API Documentation
Once the service is running, you can view the interactive API docs at:
`http://localhost:3005/docs` (or via Kong if exposed)
