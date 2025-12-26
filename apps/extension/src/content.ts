/**
 * Content Script for Social Recall
 * Injects floating intelligence panel into LinkedIn profile pages
 * Implements "Robocop mode" - passive capture of all viewed profiles
 */

// Debug: Immediately log when script is parsed
console.log('[Social Recall] ===== CONTENT SCRIPT STARTING =====');

import { createPanel, Archetype, type ProfileIntelligence, type Panel } from './panel';
import { extractProfileIdFromUrl, isLinkedInProfileUrl, type Employer } from './utils';
import { inferIntelligence, getProfileIntelligence, type ProfileData as AIProfileData, type CachedIntelligenceResult } from './ai-client';
import {
  waitForLinkedInProfile,
  waitForStable,
  waitForCompleteProfile,
  observeLazyContent,
} from './dom-utils';
import {
  detectChanges,
  recordHistory,
  type HistoryEntry,
} from './profile-history';
import { syncHistory, saveNote, updateNote, deleteNote, getNotesForContact, type HistoryEntrySync } from './sync';
import { parseVoyagerProfile, type ExtendedProfileData } from './voyager-api';

// Storage key for intercepted Voyager data
const INTERCEPTED_DATA_KEY = 'sr_voyager_data';

// AI skills version - bump this to force re-inference for all cached profiles
const AI_SKILLS_VERSION = 2;

interface StoredProfile {
  name: string;
  headline?: string;
  location?: string;
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
  recommendations?: string[];
  publications?: string[];
  organizations?: string[];
  interests?: string[];
  testScores?: string[];
  services?: string[];
  archetype?: Archetype;
  couldBe?: string[];
  goodFor?: string[];
  firstSeen: string;
  lastSeen: string;
  note?: string;
  aiVersion?: number; // Track AI skills version to force re-inference on updates
  history?: HistoryEntry[]; // Timestamped history of changes to name, headline, location, employers, education
  verified?: boolean; // Whether profile data was verified via scraper
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

  // Store timing in local storage history (safely)
  if (isExtensionContextValid()) {
    try {
      chrome.storage.local.get(['extractionHistory'], (result) => {
        if (!isExtensionContextValid()) return;
        const history = result.extractionHistory || [];
        history.unshift({
          profileId,
          durationMs,
          timestamp: Date.now(),
        });
        // Keep last 100 entries
        chrome.storage.local.set({ extractionHistory: history.slice(0, 100) });
      });
    } catch (e) {
      console.log('[Social Recall] Extension context invalidated during history storage');
    }
  }
}

/**
 * Load recent profiles from storage and show in history panel
 */
async function loadAndShowHistory(): Promise<void> {
  if (!panel) return;
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated, skipping loadAndShowHistory');
    return;
  }

  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (!isExtensionContextValid()) {
          resolve();
          return;
        }
        const notes = result.socialNotes || {};
        const profiles = Object.entries(notes)
          .map(([profileId, data]) => ({
            profileId,
            name: data.name,
            headline: data.headline,
            avatarUrl: data.avatarUrl,
            lastSeen: data.lastSeen || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
          .slice(0, 10); // Show last 10 profiles

        panel?.showHistory(profiles);
        resolve();
      });
    } catch (e) {
      console.log('[Social Recall] Extension context invalidated during loadAndShowHistory');
      resolve();
    }
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

  // Setup re-analyze callback
  panel.onReanalyze(() => {
    console.log('[Social Recall] Re-analyze requested');
    forceReanalyze();
  });

  // Setup add note callback
  panel.onAddNote(async (content: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    console.log('[Social Recall] Saving note for:', currentProfileId);
    const result = await saveNote(currentProfileId, content);
    if (result.success) {
      console.log('[Social Recall] Note saved successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      console.log('[Social Recall] Failed to save note:', result.error);
    }
    return result;
  });

  // Setup edit note callback
  panel.onEditNote(async (noteId: string, content: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    console.log('[Social Recall] Updating note:', noteId);
    const result = await updateNote(noteId, content);
    if (result.success) {
      console.log('[Social Recall] Note updated successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      console.log('[Social Recall] Failed to update note:', result.error);
    }
    return result;
  });

  // Setup delete note callback
  panel.onDeleteNote(async (noteId: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    console.log('[Social Recall] Deleting note:', noteId);
    const result = await deleteNote(noteId);
    if (result.success) {
      console.log('[Social Recall] Note deleted successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      console.log('[Social Recall] Failed to delete note:', result.error);
    }
    return result;
  });

  // Setup drag functionality
  setupDragListeners();

  // If on profile page, extract and display profile intelligence
  if (isLinkedInProfileUrl(window.location.href)) {
    console.log('[Social Recall] On profile page, extracting intelligence...');
    // Switch to profile mode (clears any history content and prepares for profile data)
    if (panel) {
      panel.setMinimalMode(false);
    }
    // Prime immediately, then extract fully
    primePanel();
    handleProfilePage();
  } else {
    console.log('[Social Recall] Not a profile page, showing history mode');
    // Show history mode - recent profiles when clicked
    if (panel) {
      panel.setMinimalMode(true);
      loadAndShowHistory();
    }
  }

  // Listen for URL changes (LinkedIn is a SPA)
  observeUrlChanges();

  // Listen for URL change messages from background script (more reliable for SPA)
  let lastHandledUrl = window.location.href;
  if (isExtensionContextValid()) {
    try {
      chrome.runtime.onMessage.addListener((message) => {
        if (!isExtensionContextValid()) return;
        if (message.type === 'URL_CHANGED') {
          console.log('[Social Recall] URL change message from background:', message.url);
          // Only handle if URL is different from last handled
          if (message.url !== lastHandledUrl) {
            const oldUrl = lastHandledUrl;
            lastHandledUrl = message.url;
            handleUrlChange(message.url, oldUrl);
          }
        }
      });
    } catch (e) {
      console.log('[Social Recall] Extension context invalidated, cannot add message listener');
    }
  }
}

/**
 * Inject the panel CSS into the page
 */
function injectStyles(): void {
  if (document.getElementById('sr-panel-styles')) {
    return;
  }

  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated, skipping style injection');
    return;
  }

  try {
    const link = document.createElement('link');
    link.id = 'sr-panel-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('panel.css');
    document.head.appendChild(link);
  } catch (e) {
    console.log('[Social Recall] Extension context invalidated during style injection');
  }
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
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.sync.set({ panelPosition: position });
  } catch (e) {
    console.log('[Social Recall] Extension context invalidated during savePosition');
  }
}

/**
 * Load saved panel position
 */
function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined;
  } catch {
    return false;
  }
}

async function loadPosition(): Promise<{ x: number; y: number } | null> {
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated, skipping loadPosition');
    return null;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['panelPosition'], (result) => {
        if (chrome.runtime.lastError) {
          console.log('[Social Recall] Storage error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result.panelPosition || null);
      });
    } catch (e) {
      console.log('[Social Recall] Extension context invalidated');
      resolve(null);
    }
  });
}

/**
 * Warm up the Vercel AI endpoint to avoid cold start delays
 * Sends a lightweight ping that wakes up the serverless function
 */
async function warmUpAI(): Promise<void> {
  try {
    const apiUrl = await getApiUrl();
    // Use HEAD request or minimal POST to warm up without full processing
    fetch(`${apiUrl}/api/infer-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warmup: true }),
    }).catch(() => {}); // Fire and forget, don't wait
    console.log('[Social Recall] AI warm-up ping sent');
  } catch {
    // Ignore errors - this is just a warm-up
  }
}

/**
 * Prime the panel with the profile name, title, and location immediately (before full extraction)
 */
function primePanel(): void {
  if (!panel) return;

  // Try to get the name from the H1 element quickly
  const h1 = document.querySelector('h1');
  const name = h1?.textContent?.trim() || 'Loading...';

  // Try to get avatar URL
  const avatarImg = document.querySelector('img.pv-top-card-profile-picture__image') as HTMLImageElement;
  const avatarUrl = avatarImg?.src;

  // Try to get headline (title)
  const headlineEl = document.querySelector('.text-body-medium.break-words');
  const headline = headlineEl?.textContent?.trim();

  // Try to get location
  const locationSelectors = [
    '.pv-text-details__left-panel span.text-body-small',
    '.text-body-small.inline.t-black--light.break-words',
  ];
  let location: string | undefined;
  for (const selector of locationSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 2 && text.length < 100 && !/^\d+[\d,]*\s*(connections?|followers?)$/i.test(text)) {
      location = text;
      break;
    }
  }

  console.log('[Social Recall] Priming panel with name:', name, 'headline:', headline, 'location:', location);
  panel.primeForProfile(name, headline, location, avatarUrl);
}

/**
 * Force re-analysis of the current profile by clearing cached AI data
 */
async function forceReanalyze(): Promise<void> {
  if (!currentProfileId) {
    console.log('[Social Recall] No current profile to re-analyze');
    return;
  }

  console.log('[Social Recall] Forcing re-analysis for:', currentProfileId);

  // Clear the aiVersion to force re-inference
  const storageKey = `profile:${currentProfileId}`;
  const result = await chrome.storage.local.get(storageKey);
  const storedData = result[storageKey] as StoredProfile | undefined;

  if (storedData) {
    // Remove aiVersion to trigger re-inference
    delete storedData.aiVersion;
    await chrome.storage.local.set({ [storageKey]: storedData });
    console.log('[Social Recall] Cleared aiVersion, re-running extraction');
  }

  // Reset current profile ID to allow re-extraction
  const profileId = currentProfileId;
  currentProfileId = null;

  // Re-run extraction
  await handleProfilePage();
}

/**
 * Handle LinkedIn profile page - extract data and update panel
 */
async function handleProfilePage(): Promise<void> {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated, aborting');
    return;
  }

  // Warm up AI endpoint early (fire and forget)
  warmUpAI();

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

  // Wait for visible content to load (NO auto-scrolling - respects user control)
  await waitForCompleteProfile({ timeout: 15000 });

  // Re-check context validity after wait
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated during wait, aborting');
    return;
  }

  // Extract profile data from page (includes background activity fetch)
  let profileData = await extractProfileData(profileId, startTime);

  // Check if we're still on the same profile after extraction
  if (profileId !== currentProfileId) {
    console.log('[Social Recall] Profile changed during extraction, aborting:', profileId);
    return;
  }

  // Get stored data for this profile
  const storedData = await getStoredProfile(profileId);

  // Merge and save (Robocop mode - auto-capture with AI intelligence)
  updateProgress('ai', startTime);
  let mergedData = await mergeProfileData(profileData, storedData);
  await saveProfile(profileId, mergedData);

  // Mark extraction complete
  updateProgress('complete', startTime);
  const durationMs = Date.now() - startTime;
  completeExtraction(profileId, durationMs);

  // Check for job changes
  const jobChange = detectJobChange(profileData, storedData);

  // Build intelligence object
  let intelligence = buildIntelligence(mergedData, jobChange);
  console.log('[Social Recall] Intelligence built:', JSON.stringify(intelligence, null, 2));

  // Check if we're still on the same profile (race condition guard)
  // User may have navigated away during extraction
  if (profileId !== currentProfileId) {
    console.log('[Social Recall] Profile changed during extraction, discarding results for:', profileId);
    return;
  }

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

    // Fetch and display notes from backend
    if (currentProfileId) {
      // Show loading state
      panel.setNotesLoading(true);

      getNotesForContact(currentProfileId).then(result => {
        if (result.success && result.notes && panel) {
          console.log(`[Social Recall] Loaded ${result.notes.length} notes from backend`);
          panel.setNotes(result.notes);
        } else if (!result.success) {
          console.log('[Social Recall] Failed to load notes:', result.error);
          // Show empty notes section even if fetch fails
          panel?.setNotes([]);
        }
      }).catch(err => {
        console.log('[Social Recall] Error fetching notes:', err);
        panel?.setNotes([]);
      });
    }
  }

  // Set up observer for lazy-loaded content (when user scrolls)
  // Re-extracts and merges data when new content appears
  const stopObserving = observeLazyContent(async () => {
    if (profileId !== currentProfileId || !panel) return;

    console.log('[Social Recall] Lazy content detected, re-extracting...');

    // Re-extract with new visible content
    const newProfileData = await extractProfileData(profileId, Date.now());
    if (profileId !== currentProfileId) return;

    // Check if we found new employers
    const oldEmployerCount = mergedData.employers?.length ?? 0;
    const newEmployerCount = newProfileData.employers?.length ?? 0;

    if (newEmployerCount > oldEmployerCount) {
      console.log(`[Social Recall] Found ${newEmployerCount - oldEmployerCount} new employers`);

      // Merge new data
      mergedData = await mergeProfileData(newProfileData, mergedData);
      await saveProfile(profileId, mergedData);

      // Update intelligence and panel
      intelligence = buildIntelligence(mergedData, jobChange);
      panel.setIntelligence(intelligence);
    }
  });

  // Clean up observer when profile changes
  const originalProfileId = profileId;
  const checkInterval = setInterval(() => {
    if (currentProfileId !== originalProfileId) {
      console.log('[Social Recall] Profile changed, stopping lazy content observer');
      stopObserving();
      clearInterval(checkInterval);
    }
  }, 1000);
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
  // Find "Show all" buttons/links - be VERY specific to avoid clicking wrong things
  // NOTE: Removed "skill" as it navigates to a separate page instead of expanding inline
  const showAllButtons = document.querySelectorAll([
    'a[id*="navigation-index-Show-all"]',
    'button[aria-label*="Show all"][aria-label*="experience"]',
    'button[aria-label*="Show all"][aria-label*="education"]',
    'button[aria-label*="Show all"][aria-label*="certification"]',
    'button[aria-label*="Show all"][aria-label*="license"]',
  ].join(', '));

  console.log(`[Social Recall] Found ${showAllButtons.length} expandable sections`);

  // Words that indicate we should NOT click this element (navigates away or unwanted action)
  const skipPatterns = /activit|post|message|connect|follow|more action|pending|withdraw|skill/i;

  for (const button of Array.from(showAllButtons)) {
    const btn = button as HTMLElement;
    const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';

    // Skip if matches any skip pattern
    if (skipPatterns.test(label)) {
      console.log(`[Social Recall] Skipping: ${label}`);
      continue;
    }

    // Only click if it looks like "Show all X" pattern
    if (!label.toLowerCase().includes('show all')) {
      continue;
    }

    try {
      btn.click();
      await wait(300);
      console.log(`[Social Recall] Expanded: ${label}`);
    } catch (e) {
      console.log(`[Social Recall] Failed to expand: ${label}`);
    }
  }

  // Expand "see more" text ONLY within profile sections, not header buttons
  const seeMoreButtons = document.querySelectorAll([
    'section .inline-show-more-text__button',
    'section button[aria-label*="see more"]',
  ].join(', '));

  for (const button of Array.from(seeMoreButtons)) {
    const btn = button as HTMLElement;
    const text = btn.textContent?.toLowerCase() || '';
    // Only click if it's actually a "see more" text expansion
    if (text.includes('see more') || text.includes('...more') || text === '…more') {
      try {
        btn.click();
        await wait(100);
      } catch (e) {
        // Ignore
      }
    }
  }

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
 * Strategy: Try Voyager API intercepted data first (complete, structured),
 * then fall back to DOM scraping for anything missing
 */
async function extractProfileData(profileId: string, startTime: number): Promise<Partial<StoredProfile>> {
  console.log('[Social Recall] Starting extraction...');
  updateProgress('expanding', startTime);

  // Try to get data from intercepted Voyager API first
  const voyagerData = getInterceptedVoyagerData();

  if (voyagerData) {
    console.log('[Social Recall] Using intercepted Voyager API data (complete, structured)');
    updateProgress('experience', startTime);

    // Voyager data is our primary source - it has complete employer/education history
    const profileData: Partial<StoredProfile> = {
      name: voyagerData.name,
      headline: voyagerData.headline,
      location: voyagerData.location,
      avatarUrl: voyagerData.avatarUrl,
      about: voyagerData.about,
      employers: voyagerData.employers,
      education: voyagerData.education,
      // Voyager doesn't provide these - fall back to DOM
      skills: extractSkills(),
      certifications: extractCertifications(),
      volunteering: extractVolunteering(),
      honorsAwards: extractHonorsAwards(),
      courses: extractCourses(),
      languages: extractLanguages(),
      activities: extractActivities(),
      lastSeen: new Date().toISOString(),
    };

    console.log('[Social Recall] Voyager extraction complete:', {
      name: profileData.name,
      employers: profileData.employers?.length,
      education: profileData.education?.length,
      skills: profileData.skills?.length,
    });

    updateProgress('complete', startTime);
    return profileData;
  }

  // Fall back to DOM scraping if no Voyager data available
  console.log('[Social Recall] No Voyager data, falling back to DOM scraping...');

  // Debug: Comprehensive DOM inspection
  try {
    debugLinkedInDOM();
  } catch (e) {
    console.log('[Social Recall] Debug DOM inspection error:', e);
  }

  console.log('[Social Recall] Extracting profile fields from DOM...');
  updateProgress('experience', startTime);

  // Extract all data from the main profile page only (no navigation)
  const profileData: Partial<StoredProfile> = {
    name: extractName(),
    headline: extractHeadline(),
    location: extractLocation(),
    avatarUrl: extractAvatarUrl(),
    about: extractAbout(),
    employers: extractEmployers(),
    education: extractEducation(),
    skills: extractSkills(),
    certifications: extractCertifications(),
    volunteering: extractVolunteering(),
    honorsAwards: extractHonorsAwards(),
    courses: extractCourses(),
    languages: extractLanguages(),
    activities: extractActivities(),
    lastSeen: new Date().toISOString(),
  };

  console.log('[Social Recall] DOM extraction complete:', {
    name: profileData.name,
    employers: profileData.employers?.length,
    education: profileData.education?.length,
    skills: profileData.skills?.length,
    certifications: profileData.certifications?.length,
    volunteering: profileData.volunteering?.length,
  });

  updateProgress('complete', startTime);
  return profileData;
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

function extractLocation(): string | undefined {
  // LinkedIn shows location in the profile header, usually after headline
  // Try various selectors LinkedIn uses for location
  const selectors = [
    // Primary location text
    '.pv-text-details__left-panel span.text-body-small',
    '.text-body-small.inline.t-black--light.break-words',
    // Location in profile card
    '.pv-top-card--list.pv-top-card--list-bullet li:nth-child(1)',
    // Alternative profile structure
    'span[class*="text-body-small"][class*="t-black--light"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim();
      // Location text is typically not too long and doesn't contain certain patterns
      if (text && text.length > 2 && text.length < 100) {
        // Skip if it looks like a connection count or follower count
        if (/^\d+[\d,]*\s*(connections?|followers?)$/i.test(text)) continue;
        // Skip if it's a pronoun indicator
        if (/^\([^)]+\)$/.test(text)) continue;
        // Skip if it looks like a link text
        if (text.includes('linkedin.com')) continue;
        // Location often contains a comma (City, State/Country) or is a single place
        console.log('[Social Recall] Found location:', text);
        return text;
      }
    }
  }

  console.log('[Social Recall] Location not found');
  return undefined;
}

function extractAvatarUrl(): string | undefined {
  const avatarImg = document.querySelector('.pv-top-card-profile-picture__image') as HTMLImageElement;
  return avatarImg?.src;
}

function debugLinkedInDOM(): void {
  console.log('[Social Recall] ===== DOM INSPECTION =====');

  // Check overall page state
  const mainContent = document.querySelector('main');
  console.log(`[Social Recall] Main element: ${mainContent ? 'found' : 'NOT FOUND'}, children: ${mainContent?.children.length || 0}`);

  // Show main's structure
  if (mainContent) {
    const firstChild = mainContent.firstElementChild;
    console.log(`[Social Recall] Main first child: ${firstChild?.tagName}.${firstChild?.className.slice(0, 50)}`);
  }

  // Find ALL sections (any class)
  const allSections = document.querySelectorAll('section');
  console.log(`[Social Recall] All sections: ${allSections.length}`);
  allSections.forEach((sec, i) => {
    if (i < 8) { // First 8 only
      const classes = sec.className.slice(0, 80);
      const id = sec.id ? ` id="${sec.id}"` : '';
      const dataSection = sec.getAttribute('data-section');
      const dataSectionAttr = dataSection ? ` data-section="${dataSection}"` : '';
      // Get first meaningful text in section
      const firstText = sec.querySelector('span, div')?.textContent?.trim().slice(0, 30) || '';
      console.log(`[Social Recall] section[${i}]:${id}${dataSectionAttr} class="${classes}" text="${firstText}"`);
    }
  });

  // Check for elements with id containing section names
  const sectionIds = ['experience', 'education', 'skills', 'activity', 'about'];
  for (const name of sectionIds) {
    const byId = document.querySelector(`[id*="${name}" i]`);
    if (byId) {
      const classes = typeof byId.className === 'string' ? byId.className : byId.className?.baseVal || '';
      console.log(`[Social Recall] Found element with id containing "${name}": ${byId.tagName}.${classes.slice(0, 40)}`);
    }
  }

  // Check for any h2 elements and their content
  const h2s = document.querySelectorAll('h2');
  console.log(`[Social Recall] h2 elements: ${h2s.length}`);
  h2s.forEach((h2, i) => {
    const text = h2.textContent?.trim().slice(0, 40);
    if (text && text.length > 2 && i < 10) {
      const parent = h2.parentElement;
      const section = h2.closest('section');
      console.log(`[Social Recall] h2[${i}]: "${text}" parent=${parent?.tagName}.${parent?.className.slice(0, 30)} section=${section?.className.slice(0, 30) || 'none'}`);
    }
  });

  // Look for common LinkedIn patterns
  const pvsElements = document.querySelectorAll('[class*="pvs-"]');
  console.log(`[Social Recall] Elements with pvs- class: ${pvsElements.length}`);

  const pvElements = document.querySelectorAll('[class*="pv-"]');
  console.log(`[Social Recall] Elements with pv- class: ${pvElements.length}`);

  // Check for profile-card sections (new LinkedIn structure)
  const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
  console.log(`[Social Recall] profile-card sections: ${profileCards.length}`);

  // Check for artdeco-card sections in main
  const artdecoSections = document.querySelectorAll('main section.artdeco-card');
  console.log(`[Social Recall] artdeco-card sections in main: ${artdecoSections.length}`);
  artdecoSections.forEach((card, i) => {
    if (i < 10) {
      // Try to find section header - look for visually-hidden or sr-only text
      const srOnly = card.querySelector('.visually-hidden, .sr-only, [class*="visually-hidden"]');
      const firstSpan = card.querySelector('span[aria-hidden="true"]');
      const anyText = srOnly?.textContent?.trim() || firstSpan?.textContent?.trim() || '';
      console.log(`[Social Recall] artdeco[${i}]: "${anyText.slice(0, 50)}"`);
    }
  });

  // Check for pvs-list containers
  const pvsLists = document.querySelectorAll('.pvs-list__container, [class*="pvs-list"]');
  console.log(`[Social Recall] pvs-list containers: ${pvsLists.length}`);

  // Find where "Experience" text lives (in any element, not just span)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let expFound = false;
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim() === 'Experience') {
      expFound = true;
      const parent = walker.currentNode.parentElement;
      const grandparent = parent?.parentElement;
      const section = parent?.closest('section');
      console.log(`[Social Recall] "Experience" text in: ${parent?.tagName}.${parent?.className.slice(0, 40)}`);
      console.log(`[Social Recall] "Experience" grandparent: ${grandparent?.tagName}.${grandparent?.className.slice(0, 40)}`);
      console.log(`[Social Recall] "Experience" section: ${section?.tagName}.${section?.className.slice(0, 50) || 'none'}`);
      break;
    }
  }
  if (!expFound) {
    console.log('[Social Recall] "Experience" text NOT FOUND anywhere in body');
    // Check if page is still loading
    const loaders = document.querySelectorAll('[class*="loader"], [class*="loading"], [class*="skeleton"]');
    console.log(`[Social Recall] Loading indicators found: ${loaders.length}`);
  }

  // Deep dive into artdeco-card sections to understand structure
  console.log('[Social Recall] ===== DEEP SECTION ANALYSIS =====');
  const mainSections = document.querySelectorAll('main section');
  mainSections.forEach((section, i) => {
    if (i >= 10) return;

    // Get all unique text content in this section (first 200 chars)
    const allText = section.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || '';
    console.log(`[Social Recall] Main section[${i}] text preview: "${allText}"`);

    // Check for company logos (indicates experience section)
    const logos = section.querySelectorAll('img[src*="company"], img[src*="shrink"]');
    if (logos.length > 0) {
      console.log(`[Social Recall] Main section[${i}] has ${logos.length} company logos - likely Experience/Education`);
    }

    // Check for specific LinkedIn elements
    const entityImages = section.querySelectorAll('[class*="entity-image"]');
    const pvsEntities = section.querySelectorAll('[class*="pvs-entity"]');
    if (entityImages.length > 0 || pvsEntities.length > 0) {
      console.log(`[Social Recall] Main section[${i}] has ${entityImages.length} entity-images, ${pvsEntities.length} pvs-entities`);
    }
  });
  console.log('[Social Recall] ===== END DEEP ANALYSIS =====');

  console.log('[Social Recall] ===== END DOM INSPECTION =====');
}

function findSectionByHeader(headerText: string): Element | null {
  const searchText = headerText.toLowerCase();

  // Strategy 1: Find pv-profile-card__anchor with id containing section name
  // LinkedIn uses <div id="experience" class="pv-profile-card__anchor"> inside sections
  const anchor = document.querySelector(`div.pv-profile-card__anchor[id*="${searchText}" i], [id*="${searchText}" i].pv-profile-card__anchor`);
  if (anchor) {
    const section = anchor.closest('section');
    if (section) {
      console.log(`[Social Recall] Found "${headerText}" via pv-profile-card__anchor id`);
      return section;
    }
  }

  // Strategy 2: Find any element with id containing section name
  const byId = document.querySelector(`section[id*="${searchText}" i], div[id*="${searchText}" i]`);
  if (byId) {
    const section = byId.tagName === 'SECTION' ? byId : byId.closest('section');
    if (section) {
      console.log(`[Social Recall] Found "${headerText}" via id attribute`);
      return section;
    }
  }

  // Strategy 2: Find section with data-view-name="profile-card" that contains matching text
  const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
  for (const card of profileCards) {
    // Check first few spans for header text
    const spans = card.querySelectorAll('span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(5, spans.length); i++) {
      const text = spans[i].textContent?.trim().toLowerCase();
      if (text === searchText || text?.startsWith(searchText)) {
        console.log(`[Social Recall] Found "${headerText}" via profile-card data-view-name`);
        return card;
      }
    }
  }

  // Strategy 3: Search all artdeco-card sections for header text in any span
  const artdecoSections = document.querySelectorAll('main section.artdeco-card');
  for (const section of artdecoSections) {
    // Check visually-hidden elements (screen reader text often has section names)
    const srOnly = section.querySelector('.visually-hidden, .sr-only, [class*="visually-hidden"]');
    if (srOnly?.textContent?.toLowerCase().includes(searchText)) {
      console.log(`[Social Recall] Found "${headerText}" via visually-hidden text`);
      return section;
    }

    // Check first few spans for header text
    const spans = section.querySelectorAll('span[aria-hidden="true"], span.t-bold');
    for (let i = 0; i < Math.min(10, spans.length); i++) {
      const text = spans[i].textContent?.trim().toLowerCase();
      if (text === searchText || text?.startsWith(searchText)) {
        console.log(`[Social Recall] Found "${headerText}" via artdeco-card span`);
        return section;
      }
    }
  }

  // Strategy 4: Find any section containing an h2/div with the header text
  const allSections = document.querySelectorAll('section');
  for (const section of allSections) {
    // Check h2 elements
    const h2 = section.querySelector('h2');
    if (h2?.textContent?.trim().toLowerCase().includes(searchText)) {
      console.log(`[Social Recall] Found "${headerText}" via section h2`);
      return section;
    }
    // Check first few text elements - including deeper nesting
    const firstSpans = section.querySelectorAll('div span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(5, firstSpans.length); i++) {
      if (firstSpans[i].textContent?.trim().toLowerCase() === searchText) {
        console.log(`[Social Recall] Found "${headerText}" via section span`);
        return section;
      }
    }
  }

  // Strategy 5: TreeWalker to find the exact text anywhere
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim().toLowerCase() === searchText) {
      const parent = walker.currentNode.parentElement;
      const section = parent?.closest('section');
      if (section) {
        console.log(`[Social Recall] Found "${headerText}" via TreeWalker text search`);
        return section;
      }
    }
  }

  // Strategy 6: Find div with pvs-list that's preceded by the header text
  const allSpans = document.querySelectorAll('span[aria-hidden="true"]');
  for (const span of allSpans) {
    if (span.textContent?.trim().toLowerCase() === searchText) {
      // Found the header text, now find its containing section
      const section = span.closest('section');
      if (section) {
        console.log(`[Social Recall] Found "${headerText}" via span search`);
        return section;
      }
    }
  }

  console.log(`[Social Recall] Could not find "${headerText}" section`);
  return null;
}

function extractEmployers(): Employer[] {
  const employers: Employer[] = [];
  const seen = new Set<string>();

  // Try to find Experience section by header
  const experienceSection = findSectionByHeader('Experience');

  // If found, extract from that section
  let searchContainer: Element | Document = experienceSection || document;
  let sectionFound = !!experienceSection;

  // Fallback: if no Experience section found, look for section with company logos in main
  if (!experienceSection) {
    const mainSections = document.querySelectorAll('main section');
    for (const section of mainSections) {
      const logos = section.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
      // If section has 2+ company logos and is below the top card, likely Experience
      if (logos.length >= 2) {
        const sectionRect = section.getBoundingClientRect();
        // Skip if it's at the very top (profile card area)
        if (sectionRect.top > 300) {
          console.log('[Social Recall] Found Experience section by company logo pattern');
          searchContainer = section;
          sectionFound = true;
          break;
        }
      }
    }
  }

  if (sectionFound) {
    console.log('[Social Recall] Extracting employers from section');
  } else {
    console.log('[Social Recall] Experience section not found, searching entire main');
    searchContainer = document.querySelector('main') || document;
  }

  // Find all divs that look like experience entries
  const allDivs = searchContainer.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for divs that contain company logo images
    const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]') as HTMLImageElement;
    if (!img) continue;

    // Make sure this div is a direct container (not a parent of many items)
    const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
    if (nestedImgs.length > 1) continue; // Skip parent containers

    // Extract company name from this specific experience entry
    const companyName = extractCompanyNameFromExperience(div);
    if (companyName && !seen.has(companyName.toLowerCase())) {
      seen.add(companyName.toLowerCase());
      employers.push({
        company: companyName,
        logo: img.src || '',
      });
      console.log(`[Social Recall] Found employer: ${companyName}`);
    }
  }

  console.log('[Social Recall] Extracted employers:', employers.length, employers.map(e => e.company));
  return employers;
}

function extractCompanyNameFromExperience(container: Element): string | null {
  // LinkedIn's experience entry structure (based on DOM analysis):
  // 1. Company name (first substantial text, often NOT in bold)
  // 2. Tenure duration (e.g., "17 yrs 1 mo")
  // 3. Job title (often in bold)
  // 4. Date range with duration (e.g., "Jul 2020 - Present · 5 yrs 6 mos")

  const spans = container.querySelectorAll('span[aria-hidden="true"]');

  // Patterns to skip
  const datePattern = /^\w{3} \d{4}|^\d{4}|Present|\d+\s*(yr|yrs|mo|mos|year|month)/i;
  const locationPattern = /^(Remote|Hybrid|On-site)$|,\s*(Remote|Hybrid|On-site)$/i;
  const jobTitlePattern = /^(founder|co-founder|ceo|cto|cfo|coo|president|director|manager|lead|senior|junior|engineer|developer|analyst|consultant|specialist|coordinator|associate|intern|head of|vp|vice|chairman|co-chair|partner|advisor|member|board|investor|founding|executive|chief|general|principal|owner|creator|author|host|producer|coach|mentor|speaker|ambassador|evangelist|advocate)/i;

  // Look for company name patterns
  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2 || text.length > 100) continue;

    // Skip if it looks like a date or tenure
    if (datePattern.test(text)) continue;
    if (text.includes(' · ') && /\d+\s*(yr|mo)/i.test(text)) continue; // "Jul 2020 - Present · 5 yrs"

    // Skip location
    if (locationPattern.test(text)) continue;

    // Skip job titles
    if (jobTitlePattern.test(text)) continue;

    // Skip generic text
    if (text === 'Experience' || text === 'Skills' || text.includes('endorsement')) continue;

    // Skip description text (usually longer)
    if (text.length > 80) continue;

    // Company name with employment type: "NEVERHACK Estonia · Full-time"
    if (text.includes(' · ')) {
      const parts = text.split(' · ');
      const employmentTypes = ['full-time', 'part-time', 'contract', 'freelance', 'self-employed', 'internship', 'apprenticeship', 'seasonal'];
      const secondPart = parts[1]?.toLowerCase() || '';
      if (employmentTypes.some(type => secondPart.includes(type))) {
        const company = parts[0].trim();
        if (company.length > 2 && company.length < 80) {
          return company;
        }
      }
    }

    // Standalone company name - check if it's likely a company
    // Companies often: have capital letters, are 2-5 words, don't start with job title words
    const words = text.split(/\s+/);
    if (words.length >= 1 && words.length <= 8) {
      // If we've reached here, this is likely a company name
      // (it's not a date, location, or job title)
      return text;
    }
  }

  return null;
}

function extractEmployersFromContainer(container: Element, employers: Employer[], seen: Set<string>): void {
  // Find list items within the container
  const items = container.querySelectorAll('li[class*="pvs-list__item"], li[class*="artdeco-list__item"], li');

  for (const item of items) {
    const companyName = extractCompanyNameFromItem(item);
    if (companyName && !seen.has(companyName.toLowerCase())) {
      seen.add(companyName.toLowerCase());
      const logoImg = item.querySelector('img[width="48"], img[class*="entity-image"], img[src*="company-logo"]') as HTMLImageElement;
      employers.push({
        company: companyName,
        logo: logoImg?.src || '',
      });
    }
  }
}

function extractCompanyNameFromItem(item: Element): string | null {
  // Try multiple selectors for company name
  const selectors = [
    '.t-14.t-normal span[aria-hidden="true"]',
    '[class*="t-normal"] span[aria-hidden="true"]',
    '.hoverable-link-text span[aria-hidden="true"]',
    'span.t-14.t-normal',
    // For grouped experience (multiple roles at same company)
    '.t-bold span[aria-hidden="true"]',
    // Fallback to any text elements
    'span[aria-hidden="true"]',
  ];

  for (const sel of selectors) {
    const el = item.querySelector(sel);
    if (el?.textContent?.trim()) {
      const text = el.textContent.trim();

      // Skip if it looks like a date range
      if (/^\w{3} \d{4}/.test(text) || /^\d{4}/.test(text) || text.includes('Present')) {
        continue;
      }

      // Company name is usually before " · " separator
      const company = text.split(' · ')[0].trim();

      // Filter out garbage data
      if (!isValidCompanyName(company)) {
        continue;
      }

      if (company && company.length > 1 && company.length < 100) {
        return company;
      }
    }
  }

  return null;
}

function isValidCompanyName(name: string): boolean {
  if (!name || name.length < 2) return false;

  const lowerName = name.toLowerCase();

  // Skip education-like entries
  if (/^(bachelor|master|doctor|j\.?d\.?|m\.?d\.?|ph\.?d\.?|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|m\.?b\.?a\.?)/i.test(name)) {
    return false;
  }

  // Skip connection degree indicators
  if (/^·\s*(1st|2nd|3rd)$/i.test(name)) {
    return false;
  }

  // Skip follower counts
  if (/^\d+[\d,]*\s*followers?$/i.test(name)) {
    return false;
  }

  // Skip if it's just a person's name (typically short, 1-3 words, no company indicators)
  // But be careful - some companies are named after people
  const words = name.split(/\s+/);
  if (words.length <= 2 && !lowerName.includes('inc') && !lowerName.includes('llc') &&
      !lowerName.includes('corp') && !lowerName.includes('company') &&
      !lowerName.includes('institute') && !lowerName.includes('group') &&
      !lowerName.includes('consulting') && !lowerName.includes('services') &&
      !lowerName.includes('solutions') && !lowerName.includes('partners')) {
    // Check if it looks like "FirstName LastName" or "FirstName L."
    if (/^[A-Z][a-z]+\s+[A-Z]\.?$/.test(name) || /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) {
      // Could be a person's name, skip unless it has company-like suffixes
      return false;
    }
  }

  // Skip degree fields and honors
  if (lowerName.includes('summa cum laude') || lowerName.includes('magna cum laude') ||
      lowerName.includes('cum laude') || lowerName.includes('phi beta kappa') ||
      lowerName.includes('legal studies') || lowerName.includes('computer science') ||
      lowerName.includes('business administration')) {
    return false;
  }

  // Skip job titles that got picked up
  if (/^(senior|junior|chief|vice|president|director|manager|engineer|developer|analyst|consultant|attorney|lawyer|counsel|partner|associate|intern)/i.test(name) &&
      !lowerName.includes('inc') && !lowerName.includes('llc') && !lowerName.includes('corp')) {
    return false;
  }

  // Skip discussion/podcast entries
  if (lowerName.includes('discussions from') || lowerName.includes('podcast')) {
    return false;
  }

  return true;
}

function extractAbout(): string | undefined {
  const aboutSection = findSectionByHeader('About');
  if (!aboutSection) return undefined;

  const textEl = aboutSection.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
    aboutSection.querySelector('[class*="inline-show-more-text"] span[aria-hidden="true"]') ||
    aboutSection.querySelector('span[aria-hidden="true"]');
  return textEl?.textContent?.trim();
}

function extractEducation(): Education[] {
  const education: Education[] = [];
  const section = findSectionByHeader('Education');
  if (!section) {
    console.log('[Social Recall] Education section not found');
    return education;
  }

  console.log('[Social Recall] Found Education section');
  const seen = new Set<string>();

  // Find divs with school logo images (education entries have school logos)
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for divs containing education logo images
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;
    if (!img) continue;

    // Skip parent containers with multiple images
    const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
    if (nestedImgs.length > 1) continue;

    // Extract education info from spans
    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    let school = '';
    let degree = '';
    let field = '';
    let dates = '';

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text) continue;

      // Date pattern: "1989 - 1992" or "2020 - Present"
      if (/^\d{4}\s*-\s*(\d{4}|Present)$/.test(text)) {
        dates = text;
        continue;
      }

      // School name is usually the first substantial text (often bold)
      if (!school && text.length > 2 && !text.includes(',')) {
        // Check if parent has bold styling
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          school = text;
          continue;
        }
      }

      // Degree info often contains comma: "Bachelor's, Computer Science"
      if (!degree && text.includes(',')) {
        const parts = text.split(',').map(s => s.trim());
        degree = parts[0];
        field = parts.slice(1).join(', ');
        continue;
      }

      // If we don't have school yet, this might be it
      if (!school && text.length > 2 && text.length < 100) {
        school = text;
      }
    }

    if (school && !seen.has(school.toLowerCase())) {
      seen.add(school.toLowerCase());
      education.push({ school, degree, field, dates });
      console.log(`[Social Recall] Found education: ${school}`);
    }
  }

  console.log('[Social Recall] Extracted education:', education.length);
  return education;
}

function extractHonorsAwards(): string[] {
  const awards: string[] = [];
  const section = findSectionByHeader('Honors') || findSectionByHeader('Awards');
  if (!section) return awards;

  const seen = new Set<string>();
  // Look for bold text in the section (award names are typically bold)
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      awards.push(text);
    }
  }

  return awards;
}

function extractCourses(): string[] {
  const courses: string[] = [];
  const section = findSectionByHeader('Courses');
  if (!section) return courses;

  const seen = new Set<string>();
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      courses.push(text);
    }
  }

  return courses;
}

function extractLanguages(): string[] {
  const languages: string[] = [];
  const section = findSectionByHeader('Languages');
  if (!section) return languages;

  const seen = new Set<string>();
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    // Language names are short
    if (text && text.length > 1 && text.length < 50 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      languages.push(text);
    }
  }

  return languages;
}

function extractVolunteering(): Volunteering[] {
  const volunteering: Volunteering[] = [];
  const section = findSectionByHeader('Volunteer');
  if (!section) {
    console.log('[Social Recall] Volunteer section not found');
    return volunteering;
  }

  console.log('[Social Recall] Found Volunteer section');
  const seen = new Set<string>();

  // Find divs with organization logos or volunteer entries
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for entries (may or may not have images)
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;

    // For volunteering, we might not always have images, so check for text patterns too
    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    if (spans.length < 2) continue; // Need at least role/org

    // Skip nested containers
    if (img) {
      const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
      if (nestedImgs.length > 1) continue;
    }

    let role = '';
    let organization = '';
    let cause = '';

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text || text.length < 2) continue;

      // Skip date ranges
      if (/^\w{3} \d{4}\s*-/.test(text) || /^\d+\s*(yr|mo)/.test(text)) {
        continue;
      }

      // Role is typically bold
      if (!role) {
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          role = text;
          continue;
        }
      }

      // Organization comes after role
      if (role && !organization && text.length > 2) {
        organization = text;
        continue;
      }

      // If no role yet, first text might be it
      if (!role && text.length > 2 && text.length < 80) {
        role = text;
      }
    }

    const key = `${role}-${organization}`.toLowerCase();
    if ((role || organization) && !seen.has(key)) {
      seen.add(key);
      volunteering.push({ organization, role, cause });
      console.log(`[Social Recall] Found volunteering: ${role} at ${organization}`);
    }
  }

  console.log('[Social Recall] Extracted volunteering:', volunteering.length);
  return volunteering;
}

function extractCertifications(): Certification[] {
  const certifications: Certification[] = [];
  const section = findSectionByHeader('Licenses') || findSectionByHeader('Certifications');
  if (!section) {
    console.log('[Social Recall] Certifications section not found');
    return certifications;
  }

  console.log('[Social Recall] Found Certifications section');
  const seen = new Set<string>();

  // Find divs with certification logos
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;
    if (!img) continue;

    const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
    if (nestedImgs.length > 1) continue;

    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    let name = '';
    let issuer = '';
    let issueDate: string | undefined;

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text) continue;

      // Issue date pattern: "Issued Jun 2023" or "Jun 2023"
      if (text.startsWith('Issued ')) {
        issueDate = text.replace('Issued ', '');
        continue;
      }
      if (/^[A-Z][a-z]{2} \d{4}$/.test(text)) {
        issueDate = text;
        continue;
      }

      // First substantial text is likely the certification name
      if (!name && text.length > 2) {
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          name = text;
          continue;
        }
      }

      // Issuer is typically second
      if (name && !issuer && text.length > 2) {
        issuer = text;
        continue;
      }

      if (!name && text.length > 2 && text.length < 100) {
        name = text;
      }
    }

    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      certifications.push({ name, issuer, issueDate });
      console.log(`[Social Recall] Found certification: ${name}`);
    }
  }

  console.log('[Social Recall] Extracted certifications:', certifications.length);
  return certifications;
}

/**
 * Extract skills from the main profile page Skills section
 * Only extracts what's visible without clicking "Show all skills"
 */
function extractSkills(): string[] {
  const skills: string[] = [];
  const section = findSectionByHeader('Skills');
  if (!section) {
    console.log('[Social Recall] Skills section not found');
    return skills;
  }

  console.log('[Social Recall] Found Skills section');
  const seen = new Set<string>();

  // Skills are typically displayed with bold text for the skill name
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2) continue;

    // Skip UI elements
    if (text.includes('Show all') || text.includes('endorsement')) continue;

    // Skip if it looks like a number (endorsement count)
    if (/^\d+$/.test(text)) continue;

    if (text.length < 60 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      skills.push(text);
      console.log(`[Social Recall] Found skill: ${text}`);
    }
  }

  // Fallback: look for any span that might be a skill name in list items
  if (skills.length === 0) {
    const listItems = section.querySelectorAll('li span[aria-hidden="true"]');
    for (const span of listItems) {
      const text = span.textContent?.trim();
      if (!text || text.length < 2 || text.length > 60) continue;
      if (text.includes('Show all') || text.includes('endorsement')) continue;
      if (/^\d+$/.test(text)) continue;

      if (!seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        skills.push(text);
      }
    }
  }

  console.log('[Social Recall] Extracted skills:', skills.length, skills.slice(0, 5));
  return skills;
}

/**
 * Extract activities from the main profile page Activity section
 * Only reads what's visible on the main profile - no navigation or background fetching
 * Limited to what LinkedIn shows in the preview (typically 3-5 items)
 */
function extractActivities(): Activity[] {
  const activities: Activity[] = [];
  const MAX_ACTIVITIES = 20;

  const activitySection = findSectionByHeader('Activity');
  if (!activitySection) {
    console.log('[Social Recall] Activity section not found on main page');
    return activities;
  }

  console.log('[Social Recall] Found Activity section on profile page');
  const seen = new Set<string>();

  // LinkedIn Activity section often uses a carousel with cards
  // Look for text content in various places
  const postTexts = activitySection.querySelectorAll('span[aria-hidden="true"], .update-components-text, .feed-shared-text');

  // Debug: show what we're finding
  const allTexts = Array.from(postTexts).slice(0, 10).map(el => el.textContent?.trim().slice(0, 50));
  console.log('[Social Recall] Activity section text samples:', allTexts);

  for (const span of postTexts) {
    if (activities.length >= MAX_ACTIVITIES) break;
    const text = span.textContent?.trim();

    // Skip UI elements and short text
    if (!text || text.length < 20) continue;
    if (text.includes('Show all') || text.includes('follower') || text.includes('reaction')) continue;
    if (/^\d+\s*(reactions?|comments?|reposts?)$/.test(text)) continue;

    // Deduplicate
    const textLower = text.toLowerCase();
    if (seen.has(textLower)) continue;
    seen.add(textLower);

    activities.push({
      type: 'post',
      text: text.slice(0, 500),
    });
    console.log(`[Social Recall] Found activity post: ${text.slice(0, 50)}...`);
  }

  console.log(`[Social Recall] Extracted ${activities.length} posts from profile Activity section`);
  return activities;
}

/**
 * Get intercepted Voyager API data from sessionStorage
 * The voyager-interceptor.ts script stores intercepted data here
 */
function getInterceptedVoyagerData(): ExtendedProfileData | null {
  try {
    const stored = sessionStorage.getItem(INTERCEPTED_DATA_KEY);
    if (!stored) {
      console.log('[Social Recall] No intercepted Voyager data found');
      return null;
    }

    const dataArray = JSON.parse(stored);
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return null;
    }

    // Get the most recent entry
    const latest = dataArray[dataArray.length - 1];
    if (!latest?.data) {
      return null;
    }

    // Parse the Voyager response
    const parsed = parseVoyagerProfile(latest.data);
    if (parsed) {
      console.log('[Social Recall] Successfully parsed Voyager data:', {
        name: parsed.name,
        employers: parsed.employers?.length,
        education: parsed.education?.length,
      });
    }
    return parsed;
  } catch (e) {
    console.error('[Social Recall] Failed to parse intercepted Voyager data:', e);
    return null;
  }
}

/**
 * Listen for real-time Voyager data interception events
 * This allows us to get data as soon as it's intercepted without polling sessionStorage
 */
function setupVoyagerDataListener(callback: (data: ExtendedProfileData) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      const parsed = parseVoyagerProfile(customEvent.detail);
      if (parsed) {
        console.log('[Social Recall] Real-time Voyager data received');
        callback(parsed);
      }
    }
  };

  window.addEventListener('voyager-data-intercepted', handler);
  return () => window.removeEventListener('voyager-data-intercepted', handler);
}

/**
 * Get stored profile data
 */
async function getStoredProfile(profileId: string): Promise<StoredProfile | null> {
  if (!isExtensionContextValid()) {
    return null;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        const notes = result.socialNotes || {};
        resolve(notes[profileId] || null);
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save profile data
 */
async function saveProfile(profileId: string, data: StoredProfile): Promise<void> {
  if (!isExtensionContextValid()) {
    return;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }
        const notes = result.socialNotes || {};
        notes[profileId] = data;
        chrome.storage.sync.set({ socialNotes: notes }, () => {
          if (chrome.runtime.lastError) {
            console.log('[Social Recall] Failed to save:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    } catch {
      resolve();
    }
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
      location: newData.location,
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
      recommendations: newData.recommendations,
      publications: newData.publications,
      organizations: newData.organizations,
      interests: newData.interests,
      testScores: newData.testScores,
      services: newData.services,
      firstSeen: now,
      lastSeen: now,
      // Default intelligence values - use scraped skills if available
      archetype: inferArchetype(newData),
      skills: newData.skills?.length ? newData.skills : [],
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
    location: newData.location || storedData.location,
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
    recommendations: newData.recommendations || storedData.recommendations,
    publications: newData.publications || storedData.publications,
    organizations: newData.organizations || storedData.organizations,
    interests: newData.interests || storedData.interests,
    testScores: newData.testScores || storedData.testScores,
    services: newData.services || storedData.services,
    // Always update skills from scraping (fresh data)
    skills: newData.skills?.length ? newData.skills : storedData.skills,
    lastSeen: now,
    // Recompute these if archetype was invalid
    ...(needsRecompute && {
      archetype: inferArchetype(newData),
      couldBe: inferCouldBe(newData),
      goodFor: inferGoodFor(newData),
    }),
  };
}

/**
 * Get the web app URL from storage or use default
 */
const DEFAULT_WEB_APP_URL = 'https://www.socialrecall.now';

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

  // Detect changes if we have stored data
  let historyUpdates: HistoryEntry[] = [];
  if (storedData) {
    const changes = detectChanges(storedData, newData);
    if (changes.length > 0) {
      console.log('[Social Recall] Detected changes:', changes.map(c => c.field));
      const withHistory = recordHistory(storedData, changes, now);
      historyUpdates = withHistory.history || [];

      // Sync new history entries to backend (fire and forget)
      const profileId = extractProfileIdFromUrl(window.location.href);
      if (profileId) {
        const newEntries: HistoryEntrySync[] = changes.map(change => ({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          detectedAt: now,
        }));
        syncHistory(profileId, newEntries).then(result => {
          if (result.success) {
            console.log('[Social Recall] History synced to backend:', result.synced);
          } else {
            console.log('[Social Recall] History sync failed:', result.error);
          }
        }).catch(err => {
          console.log('[Social Recall] History sync error:', err);
        });
      }
    } else {
      historyUpdates = storedData.history || [];
    }
  }

  // If we already have stored data with a VALID archetype AND real AI-derived intelligence, just update profile data
  // Old archetypes from previous versions are invalidated and recomputed
  // Also re-run AI if archetype is "unknown" with no real skills (likely a previous failure)
  // Check aiVersion to force re-inference when AI logic changes
  const hasRealIntelligence = storedData?.skills?.length &&
    storedData.skills[0] !== 'Professional' &&
    storedData.archetype !== Archetype.Unknown &&
    storedData.aiVersion === AI_SKILLS_VERSION; // Must match current AI version

  if (storedData && isValidArchetype(storedData.archetype) && hasRealIntelligence) {
    console.log('[Social Recall] Using stored data with valid archetype:', storedData.archetype, 'aiVersion:', storedData.aiVersion);
    return {
      ...storedData,
      name: newData.name || storedData.name,
      headline: newData.headline || storedData.headline,
      location: newData.location || storedData.location,
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
      history: historyUpdates.length > 0 ? historyUpdates : storedData.history,
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
    const linkedinId = extractProfileIdFromUrl(window.location.href);
    console.log('[Social Recall] Calling AI inference at:', apiUrl);
    console.log('[Social Recall] Profile data being sent:', JSON.stringify(aiProfileData, null, 2));

    // Use the new caching endpoint if we have a linkedin_id, otherwise fall back to direct inference
    let result: CachedIntelligenceResult;
    if (linkedinId) {
      result = await getProfileIntelligence(aiProfileData, { apiUrl, timeoutMs: 15000, linkedinId });
      console.log('[Social Recall] AI result cached:', result.cached);
      console.log('[Social Recall] AI result verified:', result.verified);
    } else {
      // Fall back to direct inference if we can't get the linkedin_id
      const fallbackResult = await inferIntelligence(aiProfileData, { apiUrl, timeoutMs: 15000 });
      result = { ...fallbackResult, cached: false, verified: false };
    }
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
        location: newData.location,
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
        recommendations: newData.recommendations,
        publications: newData.publications,
        organizations: newData.organizations,
        interests: newData.interests,
        testScores: newData.testScores,
        services: newData.services,
        firstSeen: storedData?.firstSeen || now,
        lastSeen: now,
        archetype: archetypeMap[result.archetype] || Archetype.Unknown,
        // Use AI-derived skills, fall back to scraped skills if AI returns none
        skills: result.skills?.length ? result.skills.map(s => s.name) : (newData.skills || []),
        couldBe: result.couldBe || inferCouldBe(newData),
        goodFor: result.goodFor || inferGoodFor(newData),
        note: storedData?.note,
        aiVersion: AI_SKILLS_VERSION, // Mark as AI-generated with current version
        history: historyUpdates.length > 0 ? historyUpdates : storedData?.history,
        verified: result.verified ?? false,
      };
    }
  } catch (error) {
    console.log('[Social Recall] AI inference failed, using local heuristics:', error);
  }

  // Fallback to local heuristics - pass history updates
  const syncResult = mergeProfileDataSync(newData, storedData);
  if (historyUpdates.length > 0) {
    syncResult.history = historyUpdates;
  }
  return syncResult;
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
    headline: data.headline,
    location: data.location,
    avatarUrl: data.avatarUrl,
    archetype: data.archetype || Archetype.Unknown,
    // Use defaults if arrays are empty or missing
    skills: data.skills?.length ? data.skills : ['Professional'],
    couldBe: data.couldBe?.length ? data.couldBe : ['Collaborator'],
    goodFor: data.goodFor?.length ? data.goodFor : ['Projects'],
    firstSeen: data.firstSeen ? new Date(data.firstSeen) : undefined,
    jobChange,
    history: data.history,
    verified: data.verified,
  };
}

/**
 * Handle URL change - called when navigation is detected
 */
function handleUrlChange(newUrl: string, lastUrl: string): void {
  if (newUrl === lastUrl) return;

  console.log('[Social Recall] URL changed from', lastUrl, 'to', newUrl);
  currentProfileId = null;

  if (isLinkedInProfileUrl(newUrl)) {
    console.log('[Social Recall] Navigated to profile page');
    // Switch to full mode and extract intelligence
    if (panel) {
      panel.setMinimalMode(false);
      // Prime the panel immediately with whatever name we can find
      primePanel();
    }
    // Small delay to let page content load
    setTimeout(() => handleProfilePage(), 500);
  } else {
    console.log('[Social Recall] Navigated away from profile page');
    // Switch to history mode
    if (panel) {
      panel.setMinimalMode(true);
      loadAndShowHistory();
    }
  }
}

/**
 * Observe URL changes for SPA navigation
 * Uses multiple strategies for reliability:
 * 1. Intercept history.pushState and replaceState (programmatic navigation)
 * 2. Listen to popstate event (back/forward navigation)
 * 3. MutationObserver as fallback (catches any missed changes)
 */
function observeUrlChanges(): void {
  let lastUrl = window.location.href;

  // Helper to check and handle URL change
  const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = currentUrl;
      handleUrlChange(currentUrl, oldUrl);
    }
  };

  // Strategy 1: Intercept history.pushState and history.replaceState
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function(...args) {
    originalPushState(...args);
    console.log('[Social Recall] history.pushState detected');
    checkUrlChange();
  };

  history.replaceState = function(...args) {
    originalReplaceState(...args);
    console.log('[Social Recall] history.replaceState detected');
    checkUrlChange();
  };

  // Strategy 2: Listen to popstate event (back/forward navigation)
  window.addEventListener('popstate', () => {
    console.log('[Social Recall] popstate event detected');
    checkUrlChange();
  });

  // Strategy 3: MutationObserver as fallback
  // Some SPAs might change URL in ways we don't catch above
  const observer = new MutationObserver(() => {
    checkUrlChange();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[Social Recall] URL change observers installed');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
