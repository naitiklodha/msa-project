const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('shared health routes expose standardized liveness and readiness paths', () => {
  const health = read('shared/src/routes/health.js');
  assert.match(health, /\/health\/live/);
  assert.match(health, /\/health\/ready/);
});

test('Kong declares configurable upstreams and all Socket.IO routes', () => {
  const kong = read('gateway/kong.yml');
  for (const variable of ['AUTH_SERVICE_URL', 'BFF_SERVICE_URL', 'LEADERBOARD_SERVICE_URL', 'ROOM_SERVICE_URL']) {
    assert.match(kong, new RegExp(`\\$\\(env "${variable}"\\)`));
  }
  for (const route of ['/socket.io', '/ws/leaderboard', '/ws/rooms']) {
    assert.ok(kong.includes(route), `${route} is declared`);
  }
  assert.match(kong, /KONG_CORS_ORIGIN/);
});

test('non-Node services expose the standardized health endpoints', () => {
  const rag = read('services/rag-service/app/routers/health.py');
  const analytics = read('services/analytics-service/main.go');
  for (const source of [rag, analytics]) {
    assert.match(source, /\/health\/live/);
    assert.match(source, /\/health\/ready/);
  }
});

test('frontend accepts runtime public API and WebSocket endpoints', () => {
  const config = read('frontend/src/config.js');
  const nginx = read('frontend/nginx.conf');
  const dockerfile = read('frontend/Dockerfile');

  assert.match(config, /window\.__FOCUSPULSE_CONFIG__/);
  assert.match(nginx, /\/config\.js/);
  assert.match(nginx, /VITE_API_BASE_URL/);
  assert.match(nginx, /VITE_WS_BASE_URL/);
  assert.match(dockerfile, /VITE_API_BASE_URL/);
  assert.match(dockerfile, /VITE_WS_BASE_URL/);
});

test('BFF service dependency URLs are environment-only', () => {
  const bff = read('bff/src/index.js');
  assert.doesNotMatch(bff, /http:\/\/(auth-service|game-service|timer-service|leaderboard-service|analytics-service|rag-service):/);
  assert.match(bff, /requiredServiceUrl/);
});

test('compose healthchecks use standardized liveness endpoints and configured ports', () => {
  const compose = read('docker-compose.yml');
  for (const service of ['auth-service', 'game-service', 'timer-service', 'bff', 'room-service', 'rag-service', 'analytics-service']) {
    const serviceBlock = compose.match(new RegExp(`\\n  ${service}:([\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:|\\nvolumes:)`));
    assert.ok(serviceBlock, `${service} block exists`);
    assert.match(serviceBlock[1], /\/health\/live/, `${service} uses /health/live`);
    assert.doesNotMatch(serviceBlock[1], /\/healthz/, `${service} does not use /healthz`);
    assert.doesNotMatch(serviceBlock[1], /localhost:(3001|3002|3004|3008|4000|8080)/, `${service} does not hardcode service ports`);
  }
});

test('room websocket route is explicitly aligned to /ws/rooms', () => {
  const frontend = read('frontend/src/pages/ActiveRoom.jsx');
  const roomService = read('services/room-service/src/index.js');

  assert.match(frontend, /path:\s*'\/ws\/rooms'/);
  assert.doesNotMatch(frontend, /\/ws\/rooms\/socket\.io/);
  assert.match(roomService, /path:\s*'\/ws\/rooms'/);
});
