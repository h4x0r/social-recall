/**
 * Social Recall Settings - Simplified Design
 *
 * Clickable account rows and privacy link.
 * No Web App URL config, no export/import.
 */

import { hasConsent, revokeConsent, getConsent } from './consent';

const WEB_APP_URL = 'https://www.socialrecall.now';

document.addEventListener('DOMContentLoaded', async () => {
  const googleRow = document.getElementById('googleRow') as HTMLElement;
  const googleStatus = document.getElementById('googleStatus') as HTMLElement;
  const disconnectRow = document.getElementById('disconnectRow') as HTMLElement;
  const privacyRow = document.getElementById('privacyRow') as HTMLElement;
  const revokeRow = document.getElementById('revokeRow') as HTMLElement;
  const revokeStatus = document.getElementById('revokeStatus') as HTMLElement;

  let isConnected = false;
  let showingDisconnect = false;

  // Check initial auth state and consent state
  await refreshAuthState();
  await refreshConsentState();

  // Google row click handler
  googleRow.addEventListener('click', () => {
    if (!isConnected) {
      // Not connected - initiate OAuth
      chrome.tabs.create({ url: `${WEB_APP_URL}/auth/extension` });
    } else {
      // Connected - toggle disconnect option
      showingDisconnect = !showingDisconnect;
      disconnectRow.style.display = showingDisconnect ? 'flex' : 'none';

      if (showingDisconnect) {
        googleRow.classList.add('settings__row--expanded');
      } else {
        googleRow.classList.remove('settings__row--expanded');
      }
    }
  });

  // Disconnect click handler
  disconnectRow.addEventListener('click', () => {
    chrome.storage.sync.remove(['syncToken'], () => {
      isConnected = false;
      showingDisconnect = false;
      disconnectRow.style.display = 'none';
      googleRow.classList.remove('settings__row--connected', 'settings__row--expanded');
      googleStatus.textContent = 'Not connected';
    });
  });

  // Privacy row click handler
  privacyRow.addEventListener('click', () => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/privacy` });
  });

  // Revoke consent click handler
  revokeRow.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you sure you want to revoke consent?\n\n' +
      'This will stop all data collection and server sync. ' +
      'Your existing data will remain until you request deletion.'
    );

    if (confirmed) {
      try {
        await revokeConsent(WEB_APP_URL);
        await refreshConsentState();
      } catch (error) {
        console.error('Failed to revoke consent:', error);
        alert('Failed to revoke consent. Please try again.');
      }
    }
  });

  // Listen for auth success messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTH_SUCCESS') {
      refreshAuthState();
    }
  });

  async function refreshAuthState(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['syncToken'], (result: { syncToken?: string }) => {
        isConnected = !!result.syncToken;
        if (isConnected) {
          googleRow.classList.add('settings__row--connected');
          googleStatus.textContent = 'Connected';
        } else {
          googleRow.classList.remove('settings__row--connected');
          googleStatus.textContent = 'Not connected';
        }
        resolve();
      });
    });
  }

  async function refreshConsentState(): Promise<void> {
    const consent = await getConsent();
    const hasActiveConsent = await hasConsent();

    if (!consent) {
      // No consent record at all
      revokeRow.classList.add('settings__row--disabled');
      revokeStatus.textContent = 'No consent given';
    } else if (hasActiveConsent) {
      // Active consent
      revokeRow.classList.remove('settings__row--disabled');
      revokeRow.classList.add('settings__row--warning');
      revokeStatus.textContent = 'Click to revoke';
    } else {
      // Consent was revoked
      revokeRow.classList.add('settings__row--disabled');
      revokeStatus.textContent = 'Consent revoked';
    }
  }
});
