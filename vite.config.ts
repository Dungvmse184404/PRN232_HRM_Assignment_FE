import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Each microservice runs on its own port. We proxy by path prefix so the
// browser talks to the same origin as the dev server — no CORS setup needed.
//   /api/racing/*      -> Racing service    (5002)
//   /api/officiating/* -> Racing service    (5002)
//   /api/results/*     -> Racing service    (5002)
//   /api/horse/*       -> Horse service     (5003)
//   /api/identity/*    -> Identity service  (5001)
// More specific prefixes must come first.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/racing': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/officiating': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/results': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/horse': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/identity': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
