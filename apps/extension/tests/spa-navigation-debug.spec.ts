/**
 * SPA Navigation Debug Tests
 * Tests all 8 state transitions between pages and panel states
 *
 * Navigation Types:
 *   1. Non-profile → Profile
 *   2. Profile → Non-profile
 *   3. Non-profile → Non-profile
 *   4. Profile → Profile
 *
 * Panel States:
 *   - Minimized
 *   - Expanded
 *
 * Total: 4 navigation types × 2 panel states = 8 transitions
 */

import { test, expect } from './fixtures';

const FEED_URL = 'https://www.linkedin.com/feed/';
const MYNETWORK_URL = 'https://www.linkedin.com/mynetwork/';
const PROFILE_A_URL = 'https://www.linkedin.com/in/williamhgates/';
const PROFILE_B_URL = 'https://www.linkedin.com/in/satyanadella/'; // Satya Nadella

interface PanelCheck {
  isHistoryMode: boolean;
  historyLabelText: string | null;
  profileName: string | null;
  hasArchetype: boolean;
}

async function checkPanelState(page: any): Promise<PanelCheck> {
  const historyLabel = page.locator('.sr-panel__history-label');
  const profileName = page.locator('.sr-panel__name');
  const archetype = page.locator('.sr-panel__archetype');

  const isHistoryMode = await historyLabel.isVisible().catch(() => false);
  const historyLabelText = isHistoryMode ? await historyLabel.textContent().catch(() => null) : null;
  const profileNameText = await profileName.textContent().catch(() => null);
  const hasArchetype = await archetype.isVisible().catch(() => false);

  return {
    isHistoryMode,
    historyLabelText,
    profileName: profileNameText,
    hasArchetype
  };
}

function logPanelState(label: string, state: PanelCheck) {
  console.log(`\n=== ${label} ===`);
  console.log('History mode:', state.isHistoryMode);
  console.log('History label:', state.historyLabelText);
  console.log('Profile name:', state.profileName);
  console.log('Has archetype:', state.hasArchetype);
}

// ============================================================================
// Non-Profile → Profile Navigation
// ============================================================================

test.describe('Non-Profile → Profile Navigation', () => {

  test('State 1: Minimized on feed → Navigate to profile', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');

    // Wait for panel orb to appear
    const orb = page.locator('.sr-panel__orb');
    await expect(orb).toBeVisible({ timeout: 15000 });

    // Panel should be minimized (orb visible, content hidden)
    const content = page.locator('.sr-panel__content');
    await expect(content).not.toBeVisible();

    console.log('\n=== STATE 1: Minimized on feed → Profile ===');
    await page.screenshot({ path: 'test-results/state1-before.png', fullPage: false });

    // Navigate to profile page
    console.log('Navigating to profile page...');
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Check if panel is expanded (it may auto-expand on profile page)
    const isExpanded = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpanded);

    // If not expanded, click to expand
    if (!isExpanded) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state1-after.png', fullPage: false });

    const state = await checkPanelState(page);
    logPanelState('After navigation (expanded)', state);

    // EXPECTED: Profile intelligence (NOT history mode)
    expect(state.isHistoryMode).toBe(false);
    expect(state.profileName).not.toContain('Social Recall');
  });

  test('State 2: Expanded on feed → Navigate to profile', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');

    // Wait for panel and expand it
    const orb = page.locator('.sr-panel__orb');
    await expect(orb).toBeVisible({ timeout: 20000 });
    await orb.click();

    const content = page.locator('.sr-panel__content');
    await expect(content).toBeVisible({ timeout: 5000 });

    // Verify we're in history mode
    const historyLabel = page.locator('.sr-panel__history-label');
    await expect(historyLabel).toContainText('RECENT', { timeout: 5000 });

    console.log('\n=== STATE 2: Expanded on feed → Profile ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before navigation', stateBefore);
    await page.screenshot({ path: 'test-results/state2-before.png', fullPage: false });

    // Navigate to profile page
    console.log('Navigating to profile page...');
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-results/state2-after.png', fullPage: false });

    const stateAfter = await checkPanelState(page);
    logPanelState('After navigation', stateAfter);

    // EXPECTED: Profile intelligence (NOT history mode), panel still expanded
    await expect(content).toBeVisible();
    expect(stateAfter.isHistoryMode).toBe(false);
    expect(stateAfter.profileName).not.toContain('Social Recall');
    expect(stateAfter.profileName).not.toBe('RECENT');
  });
});

// ============================================================================
// Profile → Non-Profile Navigation
// ============================================================================

test.describe('Profile → Non-Profile Navigation', () => {

  test('State 3: Minimized on profile → Navigate to feed', async ({ context }) => {
    const page = await context.newPage();

    // Start on profile
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    // Wait for panel content (on profile pages, panel auto-expands)
    await expect(content).toBeVisible({ timeout: 20000 });

    // Minimize panel (on profile page it auto-expands)
    // The orb is hidden when expanded, so we click on the panel header instead
    console.log('Panel is expanded on profile, minimizing...');
    const panelHeader = page.locator('.sr-panel__header');
    await panelHeader.click();
    await page.waitForTimeout(500);

    console.log('\n=== STATE 3: Minimized on profile → Feed ===');
    await page.screenshot({ path: 'test-results/state3-before.png', fullPage: false });

    // Navigate to feed
    console.log('Navigating to feed...');
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check current state
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    // If not expanded, click to expand
    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state3-after.png', fullPage: false });

    const state = await checkPanelState(page);
    logPanelState('After navigation (expanded)', state);

    // EXPECTED: History mode
    expect(state.isHistoryMode).toBe(true);
    expect(state.historyLabelText).toContain('RECENT');
  });

  test('State 4: Expanded on profile → Navigate to feed', async ({ context }) => {
    const page = await context.newPage();

    // Start on profile
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    // Wait for panel content (on profile pages, panel auto-expands)
    await expect(content).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(3000);

    console.log('\n=== STATE 4: Expanded on profile → Feed ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before navigation', stateBefore);
    await page.screenshot({ path: 'test-results/state4-before.png', fullPage: false });

    // Navigate to feed
    console.log('Navigating to feed...');
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check if still expanded
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    // If not expanded, expand it to check content
    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state4-after.png', fullPage: false });

    const stateAfter = await checkPanelState(page);
    logPanelState('After navigation', stateAfter);

    // EXPECTED: History mode
    expect(stateAfter.isHistoryMode).toBe(true);
    expect(stateAfter.profileName).toBe('Social Recall');
  });
});

// ============================================================================
// Non-Profile → Non-Profile Navigation
// ============================================================================

test.describe('Non-Profile → Non-Profile Navigation', () => {

  test('State 5: Minimized on feed → Navigate to mynetwork', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    await expect(orb).toBeVisible({ timeout: 20000 });

    // Ensure minimized
    const isExpanded = await content.isVisible().catch(() => false);
    if (isExpanded) {
      await orb.click();
      await page.waitForTimeout(500);
    }

    console.log('\n=== STATE 5: Minimized on feed → Mynetwork ===');
    await page.screenshot({ path: 'test-results/state5-before.png', fullPage: false });

    // Navigate to mynetwork
    console.log('Navigating to mynetwork...');
    await page.goto(MYNETWORK_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check if expanded
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    // Expand panel to check content
    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state5-after.png', fullPage: false });

    const state = await checkPanelState(page);
    logPanelState('After navigation (expanded)', state);

    // EXPECTED: History mode (still on non-profile page)
    expect(state.isHistoryMode).toBe(true);
    expect(state.historyLabelText).toContain('RECENT');
  });

  test('State 6: Expanded on feed → Navigate to mynetwork', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    await expect(orb).toBeVisible({ timeout: 20000 });

    // Ensure expanded
    const isExpanded = await content.isVisible().catch(() => false);
    if (!isExpanded) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    console.log('\n=== STATE 6: Expanded on feed → Mynetwork ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before navigation', stateBefore);
    await page.screenshot({ path: 'test-results/state6-before.png', fullPage: false });

    // Navigate to mynetwork
    console.log('Navigating to mynetwork...');
    await page.goto(MYNETWORK_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check if still expanded
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state6-after.png', fullPage: false });

    const stateAfter = await checkPanelState(page);
    logPanelState('After navigation', stateAfter);

    // EXPECTED: Still history mode
    expect(stateAfter.isHistoryMode).toBe(true);
  });
});

// ============================================================================
// Profile → Profile Navigation
// ============================================================================

test.describe('Profile → Profile Navigation', () => {

  test('State 7: Minimized on profile A → Navigate to profile B', async ({ context }) => {
    const page = await context.newPage();

    // Start on profile A
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    // Wait for panel content (on profile pages, panel auto-expands)
    await expect(content).toBeVisible({ timeout: 20000 });

    // Minimize panel (orb is hidden when expanded, click header instead)
    console.log('Panel is expanded on profile A, minimizing...');
    const panelHeader = page.locator('.sr-panel__header');
    await panelHeader.click({ force: true });
    await page.waitForTimeout(500);

    console.log('\n=== STATE 7: Minimized on profile A → Profile B ===');
    await page.screenshot({ path: 'test-results/state7-before.png', fullPage: false });

    // Navigate to profile B
    console.log('Navigating to profile B...');
    await page.goto(PROFILE_B_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Check if expanded
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state7-after.png', fullPage: false });

    const state = await checkPanelState(page);
    logPanelState('After navigation (expanded)', state);

    // FIXED: Profile → Profile navigation now correctly shows Profile B's intelligence
    expect(state.isHistoryMode).toBe(false);
    expect(state.profileName).not.toContain('Social Recall');
  });

  test('State 8: Expanded on profile A → Navigate to profile B', async ({ context }) => {
    const page = await context.newPage();

    // Start on profile A
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    // Wait for panel content (on profile pages, panel auto-expands)
    await expect(content).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(3000);

    console.log('\n=== STATE 8: Expanded on profile A → Profile B ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before navigation (Profile A)', stateBefore);
    await page.screenshot({ path: 'test-results/state8-before.png', fullPage: false });

    const profileAName = stateBefore.profileName;

    // Navigate to profile B
    console.log('Navigating to profile B...');
    await page.goto(PROFILE_B_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Check if still expanded
    const isExpandedAfter = await content.isVisible().catch(() => false);
    console.log('Panel expanded after navigation:', isExpandedAfter);

    if (!isExpandedAfter) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/state8-after.png', fullPage: false });

    const stateAfter = await checkPanelState(page);
    logPanelState('After navigation (Profile B)', stateAfter);

    // FIXED: Profile → Profile navigation now correctly shows Profile B's intelligence
    expect(stateAfter.isHistoryMode).toBe(false);
    expect(stateAfter.profileName).not.toContain('Social Recall');
    if (profileAName && stateAfter.profileName) {
      expect(stateAfter.profileName).not.toBe(profileAName);
    }
  });
});

// ============================================================================
// Real SPA Navigation (Click-based, not page.goto)
// ============================================================================

test.describe('Real SPA Navigation (Click-based)', () => {

  test('Click profile link from feed → should switch to profile mode', async ({ context }) => {
    const page = await context.newPage();

    // Start on feed
    await page.goto(FEED_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    await expect(orb).toBeVisible({ timeout: 20000 });

    // Ensure expanded
    const isExpanded = await content.isVisible().catch(() => false);
    if (!isExpanded) {
      await orb.click();
      await expect(content).toBeVisible({ timeout: 5000 });
    }

    console.log('\n=== REAL SPA: Click profile from feed ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before click', stateBefore);
    await page.screenshot({ path: 'test-results/spa-click-before.png', fullPage: false });

    // Find and click a profile link in the feed
    const profileLink = page.locator('a[href*="/in/"]').first();
    const hasProfileLink = await profileLink.isVisible().catch(() => false);

    if (hasProfileLink) {
      const href = await profileLink.getAttribute('href');
      console.log('Clicking profile link:', href);
      await profileLink.click();

      // Wait for SPA navigation
      await page.waitForTimeout(5000);

      // Check if content visible
      const isExpandedAfter = await content.isVisible().catch(() => false);
      if (!isExpandedAfter) {
        await orb.click();
        await expect(content).toBeVisible({ timeout: 5000 });
      }

      await page.screenshot({ path: 'test-results/spa-click-after.png', fullPage: false });

      const stateAfter = await checkPanelState(page);
      logPanelState('After SPA click', stateAfter);

      // EXPECTED: Profile intelligence (NOT history mode)
      expect(stateAfter.isHistoryMode).toBe(false);
    } else {
      console.log('No profile link found in feed, skipping click test');
    }
  });

  test('Click home/feed from profile → should switch to history mode', async ({ context }) => {
    const page = await context.newPage();

    // Start on profile
    await page.goto(PROFILE_A_URL);
    await page.waitForLoadState('domcontentloaded');

    const orb = page.locator('.sr-panel__orb');
    const content = page.locator('.sr-panel__content');

    // Wait for panel content (on profile pages, panel auto-expands)
    await expect(content).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(3000);

    console.log('\n=== REAL SPA: Click home from profile ===');
    const stateBefore = await checkPanelState(page);
    logPanelState('Before click', stateBefore);
    await page.screenshot({ path: 'test-results/spa-home-before.png', fullPage: false });

    // Click home/feed link
    const homeLink = page.locator('a[href="/feed/"]').first();
    const hasHomeLink = await homeLink.isVisible().catch(() => false);

    if (hasHomeLink) {
      console.log('Clicking home link...');
      await homeLink.click();

      // Wait for SPA navigation
      await page.waitForTimeout(5000);

      // Check if content visible
      const isExpandedAfter = await content.isVisible().catch(() => false);
      if (!isExpandedAfter) {
        await orb.click();
        await expect(content).toBeVisible({ timeout: 5000 });
      }

      await page.screenshot({ path: 'test-results/spa-home-after.png', fullPage: false });

      const stateAfter = await checkPanelState(page);
      logPanelState('After SPA click', stateAfter);

      // EXPECTED: History mode
      expect(stateAfter.isHistoryMode).toBe(true);
    } else {
      console.log('No home link found, skipping click test');
    }
  });
});
