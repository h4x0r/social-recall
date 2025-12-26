/**
 * Popup auth module for managing connection status with web app
 */

// Auth status constants
export const AUTH_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];

// Web app auth URL (matches background.ts origins)
const WEB_APP_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://socialrecall.now'
    : 'http://localhost:3000';

export const WEB_APP_AUTH_URL = `${WEB_APP_BASE_URL}/auth/extension`;

interface StorageResult {
  syncToken?: string;
}

/**
 * Get current auth status
 */
export function getAuthStatus(): Promise<AuthStatus> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['syncToken'], (result: StorageResult) => {
      const token = result.syncToken;
      if (token && token.length > 0) {
        resolve(AUTH_STATUS.CONNECTED);
      } else {
        resolve(AUTH_STATUS.DISCONNECTED);
      }
    });
  });
}

/**
 * Open web app login page for authentication
 */
export function handleConnect(): void {
  chrome.tabs.create({ url: WEB_APP_AUTH_URL });
}

/**
 * Clear auth token and disconnect
 */
export function handleDisconnect(): Promise<AuthStatus> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(['syncToken'], () => {
      resolve(AUTH_STATUS.DISCONNECTED);
    });
  });
}

/**
 * Set up listener for AUTH_SUCCESS messages from background script
 */
export function setupAuthMessageListener(
  onAuthSuccess: () => void
): void {
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      (message as Record<string, unknown>).type === 'AUTH_SUCCESS'
    ) {
      onAuthSuccess();
    }
  });
}
