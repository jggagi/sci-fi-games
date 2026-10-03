import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
const useDevServer = process.env.E2E_DEV === '1';

export default defineConfig({
  testDir: './tests',
  testMatch: 'game.spec.ts',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    viewport: { width: 1440, height: 1000 },
    browserName: 'chromium',
    launchOptions: {
      ...(existsSync(systemChromium) ? { executablePath: systemChromium } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: useDevServer
      ? 'npm run dev -- --host 127.0.0.1 --port 5175'
      : 'npm run preview -- --host 127.0.0.1 --port 5175',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
