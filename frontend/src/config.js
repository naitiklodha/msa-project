const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export function resolvePublicEndpoints(env, origin) {
  const publicEnv = env || {};
  const runtimeConfig = typeof window === 'undefined' ? {} : window.__FOCUSPULSE_CONFIG__ || {};
  const fallback = trimTrailingSlash(origin);

  return {
    apiBaseUrl: trimTrailingSlash(runtimeConfig.VITE_API_BASE_URL || publicEnv.VITE_API_BASE_URL || fallback),
    wsBaseUrl: trimTrailingSlash(runtimeConfig.VITE_WS_BASE_URL || publicEnv.VITE_WS_BASE_URL || fallback),
  };
}

const { apiBaseUrl, wsBaseUrl } = resolvePublicEndpoints(
  import.meta.env || {},
  typeof window === 'undefined' ? '' : window.location.origin,
);

export { apiBaseUrl, wsBaseUrl };
