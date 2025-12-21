/**
 * Content Script for Social Recall
 * Injects floating intelligence panel into LinkedIn profile pages
 * Implements "Robocop mode" - passive capture of all viewed profiles
 */

// Debug: Immediately log when script is parsed
console.log('[Social Recall] ===== CONTENT SCRIPT STARTING =====');

import { createPanel, Archetype, type ProfileIntelligence, type Panel } from './panel';
import { extractProfileIdFromUrl, isLinkedInProfileUrl, type Employer } from './utils';
import { inferIntelligence, type ProfileData as AIProfileData } from './ai-client';

interface StoredProfile {
  name: string;
  headline?: string;
  avatarUrl?: string;
  about?: string;
  employers?: Employer[];
  education?: Education[];
  honorsAwards?: string[];
  courses?: string[];
  languages?: string[];
  volunteering?: Volunteering[];
  certifications?: Certification[];
  activities?: Activity[];
  skills?: string[];
  archetype?: Archetype;
  couldBe?: string[];
  goodFor?: string[];
  firstSeen: string;
  lastSeen: string;
  note?: string;
}

interface Education {
  school: string;
  degree?: string;
  field?: string;
  dates?: string;
}

interface Volunteering {
  organization: string;
  role?: string;
  cause?: string;
}

interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface Activity {
  type: 'post' | 'comment' | 'reaction';
  text: string;
  date?: string;
}

interface StorageData {
  socialNotes?: Record<string, StoredProfile>;
}

let panel: Panel | null = null;
let currentProfileId: string | null = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Progress tracking for extraction
interface ExtractionProgress {
  step: string;
  stepLabel: string;
  progress: number; // 0-1
  startTime?: number;
}

const EXTRACTION_STEPS = [
  { id: 'expanding', label: 'Expanding sections' },
  { id: 'education', label: 'Extracting education' },
  { id: 'experience', label: 'Extracting experience' },
  { id: 'certifications', label: 'Extracting certifications' },
  { id: 'skills', label: 'Extracting skills' },
  { id: 'activity', label: 'Analyzing activity' },
  { id: 'ai', label: 'AI analysis' },
  { id: 'complete', label: 'Complete' },
];

function updateProgress(stepId: string, startTime: number): void {
  if (!panel) return;

  const stepIndex = EXTRACTION_STEPS.findIndex(s => s.id === stepId);
  const step = EXTRACTION_STEPS[stepIndex];
  if (!step) return;

  const progress = (stepIndex + 1) / EXTRACTION_STEPS.length;
  const elapsed = Date.now() - startTime;

  panel.setProgress({
    step: step.id,
    label: step.label,
    progress,
    elapsed,
  });
}

function completeExtraction(profileId: string, durationMs: number): void {
  // Update panel to show complete
  if (panel) {
    panel.setProgress({
      step: 'complete',
      label: 'Complete',
      progress: 1,
      elapsed: durationMs,
    });

    // Hide progress bar after 2 seconds
    setTimeout(() => {
      panel?.setProgress(null);
    }, 2000);
  }

  // Store timing in local storage history
  chrome.storage.local.get(['extractionHistory'], (result) => {
    const history = result.extractionHistory || [];
    history.unshift({
      profileId,
      durationMs,
      timestamp: Date.now(),
    });
    // Keep last 100 entries
    chrome.storage.local.set({ extractionHistory: history.slice(0, 100) });
  });
}

/**
 * Initialize the floating panel on all LinkedIn pages
 * Shows full intelligence on profile pages, minimal orb elsewhere
 */
function initialize(): void {
  console.log('[Social Recall] Content script loaded on:', window.location.href);

  // Inject CSS
  injectStyles();
  console.log('[Social Recall] CSS injected');

  // Create panel (always show orb on LinkedIn)
  panel = createPanel(document.body);
  console.log('[Social Recall] Panel created:', panel?.element);

  // Setup drag functionality
  setupDragListeners();

  // If on profile page, extract and display profile intelligence
  if (isLinkedInProfileUrl(window.location.href)) {
    console.log('[Social Recall] On profile page, extracting intelligence...');
    handleProfilePage();
  } else {
    console.log('[Social Recall] Not a profile page, showing minimal orb');
    // Show minimal state - just the orb with no intelligence
    if (panel) {
      panel.setMinimalMode(true);
    }
  }

  // Listen for URL changes (LinkedIn is a SPA)
  observeUrlChanges();
}

/**
 * Inject the panel CSS into the page
 */
function injectStyles(): void {
  if (document.getElementById('sr-panel-styles')) {
    return;
  }

  const link = document.createElement('link');
  link.id = 'sr-panel-styles';
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('panel.css');
  document.head.appendChild(link);
}

/**
 * Setup drag event listeners for the panel
 */
function setupDragListeners(): void {
  if (!panel) return;

  const element = panel.element;

  element.addEventListener('mousedown', (e: MouseEvent) => {
    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    isDragging = true;
    const pos = panel!.getPosition();
    dragOffset = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    element.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging || !panel) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    panel.setPosition(newX, newY);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && panel) {
      isDragging = false;
      panel.element.style.cursor = 'grab';
      // Save position to storage
      savePosition(panel.getPosition());
    }
  });
}

/**
 * Save panel position to storage
 */
function savePosition(position: { x: number; y: number }): void {
  chrome.storage.sync.set({ panelPosition: position });
}

/**
 * Load saved panel position
 */
async function loadPosition(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['panelPosition'], (result) => {
      resolve(result.panelPosition || null);
    });
  });
}

/**
 * Handle LinkedIn profile page - extract data and update panel
 */
async function handleProfilePage(): Promise<void> {
  const profileId = extractProfileIdFromUrl(window.location.href);
  if (!profileId || profileId === currentProfileId) {
    return;
  }

  currentProfileId = profileId;
  const startTime = Date.now();

  // Load saved position
  const savedPosition = await loadPosition();
  if (savedPosition && panel) {
    panel.setPosition(savedPosition.x, savedPosition.y);
  }

  // Extract profile data from page (includes background activity fetch)
  const profileData = await extractProfileData(profileId, startTime);

  // Get stored data for this profile
  const storedData = await getStoredProfile(profileId);

  // Merge and save (Robocop mode - auto-capture with AI intelligence)
  updateProgress('ai', startTime);
  const mergedData = await mergeProfileData(profileData, storedData);
  await saveProfile(profileId, mergedData);

  // Mark extraction complete
  updateProgress('complete', startTime);
  const durationMs = Date.now() - startTime;
  completeExtraction(profileId, durationMs);

  // Check for job changes
  const jobChange = detectJobChange(profileData, storedData);

  // Build intelligence object
  const intelligence = buildIntelligence(mergedData, jobChange);
  console.log('[Social Recall] Intelligence built:', JSON.stringify(intelligence, null, 2));

  // Update panel
  if (panel) {
    console.log('[Social Recall] Setting intelligence on panel...');
    panel.setIntelligence(intelligence);
    console.log('[Social Recall] Intelligence set complete');

    // Add alert class if job change detected
    const orb = panel.element.querySelector('.sr-panel__orb');
    if (jobChange && orb) {
      orb.classList.add('sr-panel__orb--alert');
    }
  }
}

/**
 * Wait for a specified duration
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Expand all "Show all X" sections on the profile page
 * This clicks expansion buttons and waits for content to load
 */
async function expandAllSections(): Promise<void> {
  // Find all "Show all" buttons/links on the profile
  // LinkedIn uses various patterns: "Show all X skills", "Show all X experiences", etc.
  const showAllButtons = document.querySelectorAll([
    'a[id*="navigation-index-Show-all"]',
    'button[aria-label*="Show all"]',
    '.pv-profile-section__see-more-inline',
    'a.optional-action-target-wrapper',
    '[data-control-name="see_all"]',
  ].join(', '));

  console.log(`[Social Recall] Found ${showAllButtons.length} expandable sections`);

  for (const button of Array.from(showAllButtons)) {
    const btn = button as HTMLElement;
    const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';

    // Skip activity-related expansions (we handle those separately with filtering)
    if (label.toLowerCase().includes('activit') || label.toLowerCase().includes('post')) {
      continue;
    }

    try {
      btn.click();
      // Wait for modal/expansion to load
      await wait(300);
      console.log(`[Social Recall] Expanded: ${label}`);
    } catch (e) {
      console.log(`[Social Recall] Failed to expand: ${label}`);
    }
  }

  // Also expand any "see more" within sections (truncated text)
  const seeMoreButtons = document.querySelectorAll([
    '.pv-shared-text-with-see-more button',
    '.inline-show-more-text__button',
    'button[aria-expanded="false"]',
  ].join(', '));

  for (const button of Array.from(seeMoreButtons)) {
    const btn = button as HTMLElement;
    if (btn.textContent?.toLowerCase().includes('see more') ||
        btn.textContent?.toLowerCase().includes('...more')) {
      try {
        btn.click();
        await wait(100);
      } catch (e) {
        // Ignore
      }
    }
  }

  // Wait a bit more for any async content to settle
  await wait(200);
}

/**
 * Close any open modals (after extracting from them)
 */
function closeModals(): void {
  const closeButtons = document.querySelectorAll([
    'button[aria-label="Dismiss"]',
    'button[data-test-modal-close-btn]',
    '.artdeco-modal__dismiss',
  ].join(', '));

  closeButtons.forEach(btn => {
    try {
      (btn as HTMLElement).click();
    } catch (e) {
      // Ignore
    }
  });
}

/**
 * Extract profile data from the current LinkedIn page
 * Expands all sections first, then extracts data
 */
async function extractProfileData(profileId: string, startTime: number): Promise<Partial<StoredProfile>> {
  // Expand all sections first to get full data
  updateProgress('expanding', startTime);
  await expandAllSections();

  // Debug: Log all section IDs found on page
  const sectionIds = Array.from(document.querySelectorAll('[id]'))
    .map(el => el.id)
    .filter(id => id && !id.startsWith('ember'));
  console.log('[Social Recall] Available section IDs:', sectionIds.slice(0, 30));

  // Extract education
  updateProgress('education', startTime);
  const education = extractEducation();

  // Extract experience
  updateProgress('experience', startTime);
  const employers = extractEmployers();

  // Extract certifications
  updateProgress('certifications', startTime);
  const certifications = extractCertifications();

  // Extract other data (skills-related fields)
  updateProgress('skills', startTime);
  const immediateData: Partial<StoredProfile> = {
    name: extractName(),
    headline: extractHeadline(),
    avatarUrl: extractAvatarUrl(),
    about: extractAbout(),
    employers,
    education,
    honorsAwards: extractHonorsAwards(),
    courses: extractCourses(),
    languages: extractLanguages(),
    volunteering: extractVolunteering(),
    certifications,
    activities: [], // We'll fetch from activity page with filtering
    lastSeen: new Date().toISOString(),
  };

  // Close any modals we opened
  closeModals();

  // Fetch activities from activity page (only posts/reposts with owner commentary, max 20)
  updateProgress('activity', startTime);
  immediateData.activities = await fetchActivitiesFromActivityPage(profileId);

  return immediateData;
}

function stripNotificationBadge(name: string): string {
  // Remove notification badge like "(1) " or "(99+) " from start of name
  return name.replace(/^\(\d+\+?\)\s*/, '').trim();
}

function extractName(): string {
  // Try various selectors LinkedIn uses for the profile name
  const selectors = [
    'h1.text-heading-xlarge',
    'h1.inline.t-24.v-align-middle.break-words',
    '.pv-top-card--list li:first-child',
    '.text-heading-xlarge',
    'h1[data-generated-suggestion-target]',
    // Profile card name
    '.pv-text-details__left-panel h1',
    '.ph5 h1',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      const name = el.textContent.trim();
      console.log('[Social Recall] Found name with selector:', selector, '→', name);
      return stripNotificationBadge(name);
    }
  }

  // Fallback to page title
  console.log('[Social Recall] Name not found in DOM, using page title fallback');
  const title = document.title;
  const parts = title.split(/\s[|–-]\s/);
  return stripNotificationBadge(parts[0]?.trim() || 'Unknown');
}

function extractHeadline(): string | undefined {
  const headlineEl = document.querySelector('.text-body-medium.break-words');
  return headlineEl?.textContent?.trim();
}

function extractAvatarUrl(): string | undefined {
  const avatarImg = document.querySelector('.pv-top-card-profile-picture__image') as HTMLImageElement;
  return avatarImg?.src;
}

function extractEmployers(): Employer[] {
  const employers: Employer[] = [];
  const experienceSection = document.querySelector('#experience');
  console.log('[Social Recall] Experience section found:', !!experienceSection);
  if (!experienceSection) {
    // Try alternative selectors
    const altSection = document.querySelector('[data-section="experience"]') ||
      document.querySelector('section:has(#experience-section)');
    console.log('[Social Recall] Alternative experience section:', !!altSection);
  }
  if (!experienceSection) return employers;

  const items = experienceSection.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
    const logoImg = item.querySelector('img[width="48"]') as HTMLImageElement;
    if (companyEl?.textContent) {
      employers.push({
        company: companyEl.textContent.trim().split(' · ')[0],
        logo: logoImg?.src || '',
      });
    }
  });
  return employers;
}

function extractAbout(): string | undefined {
  // About section has id="about" with content in a div below
  const aboutSection = document.querySelector('#about');
  if (!aboutSection) return undefined;

  const container = aboutSection.closest('section');
  const textEl = container?.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]');
  return textEl?.textContent?.trim();
}

function extractEducation(): Education[] {
  const education: Education[] = [];
  const section = document.querySelector('#education');
  if (!section) return education;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    const degreeEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
    const datesEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

    if (schoolEl?.textContent) {
      const degreeText = degreeEl?.textContent?.trim() || '';
      const [degree, field] = degreeText.split(',').map(s => s.trim());
      education.push({
        school: schoolEl.textContent.trim(),
        degree,
        field,
        dates: datesEl?.textContent?.trim(),
      });
    }
  });
  return education;
}

function extractHonorsAwards(): string[] {
  const awards: string[] = [];
  const section = document.querySelector('#honors_and_awards');
  if (!section) return awards;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const titleEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    if (titleEl?.textContent) {
      awards.push(titleEl.textContent.trim());
    }
  });
  return awards;
}

function extractCourses(): string[] {
  const courses: string[] = [];
  const section = document.querySelector('#courses');
  if (!section) return courses;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const titleEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    if (titleEl?.textContent) {
      courses.push(titleEl.textContent.trim());
    }
  });
  return courses;
}

function extractLanguages(): string[] {
  const languages: string[] = [];
  const section = document.querySelector('#languages');
  if (!section) return languages;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const langEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    if (langEl?.textContent) {
      languages.push(langEl.textContent.trim());
    }
  });
  return languages;
}

function extractVolunteering(): Volunteering[] {
  const volunteering: Volunteering[] = [];
  const section = document.querySelector('#volunteering_experience');
  if (!section) return volunteering;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const roleEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    const orgEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
    const causeEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

    if (roleEl?.textContent || orgEl?.textContent) {
      volunteering.push({
        organization: orgEl?.textContent?.trim() || '',
        role: roleEl?.textContent?.trim(),
        cause: causeEl?.textContent?.trim(),
      });
    }
  });
  return volunteering;
}

function extractCertifications(): Certification[] {
  const certifications: Certification[] = [];
  const section = document.querySelector('#licenses_and_certifications');
  if (!section) return certifications;

  const items = section.querySelectorAll('li.artdeco-list__item');
  items.forEach((item) => {
    const nameEl = item.querySelector('.t-bold span[aria-hidden="true"]');
    const issuerEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');

    // Date info is in t-black--light spans, may contain "Issued" and "Expires"
    const dateEls = item.querySelectorAll('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
    let issueDate: string | undefined;
    let expirationDate: string | undefined;
    let credentialId: string | undefined;

    dateEls.forEach((el) => {
      const text = el.textContent?.trim() || '';
      if (text.startsWith('Issued ')) {
        issueDate = text.replace('Issued ', '');
      } else if (text.startsWith('Expires ')) {
        expirationDate = text.replace('Expires ', '');
      } else if (text.includes('Credential ID')) {
        credentialId = text.replace('Credential ID ', '').trim();
      } else if (!issueDate && /^[A-Z][a-z]{2} \d{4}$/.test(text)) {
        // Fallback: plain date format like "Jan 2023"
        issueDate = text;
      }
    });

    // Credential URL from "Show credential" link
    const credentialLink = item.querySelector('a[href*="credential"]') as HTMLAnchorElement;
    const credentialUrl = credentialLink?.href;

    if (nameEl?.textContent) {
      certifications.push({
        name: nameEl.textContent.trim(),
        issuer: issuerEl?.textContent?.trim(),
        issueDate,
        expirationDate,
        credentialId,
        credentialUrl,
      });
    }
  });
  return certifications;
}

/**
 * Fetch activities from the profile's activity page
 * Only includes:
 * - Original posts by the profile owner
 * - Reposts where the owner added their own commentary
 * Excludes simple reposts/shares without commentary
 * Limited to 20 items
 */
async function fetchActivitiesFromActivityPage(profileId: string): Promise<Activity[]> {
  const activities: Activity[] = [];
  const MAX_ACTIVITIES = 20;

  try {
    const activityUrl = `https://www.linkedin.com/in/${profileId}/recent-activity/all/`;
    const response = await fetch(activityUrl, {
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      console.log('[Social Recall] Failed to fetch activity page:', response.status);
      return activities;
    }

    const html = await response.text();

    // Parse the HTML to extract activities
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find activity items in the parsed document
    const items = doc.querySelectorAll('.feed-shared-update-v2, .occludable-update');

    for (const item of Array.from(items)) {
      if (activities.length >= MAX_ACTIVITIES) break;

      // Check if this is a repost
      const repostIndicator = item.querySelector(
        '.feed-shared-actor__sub-description, ' +
        '.update-components-header__text-view, ' +
        '[data-urn*="reshare"], ' +
        '.feed-shared-reshared-text'
      );
      const isRepost = repostIndicator !== null ||
        item.innerHTML.includes('reposted') ||
        item.innerHTML.includes('reshared');

      if (isRepost) {
        // For reposts, only include if the owner added their own commentary
        // Owner's commentary appears in .feed-shared-update-v2__commentary or similar
        const ownerCommentary = item.querySelector(
          '.feed-shared-update-v2__commentary, ' +
          '.update-components-text, ' +
          '.feed-shared-inline-show-more-text'
        );

        // Get the commentary text (not the original post's text)
        const commentaryText = ownerCommentary?.textContent?.trim();

        if (commentaryText && commentaryText.length > 10) {
          activities.push({
            type: 'post', // Repost with commentary is essentially a post
            text: commentaryText.slice(0, 500),
          });
        }
        // Skip reposts without commentary
        continue;
      }

      // Original post - extract the post text
      const textEl = item.querySelector(
        '.feed-shared-text span[dir="ltr"], ' +
        '.break-words span[aria-hidden="true"], ' +
        '.update-components-text span[dir="ltr"]'
      );
      const text = textEl?.textContent?.trim();

      if (text && text.length > 10) {
        activities.push({
          type: 'post',
          text: text.slice(0, 500),
        });
      }
    }

    console.log(`[Social Recall] Fetched ${activities.length} posts/reposts with commentary (max ${MAX_ACTIVITIES})`);
  } catch (error) {
    console.log('[Social Recall] Error fetching activity page:', error);
  }

  return activities;
}

/**
 * Get stored profile data
 */
async function getStoredProfile(profileId: string): Promise<StoredProfile | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
      const notes = result.socialNotes || {};
      resolve(notes[profileId] || null);
    });
  });
}

/**
 * Save profile data
 */
async function saveProfile(profileId: string, data: StoredProfile): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
      const notes = result.socialNotes || {};
      notes[profileId] = data;
      chrome.storage.sync.set({ socialNotes: notes }, resolve);
    });
  });
}

// Valid archetypes in the current set (11 core + unknown)
const VALID_ARCHETYPES = new Set([
  Archetype.Builder,
  Archetype.Advisor,
  Archetype.Creator,
  Archetype.Executive,
  Archetype.Connector,
  Archetype.Operator,
  Archetype.Seller,
  Archetype.Researcher,
  Archetype.Integrator,
  Archetype.Evangelist,
  Archetype.Investor,
  Archetype.Unknown,
]);

function isValidArchetype(archetype: Archetype | undefined): boolean {
  return archetype !== undefined && VALID_ARCHETYPES.has(archetype);
}

/**
 * Merge new profile data with stored data (sync version with local heuristics)
 */
function mergeProfileDataSync(
  newData: Partial<StoredProfile>,
  storedData: StoredProfile | null
): StoredProfile {
  const now = new Date().toISOString();

  if (!storedData) {
    return {
      name: newData.name || 'Unknown',
      headline: newData.headline,
      avatarUrl: newData.avatarUrl,
      about: newData.about,
      employers: newData.employers,
      education: newData.education,
      honorsAwards: newData.honorsAwards,
      courses: newData.courses,
      languages: newData.languages,
      volunteering: newData.volunteering,
      certifications: newData.certifications,
      activities: newData.activities,
      firstSeen: now,
      lastSeen: now,
      // Default intelligence values from local heuristics
      archetype: inferArchetype(newData),
      skills: inferSkills(newData),
      couldBe: inferCouldBe(newData),
      goodFor: inferGoodFor(newData),
    };
  }

  // Recompute intelligence if archetype is invalid (from old version)
  const needsRecompute = !isValidArchetype(storedData.archetype);

  return {
    ...storedData,
    name: newData.name || storedData.name,
    headline: newData.headline || storedData.headline,
    avatarUrl: newData.avatarUrl || storedData.avatarUrl,
    about: newData.about || storedData.about,
    employers: newData.employers || storedData.employers,
    education: newData.education || storedData.education,
    honorsAwards: newData.honorsAwards || storedData.honorsAwards,
    courses: newData.courses || storedData.courses,
    languages: newData.languages || storedData.languages,
    volunteering: newData.volunteering || storedData.volunteering,
    certifications: newData.certifications || storedData.certifications,
    activities: newData.activities || storedData.activities,
    lastSeen: now,
    // Recompute these if archetype was invalid
    ...(needsRecompute && {
      archetype: inferArchetype(newData),
      skills: inferSkills(newData),
      couldBe: inferCouldBe(newData),
      goodFor: inferGoodFor(newData),
    }),
  };
}

/**
 * Get the web app URL from storage or use default
 */
const DEFAULT_WEB_APP_URL = 'https://social-recall.vercel.app';

async function getApiUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['webAppUrl'], (result) => {
      resolve(result.webAppUrl || DEFAULT_WEB_APP_URL);
    });
  });
}


/**
 * Merge new profile data with AI intelligence
 */
async function mergeProfileData(
  newData: Partial<StoredProfile>,
  storedData: StoredProfile | null
): Promise<StoredProfile> {
  const now = new Date().toISOString();
  console.log('[Social Recall] mergeProfileData called, storedData:', storedData ? 'exists' : 'null');

  // If we already have stored data with a VALID archetype AND real intelligence data, just update profile data
  // Old archetypes from previous versions are invalidated and recomputed
  // Also re-run AI if archetype is "unknown" with no real skills (likely a previous failure)
  const hasRealIntelligence = storedData?.skills?.length &&
    storedData.skills[0] !== 'Professional' &&
    storedData.archetype !== Archetype.Unknown;

  if (storedData && isValidArchetype(storedData.archetype) && hasRealIntelligence) {
    console.log('[Social Recall] Using stored data with valid archetype:', storedData.archetype);
    return {
      ...storedData,
      name: newData.name || storedData.name,
      headline: newData.headline || storedData.headline,
      avatarUrl: newData.avatarUrl || storedData.avatarUrl,
      about: newData.about || storedData.about,
      employers: newData.employers || storedData.employers,
      education: newData.education || storedData.education,
      honorsAwards: newData.honorsAwards || storedData.honorsAwards,
      courses: newData.courses || storedData.courses,
      languages: newData.languages || storedData.languages,
      volunteering: newData.volunteering || storedData.volunteering,
      certifications: newData.certifications || storedData.certifications,
      activities: newData.activities || storedData.activities,
      lastSeen: now,
    };
  }

  // Need to run AI - either new profile, invalid archetype, or missing real intelligence
  console.log('[Social Recall] Running AI inference (stored archetype:', storedData?.archetype, 'hasRealIntelligence:', hasRealIntelligence, ')');

  // For new profiles, try AI inference first with full profile data
  const aiProfileData: AIProfileData = {
    name: newData.name || 'Unknown',
    headline: newData.headline || '',
    about: newData.about,
    employers: newData.employers,
    education: newData.education,
    honorsAwards: newData.honorsAwards,
    courses: newData.courses,
    languages: newData.languages,
    volunteering: newData.volunteering,
    certifications: newData.certifications,
    activities: newData.activities,
  };

  try {
    const apiUrl = await getApiUrl();
    console.log('[Social Recall] Calling AI inference at:', apiUrl);
    console.log('[Social Recall] Profile data being sent:', JSON.stringify(aiProfileData, null, 2));
    const result = await inferIntelligence(aiProfileData, { apiUrl, timeoutMs: 5000 });
    console.log('[Social Recall] AI result success:', result?.success);
    console.log('[Social Recall] AI result archetype:', result?.archetype);
    console.log('[Social Recall] AI result skills:', result?.skills);
    console.log('[Social Recall] AI result error:', result?.error);

    if (result.success && result.archetype) {
      // AI inference succeeded - map to 11 core archetypes + Unknown
      const archetypeMap: Record<string, Archetype> = {
        builder: Archetype.Builder,
        advisor: Archetype.Advisor,
        creator: Archetype.Creator,
        executive: Archetype.Executive,
        connector: Archetype.Connector,
        operator: Archetype.Operator,
        seller: Archetype.Seller,
        researcher: Archetype.Researcher,
        integrator: Archetype.Integrator,
        evangelist: Archetype.Evangelist,
        investor: Archetype.Investor,
        unknown: Archetype.Unknown,
      };

      return {
        name: newData.name || 'Unknown',
        headline: newData.headline,
        avatarUrl: newData.avatarUrl,
        about: newData.about,
        employers: newData.employers,
        education: newData.education,
        honorsAwards: newData.honorsAwards,
        courses: newData.courses,
        languages: newData.languages,
        volunteering: newData.volunteering,
        certifications: newData.certifications,
        activities: newData.activities,
        firstSeen: storedData?.firstSeen || now,
        lastSeen: now,
        archetype: archetypeMap[result.archetype] || Archetype.Unknown,
        skills: result.skills?.map(s => s.name) || inferSkills(newData),
        couldBe: result.couldBe || inferCouldBe(newData),
        goodFor: result.goodFor || inferGoodFor(newData),
        note: storedData?.note,
      };
    }
  } catch (error) {
    console.log('[Social Recall] AI inference failed, using local heuristics:', error);
  }

  // Fallback to local heuristics
  return mergeProfileDataSync(newData, storedData);
}

/**
 * Detect if the person changed jobs
 */
function detectJobChange(
  newData: Partial<StoredProfile>,
  storedData: StoredProfile | null
): { current: string; previous: string } | undefined {
  if (!storedData?.employers?.length || !newData.employers?.length) {
    return undefined;
  }

  const currentEmployer = newData.employers[0]?.company;
  const previousEmployer = storedData.employers[0]?.company;

  if (currentEmployer && previousEmployer && currentEmployer !== previousEmployer) {
    return { current: currentEmployer, previous: previousEmployer };
  }

  return undefined;
}

/**
 * Fallback archetype when AI inference unavailable
 */
function inferArchetype(_data: Partial<StoredProfile>): Archetype {
  // AI handles real archetype inference - this is just a placeholder fallback
  return Archetype.Unknown;
}

/**
 * Fallback skills when AI inference unavailable
 */
function inferSkills(_data: Partial<StoredProfile>): string[] {
  // AI handles real skill extraction - this is just a placeholder fallback
  return [];
}

/**
 * Fallback relationship types when AI inference unavailable
 */
function inferCouldBe(_data: Partial<StoredProfile>): string[] {
  // AI handles real relationship inference - this is just a placeholder fallback
  return [];
}

/**
 * Fallback project fit when AI inference unavailable
 */
function inferGoodFor(_data: Partial<StoredProfile>): string[] {
  // AI handles real industry/project inference - this is just a placeholder fallback
  return [];
}

/**
 * Build ProfileIntelligence object for display
 */
function buildIntelligence(
  data: StoredProfile,
  jobChange?: { current: string; previous: string }
): ProfileIntelligence {
  return {
    name: data.name,
    avatarUrl: data.avatarUrl,
    archetype: data.archetype || Archetype.Unknown,
    // Use defaults if arrays are empty or missing
    skills: data.skills?.length ? data.skills : ['Professional'],
    couldBe: data.couldBe?.length ? data.couldBe : ['Collaborator'],
    goodFor: data.goodFor?.length ? data.goodFor : ['Projects'],
    firstSeen: data.firstSeen ? new Date(data.firstSeen) : undefined,
    jobChange,
  };
}

/**
 * Observe URL changes for SPA navigation
 */
function observeUrlChanges(): void {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      currentProfileId = null;

      if (isLinkedInProfileUrl(lastUrl)) {
        console.log('[Social Recall] Navigated to profile page');
        // Switch to full mode and extract intelligence
        if (panel) {
          panel.setMinimalMode(false);
        }
        // Small delay to let page content load
        setTimeout(() => handleProfilePage(), 500);
      } else {
        console.log('[Social Recall] Navigated away from profile page');
        // Switch to minimal mode
        if (panel) {
          panel.setMinimalMode(true);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
