import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: Number(process.env.PORT || 5171), strictPort: true },
  preview: { port: Number(process.env.PORT || 5171), strictPort: true },
});
