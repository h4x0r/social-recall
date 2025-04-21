document.addEventListener('DOMContentLoaded', () => {
  const personNameInput = document.getElementById('personName');
  const notesInput = document.getElementById('notes');
  const saveButton = document.getElementById('saveButton');
  const notesList = document.getElementById('notesList');

  // Get the current active tab
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const tab = tabs?.[0];
    if (tab) {
      try {
        // First check if we're on a LinkedIn profile and extract profile info
        const profileInfo = await extractProfileInfo(tab.id);
        
        if (profileInfo && profileInfo.isLinkedInProfile && 
            profileInfo.name && profileInfo.name !== 'Unknown LinkedIn User' && 
            profileInfo.profileId) {
          // We're on a LinkedIn profile page with valid info
          saveButton.disabled = false;
          personNameInput.disabled = false;
          notesInput.disabled = false;
          
          // Store current profile ID for save function to use
          saveButton.dataset.profileId = profileInfo.profileId;
          
          // Store employers if available
          if (profileInfo.employers && profileInfo.employers.length > 0) {
            saveButton.dataset.employers = JSON.stringify(profileInfo.employers);
            
            // Display company logos
            displayCompanyLogos(profileInfo.employers);
          } else {
            saveButton.dataset.employers = '[]';
            // Clear any existing logos
            document.getElementById('companyLogosContainer').innerHTML = '';
          }
          
          // Fill in the name field
          personNameInput.value = profileInfo.name;
          
          // Load existing note for this profile ID
          loadNoteForProfileId(profileInfo.profileId);
        } else {
          // Not on a LinkedIn profile or couldn't get valid profile info
          showDefaultView();
        }
      } catch (error) {
        console.error('Error extracting profile info:', error);
        // Show default view if we can't get profile info
        showDefaultView();
      }
    } else {
      // No active tab
      showDefaultView();
    }
  });
  
  // Handle save button click
  saveButton.addEventListener('click', () => {
    const name = personNameInput.value.trim();
    const note = notesInput.value.trim();
    const profileId = saveButton.dataset.profileId;
    const employers = JSON.parse(saveButton.dataset.employers || '[]');
    
    if (!profileId) return;
    
    console.log('Saving data for profile:', profileId, 'Name:', name);
    
    chrome.storage.sync.get(['socialNotes'], (result) => {
      const notes = result.socialNotes || {};
      
      // Store the note using profileId as the key
      notes[profileId] = {
        name: name, // Store the name alongside the note for reference
        text: note,
        employers: employers
      };
      
      console.log('Profile data saved:', notes[profileId]);
      
      chrome.storage.sync.set({ socialNotes: notes }, () => {
        console.log('Information saved successfully');
      });
    });
  });
  
  // Function to extract profile info directly from the page
  async function extractProfileInfo(tabId) {
    // This function injects and executes code in the active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: async () => {
        // Function to extract LinkedIn profile ID from URL or page
        function extractProfileId() {
          // Try to get from URL first
          const urlRegex = /linkedin\.com\/in\/([^/]+)/;
          const urlMatch = urlRegex.exec(window.location.href);
          if (urlMatch) return urlMatch[1];

          // Fallback to meta tag
          const metaProfile = document.querySelector('meta[name="profile-id"]');
          return metaProfile?.content || null;
        }

        // Function to extract LinkedIn profile name from the page
        function extractProfileName() {
          // First try to get the name from the document title
          const title = document.title;
          if (title) {
            // LinkedIn titles are usually in format "Name - [Something] | LinkedIn"
            // or sometimes just "Name | LinkedIn"
            const titleParts = title.split(/\s[\|\-]\s|\s\||\s\-\s/);
            if (titleParts.length > 0 && titleParts[0].trim()) {
              return titleParts[0].trim();
            }
          }
          
          // Fallback to meta title tag if exists
          const metaTitle = document.querySelector('meta[property="og:title"]');
          if (metaTitle?.content) {
            const metaTitleParts = metaTitle.content.split(/\s[\|\-]\s|\s\||\s\-\s/);
            if (metaTitleParts.length > 0 && metaTitleParts[0].trim()) {
              return metaTitleParts[0].trim();
            }
          }
          
          return 'Unknown LinkedIn User';
        }

        // Function to extract employers in chronological order
        async function extractEmployers() {
          // Array to store employer information
          const employers = [];
          
          try {
            console.log('Looking for Experience section');
            
            // First, find the Experience section by looking for headers
            const experienceHeaders = Array.from(document.querySelectorAll('h2, section h1, .pv-profile-section__header-text, .pvs-header__title'))
              .filter(el => el.textContent.trim().toLowerCase().includes('experience'));
              
            if (experienceHeaders.length > 0) {
              console.log('Found Experience section');
              
              // Get the first experience header and its section
              const header = experienceHeaders[0];
              let section = header.closest('section') || header.parentElement;
              
              if (section) {
                console.log('Looking for company logos within Experience section');
                
                // Find potential employers within the Experience section
                const experienceItems = section.querySelectorAll('li, .pvs-entity, .pv-entity, .profile-section-card');
                //console.log(`Found ${experienceItems.length} potential experience items`);
                
                // Process each experience item
                for (const element of experienceItems) {
                  const item = element;
                  //console.log(`Processing experience item ${index + 1}`);
                  
                  // Look for 48x48 images that might be company logos
                  const logoImg = item.querySelector('img[width="48"], img[height="48"], .ivm-view-attr__ghost-entity'); // Safe to assume within Experience section, all 48x48 images are company logos
                  
                  if (logoImg) {
                    console.log(`Found potential company logo image: ${logoImg.src || 'no src'}`);
                    
                    function extractCommentTextFromSpans(spans) {
                      for (const span of spans) {
                        // Check HTML content for the pattern
                        const html = span.innerHTML;
                        const commentPattern = /<!---->([^<>]+)<!---->/;
                        const match = html.match(commentPattern);
                        return match ? match[1].trim() : null;
                      }
                    }

                    function extractFirstPartBeforeMiddleDot(string) {
                          let dotIndex = string.indexOf(' ' + String.fromCharCode(0xB7) + ' ');
                          
                          // If we found any separator, trim the text
                          if (dotIndex !== -1)
                            string = string.substring(0, dotIndex).trim();
                          
                          return string;
                    }

                    const commentText1 = extractCommentTextFromSpans(item.querySelectorAll('span[aria-hidden="true"]'));
                    if (commentText1)
                      console.log(`Found first line after logo in aria-hidden span: "${commentText1}"`);
                    let companyName = commentText1;

                    const commentText2 = extractCommentTextFromSpans(item.querySelectorAll('.t-14.t-normal'));
                    if (commentText2)
                      console.log(`Found second line after logo in aria-hidden span: "${commentText2}"`);
                    if (!commentText2.match('[0-9] mo'))
                      companyName = extractFirstPartBeforeMiddleDot(commentText2);

                    // Skip if we couldn't extract a company name
                    if (!companyName) continue;

                    // Store the image URL
                    const logoUrl = logoImg.src || '';

                    // Add to employers list with company info and logo URL
                    employers.push({
                      company: companyName,
                      logo: logoUrl
                    });
                  }
                }
              }
            }
            
            // Log what we found
            console.log(`Found ${employers.length} employers`);
            employers.forEach((emp, i) => {
              console.log(`Employer ${i+1}: ${emp.company}${emp.logo ? ' (has logo URL)' : ''}`);
            });
            
          } catch (e) {
            console.error('Error extracting employers:', e);
          }
          
          return employers;
        }

        // Check if we're on a LinkedIn profile page
        const profileRegex = /linkedin\.com\/in\/([^/]+)/;
        const isLinkedInProfile = profileRegex.exec(window.location.href);

        // Return the profile info
        return {
          name: extractProfileName(),
          profileId: extractProfileId(),
          url: window.location.href,
          isLinkedInProfile: !!isLinkedInProfile,
          employers: await extractEmployers()
        };
      }
    });
    
    // The results come back as an array
    if (results?.[0]?.result) {
      return results[0].result;
    }
    
    throw new Error('Failed to extract profile info');
  }
  
  // Function to load the note for a specific profile ID
  function loadNoteForProfileId(profileId) {
    chrome.storage.sync.get(['socialNotes'], (result) => {
      const allNotes = result.socialNotes || {};
      const profileNote = allNotes[profileId];
      
      if (profileNote?.text) {
        // Load the note text
        notesInput.value = profileNote.text;
        
        // Update name input if name is different
        if (profileNote.name && personNameInput.value !== profileNote.name) {
          personNameInput.value = profileNote.name;
        }
      } else {
        // No previous note
        notesInput.value = '';
      }
    });
  }

  // Function to display company logos
  function displayCompanyLogos(employers) {
    const logosContainer = document.getElementById('companyLogosContainer');
    logosContainer.innerHTML = ''; // Clear existing logos
    
    if (!employers || employers.length === 0) return;
    
    // Get the profileId to check against saved data
    const profileId = saveButton.dataset.profileId;
    
    // First, retrieve any saved employers for this profile
    chrome.storage.sync.get(['socialNotes'], (result) => {
      const socialNotes = result.socialNotes || {};
      const savedProfile = socialNotes[profileId];
      const savedEmployers = savedProfile?.employers || [];
      const savedCompanyNames = savedEmployers.map(e => e.company.toLowerCase());
      
      console.log('Saved employers:', savedCompanyNames);
      console.log('Current employers:', employers.map(e => e.company));
      
      // Display company logos, highlighting new ones
      employers.forEach(employer => {
        if (employer.company) {
          const logoWrapper = document.createElement('div');
          logoWrapper.className = 'company-logo-wrapper';
          
          // Check if this employer is new (not in saved data)
          const isNewEmployer = !savedCompanyNames.includes(employer.company.toLowerCase());
          
          if (isNewEmployer) {
            console.log(`New employer found: ${employer.company}`);
            // Add highlight indicator
            const newIndicator = document.createElement('div');
            newIndicator.className = 'company-logo-new';
            logoWrapper.appendChild(newIndicator);
          }
          
          if (employer.logo) {
            // Create image element for the logo
            const logoImg = document.createElement('img');
            logoImg.className = 'company-logo';
            logoImg.alt = employer.company;
            
            // Add error handling for image loading
            logoImg.onerror = function() {
              // Replace with initials on load error
              this.style.display = 'none';
              createInitialsPlaceholder(logoWrapper, employer.company);
            };
            
            // Set the source last to trigger load event
            logoImg.src = employer.logo;
            logoWrapper.appendChild(logoImg);
          } else {
            // Create a placeholder with company initials if no logo
            createInitialsPlaceholder(logoWrapper, employer.company);
          }
          
          // Add tooltip with company name
          const tooltip = document.createElement('span');
          tooltip.className = 'company-logo-tooltip';
          tooltip.textContent = employer.company + (isNewEmployer ? ' (New)' : '');
          logoWrapper.appendChild(tooltip);
          
          logosContainer.appendChild(logoWrapper);
        }
      });
      
      // Show the container if we added any logos
      if (logosContainer.children.length > 0) {
        logosContainer.style.display = 'flex';
      } else {
        logosContainer.style.display = 'none';
      }
    });
  }

  // Helper function to create an initials placeholder
  function createInitialsPlaceholder(container, companyName) {
    const logoPlaceholder = document.createElement('div');
    logoPlaceholder.className = 'company-logo';
    logoPlaceholder.style.display = 'flex';
    logoPlaceholder.style.justifyContent = 'center';
    logoPlaceholder.style.alignItems = 'center';
    logoPlaceholder.style.backgroundColor = '#f3f6f8';
    logoPlaceholder.style.color = '#0077b5';
    logoPlaceholder.style.fontWeight = 'bold';
    logoPlaceholder.style.fontSize = '12px';
    
    // Get initials from company name
    const initials = companyName
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
    
    logoPlaceholder.textContent = initials;
    container.appendChild(logoPlaceholder);
  }

  function showDefaultView() {
    // Disable the save button when not on LinkedIn
    saveButton.disabled = true;
    notesInput.value = '';
    personNameInput.value = '';
    
    // Clear any stored profile ID
    delete saveButton.dataset.profileId;
    
    // Clear any stored employers
    delete saveButton.dataset.employers;
    
    // No visible elements in notesList now
    notesList.innerHTML = '';
    
    // Clear company logos
    const logosContainer = document.getElementById('companyLogosContainer');
    logosContainer.innerHTML = '';
    logosContainer.style.display = 'none';
    
    // Show placeholder text in the note input
    notesInput.placeholder = 'Visit a LinkedIn profile to add notes...';
    
    // Disable inputs when not on LinkedIn
    personNameInput.disabled = true;
    notesInput.disabled = true;
  }
});
