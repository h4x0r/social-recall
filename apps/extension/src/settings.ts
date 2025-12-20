import {
  syncAllContacts,
  isLoggedIn,
  getSyncToken,
  setSyncToken,
  clearSyncToken,
  openLoginPage,
  getWebAppUrl,
  setWebAppUrl,
} from './sync';

interface SocialNote {
  name: string;
  text: string;
  employers?: Employer[];
}

interface Employer {
  company: string;
  logo: string;
}

type SocialNotes = Record<string, SocialNote>;

interface StorageResult {
  socialNotes?: SocialNotes;
}

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const exportDataButton = document.getElementById('exportData') as HTMLElement;
  const importDataButton = document.getElementById('importData') as HTMLElement;
  const syncButton = document.getElementById('syncButton') as HTMLButtonElement;
  const connectButton = document.getElementById('connectButton') as HTMLButtonElement;
  const disconnectButton = document.getElementById('disconnectButton') as HTMLButtonElement;
  const syncStatus = document.getElementById('syncStatus') as HTMLElement;
  const webAppUrlInput = document.getElementById('webAppUrl') as HTMLInputElement;
  const saveUrlButton = document.getElementById('saveUrlButton') as HTMLButtonElement;

  // Initialize sync UI
  await updateSyncUI();

  // Load saved web app URL
  const savedUrl = await getWebAppUrl();
  if (webAppUrlInput) {
    webAppUrlInput.value = savedUrl;
  }

  // Save web app URL
  if (saveUrlButton) {
    saveUrlButton.addEventListener('click', async () => {
      const url = webAppUrlInput.value.trim();
      if (url) {
        await setWebAppUrl(url);
        showStatus('Web app URL saved!', 'success');
      }
    });
  }

  // Connect button - open web app for login
  if (connectButton) {
    connectButton.addEventListener('click', () => {
      openLoginPage();
      showStatus('Opening Social Recall... Complete login then paste your token below.', 'info');
    });
  }

  // Disconnect button
  if (disconnectButton) {
    disconnectButton.addEventListener('click', async () => {
      await clearSyncToken();
      await updateSyncUI();
      showStatus('Disconnected from Social Recall', 'info');
    });
  }

  // Sync button
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      syncButton.disabled = true;
      syncButton.textContent = 'Syncing...';
      showStatus('Syncing contacts...', 'info');

      const result = await syncAllContacts();

      syncButton.disabled = false;
      syncButton.textContent = 'Sync Now';

      if (result.success) {
        showStatus(`Synced ${result.synced} contacts successfully!`, 'success');
      } else {
        showStatus(`Sync failed: ${result.error}`, 'error');
      }
    });
  }

  // Listen for token input (manual paste)
  const tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
  const saveTokenButton = document.getElementById('saveTokenButton') as HTMLButtonElement;

  if (saveTokenButton && tokenInput) {
    saveTokenButton.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (token) {
        await setSyncToken(token);
        tokenInput.value = '';
        await updateSyncUI();
        showStatus('Connected to Social Recall!', 'success');
      }
    });
  }

  async function updateSyncUI(): Promise<void> {
    const loggedIn = await isLoggedIn();

    if (syncButton) syncButton.style.display = loggedIn ? 'block' : 'none';
    if (disconnectButton) disconnectButton.style.display = loggedIn ? 'block' : 'none';
    if (connectButton) connectButton.style.display = loggedIn ? 'none' : 'block';

    const tokenSection = document.getElementById('tokenSection');
    if (tokenSection) tokenSection.style.display = loggedIn ? 'none' : 'block';

    if (syncStatus) {
      syncStatus.textContent = loggedIn ? 'Connected to Social Recall' : 'Not connected';
      syncStatus.className = loggedIn ? 'status-connected' : 'status-disconnected';
    }
  }

  function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    if (syncStatus) {
      syncStatus.textContent = message;
      syncStatus.className = `status-${type}`;
    }
  }

  exportDataButton.addEventListener('click', (): void => {
    chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
      console.log('Retrieved data from storage:', result);

      const socialNotes: SocialNotes = result.socialNotes || {};
      console.log('Social notes to export:', socialNotes);

      const csvRows: string[] = [];

      csvRows.push(['ProfileId', 'PersonName', 'Notes', 'Companies'].join(','));

      Object.keys(socialNotes).forEach((profileId: string): void => {
        console.log('Processing profile:', profileId);
        const profile: SocialNote = socialNotes[profileId];

        if (!profile) {
          console.log('No data for profile:', profileId);
          return;
        }

        const personName: string = `"${(profile.name || '').replace(/"/g, '""')}"`;
        const notes: string = `"${(profile.text || '').replace(/"/g, '""')}"`;

        let companies: string = '';
        if (profile.employers && profile.employers.length) {
          companies = `"${profile.employers.map((e: Employer) => e.company || '').join('; ').replace(/"/g, '""')}"`;
        }

        csvRows.push([profileId, personName, notes, companies].join(','));
      });

      if (csvRows.length <= 1) {
        console.log('No profile data found to export');
        alert('No profile data found to export. Please save some LinkedIn profiles first.');
        return;
      }

      const csvContent: string = csvRows.join('\n');
      console.log('CSV content created with', csvRows.length, 'rows');

      const blob: Blob = new Blob([csvContent], { type: 'text/csv' });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `social-recall-backup-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  importDataButton.addEventListener('click', (): void => {
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

            for (let i = 1; i < rows.length; i++) {
              let row: string = rows[i].trim();
              if (!row) continue;

              const fields: string[] = [];
              let inQuotes: boolean = false;
              let currentField: string = '';

              for (let j = 0; j < row.length; j++) {
                const char: string = row[j];

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
                  text: notes || ''
                };

                if (companies) {
                  const companyNames: string[] = companies.split(';').map((c: string) => c.trim()).filter((c: string) => c);
                  socialNotes[profileId].employers = companyNames.map((company: string): Employer => ({
                    company,
                    logo: ''
                  }));
                }
              }
            }

            chrome.storage.sync.set({ socialNotes: socialNotes }, (): void => {
              alert('Data imported successfully from CSV!');
            });
          });
        } catch (error) {
          console.error('Import error:', error);
          alert('Error importing CSV data. Please make sure the file is valid.');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  });
});