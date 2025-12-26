/**
 * Panel Tests - Test the floating panel on LinkedIn
 */

import { test, expect } from './fixtures';

test.describe('Social Recall Panel', () => {
  test('shows orb on LinkedIn feed', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Panel orb should be visible
    const orb = page.locator('.sr-panel__orb');
    await expect(orb).toBeVisible({ timeout: 10000 });
  });

  test('shows panel when orb is clicked', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForLoadState('networkidle');

    // Click the orb
    const orb = page.locator('.sr-panel__orb');
    await orb.click();

    // Panel content should be visible
    const content = page.locator('.sr-panel__content');
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('shows history mode on non-profile page', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForLoadState('networkidle');

    // Open panel
    const orb = page.locator('.sr-panel__orb');
    await orb.click();

    // Should show "RECENT" label (history mode)
    const recentLabel = page.locator('.sr-panel__history-label');
    await expect(recentLabel).toContainText('RECENT', { timeout: 5000 });
  });

  test('shows profile intelligence on profile page', async ({ context }) => {
    const page = await context.newPage();

    // Use a public profile - Bill Gates
    await page.goto('https://www.linkedin.com/in/williamhgates/');
    await page.waitForLoadState('networkidle');

    // Wait for panel to process
    await page.waitForTimeout(3000);

    // Panel should show profile name
    const nameEl = page.locator('.sr-panel__name');
    await expect(nameEl).toBeVisible({ timeout: 15000 });

    // Should have archetype section (AI analysis)
    const archetype = page.locator('.sr-panel__archetype');
    await expect(archetype).toBeVisible({ timeout: 30000 });
  });

  test('can minimize and restore panel', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForLoadState('networkidle');

    // Open panel
    const orb = page.locator('.sr-panel__orb');
    await orb.click();

    const content = page.locator('.sr-panel__content');
    await expect(content).toBeVisible();

    // Click minimize
    const minimize = page.locator('.sr-panel__minimize');
    await minimize.click();

    // Content should be hidden, orb visible
    await expect(content).not.toBeVisible();
    await expect(orb).toBeVisible();

    // Click orb to restore
    await orb.click();
    await expect(content).toBeVisible();
  });
});

test.describe('SPA Navigation', () => {
  test('updates panel when navigating to profile', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForLoadState('networkidle');

    // Open panel - should be in history mode
    const orb = page.locator('.sr-panel__orb');
    await orb.click();

    const historyLabel = page.locator('.sr-panel__history-label');
    await expect(historyLabel).toContainText('RECENT');

    // Navigate to a profile via search or link
    await page.goto('https://www.linkedin.com/in/williamhgates/');
    await page.waitForLoadState('networkidle');

    // Panel should switch to profile mode
    const nameEl = page.locator('.sr-panel__name');
    await expect(nameEl).not.toContainText('Social Recall', { timeout: 15000 });
  });
});
