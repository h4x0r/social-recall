document.addEventListener('DOMContentLoaded', () => {
  // Export data
  document.getElementById('exportData').addEventListener('click', () => {
    chrome.storage.sync.get(['socialNotes'], (result) => {
      console.log('Retrieved data from storage:', result);
      
      const socialNotes = result.socialNotes || {};
      console.log('Social notes to export:', socialNotes);
      
      // Convert data to CSV format
      const csvRows = [];
      
      // CSV Header
      csvRows.push(['ProfileId', 'PersonName', 'Notes', 'Companies'].join(','));
      
      // For each profile in the data
      Object.keys(socialNotes).forEach(profileId => {
        console.log('Processing profile:', profileId);
        const profile = socialNotes[profileId];
        
        if (!profile) {
          console.log('No data for profile:', profileId);
          return; // Skip this profile
        }
        
        // Escape any commas within fields by wrapping in quotes
        const personName = `"${(profile.name || '').replace(/"/g, '""')}"`;
        const notes = `"${(profile.text || '').replace(/"/g, '""')}"`;
        
        // Handle employers data (company names)
        let companies = '';
        if (profile.employers && profile.employers.length) {
          companies = `"${profile.employers.map(e => e.company || '').join('; ').replace(/"/g, '""')}"`;
        }
        
        csvRows.push([profileId, personName, notes, companies].join(','));
      });
      
      // If no data rows were added (only header exists)
      if (csvRows.length <= 1) {
        console.log('No profile data found to export');
        alert('No profile data found to export. Please save some LinkedIn profiles first.');
        return;
      }
      
      // Join rows with newlines to create full CSV content
      const csvContent = csvRows.join('\n');
      console.log('CSV content created with', csvRows.length, 'rows');
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-recall-backup-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // Import data
  document.getElementById('importData').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvContent = event.target.result;
          const rows = csvContent.split('\n');
          
          // Retrieve existing notes first
          chrome.storage.sync.get(['socialNotes'], (result) => {
            const socialNotes = result.socialNotes || {};
            
            // Process CSV rows (skip header)
            for (let i = 1; i < rows.length; i++) {
              // Handle CSV parsing with possible quoted fields containing commas
              let row = rows[i].trim();
              if (!row) continue; // Skip empty rows
              
              // Parse CSV with respect for quoted fields
              const fields = [];
              let inQuotes = false;
              let currentField = '';
              
              for (let j = 0; j < row.length; j++) {
                const char = row[j];
                
                if (char === '"') {
                  if (j + 1 < row.length && row[j + 1] === '"') {
                    // Handle escaped quotes (two double-quotes)
                    currentField += '"';
                    j++; // Skip the next quote
                  } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                  }
                } else if (char === ',' && !inQuotes) {
                  // End of field
                  fields.push(currentField);
                  currentField = '';
                } else {
                  currentField += char;
                }
              }
              
              // Add the last field
              fields.push(currentField);
              
              // Process the fields
              const [profileId, personName, notes, companies] = fields;
              
              if (profileId) {
                // Create profile object in the correct structure
                socialNotes[profileId] = {
                  name: personName || '',
                  text: notes || ''
                };
                
                // Handle employers if present
                if (companies) {
                  const companyNames = companies.split(';').map(c => c.trim()).filter(c => c);
                  socialNotes[profileId].employers = companyNames.map(company => ({ 
                    company,
                    logo: '' // No logos in CSV import, will need to be re-extracted
                  }));
                }
              }
            }
            
            // Save updated notes back to storage
            chrome.storage.sync.set({ socialNotes: socialNotes }, () => {
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
