import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Proxy /api qua API Gateway (localhost:5000), route theo prefix đến từng service.
// Quy tắc: prefix CỤ THỂ phải khai báo TRƯỚC prefix CHUNG (/api) — nếu không
// request vào `/api/predictions/*` sẽ bị catch-all `/api` nuốt và proxy về gateway
// (gateway chưa có route prediction -> 404).
//
//   /api/identity/*    -> Identity (:5001) hoặc gateway
//   /api/racing/*      -> Racing (:5002) hoặc gateway
//   /api/officiating/* -> Racing (:5002)
//   /api/results/*     -> Racing (:5002)
//   /api/owners/*      -> Racing (:5002)
//   /api/horse/*       -> Horse (:5003) hoặc gateway
//   /api/predictions/* -> Prediction (:5004) — gateway chưa route, gọi thẳng
//   /api/* (còn lại)   -> Gateway (:5000)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // --- Cụ thể trước ---
      '/api/predictions': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
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
      '/api/owners': {
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
      // --- Chung sau cùng ---
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
