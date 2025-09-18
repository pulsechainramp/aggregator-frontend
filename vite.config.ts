import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    host: '0.0.0.0',
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  build: {
    outDir: 'build',
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}); 