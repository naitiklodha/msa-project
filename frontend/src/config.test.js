import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicEndpoints } from './config.js';

test('uses the current origin when public endpoints are not configured', () => {
  assert.deepEqual(resolvePublicEndpoints({}, 'https://app.focuspulse.example/'), {
    apiBaseUrl: 'https://app.focuspulse.example',
    wsBaseUrl: 'https://app.focuspulse.example',
  });
});

test('normalizes configured API and WebSocket endpoint URLs', () => {
  assert.deepEqual(resolvePublicEndpoints({
    VITE_API_BASE_URL: 'https://api.focuspulse.example/',
    VITE_WS_BASE_URL: 'wss://ws.focuspulse.example/',
  }, 'https://app.focuspulse.example'), {
    apiBaseUrl: 'https://api.focuspulse.example',
    wsBaseUrl: 'wss://ws.focuspulse.example',
  });
});

test('runtime config overrides build-time public endpoints', () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    __FOCUSPULSE_CONFIG__: {
      VITE_API_BASE_URL: 'https://runtime-api.focuspulse.example/',
      VITE_WS_BASE_URL: 'wss://runtime-ws.focuspulse.example/',
    },
  };

  try {
    assert.deepEqual(resolvePublicEndpoints({
      VITE_API_BASE_URL: 'https://build-api.focuspulse.example/',
      VITE_WS_BASE_URL: 'wss://build-ws.focuspulse.example/',
    }, 'https://app.focuspulse.example'), {
      apiBaseUrl: 'https://runtime-api.focuspulse.example',
      wsBaseUrl: 'wss://runtime-ws.focuspulse.example',
    });
  } finally {
    globalThis.window = originalWindow;
  }
});
