import { defineConfig } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests',
  timeout: 120000, // 2 minutes for profile extraction with lazy loading
  retries: 0,
  workers: 1, // Extensions require single worker

  use: {
    // Chrome extensions require the new headless mode (not legacy headless)
    headless: 'new' as const,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'extension-tests',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
});
