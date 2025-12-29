/**
 * Social Recall Popup - Simplified Design
 *
 * Shows recent profiles and single dashboard action.
 * No stats, no sync button - sync happens automatically in background.
 */

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

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const recentList = document.getElementById('recentList') as HTMLElement;
  const dashboardBtn = document.getElementById('dashboardBtn') as HTMLButtonElement;

  // Load recent profiles
  await loadRecentProfiles();

  // Dashboard button
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: WEB_APP_URL });
  });

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

  function getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
});
