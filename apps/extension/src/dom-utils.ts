/**
 * Playwright-like DOM utilities for Chrome extension content scripts
 * Provides reliable waiting and querying similar to Playwright's API
 */

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_INTERVAL = 100;

/**
 * Wait for a selector to appear in the DOM
 * Similar to Playwright's page.waitForSelector()
 */
export async function waitForSelector(
  selector: string,
  options: WaitOptions = {}
): Promise<Element | null> {
  const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  console.log(`[Social Recall] waitForSelector timeout: ${selector}`);
  return null;
}

/**
 * Wait for multiple elements matching a selector
 * Returns when at least minCount elements are found
 */
export async function waitForSelectorAll(
  selector: string,
  minCount: number = 1,
  options: WaitOptions = {}
): Promise<Element[]> {
  const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elements = document.querySelectorAll(selector);
    if (elements.length >= minCount) {
      return Array.from(elements);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return Array.from(document.querySelectorAll(selector));
}

/**
 * Wait for a function to return true
 * Similar to Playwright's page.waitForFunction()
 */
export async function waitForFunction(
  fn: () => boolean | Promise<boolean>,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await fn();
      if (result) {
        return true;
      }
    } catch {
      // Ignore errors, keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Wait for text to appear anywhere in the document
 */
export async function waitForText(
  text: string,
  options: WaitOptions = {}
): Promise<boolean> {
  return waitForFunction(
    () => document.body.textContent?.includes(text) ?? false,
    options
  );
}

/**
 * Wait for the page to be in a stable state (no major DOM changes)
 */
export async function waitForStable(stabilityMs: number = 500): Promise<void> {
  return new Promise((resolve) => {
    let lastChangeTime = Date.now();
    let resolved = false;

    const observer = new MutationObserver(() => {
      lastChangeTime = Date.now();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const checkStability = () => {
      if (resolved) return;

      if (Date.now() - lastChangeTime >= stabilityMs) {
        resolved = true;
        observer.disconnect();
        resolve();
      } else {
        setTimeout(checkStability, 100);
      }
    };

    setTimeout(checkStability, stabilityMs);
  });
}

/**
 * Scroll and wait for lazy content to load
 */
export async function scrollAndWait(): Promise<void> {
  const scrollHeight = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;

  // Scroll in chunks
  for (let pos = 0; pos < scrollHeight; pos += viewportHeight) {
    window.scrollTo(0, pos);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Scroll back to top
  window.scrollTo(0, 0);

  // Wait for DOM to stabilize after scroll
  await waitForStable(300);
}

/**
 * Extract text from an element, handling aria-hidden patterns
 */
export function extractText(element: Element | null): string | undefined {
  if (!element) return undefined;

  // LinkedIn uses span[aria-hidden="true"] for visible text
  const ariaHidden = element.querySelector('span[aria-hidden="true"]');
  if (ariaHidden?.textContent?.trim()) {
    return ariaHidden.textContent.trim();
  }

  return element.textContent?.trim() || undefined;
}

/**
 * Find a section by its header text (Experience, Education, etc.)
 */
export async function findSectionByHeader(
  headerText: string,
  options: WaitOptions = {}
): Promise<Element | null> {
  const searchText = headerText.toLowerCase();

  // Wait for sections to exist
  await waitForSelector('section', options);

  // Strategy 1: Look for section with matching span text
  const sections = document.querySelectorAll('section');
  for (const section of sections) {
    const spans = section.querySelectorAll('span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(5, spans.length); i++) {
      const text = spans[i].textContent?.trim().toLowerCase();
      if (text === searchText || text?.startsWith(searchText)) {
        return section;
      }
    }

    // Also check h2
    const h2 = section.querySelector('h2');
    const h2Text = h2?.textContent?.trim().toLowerCase();
    if (h2Text?.includes(searchText)) {
      return section;
    }
  }

  return null;
}

/**
 * Wait for LinkedIn profile to be fully loaded
 */
export async function waitForLinkedInProfile(
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeout = DEFAULT_TIMEOUT } = options;

  console.log('[Social Recall] Waiting for LinkedIn profile to load...');

  // First, wait for the main content area
  const main = await waitForSelector('main', { timeout: 5000 });
  if (!main) {
    console.log('[Social Recall] Main element not found');
    return false;
  }

  // Scroll to trigger lazy loading
  await scrollAndWait();

  // Wait for key indicators that profile is loaded
  const loaded = await waitForFunction(
    () => {
      // Check for profile name
      const h1 = document.querySelector('h1');
      const hasName = h1?.textContent?.trim().length > 0;

      // Check for Experience or About text (multiple possible patterns)
      const bodyText = document.body.textContent || '';
      const hasProfileContent = bodyText.includes('Experience') ||
        bodyText.includes('About') ||
        bodyText.includes('Skills') ||
        bodyText.includes('Education');

      // Check for main having multiple children
      const mainEl = document.querySelector('main');
      const hasMultipleChildren = (mainEl?.children.length || 0) >= 3;

      // Check for profile sections - multiple class patterns
      const hasPvsElements = document.querySelectorAll('[class*="pvs-"]').length > 50;
      const hasArtdecoCards = document.querySelectorAll('main section.artdeco-card').length >= 2;

      // Check that loaders are gone (sections fully loaded)
      const loadersGone = document.querySelectorAll('[class*="pvs-loader"]').length === 0;

      console.log(`[Social Recall] Load check: name=${hasName}, content=${hasProfileContent}, children=${mainEl?.children.length}, pvs=${hasPvsElements}, cards=${hasArtdecoCards}, loadersGone=${loadersGone}`);

      // Either we have profile content text, OR we have enough structural elements
      return hasName && (hasProfileContent || (hasMultipleChildren && hasPvsElements && loadersGone) || hasArtdecoCards);
    },
    { timeout, interval: 500 }
  );

  if (loaded) {
    console.log('[Social Recall] Profile loaded successfully');
    // Give a bit more time for final rendering
    await waitForStable(500);
  } else {
    console.log('[Social Recall] Profile load timeout - proceeding anyway');
    // Still wait a bit for content to render
    await waitForStable(1000);
  }

  return loaded;
}

/**
 * Extract list items from a section (Experience, Education, etc.)
 */
export function extractListItems(section: Element): Element[] {
  // Try different list item patterns
  const selectors = [
    'li.pvs-list__paged-list-item',
    'li[class*="pvs-list__item"]',
    '.pvs-entity',
    'li',
  ];

  for (const selector of selectors) {
    const items = section.querySelectorAll(selector);
    if (items.length > 0) {
      return Array.from(items);
    }
  }

  return [];
}
