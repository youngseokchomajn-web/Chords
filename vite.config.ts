import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Chords/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
