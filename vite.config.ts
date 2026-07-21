import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Proxy /api through the API Gateway (localhost:5000) which routes to all
// services: Identity (:5001), Racing (:5002), Horse (:5003), Prediction (:5004).
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
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },

      // Horse Service - port 5003
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

      // Racing Service - port 5002
      '/api/racing': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/results': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/owners': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/officiating': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },

      // Prediction Service - port 5004
      '/api/predictions': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
});
