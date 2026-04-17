# RAG Service

This is the Retrieval-Augmented Generation (RAG) backend service for the MSA project. It handles document ingestion, vector storage using PostgreSQL + pgvector, and query answering using Google's Gemini models.

## Features

- **Document Ingestion**: Chunking and embedding of documents.
- **Vector Search**: Semantic similarity search using `pgvector` inside PostgreSQL.
- **Query Answering**: Answers questions based on ingested context using Gemini models.
- **Streaming Responses**: Supports Server-Sent Events (NDJSON) to stream generated text chunk by chunk for faster perceived latency.
- **Quiz Generation**: Automatically generate multiple-choice quizzes from chunks of content.

## Prerequisites

Before running the service, you need:

1. **Python 3.10+**
2. **PostgreSQL Database** with the `pgvector` extension enabled.
3. **Google Gemini API Key**

## Environment Variables

Create a `.env` file in the `rag-service` directory (or use your existing one). It should look like this:

```env
# Required
POSTGRES_URL="postgresql://user:password@localhost:5432/dbname"
GOOGLE_API_KEY="your_google_genai_api_key_here"

# Optional Overrides
GEMINI_LLM_MODEL="models/gemini-2.5-pro" # Default LLM model
EMBEDDING_MODEL="models/gemini-embedding-001" # Default embedding model
EMBEDDING_DIM="768" # Dimension size for vector embeddings
RAG_CHUNK_SIZE="1000" # Size of chunks during document parsing
RAG_CHUNK_OVERLAP="200" # Overlap size for chunks
```

## Setup & Running the Service

1. **Activate the Virtual Environment**:
   Ensure you are in the `services/rag-service` directory, then activate the virtual environment.
   ```bash
   # On Windows
   .\.venv\Scripts\activate

   # On Mac/Linux
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   If you haven't already:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Development Server**:
   You can run the FastAPI application using `uvicorn`:
   ```bash
   uvicorn app.main:app --reload
   ```

The server will start on `http://127.0.0.0:8000`. You can visit `http://127.0.0.1:8000/docs` to see the auto-generated Swagger UI and test the endpoints directly!

## API Endpoints

### Querying

* **`POST /query`**: Ask a question. Returns the retrieved `documents` and the `answer` in a single JSON response.
* **`POST /query/stream`**: Ask a question and receive the response in **NDJSON** (Newline Delimited JSON). The first chunk contains the retrieved documents (`type: metadata`), and subsequent chunks stream the generated text piece by piece (`type: chunk`).

### Documents Management

* **`POST /documents/ingest`**: Ingest new content directly by providing text. The text will be chunked, embedded, and stored in the database.
* **`POST /documents/upload`**: Upload a file (e.g., PDF) to extract text, summarize topic divisions, and automatically ingest it as one or multiple documents based on the breakdown.
* **`POST /documents/upload/summary`**: Upload a file and get a summary/topic division breakdown WITHOUT ingesting it into the database.
* **`POST /documents/upload/breakdown-with-questions`**: Upload a file to get a full topic breakdown along with automatically generated quiz questions for each topic part.
* **`POST /documents/generate-questions`**: Generate a set of multiple-choice questions for a specific block of content.
* **`PUT /documents/{id}`**: Update an existing document's content and metadata.
* **`GET /documents`**: List recently ingested documents.

### Health Check

* **`GET /health`**: Returns the API status.
