import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    watch: {
      ignored: ['**/brand-right/**', '**/.git/**']
    }
  },
});
