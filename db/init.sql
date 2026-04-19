-- FocusPulse Database Schema
-- This runs automatically when the Postgres container starts for the first time.

-- We need the uuid extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (auth-service owns this)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus sessions (timer-service owns this)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 25,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active'  -- active | completed | abandoned
);

-- Game scores (game-service owns this)
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  source VARCHAR(50) NOT NULL,  -- 'focus_session' | 'quiz_completed' | 'streak_bonus'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for the queries we'll actually run
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id, created_at DESC);

-- Core Documents (RAG Service)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash VARCHAR(64) UNIQUE NOT NULL,
    file_name VARCHAR(255),
    content_length INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Document Link
CREATE TABLE IF NOT EXISTS user_documents (
    user_id UUID NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

-- Chunks (with Vector Embeddings for RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    topic TEXT,
    time_est_s INT,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Attempts
CREATE TABLE IF NOT EXISTS user_question_attempts (
    user_id UUID,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    was_correct BOOLEAN,
    PRIMARY KEY (user_id, question_id)
);
