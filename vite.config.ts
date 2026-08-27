import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  // content/ lives outside src/ so Vite needs explicit permission to serve it
  server: { fs: { allow: ['.'] }, port: 5173 },
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 4000 },
});
