import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const port = Number(process.env.PORT || 5173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: existsSync('/usr/bin/chromium')
      ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }
      : undefined,
  },
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
