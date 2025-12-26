/**
 * Background script for Chrome extension
 * Handles external messages from web app for auth token flow
 */

// Allowed origins for receiving auth tokens
export const WEB_APP_ORIGINS = [
  'http://localhost:3000',
  'https://socialrecall.now',
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
 * Set up listener for SPA navigation on LinkedIn
 * Uses webNavigation API which is more reliable than content script interception
 */
export function setupNavigationListener(): void {
  // Listen for SPA navigation (history.pushState/replaceState)
  chrome.webNavigation.onHistoryStateUpdated.addListener(
    (details) => {
      // Only handle main frame navigation
      if (details.frameId !== 0) return;

      console.log('[Social Recall BG] SPA navigation detected:', details.url);

      // Send message to content script
      chrome.tabs.sendMessage(details.tabId, {
        type: 'URL_CHANGED',
        url: details.url,
      }).catch(() => {
        // Content script might not be ready yet, ignore errors
      });
    },
    { url: [{ hostContains: 'linkedin.com' }] }
  );

  console.log('[Social Recall BG] Navigation listener set up');
}

/**
 * Enable silent auto-update when new version is available
 */
function setupAutoUpdate(): void {
  chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('[Social Recall BG] Update available, reloading...');
    chrome.runtime.reload();
  });
}

// Auto-initialize when running in browser (not in tests)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessageExternal) {
  setupAuthListener();
  setupContextMenu();
  setupAutoUpdate();
  // webNavigation may not be available in all contexts
  if (chrome.webNavigation?.onHistoryStateUpdated) {
    setupNavigationListener();
  }
}
