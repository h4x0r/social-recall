/**
 * Content Script for Social Recall
 * Injects floating intelligence panel into LinkedIn profile pages
 * Implements "Robocop mode" - passive capture of all viewed profiles
 */

// Debug: Immediately log when script is parsed
logger.debug('===== CONTENT SCRIPT STARTING =====');

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
import {
  type Education,
  type Volunteering,
  type Certification,
  type Activity,
  type Project,
  isExtensionContextValid,
  wait,
} from './types';
import {
  stripNotificationBadge,
  extractName,
  extractHeadline,
  extractLocation,
  extractAvatarUrl,
  extractEmployers,
  extractAbout,
  extractEducation,
  extractSkills,
  extractCertifications,
  extractVolunteering,
  extractActivities,
  extractRecommendations,
  extractPublications,
  extractOrganizations,
  extractInterests,
  extractHonorsAwards,
  extractCourses,
  extractLanguages,
  extractTestScores,
  extractServices,
  extractProjects,
} from './dom-extractors';
import {
  getStoredProfile,
  saveProfile,
  getApiUrl,
  DEFAULT_WEB_APP_URL,
} from './storage';
import {
  VALID_ARCHETYPES,
  isValidArchetype,
  inferArchetype,
  inferCouldBe,
  inferGoodFor,
} from './profile-merge';
import { logger } from './logger';
import { hasConsent, grantConsent, getConsent } from './consent';


// AI skills version - bump this to force re-inference for all cached profiles
const AI_SKILLS_VERSION = 2;

// Set to true to disable API writes during testing
// This allows testing data extraction without writing to Supabase
const DISABLE_API_WRITES = true;

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
  projects?: Project[];
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
  { id: 'loading', label: 'Loading profile' },
  { id: 'expanding', label: 'Expanding sections' },
  { id: 'experience', label: 'Extracting experience' },
  { id: 'skills', label: 'Extracting skills' },
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
      logger.debug('Extension context invalidated during history storage');
    }
  }
}

/**
 * Load recent profiles from storage and show in history panel
 */
async function loadAndShowHistory(): Promise<void> {
  if (!panel) return;
  if (!isExtensionContextValid()) {
    logger.debug('Extension context invalidated, skipping loadAndShowHistory');
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
      logger.debug('Extension context invalidated during loadAndShowHistory');
      resolve();
    }
  });
}

/**
 * Initialize the floating panel on all LinkedIn pages
 * Shows full intelligence on profile pages, minimal orb elsewhere
 */
function initialize(): void {
  logger.debug('Content script loaded on:', window.location.href);

  // Inject CSS
  injectStyles();
  logger.debug('CSS injected');

  // Create panel (always show orb on LinkedIn)
  panel = createPanel(document.body);
  logger.debug('Panel created:', panel?.element);

  // Setup re-analyze callback
  panel.onReanalyze(() => {
    logger.debug('Re-analyze requested');
    forceReanalyze();
  });

  // Setup add note callback
  panel.onAddNote(async (content: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    logger.debug('Saving note for:', currentProfileId);
    const result = await saveNote(currentProfileId, content);
    if (result.success) {
      logger.debug('Note saved successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      logger.debug('Failed to save note:', result.error);
    }
    return result;
  });

  // Setup edit note callback
  panel.onEditNote(async (noteId: string, content: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    logger.debug('Updating note:', noteId);
    const result = await updateNote(noteId, content);
    if (result.success) {
      logger.debug('Note updated successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      logger.debug('Failed to update note:', result.error);
    }
    return result;
  });

  // Setup delete note callback
  panel.onDeleteNote(async (noteId: string) => {
    if (!currentProfileId) {
      return { success: false, error: 'No profile loaded' };
    }
    logger.debug('Deleting note:', noteId);
    const result = await deleteNote(noteId);
    if (result.success) {
      logger.debug('Note deleted successfully');
      // Refresh notes display
      const notesResult = await getNotesForContact(currentProfileId);
      if (notesResult.success && notesResult.notes && panel) {
        panel.setNotes(notesResult.notes);
      }
    } else {
      logger.debug('Failed to delete note:', result.error);
    }
    return result;
  });

  // Setup drag functionality
  setupDragListeners();

  // Setup consent accept callback
  panel.onConsentAccept(async () => {
    logger.debug('Consent accepted, granting consent...');
    try {
      const apiUrl = await getApiUrl();
      await grantConsent(apiUrl);
      logger.debug('Consent granted successfully');
      panel?.hideConsentOverlay();
    } catch (error) {
      logger.error('Failed to grant consent:', error);
      // Still hide overlay - user accepted, just logging failed
      panel?.hideConsentOverlay();
    }
  });

  // Check consent status and show overlay if needed
  hasConsent().then(consented => {
    if (!consented && panel) {
      logger.debug('No consent found, showing consent overlay');
      panel.showConsentOverlay();
    }
  });

  // If on profile page, extract and display profile intelligence
  if (isLinkedInProfileUrl(window.location.href)) {
    logger.debug('On profile page, extracting intelligence...');
    // Switch to profile mode (clears any history content and prepares for profile data)
    if (panel) {
      panel.setMinimalMode(false);
    }
    // Prime immediately, then extract fully
    primePanel();
    handleProfilePage();
  } else {
    logger.debug('Not a profile page, showing history mode');
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
          logger.debug('URL change message from background:', message.url);
          // Only handle if URL is different from last handled
          if (message.url !== lastHandledUrl) {
            const oldUrl = lastHandledUrl;
            lastHandledUrl = message.url;
            handleUrlChange(message.url, oldUrl);
          }
        }
      });
    } catch (e) {
      logger.debug('Extension context invalidated, cannot add message listener');
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
    logger.debug('Extension context invalidated, skipping style injection');
    return;
  }

  try {
    const link = document.createElement('link');
    link.id = 'sr-panel-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('panel.css');
    document.head.appendChild(link);
  } catch (e) {
    logger.debug('Extension context invalidated during style injection');
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
    logger.debug('Extension context invalidated during savePosition');
  }
}

/**
 * Load saved panel position
 */

async function loadPosition(): Promise<{ x: number; y: number } | null> {
  if (!isExtensionContextValid()) {
    logger.debug('Extension context invalidated, skipping loadPosition');
    return null;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['panelPosition'], (result) => {
        if (chrome.runtime.lastError) {
          logger.debug('Storage error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result.panelPosition || null);
      });
    } catch (e) {
      logger.debug('Extension context invalidated');
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
    logger.debug('AI warm-up ping sent');
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

  logger.debug('Priming panel with name:', name, 'headline:', headline, 'location:', location);
  panel.primeForProfile(name, headline, location, avatarUrl);
}

/**
 * Force re-analysis of the current profile by clearing cached AI data
 */
async function forceReanalyze(): Promise<void> {
  if (!currentProfileId) {
    logger.debug('No current profile to re-analyze');
    return;
  }

  logger.debug('Forcing re-analysis for:', currentProfileId);

  // Clear the aiVersion to force re-inference
  const storageKey = `profile:${currentProfileId}`;
  const result = await chrome.storage.local.get(storageKey);
  const storedData = result[storageKey] as StoredProfile | undefined;

  if (storedData) {
    // Remove aiVersion to trigger re-inference
    delete storedData.aiVersion;
    await chrome.storage.local.set({ [storageKey]: storedData });
    logger.debug('Cleared aiVersion, re-running extraction');
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
    logger.debug('Extension context invalidated, aborting');
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

  // Show loading progress during initial wait
  updateProgress('loading', startTime);

  // Wait for lazy-loaded sections (LinkedIn loads all after ~3s regardless of scroll)
  await waitForCompleteProfile({ timeout: 15000 });

  // Re-check context validity after wait
  if (!isExtensionContextValid()) {
    logger.debug('Extension context invalidated during wait, aborting');
    return;
  }

  // Extract profile data from page (includes background activity fetch)
  let profileData = await extractProfileData(profileId, startTime);

  // Check if we're still on the same profile after extraction
  if (profileId !== currentProfileId) {
    logger.debug('Profile changed during extraction, aborting:', profileId);
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
  logger.debug('Intelligence built:', JSON.stringify(intelligence, null, 2));

  // Check if we're still on the same profile (race condition guard)
  // User may have navigated away during extraction
  if (profileId !== currentProfileId) {
    logger.debug('Profile changed during extraction, discarding results for:', profileId);
    return;
  }

  // Update panel
  if (panel) {
    logger.debug('Setting intelligence on panel...');
    panel.setIntelligence(intelligence);
    logger.debug('Intelligence set complete');

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
          logger.debug(`Loaded ${result.notes.length} notes from backend`);
          panel.setNotes(result.notes);
        } else if (!result.success) {
          logger.debug('Failed to load notes:', result.error);
          // Show empty notes section even if fetch fails
          panel?.setNotes([]);
        }
      }).catch(err => {
        logger.debug('Error fetching notes:', err);
        panel?.setNotes([]);
      });
    }
  }

  // Set up observer for lazy-loaded content (when user scrolls)
  // Re-extracts and merges data when new content appears
  const stopObserving = observeLazyContent(async () => {
    if (profileId !== currentProfileId || !panel) return;

    logger.debug('Lazy content detected, re-extracting...');

    // Re-extract with new visible content
    const newProfileData = await extractProfileData(profileId, Date.now());
    if (profileId !== currentProfileId) return;

    // Check if we found new employers
    const oldEmployerCount = mergedData.employers?.length ?? 0;
    const newEmployerCount = newProfileData.employers?.length ?? 0;

    if (newEmployerCount > oldEmployerCount) {
      logger.debug(`Found ${newEmployerCount - oldEmployerCount} new employers`);

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
      logger.debug('Profile changed, stopping lazy content observer');
      stopObserving();
      clearInterval(checkInterval);
    }
  }, 1000);
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

  logger.debug(`Found ${showAllButtons.length} expandable sections`);

  // Words that indicate we should NOT click this element (navigates away or unwanted action)
  const skipPatterns = /activit|post|message|connect|follow|more action|pending|withdraw|skill/i;

  for (const button of Array.from(showAllButtons)) {
    const btn = button as HTMLElement;
    const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';

    // Skip if matches any skip pattern
    if (skipPatterns.test(label)) {
      logger.debug(`Skipping: ${label}`);
      continue;
    }

    // Only click if it looks like "Show all X" pattern
    if (!label.toLowerCase().includes('show all')) {
      continue;
    }

    try {
      btn.click();
      await wait(300);
      logger.debug(`Expanded: ${label}`);
    } catch (e) {
      logger.debug(`Failed to expand: ${label}`);
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
 * Extract profile data from the current LinkedIn page using DOM scraping
 */
async function extractProfileData(profileId: string, startTime: number): Promise<Partial<StoredProfile>> {
  logger.debug('Starting DOM extraction...');
  updateProgress('experience', startTime);

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
    recommendations: extractRecommendations(),
    publications: extractPublications(),
    organizations: extractOrganizations(),
    interests: extractInterests(),
    testScores: extractTestScores(),
    services: extractServices(),
    projects: extractProjects(),
    lastSeen: new Date().toISOString(),
  };

  logger.debug('DOM extraction complete:', {
    name: profileData.name,
    employers: profileData.employers?.length,
    education: profileData.education?.length,
    skills: profileData.skills?.length,
  });

  updateProgress('complete', startTime);
  return profileData;
}

function debugLinkedInDOM(): void {
  logger.debug('===== DOM INSPECTION =====');

  // Check overall page state
  const mainContent = document.querySelector('main');
  logger.debug(`Main element: ${mainContent ? 'found' : 'NOT FOUND'}, children: ${mainContent?.children.length || 0}`);

  // Show main's structure
  if (mainContent) {
    const firstChild = mainContent.firstElementChild;
    logger.debug(`Main first child: ${firstChild?.tagName}.${firstChild?.className.slice(0, 50)}`);
  }

  // Find ALL sections (any class)
  const allSections = document.querySelectorAll('section');
  logger.debug(`All sections: ${allSections.length}`);
  allSections.forEach((sec, i) => {
    if (i < 8) { // First 8 only
      const classes = sec.className.slice(0, 80);
      const id = sec.id ? ` id="${sec.id}"` : '';
      const dataSection = sec.getAttribute('data-section');
      const dataSectionAttr = dataSection ? ` data-section="${dataSection}"` : '';
      // Get first meaningful text in section
      const firstText = sec.querySelector('span, div')?.textContent?.trim().slice(0, 30) || '';
      logger.debug(`section[${i}]:${id}${dataSectionAttr} class="${classes}" text="${firstText}"`);
    }
  });

  // Check for elements with id containing section names
  const sectionIds = ['experience', 'education', 'skills', 'activity', 'about'];
  for (const name of sectionIds) {
    const byId = document.querySelector(`[id*="${name}" i]`);
    if (byId) {
      const classes = typeof byId.className === 'string' ? byId.className : byId.className?.baseVal || '';
      logger.debug(`Found element with id containing "${name}": ${byId.tagName}.${classes.slice(0, 40)}`);
    }
  }

  // Check for any h2 elements and their content
  const h2s = document.querySelectorAll('h2');
  logger.debug(`h2 elements: ${h2s.length}`);
  h2s.forEach((h2, i) => {
    const text = h2.textContent?.trim().slice(0, 40);
    if (text && text.length > 2 && i < 10) {
      const parent = h2.parentElement;
      const section = h2.closest('section');
      logger.debug(`h2[${i}]: "${text}" parent=${parent?.tagName}.${parent?.className.slice(0, 30)} section=${section?.className.slice(0, 30) || 'none'}`);
    }
  });

  // Look for common LinkedIn patterns
  const pvsElements = document.querySelectorAll('[class*="pvs-"]');
  logger.debug(`Elements with pvs- class: ${pvsElements.length}`);

  const pvElements = document.querySelectorAll('[class*="pv-"]');
  logger.debug(`Elements with pv- class: ${pvElements.length}`);

  // Check for profile-card sections (new LinkedIn structure)
  const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
  logger.debug(`profile-card sections: ${profileCards.length}`);

  // Check for artdeco-card sections in main
  const artdecoSections = document.querySelectorAll('main section.artdeco-card');
  logger.debug(`artdeco-card sections in main: ${artdecoSections.length}`);
  artdecoSections.forEach((card, i) => {
    if (i < 10) {
      // Try to find section header - look for visually-hidden or sr-only text
      const srOnly = card.querySelector('.visually-hidden, .sr-only, [class*="visually-hidden"]');
      const firstSpan = card.querySelector('span[aria-hidden="true"]');
      const anyText = srOnly?.textContent?.trim() || firstSpan?.textContent?.trim() || '';
      logger.debug(`artdeco[${i}]: "${anyText.slice(0, 50)}"`);
    }
  });

  // Check for pvs-list containers
  const pvsLists = document.querySelectorAll('.pvs-list__container, [class*="pvs-list"]');
  logger.debug(`pvs-list containers: ${pvsLists.length}`);

  // Find where "Experience" text lives (in any element, not just span)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let expFound = false;
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim() === 'Experience') {
      expFound = true;
      const parent = walker.currentNode.parentElement;
      const grandparent = parent?.parentElement;
      const section = parent?.closest('section');
      logger.debug(`"Experience" text in: ${parent?.tagName}.${parent?.className.slice(0, 40)}`);
      logger.debug(`"Experience" grandparent: ${grandparent?.tagName}.${grandparent?.className.slice(0, 40)}`);
      logger.debug(`"Experience" section: ${section?.tagName}.${section?.className.slice(0, 50) || 'none'}`);
      break;
    }
  }
  if (!expFound) {
    logger.debug('"Experience" text NOT FOUND anywhere in body');
    // Check if page is still loading
    const loaders = document.querySelectorAll('[class*="loader"], [class*="loading"], [class*="skeleton"]');
    logger.debug(`Loading indicators found: ${loaders.length}`);
  }

  // Deep dive into artdeco-card sections to understand structure
  logger.debug('===== DEEP SECTION ANALYSIS =====');
  const mainSections = document.querySelectorAll('main section');
  mainSections.forEach((section, i) => {
    if (i >= 10) return;

    // Get all unique text content in this section (first 200 chars)
    const allText = section.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || '';
    logger.debug(`Main section[${i}] text preview: "${allText}"`);

    // Check for company logos (indicates experience section)
    const logos = section.querySelectorAll('img[src*="company"], img[src*="shrink"]');
    if (logos.length > 0) {
      logger.debug(`Main section[${i}] has ${logos.length} company logos - likely Experience/Education`);
    }

    // Check for specific LinkedIn elements
    const entityImages = section.querySelectorAll('[class*="entity-image"]');
    const pvsEntities = section.querySelectorAll('[class*="pvs-entity"]');
    if (entityImages.length > 0 || pvsEntities.length > 0) {
      logger.debug(`Main section[${i}] has ${entityImages.length} entity-images, ${pvsEntities.length} pvs-entities`);
    }
  });
  logger.debug('===== END DEEP ANALYSIS =====');

  logger.debug('===== END DOM INSPECTION =====');
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
 * Merge new profile data with AI intelligence
 */
async function mergeProfileData(
  newData: Partial<StoredProfile>,
  storedData: StoredProfile | null
): Promise<StoredProfile> {
  const now = new Date().toISOString();
  logger.debug('mergeProfileData called, storedData:', storedData ? 'exists' : 'null');

  // Detect changes only for profiles we've seen before (not brand new)
  // If firstSeen is within the last minute, this is still the initial capture
  let historyUpdates: HistoryEntry[] = [];
  const isEstablishedProfile = storedData?.firstSeen &&
    (Date.now() - new Date(storedData.firstSeen).getTime() > 60000);

  if (storedData && isEstablishedProfile) {
    const changes = detectChanges(storedData, newData);
    if (changes.length > 0) {
      logger.debug('Detected changes:', changes.map(c => c.field));
      const withHistory = recordHistory(storedData, changes, now);
      historyUpdates = withHistory.history || [];

      // Sync new history entries to backend (fire and forget) - only if consent given
      const profileId = extractProfileIdFromUrl(window.location.href);
      if (profileId) {
        hasConsent().then(consented => {
          if (!consented) {
            logger.debug('Server sync skipped - no consent');
            return;
          }
          const newEntries: HistoryEntrySync[] = changes.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            detectedAt: now,
          }));
          syncHistory(profileId, newEntries).then(result => {
            if (result.success) {
              logger.debug('History synced to backend:', result.synced);
            } else {
              logger.debug('History sync failed:', result.error);
            }
          }).catch(err => {
            logger.debug('History sync error:', err);
          });
        });
      }
    } else {
      historyUpdates = storedData.history || [];
    }
  } else if (storedData) {
    // Same visit (lazy reload) - preserve existing history without detecting changes
    historyUpdates = storedData.history || [];
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
    logger.debug('Using stored data with valid archetype:', storedData.archetype, 'aiVersion:', storedData.aiVersion);
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
  logger.debug('Running AI inference (stored archetype:', storedData?.archetype, 'hasRealIntelligence:', hasRealIntelligence, ')');

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
    projects: newData.projects,
  };

  // Skip API calls when testing data extraction
  if (DISABLE_API_WRITES) {
    logger.debug('API writes disabled (DISABLE_API_WRITES=true). Using local heuristics.');
    logger.debug('Extracted profile data:', JSON.stringify(aiProfileData, null, 2));
    const syncResult = mergeProfileDataSync(newData, storedData);
    if (historyUpdates.length > 0) {
      syncResult.history = historyUpdates;
    }
    return syncResult;
  }

  // Skip server sync if no consent - use local heuristics only
  const consented = await hasConsent();
  if (!consented) {
    logger.debug('Server sync skipped - no consent. Using local heuristics.');
    const syncResult = mergeProfileDataSync(newData, storedData);
    if (historyUpdates.length > 0) {
      syncResult.history = historyUpdates;
    }
    return syncResult;
  }

  try {
    const apiUrl = await getApiUrl();
    const linkedinId = extractProfileIdFromUrl(window.location.href);
    logger.debug('Calling AI inference at:', apiUrl);
    logger.debug('Profile data being sent:', JSON.stringify(aiProfileData, null, 2));

    // Use the new caching endpoint if we have a linkedin_id, otherwise fall back to direct inference
    let result: CachedIntelligenceResult;
    if (linkedinId) {
      result = await getProfileIntelligence(aiProfileData, { apiUrl, timeoutMs: 15000, linkedinId });
      logger.debug('AI result cached:', result.cached);
      logger.debug('AI result verified:', result.verified);
    } else {
      // Fall back to direct inference if we can't get the linkedin_id
      const fallbackResult = await inferIntelligence(aiProfileData, { apiUrl, timeoutMs: 15000 });
      result = { ...fallbackResult, cached: false, verified: false };
    }
    logger.debug('AI result success:', result?.success);
    logger.debug('AI result archetype:', result?.archetype);
    logger.debug('AI result skills:', result?.skills);
    logger.debug('AI result error:', result?.error);

    // Accept AI results if successful, even if archetype parsing failed
    if (result.success) {
      // Map AI archetype to enum, defaulting to Unknown if missing/invalid
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
        archetype: result.archetype
          ? (archetypeMap[result.archetype] || (logger.debug('Unknown archetype from AI:', result.archetype), Archetype.Unknown))
          : (logger.debug('No archetype returned from AI'), Archetype.Unknown),
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
    logger.debug('AI inference failed, using local heuristics:', error);
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

  logger.debug('URL changed from', lastUrl, 'to', newUrl);
  currentProfileId = null;

  if (isLinkedInProfileUrl(newUrl)) {
    logger.debug('Navigated to profile page');
    // Switch to full mode and extract intelligence
    if (panel) {
      panel.setMinimalMode(false);
      // Prime the panel immediately with whatever name we can find
      primePanel();
    }
    // Small delay to let page content load
    setTimeout(() => handleProfilePage(), 500);
  } else {
    logger.debug('Navigated away from profile page');
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
    logger.debug('history.pushState detected');
    checkUrlChange();
  };

  history.replaceState = function(...args) {
    originalReplaceState(...args);
    logger.debug('history.replaceState detected');
    checkUrlChange();
  };

  // Strategy 2: Listen to popstate event (back/forward navigation)
  window.addEventListener('popstate', () => {
    logger.debug('popstate event detected');
    checkUrlChange();
  });

  // Strategy 3: MutationObserver as fallback
  // Some SPAs might change URL in ways we don't catch above
  const observer = new MutationObserver(() => {
    checkUrlChange();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  logger.debug('URL change observers installed');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
