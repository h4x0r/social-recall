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

// Auto-initialize when running in browser (not in tests)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessageExternal) {
  setupAuthListener();
  setupContextMenu();
}
