/**
 * Social Recall Popup - Art Deco Style
 * Shows connection status, stats, recent profiles, and extraction progress
 */

import { syncAllContacts, isLoggedIn, getWebAppUrl } from './sync';

interface SocialNote {
  name: string;
  text?: string;
  headline?: string;
  avatarUrl?: string;
  lastSeen?: string;
}

interface SocialNotes {
  [profileId: string]: SocialNote;
}

interface StorageResult {
  socialNotes?: SocialNotes;
  syncToken?: string;
}

interface ExtractionProgress {
  step: string;
  stepLabel: string;
  progress: number;
  elapsed: number;
  timestamp: number;
  profileId?: string;
  durationMs?: number;
}

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const statusDot = document.querySelector('.popup__status-dot') as HTMLElement;
  const statusText = document.getElementById('statusText') as HTMLElement;
  const profileCount = document.getElementById('profileCount') as HTMLElement;
  const newCount = document.getElementById('newCount') as HTMLElement;
  const recentList = document.getElementById('recentList') as HTMLElement;
  const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement;
  const webAppBtn = document.getElementById('webAppBtn') as HTMLButtonElement;

  // Progress elements
  const progressSection = document.getElementById('progressSection') as HTMLElement;
  const progressLabel = document.getElementById('progressLabel') as HTMLElement;
  const progressTime = document.getElementById('progressTime') as HTMLElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;

  let lastProgressTimestamp = 0;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  // Poll for extraction progress from storage
  function checkProgress(): void {
    chrome.storage.local.get(['extractionProgress'], (result) => {
      const progress = result.extractionProgress as ExtractionProgress | undefined;

      if (!progress || progress.timestamp === lastProgressTimestamp) {
        return;
      }

      lastProgressTimestamp = progress.timestamp;

      // Only show progress if it's recent (within last 30 seconds)
      const isRecent = Date.now() - progress.timestamp < 30000;

      if (!isRecent) {
        progressSection.style.display = 'none';
        return;
      }

      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      progressSection.style.display = 'block';
      progressLabel.textContent = progress.stepLabel;
      progressTime.textContent = `${(progress.elapsed / 1000).toFixed(1)}s`;
      progressFill.style.width = `${Math.round(progress.progress * 100)}%`;

      if (progress.step === 'complete') {
        progressSection.classList.add('popup__progress--complete');

        // Hide after 3 seconds
        hideTimeout = setTimeout(() => {
          progressSection.style.display = 'none';
          progressSection.classList.remove('popup__progress--complete');
          progressFill.style.width = '0%';
        }, 3000);

        // Refresh stats and recent profiles
        loadStats();
        loadRecentProfiles();
      } else {
        progressSection.classList.remove('popup__progress--complete');
      }
    });
  }

  // Check progress immediately and every 500ms
  checkProgress();
  setInterval(checkProgress, 500);

  // Check connection status
  const connected = await isLoggedIn();
  updateConnectionStatus(connected);

  // Load stats and recent profiles
  await loadStats();
  await loadRecentProfiles();

  // Sync button
  syncBtn.addEventListener('click', async () => {
    if (!connected) {
      // Open web app for login
      const webAppUrl = await getWebAppUrl();
      chrome.tabs.create({ url: `${webAppUrl}/auth/extension` });
      return;
    }

    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="popup__btn-icon">↻</span> Syncing...';

    const result = await syncAllContacts();

    if (result.success) {
      syncBtn.innerHTML = '<span class="popup__btn-icon">✓</span> Synced!';
      setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<span class="popup__btn-icon">↻</span> Sync Now';
      }, 2000);
    } else {
      syncBtn.innerHTML = '<span class="popup__btn-icon">✕</span> Failed';
      setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<span class="popup__btn-icon">↻</span> Sync Now';
      }, 2000);
    }
  });

  // Web app button
  webAppBtn.addEventListener('click', async () => {
    const webAppUrl = await getWebAppUrl();
    chrome.tabs.create({ url: webAppUrl });
  });

  function updateConnectionStatus(isConnected: boolean): void {
    if (isConnected) {
      statusDot.classList.add('popup__status-dot--connected');
      statusText.textContent = 'Connected to Social Recall';
      statusText.classList.add('popup__status-text--connected');
      syncBtn.innerHTML = '<span class="popup__btn-icon">↻</span> Sync Now';
    } else {
      statusDot.classList.add('popup__status-dot--disconnected');
      statusText.textContent = 'Not connected';
      syncBtn.innerHTML = '<span class="popup__btn-icon">→</span> Connect';
    }
  }

  async function loadStats(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['socialNotes'], (result: StorageResult) => {
        const notes = result.socialNotes || {};
        const profiles = Object.keys(notes);
        const total = profiles.length;

        // Count profiles seen in last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let thisWeek = 0;
        profiles.forEach((id) => {
          const note = notes[id];
          if (note.lastSeen) {
            const lastSeen = new Date(note.lastSeen);
            if (lastSeen >= oneWeekAgo) {
              thisWeek++;
            }
          }
        });

        profileCount.textContent = total.toString();
        newCount.textContent = thisWeek.toString();
        resolve();
      });
    });
  }

  async function loadRecentProfiles(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['socialNotes'], (result: StorageResult) => {
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
