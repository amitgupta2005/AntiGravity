import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiMiddleware } from './server/apiRouter.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'unified-in-ui-backend-api',
      configureServer(server) {
        // Internal backend API middleware running directly inside Vite dev server
        server.middlewares.use(createApiMiddleware());
      },
      configurePreviewServer(server) {
        // Internal backend API middleware for production preview
        server.middlewares.use(createApiMiddleware());
      }
    }
  ],
  server: {
    port: 5177,
    host: true
  },
  preview: {
    port: 5177,
    host: true
  }
});
