import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',     // default build output
    emptyOutDir: true,  // clear old builds
    assetsDir: '',      // crucial: makes asset paths relative for Express
  },
  define: {
    'process.env': process.env, // optional, exposes env to Vite
  },
});
