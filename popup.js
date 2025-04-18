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
  saveButton.addEventListener('click', saveNote);
  
  // Function to extract profile info directly from the page
  async function extractProfileInfo(tabId) {
    // This function injects and executes code in the active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
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

        // Check if we're on a LinkedIn profile page
        const profileRegex = /linkedin\.com\/in\/([^/]+)/;
        const isLinkedInProfile = profileRegex.exec(window.location.href);

        // Return the profile info
        return {
          name: extractProfileName(),
          profileId: extractProfileId(),
          url: window.location.href,
          isLinkedInProfile: !!isLinkedInProfile
        };
      }
    });
    
    // The results come back as an array
    if (results?.[0]?.result) {
      return results[0].result;
    }
    
    throw new Error('Failed to extract profile info');
  }
  
  // Function to save a new note
  function saveNote() {
    const name = personNameInput.value.trim();
    const note = notesInput.value.trim();
    const profileId = saveButton.dataset.profileId;
    
    if (!profileId) return;
    
    chrome.storage.sync.get(['socialNotes'], (result) => {
      const notes = result.socialNotes || {};
      
      // Store the note using profileId as the key
      notes[profileId] = {
        name: name, // Store the name alongside the note for reference
        text: note,
        updated: new Date().toISOString()
      };
      
      chrome.storage.sync.set({ socialNotes: notes }, () => {
        console.log('Information saved successfully');
      });
    });
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

  function showDefaultView() {
    // Disable the save button when not on LinkedIn
    saveButton.disabled = true;
    
    // No visible elements in notesList now
    notesList.innerHTML = '';
    
    // Clear input fields
    personNameInput.value = '';
    notesInput.value = '';
    
    // Clear any stored profile ID
    delete saveButton.dataset.profileId;
    
    // Show placeholder text in the note input
    notesInput.placeholder = 'Visit a LinkedIn profile to add notes...';
    
    // Disable inputs when not on LinkedIn
    personNameInput.disabled = true;
    notesInput.disabled = true;
  }
});
