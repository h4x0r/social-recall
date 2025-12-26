/**
 * Playwright Test Fixtures for Extension Testing
 *
 * Provides a browser context with:
 * - Extension loaded
 * - LinkedIn session authenticated
 */

import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../dist');
const userDataDir = path.resolve(__dirname, '../.auth/user-data');

// Extend base test with extension context
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Override context to load extension with saved auth
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
      ],
      viewport: { width: 1280, height: 720 },
    });

    await use(context);
    await context.close();
  },

  // Get extension ID for accessing extension pages
  extensionId: async ({ context }, use) => {
    // Get extension ID from service worker
    let extensionId = '';

    // Wait for service worker to be registered
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const url = serviceWorkers[0].url();
      const match = url.match(/chrome-extension:\/\/([^/]+)/);
      if (match) extensionId = match[1];
    }

    // Fallback: check background page
    if (!extensionId) {
      const pages = context.backgroundPages();
      if (pages.length > 0) {
        const url = pages[0].url();
        const match = url.match(/chrome-extension:\/\/([^/]+)/);
        if (match) extensionId = match[1];
      }
    }

    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
