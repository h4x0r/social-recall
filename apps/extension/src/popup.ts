import {
  Employer,
  extractProfileIdFromUrl,
  isLinkedInProfileUrl,
  extractProfileNameFromTitle,
  extractFirstPartBeforeMiddleDot,
  getCompanyInitials,
  isDurationString,
  isNewEmployer,
} from './utils';

interface SocialNote {
  name: string;
  text: string;
  employers?: Employer[];
}

interface SocialNotes {
  [profileId: string]: SocialNote;
}

interface StorageResult {
  socialNotes?: SocialNotes;
}

interface ProfileInfo {
  name: string;
  profileId: string;
  url: string;
  isLinkedInProfile: boolean;
  employers: Employer[];
}

document.addEventListener('DOMContentLoaded', (): void => {
  const personNameInput = document.getElementById('personName') as HTMLInputElement;
  const notesInput = document.getElementById('notes') as HTMLTextAreaElement;
  const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  const notesList = document.getElementById('notesList') as HTMLElement;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs: chrome.tabs.Tab[]): Promise<void> => {
    const tab: chrome.tabs.Tab | undefined = tabs?.[0];
    if (tab && tab.id) {
      try {
        const profileInfo: ProfileInfo = await extractProfileInfo(tab.id);

        if (profileInfo && profileInfo.isLinkedInProfile &&
          profileInfo.name && profileInfo.name !== 'Unknown LinkedIn User' &&
          profileInfo.profileId) {

          saveButton.disabled = false;
          personNameInput.disabled = false;
          notesInput.disabled = false;

          saveButton.dataset.profileId = profileInfo.profileId;

          if (profileInfo.employers && profileInfo.employers.length > 0) {
            saveButton.dataset.employers = JSON.stringify(profileInfo.employers);
            displayCompanyLogos(profileInfo.employers);
          } else {
            saveButton.dataset.employers = '[]';
            const logosContainer = document.getElementById('companyLogosContainer') as HTMLElement;
            logosContainer.innerHTML = '';
          }

          personNameInput.value = profileInfo.name;
          loadNoteForProfileId(profileInfo.profileId);
        } else {
          showDefaultView();
        }
      } catch (error) {
        console.error('Error extracting profile info:', error);
        showDefaultView();
      }
    } else {
      showDefaultView();
    }
  });

  saveButton.addEventListener('click', (): void => {
    const name: string = personNameInput.value.trim();
    const note: string = notesInput.value.trim();
    const profileId: string | undefined = saveButton.dataset.profileId;
    const employers: Employer[] = JSON.parse(saveButton.dataset.employers || '[]');

    if (!profileId) return;

    console.log('Saving data for profile:', profileId, 'Name:', name);

    chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
      const notes: SocialNotes = result.socialNotes || {};

      notes[profileId] = {
        name: name,
        text: note,
        employers: employers
      };

      console.log('Profile data saved:', notes[profileId]);

      chrome.storage.sync.set({ socialNotes: notes }, (): void => {
        console.log('Information saved successfully');
      });
    });
  });

  async function extractProfileInfo(tabId: number): Promise<ProfileInfo> {
    const results: any[] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        function extractProfileId(): string | null {
          const urlRegex = /linkedin\.com\/in\/([^/]+)/;
          const urlMatch = urlRegex.exec(window.location.href);
          if (urlMatch) return urlMatch[1];

          const metaProfile = document.querySelector('meta[name="profile-id"]') as HTMLMetaElement;
          return metaProfile?.content || null;
        }

        function extractProfileName(): string {
          const title: string = document.title;
          if (title) {
            const titleParts: string[] = title.split(/\s[\|\-]\s|\s\||\s\-\s/);
            if (titleParts.length > 0 && titleParts[0].trim()) {
              return titleParts[0].trim();
            }
          }

          const metaTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
          if (metaTitle?.content) {
            const metaTitleParts: string[] = metaTitle.content.split(/\s[\|\-]\s|\s\||\s\-\s/);
            if (metaTitleParts.length > 0 && metaTitleParts[0].trim()) {
              return metaTitleParts[0].trim();
            }
          }

          return 'Unknown LinkedIn User';
        }

        function extractEmployers(): Employer[] {
          const employers: Employer[] = [];

          try {
            console.log('Looking for Experience section');

            const experienceHeaders: Element[] = Array.from(document.querySelectorAll('h2, section h1, .pv-profile-section__header-text, .pvs-header__title'))
              .filter((el: Element) => (el.textContent || '').trim().toLowerCase().includes('experience'));

            if (experienceHeaders.length > 0) {
              console.log('Found Experience section');

              const header: Element = experienceHeaders[0];
              let section: Element | null = header.closest('section') || header.parentElement;

              if (section) {
                console.log('Looking for company logos within Experience section');

                const experienceItems: NodeListOf<Element> = section.querySelectorAll('li, .pvs-entity, .pv-entity, .profile-section-card');

                for (let i = 0; i < experienceItems.length; i++) {
                  const item = experienceItems[i];
                  const logoImg = item.querySelector('img[width="48"], img[height="48"], .ivm-view-attr__ghost-entity') as HTMLImageElement;

                  if (logoImg) {
                    console.log(`Found potential company logo image: ${logoImg.src || 'no src'}`);

                    function extractCommentTextFromSpans(spans: NodeListOf<Element>): string | null {
                      for (let j = 0; j < spans.length; j++) {
                        const span = spans[j];
                        const html: string = (span as HTMLElement).innerHTML;
                        const commentPattern = /<!---->([^<>]+)<!---->/;
                        const match = html.match(commentPattern);
                        if (match) return match[1].trim();
                      }
                      return null;
                    }

                    function extractFirstPartBeforeMiddleDot(string: string): string {
                      let dotIndex: number = string.indexOf(' ' + String.fromCharCode(0xB7) + ' ');

                      if (dotIndex !== -1) {
                        string = string.substring(0, dotIndex).trim();
                      }

                      return string;
                    }

                    const commentText1: string | null = extractCommentTextFromSpans(item.querySelectorAll('span[aria-hidden="true"]'));
                    if (commentText1) {
                      console.log(`Found first line after logo in aria-hidden span: "${commentText1}"`);
                    }
                    let companyName: string | null = commentText1;

                    const commentText2: string | null = extractCommentTextFromSpans(item.querySelectorAll('.t-14.t-normal'));
                    if (commentText2) {
                      console.log(`Found second line after logo in aria-hidden span: "${commentText2}"`);
                    }
                    if (commentText2 && !commentText2.match('[0-9] mo')) {
                      companyName = extractFirstPartBeforeMiddleDot(commentText2);
                    }

                    if (!companyName) continue;

                    const logoUrl: string = logoImg.src || '';

                    employers.push({
                      company: companyName,
                      logo: logoUrl
                    });
                  }
                }
              }
            }

            console.log(`Found ${employers.length} employers`);
            employers.forEach((emp: Employer, i: number): void => {
              console.log(`Employer ${i + 1}: ${emp.company}${emp.logo ? ' (has logo URL)' : ''}`);
            });

          } catch (e) {
            console.error('Error extracting employers:', e);
          }

          return employers;
        }

        const profileRegex = /linkedin\.com\/in\/([^/]+)/;
        const isLinkedInProfile = profileRegex.exec(window.location.href);

        return {
          name: extractProfileName(),
          profileId: extractProfileId() || '',
          url: window.location.href,
          isLinkedInProfile: !!isLinkedInProfile,
          employers: extractEmployers()
        };
      }
    });

    if (results && results[0] && results[0].result) {
      return results[0].result as ProfileInfo;
    }

    throw new Error('Failed to extract profile info');
  }

  function loadNoteForProfileId(profileId: string): void {
    chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
      const allNotes: SocialNotes = result.socialNotes || {};
      const profileNote: SocialNote | undefined = allNotes[profileId];

      if (profileNote?.text) {
        notesInput.value = profileNote.text;

        if (profileNote.name && personNameInput.value !== profileNote.name) {
          personNameInput.value = profileNote.name;
        }
      } else {
        notesInput.value = '';
      }
    });
  }

  function displayCompanyLogos(employers: Employer[]): void {
    const logosContainer = document.getElementById('companyLogosContainer') as HTMLElement;
    logosContainer.innerHTML = '';

    if (!employers || employers.length === 0) return;

    const profileId: string | undefined = saveButton.dataset.profileId;

    chrome.storage.sync.get(['socialNotes'], (result: StorageResult): void => {
      const socialNotes: SocialNotes = result.socialNotes || {};
      const savedProfile: SocialNote | undefined = socialNotes[profileId!];
      const savedEmployers: Employer[] = savedProfile?.employers || [];
      const savedCompanyNames: string[] = savedEmployers.map((e: Employer) => e.company.toLowerCase());

      const isFirstVisit: boolean = !savedProfile;

      console.log('Saved employers:', savedCompanyNames);
      console.log('Current employers:', employers.map((e: Employer) => e.company));
      console.log('Is first visit:', isFirstVisit);

      employers.forEach((employer: Employer): void => {
        if (employer.company) {
          const logoWrapper: HTMLDivElement = document.createElement('div');
          logoWrapper.className = 'company-logo-wrapper';

          const employerIsNew: boolean = isNewEmployer(employer, savedEmployers, isFirstVisit);

          if (employerIsNew) {
            console.log(`New employer found: ${employer.company}`);
            const newIndicator: HTMLDivElement = document.createElement('div');
            newIndicator.className = 'company-logo-new';
            logoWrapper.appendChild(newIndicator);
          }

          if (employer.logo) {
            const logoImg: HTMLImageElement = document.createElement('img');
            logoImg.className = 'company-logo';
            logoImg.alt = employer.company;

            logoImg.onerror = function (): void {
              this.style.display = 'none';
              createInitialsPlaceholder(logoWrapper, employer.company);
            };

            logoImg.src = employer.logo;
            logoWrapper.appendChild(logoImg);
          } else {
            createInitialsPlaceholder(logoWrapper, employer.company);
          }

          const tooltip: HTMLSpanElement = document.createElement('span');
          tooltip.className = 'company-logo-tooltip';
          tooltip.textContent = employer.company + (employerIsNew ? ' (New)' : '');
          logoWrapper.appendChild(tooltip);

          logosContainer.appendChild(logoWrapper);
        }
      });

      if (logosContainer.children.length > 0) {
        logosContainer.style.display = 'flex';
      } else {
        logosContainer.style.display = 'none';
      }
    });
  }

  function createInitialsPlaceholder(container: HTMLElement, companyName: string): void {
    const logoPlaceholder: HTMLDivElement = document.createElement('div');
    logoPlaceholder.className = 'company-logo';
    logoPlaceholder.style.display = 'flex';
    logoPlaceholder.style.justifyContent = 'center';
    logoPlaceholder.style.alignItems = 'center';
    logoPlaceholder.style.backgroundColor = '#f3f6f8';
    logoPlaceholder.style.color = '#0077b5';
    logoPlaceholder.style.fontWeight = 'bold';
    logoPlaceholder.style.fontSize = '12px';

    logoPlaceholder.textContent = getCompanyInitials(companyName);
    container.appendChild(logoPlaceholder);
  }

  function showDefaultView(): void {
    saveButton.disabled = true;
    notesInput.value = '';
    personNameInput.value = '';

    delete saveButton.dataset.profileId;
    delete saveButton.dataset.employers;

    notesList.innerHTML = '';

    const logosContainer = document.getElementById('companyLogosContainer') as HTMLElement;
    logosContainer.innerHTML = '';
    logosContainer.style.display = 'none';

    notesInput.placeholder = 'Visit a LinkedIn profile to add notes...';

    personNameInput.disabled = true;
    notesInput.disabled = true;
  }
});