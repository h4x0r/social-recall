/**
 * Auth Setup - Run once to capture LinkedIn login session
 *
 * Usage: npx playwright test --project=setup
 *
 * This opens a browser for manual LinkedIn login.
 * The session is saved to .auth/linkedin.json for reuse.
 */

import { test as setup, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.resolve(__dirname, '../.auth/linkedin.json');
const userDataDir = path.resolve(__dirname, '../.auth/user-data');
const extensionPath = path.resolve(__dirname, '../dist');

setup('authenticate with LinkedIn', async () => {
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if already authenticated
  if (fs.existsSync(authFile)) {
    const stats = fs.statSync(authFile);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    // Reuse auth if less than 24 hours old
    if (ageHours < 24) {
      console.log('Using existing auth (less than 24h old)');
      return;
    }
  }

  console.log('\n========================================');
  console.log('LinkedIn Login Required');
  console.log('========================================');
  console.log('A browser will open. Please:');
  console.log('1. Log in to LinkedIn');
  console.log('2. Complete any 2FA if prompted');
  console.log('3. Wait for the feed to load');
  console.log('4. The browser will close automatically');
  console.log('========================================\n');

  // Launch with extension loaded
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Must be headed for login
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Navigate to LinkedIn login
  await page.goto('https://www.linkedin.com/login');

  // Wait for successful login - user lands on feed
  await page.waitForURL('**/feed/**', { timeout: 300000 }); // 5 min timeout for login

  console.log('Login successful! Saving session...');

  // Wait a bit for session to stabilize
  await page.waitForTimeout(2000);

  // Save storage state
  await context.storageState({ path: authFile });

  await context.close();

  console.log(`Auth saved to ${authFile}`);
});
