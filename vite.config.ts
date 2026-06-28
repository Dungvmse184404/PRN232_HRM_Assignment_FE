import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Each microservice runs on its own port. We proxy by path prefix so the
// browser talks to the same origin as the dev server — no CORS setup needed.
//   /api/horse/*    -> Horse service   (5003)
//   /api/identity/* -> Identity service (5001)
// More specific prefixes must come first.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
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
