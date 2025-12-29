/**
 * Social Recall Settings - Art Deco Style
 */

import {
  isLoggedIn,
  clearSyncToken,
  getWebAppUrl,
  setWebAppUrl,
  getUserInfo,
} from './sync';
import { handleConnect, setupAuthMessageListener } from './popup-auth';
import { getConsent, revokeConsent, grantConsent, type ConsentRecord } from './consent';

interface SocialNote {
  name: string;
  text?: string;
  employers?: { company: string; logo: string }[];
}

interface SocialNotes {
  [profileId: string]: SocialNote;
}

interface StorageResult {
  socialNotes?: SocialNotes;
}

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const googleAccount = document.getElementById('googleAccount') as HTMLElement;
  const googleEmail = document.getElementById('googleEmail') as HTMLElement;
  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
  const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  const importBtn = document.getElementById('importBtn') as HTMLButtonElement;
  const webAppUrlInput = document.getElementById('webAppUrl') as HTMLInputElement;
  const saveUrlBtn = document.getElementById('saveUrlBtn') as HTMLButtonElement;

  // Initialize UI
  await updateUI();

  // Load saved web app URL
  const savedUrl = await getWebAppUrl();
  if (webAppUrlInput) {
    webAppUrlInput.value = savedUrl;
  }

  // Save web app URL
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener('click', async () => {
      const url = webAppUrlInput.value.trim();
      if (url) {
        await setWebAppUrl(url);
        showToast('Web app URL saved!', 'success');
      }
    });
  }

  // Connect button
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      handleConnect();
      showToast('Opening Social Recall...', 'info');
    });
  }

  // Listen for auth success from background script
  setupAuthMessageListener(async () => {
    await updateUI();
    showToast('Connected to Social Recall!', 'success');
  });

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await clearSyncToken();
      await updateUI();
      showToast('Disconnected from Social Recall', 'info');
    });
  }

  // Export button
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  // Import button
  if (importBtn) {
    importBtn.addEventListener('click', importData);
  }

  // Consent management
  const consentStatus = document.getElementById('consentStatus') as HTMLElement;
  const revokeConsentBtn = document.getElementById('revokeConsentBtn') as HTMLButtonElement;
  const grantConsentBtn = document.getElementById('grantConsentBtn') as HTMLButtonElement;

  await updateConsentUI();

  if (revokeConsentBtn) {
    revokeConsentBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to revoke your consent? This will stop data collection to our servers.')) {
        await revokeConsent();
        await updateConsentUI();
        showToast('Consent revoked. Data collection stopped.', 'info');
      }
    });
  }

  if (grantConsentBtn) {
    grantConsentBtn.addEventListener('click', async () => {
      try {
        const apiUrl = await getWebAppUrl();
        await grantConsent(apiUrl);
        await updateConsentUI();
        showToast('Consent granted. Data collection enabled.', 'success');
      } catch (error) {
        showToast('Failed to grant consent. Please try again.', 'error');
      }
    });
  }

  async function updateConsentUI(): Promise<void> {
    const consent = await getConsent();

    if (!consent) {
      // No consent record exists
      if (consentStatus) consentStatus.textContent = 'No consent given yet';
      if (revokeConsentBtn) revokeConsentBtn.style.display = 'none';
      if (grantConsentBtn) grantConsentBtn.style.display = 'flex';
    } else if (consent.given) {
      // Active consent
      const date = new Date(consent.timestamp).toLocaleDateString();
      if (consentStatus) consentStatus.textContent = `Consent granted on ${date}`;
      if (revokeConsentBtn) revokeConsentBtn.style.display = 'flex';
      if (grantConsentBtn) grantConsentBtn.style.display = 'none';
    } else {
      // Consent was revoked
      const revokedDate = consent.revokedAt ? new Date(consent.revokedAt).toLocaleDateString() : 'unknown date';
      if (consentStatus) consentStatus.textContent = `Consent revoked on ${revokedDate}`;
      if (revokeConsentBtn) revokeConsentBtn.style.display = 'none';
      if (grantConsentBtn) grantConsentBtn.style.display = 'flex';
    }
  }

  async function updateUI(): Promise<void> {
    const loggedIn = await isLoggedIn();

    if (connectBtn) connectBtn.style.display = loggedIn ? 'none' : 'flex';
    if (logoutBtn) logoutBtn.style.display = loggedIn ? 'flex' : 'none';

    if (loggedIn) {
      googleAccount?.classList.add('settings__account--connected');

      // Try to get user info
      const userInfo = await getUserInfo();
      if (userInfo && googleEmail) {
        googleEmail.textContent = userInfo.email;
      } else if (googleEmail) {
        googleEmail.textContent = 'Connected';
      }
    } else {
      googleAccount?.classList.remove('settings__account--connected');
      if (googleEmail) {
        googleEmail.textContent = 'Not connected';
      }
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info'): void {
    // Remove existing toasts
    const existingToast = document.querySelector('.settings__toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `settings__toast settings__toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function exportData(): void {
    chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
      const socialNotes: SocialNotes = result.socialNotes || {};
      const csvRows: string[] = [];

      csvRows.push(['ProfileId', 'PersonName', 'Notes', 'Companies'].join(','));

      Object.keys(socialNotes).forEach((profileId: string): void => {
        const profile: SocialNote = socialNotes[profileId];

        if (!profile) {
          return;
        }

        const personName: string = `"${(profile.name || '').replace(/"/g, '""')}"`;
        const notes: string = `"${(profile.text || '').replace(/"/g, '""')}"`;
        let companies: string = '';
        if (profile.employers && profile.employers.length) {
          companies = `"${profile.employers.map((e) => e.company || '').join('; ').replace(/"/g, '""')}"`;
        }
        csvRows.push([profileId, personName, notes, companies].join(','));
      });

      if (csvRows.length <= 1) {
        showToast('No profile data found to export', 'error');
        return;
      }

      const csvContent: string = csvRows.join('\n');
      const blob: Blob = new Blob([csvContent], { type: 'text/csv' });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `social-recall-backup-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Exported ${csvRows.length - 1} profiles`, 'success');
    });
  }

  function importData(): void {
    const input: HTMLInputElement = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = (e: Event): void => {
      const target = e.target as HTMLInputElement;
      const file: File | undefined = target.files?.[0];

      if (!file) return;

      const reader: FileReader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>): void => {
        try {
          const csvContent: string = event.target?.result as string;
          const rows: string[] = csvContent.split('\n');

          chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
            const socialNotes: SocialNotes = result.socialNotes || {};
            let importCount: number = 0;

            for (let i = 1; i < rows.length; i++) {
              const row: string = rows[i].trim();
              if (!row) continue;

              // Parse CSV with proper quote handling
              const fields: string[] = [];
              let inQuotes = false;
              let currentField = '';

              for (let j = 0; j < row.length; j++) {
                const char = row[j];
                if (char === '"') {
                  if (j + 1 < row.length && row[j + 1] === '"') {
                    currentField += '"';
                    j++;
                  } else {
                    inQuotes = !inQuotes;
                  }
                } else if (char === ',' && !inQuotes) {
                  fields.push(currentField);
                  currentField = '';
                } else {
                  currentField += char;
                }
              }
              fields.push(currentField);

              const [profileId, personName, notes, companies] = fields;

              if (profileId) {
                socialNotes[profileId] = {
                  name: personName || '',
                  text: notes || '',
                };

                if (companies) {
                  const companyNames = companies.split(';').map((c) => c.trim()).filter((c) => c);
                  socialNotes[profileId].employers = companyNames.map((company) => ({
                    company,
                    logo: '',
                  }));
                }

                importCount++;
              }
            }

            chrome.storage.sync.set({ socialNotes }, (): void => {
              showToast(`Imported ${importCount} profiles`, 'success');
            });
          });
        } catch (error) {
          console.error('Import error:', error);
          showToast('Error importing CSV data', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }
});
