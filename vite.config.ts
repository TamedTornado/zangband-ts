import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800, // Data chunk is ~730 kB of game content
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'rot-js'],
          data: [
            './src/data/monsters/monsters.json',
            './src/data/items/items.json',
            './src/data/items/ego-items.json',
            './src/data/items/artifacts.json',
          ],
        },
      },
    },
  },
});
