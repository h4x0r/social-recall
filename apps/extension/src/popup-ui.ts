/**
 * Popup UI Module - Simplified Design
 *
 * Displays recent profiles and single dashboard action.
 * No stats, no sync button - sync happens automatically.
 */

export interface PopupElements {
  element: HTMLElement;
  loadRecentProfiles: () => Promise<void>;
}

interface SocialNote {
  name: string;
  headline?: string;
  avatarUrl?: string;
  lastSeen?: string;
}

interface SocialNotes {
  [profileId: string]: SocialNote;
}

const WEB_APP_URL = 'https://www.socialrecall.now';

export function createPopup(container: HTMLElement): PopupElements {
  const element = document.createElement('div');
  element.className = 'popup';
  element.innerHTML = `
    <!-- Header -->
    <div class="popup__header">
      <div class="popup__logo">
        <span class="popup__diamond">◇</span>
        <span class="popup__title">Social Recall</span>
        <span class="popup__diamond">◇</span>
      </div>
      <a href="settings.html" class="popup__settings" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </a>
    </div>

    <!-- Recent Profiles -->
    <div class="popup__recent">
      <div class="popup__section-header">
        <span class="popup__label">RECENT</span>
      </div>
      <div class="popup__recent-list"></div>
    </div>

    <!-- Actions -->
    <div class="popup__actions">
      <button class="popup__btn popup__btn--primary" data-action="dashboard">
        Open Dashboard
      </button>
    </div>

    <!-- Footer -->
    <div class="popup__footer">
      <span class="popup__diamond-small">◇</span>
    </div>
  `;

  container.appendChild(element);

  // Dashboard button handler
  const dashboardBtn = element.querySelector('[data-action="dashboard"]') as HTMLButtonElement;
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: WEB_APP_URL });
  });

  const recentList = element.querySelector('.popup__recent-list') as HTMLElement;

  async function loadRecentProfiles(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['socialNotes'], (result: { socialNotes?: SocialNotes }) => {
        const notes = result.socialNotes || {};
        const profiles = Object.entries(notes);

        // Sort by lastSeen, most recent first
        profiles.sort((a, b) => {
          const aTime = a[1].lastSeen ? new Date(a[1].lastSeen).getTime() : 0;
          const bTime = b[1].lastSeen ? new Date(b[1].lastSeen).getTime() : 0;
          return bTime - aTime;
        });

        // Take top 5
        const recent = profiles.slice(0, 5);

        if (recent.length === 0) {
          recentList.innerHTML = `
            <div class="popup__recent-empty">
              <p>No profiles yet</p>
              <p style="margin-top: 4px; opacity: 0.7;">Visit LinkedIn to start tracking</p>
            </div>
          `;
          resolve();
          return;
        }

        recentList.innerHTML = recent
          .map(([profileId, note]) => {
            const initials = getInitials(note.name);
            const avatarHtml = note.avatarUrl
              ? `<img src="${note.avatarUrl}" alt="${note.name}">`
              : initials;

            return `
              <div class="popup__recent-item" data-profile-id="${profileId}">
                <div class="popup__recent-avatar">${avatarHtml}</div>
                <div class="popup__recent-info">
                  <div class="popup__recent-name">${note.name}</div>
                  <div class="popup__recent-meta">${note.headline || 'LinkedIn'}</div>
                </div>
              </div>
            `;
          })
          .join('');

        // Add click handlers to open LinkedIn profiles
        recentList.querySelectorAll('.popup__recent-item').forEach((item) => {
          item.addEventListener('click', () => {
            const profileId = item.getAttribute('data-profile-id');
            if (profileId) {
              chrome.tabs.create({ url: `https://linkedin.com/in/${profileId}` });
            }
          });
        });

        resolve();
      });
    });
  }

  return {
    element,
    loadRecentProfiles,
  };
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
