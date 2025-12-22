/**
 * Background script for Chrome extension
 * Handles external messages from web app for auth token flow
 */

// Allowed origins for receiving auth tokens
export const WEB_APP_ORIGINS = [
  'http://localhost:3000',
  'https://social-recall.vercel.app',
];

interface AuthTokenMessage {
  type: 'AUTH_TOKEN';
  token: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
}

function isValidOrigin(url: string | undefined): boolean {
  if (!url) return false;
  return WEB_APP_ORIGINS.some((origin) => url.startsWith(origin));
}

function isAuthTokenMessage(message: unknown): message is AuthTokenMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as Record<string, unknown>).type === 'AUTH_TOKEN'
  );
}

/**
 * Set up listener for external messages from web app
 */
export function setupAuthListener(): void {
  chrome.runtime.onMessageExternal.addListener(
    (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: AuthResponse) => void
    ): boolean | void => {
      // Validate sender origin
      if (!isValidOrigin(sender.url)) {
        sendResponse({ success: false, error: 'Invalid origin' });
        return;
      }

      // Handle AUTH_TOKEN message
      if (isAuthTokenMessage(message)) {
        if (!message.token) {
          sendResponse({ success: false, error: 'Missing token' });
          return;
        }

        // Store token in chrome.storage.sync
        chrome.storage.sync.set({ syncToken: message.token }, () => {
          sendResponse({ success: true });
          // Notify any open popups
          chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });
        });

        // Return true to keep message channel open for async response
        return true;
      }

      // Unknown message type - don't respond
    }
  );
}

/**
 * Set up context menu for right-click on extension icon
 */
export function setupContextMenu(): void {
  // Create context menu on install
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'social-recall-settings',
      title: 'Settings',
      contexts: ['action'], // Shows on extension icon right-click
    });
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'social-recall-settings') {
      chrome.runtime.openOptionsPage();
    }
  });
}

/**
 * Scrape a LinkedIn sub-page in a background tab
 * Opens tab, waits for content, extracts data, closes tab
 */
// Ordered by importance (most important first)
type ExtractorType =
  | 'activity'
  | 'services'
  | 'recommendations'
  | 'honors'
  | 'publications'
  | 'experience'
  | 'courses'
  | 'education'
  | 'certifications'
  | 'testscores'
  | 'skills'
  | 'languages'
  | 'volunteering'
  | 'organizations'
  | 'interests';

interface ScrapeRequest {
  type: 'SCRAPE_SUBPAGE';
  url: string;
  extractorType: ExtractorType;
}

interface ScrapeResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

async function scrapeSubpage(url: string, extractorType: string): Promise<ScrapeResponse> {
  let tabId: number | undefined;

  try {
    // Create a new tab in the background (not active)
    const tab = await chrome.tabs.create({
      url,
      active: false, // Background tab - doesn't take focus
    });

    tabId = tab.id;
    if (!tabId) {
      return { success: false, error: 'Failed to create tab' };
    }

    // Wait for the tab to finish loading
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tab load timeout')), 30000);

      const listener = (changedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });

    // Wait a bit for JavaScript to render content
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // For activity pages, scroll to load more content
    if (extractorType === 'activity') {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: scrollToLoadMore,
        args: [5, 1000], // 5 scrolls, 1 second between each
      });
    }

    // Execute extraction script in the tab
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDataFromPage,
      args: [extractorType],
    });

    const data = results[0]?.result as string[] | undefined;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Social Recall] Background scrape error:', error);
    return { success: false, error: String(error) };
  } finally {
    // Always close the background tab
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        // Tab might already be closed
      }
    }
  }
}

// This function runs in the context of the scraped page to scroll and load more content
async function scrollToLoadMore(scrollCount: number, delayMs: number): Promise<void> {
  for (let i = 0; i < scrollCount; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  // Scroll back to top
  window.scrollTo(0, 0);
}

// This function runs in the context of the scraped page
function extractDataFromPage(extractorType: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  // Helper to add unique non-empty results
  const addResult = (text: string | null | undefined) => {
    const trimmed = text?.trim();
    if (trimmed && trimmed.length > 1 && trimmed.length < 200 && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      results.push(trimmed);
    }
  };

  // Helper to extract text from an element, preferring aria-hidden spans
  const extractText = (el: Element | null): string | undefined => {
    if (!el) return undefined;
    const ariaHidden = el.querySelector('span[aria-hidden="true"]');
    return ariaHidden?.textContent?.trim() || el.textContent?.trim();
  };

  // Common selectors for list items on detail pages
  const listItemSelectors = [
    'li.pvs-list__paged-list-item',
    'li[class*="pvs-list__item"]',
    '.pvs-entity',
  ].join(', ');

  // Get all list items
  const listItems = document.querySelectorAll(listItemSelectors);

  switch (extractorType) {
    case 'activity': {
      // Activity page: Extract posts with user commentary (not just reposts)
      const MAX_POSTS = 20;
      const MIN_POST_LENGTH = 10;
      const MAX_POST_LENGTH = 500;

      const feedItems = document.querySelectorAll([
        '.feed-shared-update-v2',
        '.occludable-update',
        '[data-urn*="activity"]',
      ].join(', '));

      for (const item of feedItems) {
        if (results.length >= MAX_POSTS) break;

        // Check if this is a repost
        const isRepost = item.querySelector([
          '.feed-shared-actor__sub-description',
          '[data-urn*="reshare"]',
          '.feed-shared-reshared-text',
        ].join(', ')) !== null ||
        item.innerHTML?.includes('reposted');

        let commentary: string | null = null;

        if (isRepost) {
          // For reposts, only extract if user added their own commentary
          const commentaryEl = item.querySelector([
            '.feed-shared-update-v2__commentary span[dir="ltr"]',
            '.feed-shared-update-v2__commentary span[aria-hidden="true"]',
            '.feed-shared-update-v2__commentary',
          ].join(', '));

          if (commentaryEl) {
            const ariaHidden = commentaryEl.querySelector('span[aria-hidden="true"]');
            commentary = (ariaHidden?.textContent?.trim() || commentaryEl.textContent?.trim()) || null;
          }
          // Skip reposts without commentary
          if (!commentary) continue;
        } else {
          // Original post - extract the post text
          const textEl = item.querySelector([
            '.update-components-text span[dir="ltr"]',
            '.update-components-text span[aria-hidden="true"]',
            '.feed-shared-text span[dir="ltr"]',
            '.feed-shared-text span[aria-hidden="true"]',
            '.break-words span[aria-hidden="true"]',
          ].join(', '));

          if (textEl) {
            const ariaHidden = textEl.querySelector('span[aria-hidden="true"]');
            commentary = (ariaHidden?.textContent?.trim() || textEl.textContent?.trim()) || null;
          }
        }

        // Validate and add the commentary
        if (commentary && commentary.length >= MIN_POST_LENGTH && !seen.has(commentary.toLowerCase())) {
          seen.add(commentary.toLowerCase());
          const truncated = commentary.length > MAX_POST_LENGTH ? commentary.slice(0, MAX_POST_LENGTH) : commentary;
          results.push(truncated);
        }
      }
      break;
    }

    case 'skills': {
      // Skills: Extract skill names from skills detail page
      const skillElements = document.querySelectorAll([
        'a[data-field="skill_card_skill_topic"] span[aria-hidden="true"]',
        '.pvs-list__paged-list-item .t-bold span[aria-hidden="true"]',
        'li[class*="pvs-list"] .t-bold span[aria-hidden="true"]',
      ].join(', '));
      skillElements.forEach((el) => addResult(el.textContent));
      break;
    }

    case 'experience': {
      // Experience: Extract company names and job titles
      listItems.forEach((item) => {
        // Look for the bold text (usually job title or company)
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        const boldText = boldEl?.textContent?.trim();

        // Look for company name (often in t-normal after bold)
        const normalEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        normalEls.forEach((el) => {
          const text = el.textContent?.trim();
          // Company names often have " · Full-time" etc suffix
          if (text?.includes(' · ')) {
            addResult(text.split(' · ')[0]);
          }
        });

        // Also add the bold text as it might be the company for grouped roles
        if (boldText && !boldText.toLowerCase().includes('present') &&
            !/^\d{4}/.test(boldText) && !/^\w{3} \d{4}/.test(boldText)) {
          addResult(boldText);
        }
      });
      break;
    }

    case 'education': {
      // Education: Extract school names, degrees, fields
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent); // School name

        // Degree and field often in secondary text
        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          // Skip date ranges
          if (text && !/^\d{4}\s*-/.test(text) && !/^\w{3} \d{4}/.test(text)) {
            addResult(text);
          }
        });
      });
      break;
    }

    case 'certifications': {
      // Certifications/Licenses: Extract cert names and issuers
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent); // Cert name

        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !text.startsWith('Issued') && !text.startsWith('Expires') &&
              !/^\w{3} \d{4}/.test(text)) {
            addResult(text); // Issuer
          }
        });
      });
      break;
    }

    case 'volunteering': {
      // Volunteering: Extract org names and roles
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent); // Role

        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !/^\w{3} \d{4}/.test(text) && !/^\d+\s*(yr|mo)/.test(text)) {
            addResult(text); // Organization
          }
        });
      });
      break;
    }

    case 'recommendations': {
      // Recommendations: Extract recommender names and snippets
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent); // Recommender name

        // Get recommendation text
        const textEl = item.querySelector('.inline-show-more-text span[aria-hidden="true"]');
        if (textEl?.textContent?.trim()) {
          addResult(textEl.textContent.trim().slice(0, 200)); // Limit length
        }
      });
      break;
    }

    case 'publications': {
      // Publications: Extract publication titles
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);

        // Publisher/journal
        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !/^\w{3} \d{4}/.test(text) && !/^\d{4}$/.test(text)) {
            addResult(text);
          }
        });
      });
      break;
    }

    case 'courses': {
      // Courses: Extract course names
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);
      });
      break;
    }

    case 'honors': {
      // Honors & Awards: Extract award names
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);

        // Issuer
        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !/^\w{3} \d{4}/.test(text) && !/^\d{4}$/.test(text)) {
            addResult(text);
          }
        });
      });
      break;
    }

    case 'languages': {
      // Languages: Extract language names and proficiency
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        const lang = boldEl?.textContent?.trim();

        const profEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const prof = profEl?.textContent?.trim();

        if (lang) {
          addResult(prof ? `${lang} (${prof})` : lang);
        }
      });
      break;
    }

    case 'organizations': {
      // Organizations: Extract org names and roles
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);

        const secondaryEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
        secondaryEls.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !/^\w{3} \d{4}/.test(text)) {
            addResult(text);
          }
        });
      });
      break;
    }

    case 'interests': {
      // Interests: Extract interest/topic names (companies, schools, groups, etc)
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);
      });

      // Also check for image-based interest items (influencers, companies)
      const entityItems = document.querySelectorAll('.entity-result__title-text a span[aria-hidden="true"]');
      entityItems.forEach((el) => addResult(el.textContent));
      break;
    }

    case 'testscores': {
      // Test Scores: Extract test names and scores
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        const testName = boldEl?.textContent?.trim();

        const scoreEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const score = scoreEl?.textContent?.trim();

        if (testName) {
          addResult(score ? `${testName}: ${score}` : testName);
        }
      });
      break;
    }

    case 'services': {
      // Services: Extract service names
      listItems.forEach((item) => {
        const boldEl = item.querySelector('.t-bold span[aria-hidden="true"]');
        addResult(boldEl?.textContent);
      });

      // Services might also be in a different format
      const serviceCards = document.querySelectorAll('.services-section-card span[aria-hidden="true"]');
      serviceCards.forEach((el) => addResult(el.textContent));
      break;
    }
  }

  console.log(`[Social Recall] Extracted ${results.length} ${extractorType} items`);
  return results;
}

function setupScrapeListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ScrapeResponse) => void
    ): boolean => {
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as ScrapeRequest).type === 'SCRAPE_SUBPAGE'
      ) {
        const req = message as ScrapeRequest;
        scrapeSubpage(req.url, req.extractorType)
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true; // Keep channel open for async response
      }
      return false;
    }
  );
}

// Auto-initialize when running in browser (not in tests)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessageExternal) {
  setupAuthListener();
  setupContextMenu();
  setupScrapeListener();
}
