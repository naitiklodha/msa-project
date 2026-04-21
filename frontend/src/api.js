import axios from 'axios';

const API_BASE = 'http://localhost:8000'; // Point to Kong gateway explicitly

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fp_token');
      localStorage.removeItem('fp_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const authAPI = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

// --- Timer ---
export const timerAPI = {
  start: (durationMinutes = 25) =>
    api.post('/timer/sessions', { durationMinutes }),
  getActive: () =>
    api.get('/timer/sessions/active'),
  complete: (sessionId) =>
    api.post(`/timer/sessions/${sessionId}/complete`),
  abandon: (sessionId) =>
    api.post(`/timer/sessions/${sessionId}/abandon`),
  history: () =>
    api.get('/timer/sessions/history'),
};

// --- Game ---
export const gameAPI = {
  status: () => api.get('/game/status'),
  minigame: (gameName, score) => api.post('/game/score-mini-game', { gameName, score }),
};

// --- Documents (RAG) ---
export const docAPI = {
  upload: (file, roomId = null) => {
    const form = new FormData();
    form.append('file', file);
    if (roomId) form.append('room_id', roomId);
    return api.post('/documents/upload/breakdown-with-questions', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (roomId = null) => api.get(roomId ? `/documents?room_id=${roomId}` : '/documents'),
  topics: (docId) => api.get(`/documents/${docId}/topics`),
  delete: (docId) => api.delete(`/documents/${docId}`),
  questions: (docId, chunkId) =>
    api.get(`/documents/${docId}/chunks/${chunkId}/questions`),
};

// --- Rooms ---
export const roomAPI = {
  create: (name) => api.post('/rooms/create', { name }),
  get: (code) => api.get(`/rooms/${code}`),
  mine: () => api.get('/rooms/mine'),
  history: (code) => api.get(`/rooms/${code}/history`),
  leaderboard: (code) => api.get(`/rooms/${code}/leaderboard`),
};

// --- Quiz ---
export const quizAPI = {
  start: (documentId, chunkId, roomId = null) =>
    api.post(`/documents/quiz/start?document_id=${documentId}&chunk_id=${chunkId}${roomId ? `&room_id=${roomId}` : ''}`),
  next: (sessionId) =>
    api.get(`/documents/quiz/${sessionId}/next`),
  submit: (sessionId, questionId, wasCorrect) =>
    api.post(`/documents/quiz/submit?session_id=${sessionId}&question_id=${questionId}&was_correct=${wasCorrect}`),
  complete: (sessionId, roomId = null) =>
    api.post(`/documents/quiz/${sessionId}/complete${roomId ? `?room_id=${roomId}` : ''}`),
};

// --- Leaderboard ---
export const leaderboardAPI = {
  global: () => api.get('/api/leaderboard/global'),
};

// --- RAG Query ---
export const ragAPI = {
  query: (query, topK = 3) =>
    api.post('/query', { query, top_k: topK }),
};

// --- Dashboard (BFF) ---
export const dashboardAPI = {
  get: () => api.get('/api/dashboard'),
};

export default api;
