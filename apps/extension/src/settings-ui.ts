/**
 * Settings UI Module - Simplified Design
 *
 * Clickable account rows and privacy link.
 * No Web App URL config, no export/import.
 */

export interface SettingsElements {
  element: HTMLElement;
  refreshAuthState: () => Promise<void>;
}

const WEB_APP_URL = 'https://www.socialrecall.now';

export function createSettings(container: HTMLElement): SettingsElements {
  const element = document.createElement('div');
  element.className = 'settings';

  let isConnected = false;
  let showingDisconnect = false;

  element.innerHTML = `
    <!-- Header -->
    <div class="settings__header">
      <div class="settings__logo">
        <span class="settings__diamond">◇</span>
        <span class="settings__title">Settings</span>
        <span class="settings__diamond">◇</span>
      </div>
    </div>

    <!-- Account Rows -->
    <div class="settings__rows">
      <!-- Google Account -->
      <div class="settings__account-row" data-account="google">
        <div class="settings__account-icon settings__account-icon--google">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div class="settings__account-info">
          <div class="settings__account-name">Google</div>
          <div class="settings__account-status">Not connected</div>
        </div>
        <div class="settings__account-arrow">→</div>
      </div>

      <!-- Disconnect Action (hidden by default) -->
      <div class="settings__disconnect-row" data-action="disconnect" style="display: none;">
        <span class="settings__disconnect-text">Disconnect Account</span>
      </div>

      <!-- iCloud Account (Coming Soon) -->
      <div class="settings__account-row settings__account-row--disabled" data-account="icloud">
        <div class="settings__account-icon settings__account-icon--icloud">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#999">
            <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
          </svg>
        </div>
        <div class="settings__account-info">
          <div class="settings__account-name">iCloud</div>
          <div class="settings__account-status">Coming soon</div>
        </div>
        <span class="settings__badge">Soon</span>
      </div>

      <!-- Privacy & Data -->
      <div class="settings__account-row" data-action="privacy">
        <div class="settings__account-icon settings__account-icon--privacy">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div class="settings__account-info">
          <div class="settings__account-name">Privacy & Data</div>
          <div class="settings__account-status">Manage consent</div>
        </div>
        <div class="settings__account-arrow">→</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="settings__footer">
      <span class="settings__diamond-small">◇</span>
    </div>
  `;

  container.appendChild(element);

  const googleRow = element.querySelector('[data-account="google"]') as HTMLElement;
  const disconnectRow = element.querySelector('[data-action="disconnect"]') as HTMLElement;
  const privacyRow = element.querySelector('[data-action="privacy"]') as HTMLElement;
  const googleStatus = googleRow.querySelector('.settings__account-status') as HTMLElement;

  // Google row click handler
  googleRow.addEventListener('click', () => {
    if (!isConnected) {
      // Not connected - initiate OAuth
      chrome.tabs.create({ url: `${WEB_APP_URL}/auth/extension` });
    } else {
      // Connected - toggle disconnect option
      showingDisconnect = !showingDisconnect;
      disconnectRow.style.display = showingDisconnect ? 'flex' : 'none';
    }
  });

  // Disconnect click handler
  disconnectRow.addEventListener('click', () => {
    chrome.storage.sync.remove(['syncToken'], () => {
      isConnected = false;
      showingDisconnect = false;
      disconnectRow.style.display = 'none';
      googleRow.classList.remove('settings__account-row--connected');
      googleStatus.textContent = 'Not connected';
    });
  });

  // Privacy row click handler
  privacyRow.addEventListener('click', () => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/privacy` });
  });

  async function refreshAuthState(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['syncToken'], (result: { syncToken?: string }) => {
        isConnected = !!result.syncToken;
        if (isConnected) {
          googleRow.classList.add('settings__account-row--connected');
          googleStatus.textContent = 'Connected';
        } else {
          googleRow.classList.remove('settings__account-row--connected');
          googleStatus.textContent = 'Not connected';
        }
        resolve();
      });
    });
  }

  return {
    element,
    refreshAuthState,
  };
}
