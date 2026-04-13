-- FocusPulse Database Schema
-- This runs automatically when the Postgres container starts for the first time.

-- We need the uuid extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
