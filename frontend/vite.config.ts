import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Required for Docker: bind to all interfaces so the container is reachable
    host: '0.0.0.0',
    // Required for Docker/WSL: filesystem events don't propagate reliably through
    // volume mounts, so Vite falls back to polling to detect file changes
    watch: {
      usePolling: true,
    },
    proxy: {
      // In Docker the backend is reachable via service name; locally via localhost.
      // VITE_API_TARGET is injected by docker-compose.dev.yml; falls back to localhost.
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
