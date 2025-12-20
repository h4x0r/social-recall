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

document.addEventListener('DOMContentLoaded', (): void => {
  const exportDataButton = document.getElementById('exportData') as HTMLElement;
  const importDataButton = document.getElementById('importData') as HTMLElement;

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