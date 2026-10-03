import { defineConfig } from 'vite';

// The production folder is independent and also works under a nested static path.
export default defineConfig({ base: './', server: { port: 5175 }, preview: { port: 5175 } });
