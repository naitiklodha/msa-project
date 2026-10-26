import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_DEV_PROXY_TARGET;
  const paths = ['/api', '/auth', '/timer', '/game', '/documents', '/query'];
  const proxy = target
    ? Object.fromEntries([
      ...paths.map((path) => [path, target]),
      ...['/socket.io', '/ws/leaderboard', '/ws/rooms'].map((path) => [path, { target, ws: true }]),
    ])
    : {};

  return {
    plugins: [react()],
    server: { proxy },
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        drafts: {
          customMedia: true,
        },
      },
    },
  };
});
