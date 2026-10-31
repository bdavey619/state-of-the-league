import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the site works on GitHub Pages under /<repo-name>/ without config.
export default defineConfig({
  base: './',
  plugins: [react()],
});
