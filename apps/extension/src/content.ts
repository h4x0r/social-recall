/**
 * Content Script for Social Recall
 * Injects floating intelligence panel into LinkedIn profile pages
 * Implements "Robocop mode" - passive capture of all viewed profiles
 */

// Debug: Immediately log when script is parsed
console.log('[Social Recall] ===== CONTENT SCRIPT STARTING =====');

import { createPanel, Archetype, type ProfileIntelligence, type Panel, type WorkerState, type WorkerStatus } from './panel';
import { extractProfileIdFromUrl, isLinkedInProfileUrl, type Employer } from './utils';
import { inferIntelligence, type ProfileData as AIProfileData } from './ai-client';
import {
  waitForLinkedInProfile,
  waitForStable,
} from './dom-utils';

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
  activityPosts?: string[]; // User's recent posts with their own commentary
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
 * Load recent profiles from storage and show in history panel
 */
async function loadAndShowHistory(): Promise<void> {
  if (!panel) return;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
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

      panel.showHistory(profiles);
      resolve();
    });
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
    console.log('[Social Recall] Not a profile page, showing history mode');
    // Show history mode - recent profiles when clicked
    if (panel) {
      panel.setMinimalMode(true);
      loadAndShowHistory();
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
 * Handle LinkedIn profile page - extract data and update panel
 */
async function handleProfilePage(): Promise<void> {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated, aborting');
    return;
  }

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

  // Use Playwright-like waiting for profile to load
  await waitForLinkedInProfile({ timeout: 30000 });

  // Re-check context validity after wait
  if (!isExtensionContextValid()) {
    console.log('[Social Recall] Extension context invalidated during wait, aborting');
    return;
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
 * Scrape a LinkedIn detail page in a background tab
 * This allows extracting data without navigating away from the current profile
 */
interface ScrapeResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

// Ordered by importance (most important first)
type DetailPageType =
  | 'activity'
  | 'services'
  | 'recommendations'
  | 'honors'
  | 'publications'
  | 'experience'
  | 'courses'
  | 'education'
  | 'certifications'
  | 'testscores'
  | 'skills'
  | 'languages'
  | 'volunteering'
  | 'organizations'
  | 'interests';

// Map detail page types to their URL paths (ordered by importance)
const DETAIL_PAGE_PATHS: Record<DetailPageType, string> = {
  activity: 'recent-activity/all',
  services: 'details/services',
  recommendations: 'details/recommendations',
  honors: 'details/honors',
  publications: 'details/publications',
  experience: 'details/experience',
  courses: 'details/courses',
  education: 'details/education',
  certifications: 'details/certifications',
  testscores: 'details/testscores',
  skills: 'details/skills',
  languages: 'details/languages',
  volunteering: 'details/volunteering-experiences',
  organizations: 'details/organizations',
  interests: 'details/interests',
};

async function scrapeDetailPageInBackground(
  profileId: string,
  pageType: DetailPageType
): Promise<string[]> {
  if (!isExtensionContextValid()) {
    console.log(`[Social Recall] Extension context invalid, skipping ${pageType} scrape`);
    return [];
  }

  const path = DETAIL_PAGE_PATHS[pageType];
  const url = `https://www.linkedin.com/in/${profileId}/${path}/`;
  console.log(`[Social Recall] Requesting background ${pageType} scrape for:`, url);

  try {
    const response: ScrapeResponse = await chrome.runtime.sendMessage({
      type: 'SCRAPE_SUBPAGE',
      url,
      extractorType: pageType,
    });

    if (response.success && response.data) {
      console.log(`[Social Recall] Background scrape returned ${response.data.length} ${pageType} items`);
      return response.data;
    } else {
      console.log(`[Social Recall] Background ${pageType} scrape failed:`, response.error);
      return [];
    }
  } catch (error) {
    console.log(`[Social Recall] Error sending ${pageType} scrape message:`, error);
    return [];
  }
}

/**
 * Scrape all detail pages SEQUENTIALLY to avoid rate limiting
 * Fields ordered by importance (most important first)
 */
interface AllDetailData {
  activity: string[];
  services: string[];
  recommendations: string[];
  honors: string[];
  publications: string[];
  experience: string[];
  courses: string[];
  education: string[];
  certifications: string[];
  testscores: string[];
  skills: string[];
  languages: string[];
  volunteering: string[];
  organizations: string[];
  interests: string[];
}

// Detail page types in order of importance for progress tracking
// Activity is first (most important - user's own thoughts)
const DETAIL_PAGE_ORDER: DetailPageType[] = [
  'activity',
  'services',
  'recommendations',
  'honors',
  'publications',
  'experience',
  'courses',
  'education',
  'certifications',
  'testscores',
  'skills',
  'languages',
  'volunteering',
  'organizations',
  'interests',
];

// Random delay between 2-5 seconds to appear human-like
function randomDelay(): number {
  const MIN_DELAY_MS = 2000;
  const MAX_DELAY_MS = 5000;
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

// Cache interface for scraped data
interface ScrapeCache {
  [section: string]: {
    data: string[];
    scrapedAt: string; // YYYY-MM-DD
  };
}

// Get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Load scrape cache from storage
async function loadScrapeCache(profileId: string): Promise<ScrapeCache> {
  if (!isExtensionContextValid()) return {};
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([`scrape_cache_${profileId}`], (result) => {
        if (chrome.runtime.lastError) {
          resolve({});
          return;
        }
        resolve(result[`scrape_cache_${profileId}`] || {});
      });
    } catch {
      resolve({});
    }
  });
}

// Save scrape cache to storage
async function saveScrapeCache(profileId: string, cache: ScrapeCache): Promise<void> {
  if (!isExtensionContextValid()) return;
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [`scrape_cache_${profileId}`]: cache }, () => {
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

async function scrapeAllDetailPages(
  profileId: string,
  onProgress?: (completed: number, total: number, current: string, workers: WorkerState[]) => void
): Promise<AllDetailData> {
  console.log('[Social Recall] Starting SEQUENTIAL scrape of all detail pages (rate-limit safe)');

  const total = DETAIL_PAGE_ORDER.length;
  let completed = 0;
  const results: Record<string, string[]> = {};
  const today = getTodayDate();

  // Load existing cache
  const cache = await loadScrapeCache(profileId);
  let cacheUpdated = false;

  // Initialize worker states - check cache to mark already-scraped as complete
  const workerStates: Map<DetailPageType, WorkerStatus> = new Map();
  for (const pageType of DETAIL_PAGE_ORDER) {
    const cached = cache[pageType];
    if (cached && cached.scrapedAt === today && cached.data.length > 0) {
      workerStates.set(pageType, 'complete');
      results[pageType] = cached.data;
      completed++;
    } else {
      workerStates.set(pageType, 'pending');
    }
  }

  // Helper to build workers array from current states
  const buildWorkersArray = (): WorkerState[] => {
    return DETAIL_PAGE_ORDER.map(pageType => ({
      name: pageType,
      status: workerStates.get(pageType) || 'pending',
    }));
  };

  // Initial progress update
  onProgress?.(completed, total, 'checking cache', buildWorkersArray());
  console.log(`[Social Recall] ${completed} sections already cached for today`);

  // Scrape sections SEQUENTIALLY with delays between each
  for (const pageType of DETAIL_PAGE_ORDER) {
    // Skip if already cached
    if (workerStates.get(pageType) === 'complete') {
      console.log(`[Social Recall] Using cached ${pageType} data`);
      continue;
    }

    // Add random delay before scraping (except for first uncached section)
    const uncachedSoFar = DETAIL_PAGE_ORDER.filter(p => workerStates.get(p) !== 'complete');
    if (uncachedSoFar.indexOf(pageType) > 0) {
      const delay = randomDelay();
      console.log(`[Social Recall] Waiting ${(delay / 1000).toFixed(1)}s before scraping ${pageType}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Mark as loading
    workerStates.set(pageType, 'loading');
    onProgress?.(completed, total, pageType, buildWorkersArray());

    // Scrape the section
    const data = await scrapeDetailPageInBackground(profileId, pageType);
    results[pageType] = data;

    // Mark as complete
    workerStates.set(pageType, 'complete');
    completed++;
    onProgress?.(completed, total, pageType, buildWorkersArray());
    console.log(`[Social Recall] Scraped ${pageType} (${completed}/${total}): ${data.length} items`);

    // Update cache if we got data
    if (data.length > 0) {
      cache[pageType] = { data, scrapedAt: today };
      cacheUpdated = true;
    }
  }

  // Save updated cache
  if (cacheUpdated) {
    await saveScrapeCache(profileId, cache);
    console.log('[Social Recall] Cache updated');
  }

  console.log('[Social Recall] All detail pages scraped (sequential, rate-limit safe)');

  return {
    activity: results.activity || [],
    services: results.services || [],
    recommendations: results.recommendations || [],
    honors: results.honors || [],
    publications: results.publications || [],
    experience: results.experience || [],
    courses: results.courses || [],
    education: results.education || [],
    certifications: results.certifications || [],
    testscores: results.testscores || [],
    skills: results.skills || [],
    languages: results.languages || [],
    volunteering: results.volunteering || [],
    organizations: results.organizations || [],
    interests: results.interests || [],
  };
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
 * Uses background tab scraping for all detail pages to get complete data
 */
async function extractProfileData(profileId: string, startTime: number): Promise<Partial<StoredProfile>> {
  updateProgress('expanding', startTime);

  // Debug: Comprehensive DOM inspection
  debugLinkedInDOM();

  // Extract basic data from the main profile page (name, headline, about, avatar)
  const basicData = {
    name: extractName(),
    headline: extractHeadline(),
    avatarUrl: extractAvatarUrl(),
    about: extractAbout(),
  };

  // Scrape ALL detail pages in parallel using background tabs
  // This gets complete data without navigating away from the current page
  updateProgress('skills', startTime);

  const detailData = await scrapeAllDetailPages(profileId, (completed, total, current, workers) => {
    // Update progress bar with scraping status and worker states
    if (panel) {
      const progress = 0.1 + (completed / total) * 0.7; // 10% to 80% of overall progress
      panel.setProgress({
        step: 'scraping',
        label: `Scraping detail pages (${completed}/${total})`,
        progress,
        elapsed: Date.now() - startTime,
        workers,
      });
    }
  });

  // Close any modals we may have triggered
  closeModals();

  // Fetch activities from activity page (only posts/reposts with owner commentary, max 20)
  updateProgress('activity', startTime);
  const activities = await fetchActivitiesFromActivityPage(profileId);

  // Build the profile data using scraped detail pages
  const profileData: Partial<StoredProfile> = {
    ...basicData,
    // Convert scraped string arrays to structured data where needed
    employers: detailData.experience.map((company) => ({ company, logo: '' })),
    education: detailData.education.map((school) => ({ school })),
    skills: detailData.skills,
    certifications: detailData.certifications.map((name) => ({ name })),
    volunteering: detailData.volunteering.map((org) => ({ organization: org })),
    honorsAwards: detailData.honors,
    courses: detailData.courses,
    languages: detailData.languages,
    recommendations: detailData.recommendations,
    publications: detailData.publications,
    organizations: detailData.organizations,
    interests: detailData.interests,
    testScores: detailData.testscores,
    services: detailData.services,
    activityPosts: detailData.activity,
    activities,
    lastSeen: new Date().toISOString(),
  };

  console.log('[Social Recall] Profile data extracted:', {
    name: profileData.name,
    employers: profileData.employers?.length,
    education: profileData.education?.length,
    skills: profileData.skills?.length,
    certifications: profileData.certifications?.length,
    volunteering: profileData.volunteering?.length,
    recommendations: profileData.recommendations?.length,
    publications: profileData.publications?.length,
    organizations: profileData.organizations?.length,
    interests: profileData.interests?.length,
  });

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
    if (i < 5) { // First 5 only
      const classes = sec.className.slice(0, 80);
      console.log(`[Social Recall] section[${i}]: "${classes}"`);
    }
  });

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
  profileCards.forEach((card, i) => {
    const firstSpan = card.querySelector('span[aria-hidden="true"]');
    console.log(`[Social Recall] profile-card[${i}]: "${firstSpan?.textContent?.trim().slice(0, 30) || 'no text'}"`);
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
  }

  console.log('[Social Recall] ===== END DOM INSPECTION =====');
}

function findSectionByHeader(headerText: string): Element | null {
  const searchText = headerText.toLowerCase();

  // Strategy 1: Find section with data-view-name="profile-card" that contains matching text
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

  // Strategy 2: Find any section containing an h2/div with the header text
  const allSections = document.querySelectorAll('section');
  for (const section of allSections) {
    // Check h2 elements
    const h2 = section.querySelector('h2');
    if (h2?.textContent?.trim().toLowerCase().includes(searchText)) {
      console.log(`[Social Recall] Found "${headerText}" via section h2`);
      return section;
    }
    // Check first few text elements
    const firstSpans = section.querySelectorAll(':scope > div span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(3, firstSpans.length); i++) {
      if (firstSpans[i].textContent?.trim().toLowerCase() === searchText) {
        console.log(`[Social Recall] Found "${headerText}" via section span`);
        return section;
      }
    }
  }

  // Strategy 3: Find div with pvs-list that's preceded by the header text
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

  // ONLY extract from Experience section - don't search the whole page
  const experienceSection = findSectionByHeader('Experience');

  if (experienceSection) {
    console.log('[Social Recall] Found Experience section, extracting employers');

    // Find all divs that look like experience entries within the section
    // LinkedIn uses nested divs, not li elements
    const allDivs = experienceSection.querySelectorAll('div');

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
  } else {
    console.log('[Social Recall] Experience section not found');
  }

  console.log('[Social Recall] Extracted employers:', employers.length, employers.map(e => e.company));
  return employers;
}

function extractCompanyNameFromExperience(container: Element): string | null {
  // In LinkedIn's experience entries:
  // - Job title is in bold (t-bold)
  // - Company name is in t-14 t-normal, often with " · Full-time" suffix
  // We want the company name, not the job title

  const spans = container.querySelectorAll('span[aria-hidden="true"]');
  const texts: string[] = [];

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2) continue;

    // Skip date-like text
    if (/^\w{3} \d{4}/.test(text) || /^\d{4}/.test(text) || text.includes('Present')) continue;
    if (/^\d+\s*(yr|yrs|mo|mos|year|years|month|months)/.test(text)) continue;

    // Skip location text (City, State/Country format)
    if (/^[A-Z][a-z]+.*,.*\s*(Remote|Hybrid|On-site)$/i.test(text)) continue;
    if (/^(Remote|Hybrid|On-site)$/i.test(text)) continue;

    // Skip skills text
    if (text.includes('skills') || text.includes('Penetration') || text.includes('Security and')) continue;

    texts.push(text);
  }

  // Look for company name pattern - typically contains " · " with employment type
  for (const text of texts) {
    if (text.includes(' · ')) {
      // "NEVERHACK Estonia · Full-time" -> "NEVERHACK Estonia"
      // "Covert Security · Self-employed" -> "Covert Security"
      const parts = text.split(' · ');
      const company = parts[0].trim();
      // Make sure it's not a job title (job titles don't usually have · suffix)
      if (company.length > 2 && company.length < 80) {
        return company;
      }
    }
  }

  // Fallback: look for text that looks like a company (not a job title)
  // Job titles typically start with specific words
  const jobTitlePatterns = /^(founder|ceo|cto|cfo|coo|president|director|manager|lead|senior|junior|engineer|developer|analyst|consultant|specialist|coordinator|associate|intern|head of|vp|vice)/i;

  for (const text of texts) {
    if (text.length > 2 && text.length < 80) {
      // Skip job titles
      if (jobTitlePatterns.test(text)) continue;
      // Skip if it contains common job title words
      if (/\b(and|of|at)\b/i.test(text) && text.split(' ').length <= 4) continue;

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

  // First, try to extract activity from the current profile page's Activity section
  const activitySection = findSectionByHeader('Activity');
  if (activitySection) {
    console.log('[Social Recall] Found Activity section on profile page');
    const postTexts = activitySection.querySelectorAll('span[aria-hidden="true"]');
    for (const span of postTexts) {
      if (activities.length >= MAX_ACTIVITIES) break;
      const text = span.textContent?.trim();
      // Look for substantial text that looks like a post (not UI elements)
      if (text && text.length > 50 && !text.includes('Show all') && !text.includes('follower')) {
        activities.push({
          type: 'post',
          text: text.slice(0, 500),
        });
        console.log(`[Social Recall] Found activity post: ${text.slice(0, 50)}...`);
      }
    }
  }

  // If we found posts on the profile page, return them
  if (activities.length > 0) {
    console.log(`[Social Recall] Extracted ${activities.length} posts from profile Activity section`);
    return activities;
  }

  // Fallback: try fetching the activity page (may not work due to SPA)
  try {
    const activityUrl = `https://www.linkedin.com/in/${profileId}/recent-activity/all/`;
    console.log('[Social Recall] Fetching activity page:', activityUrl);
    const response = await fetch(activityUrl, {
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      console.log('[Social Recall] Failed to fetch activity page:', response.status);
      return activities;
    }

    const html = await response.text();
    console.log('[Social Recall] Activity page HTML length:', html.length);

    // Parse the HTML to extract activities
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find activity items in the parsed document
    const items = doc.querySelectorAll('.feed-shared-update-v2, .occludable-update');
    console.log('[Social Recall] Activity items found in fetched HTML:', items.length);

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
        recommendations: newData.recommendations,
        publications: newData.publications,
        organizations: newData.organizations,
        interests: newData.interests,
        testScores: newData.testScores,
        services: newData.services,
        firstSeen: storedData?.firstSeen || now,
        lastSeen: now,
        archetype: archetypeMap[result.archetype] || Archetype.Unknown,
        // Prefer scraped skills from page, fall back to AI skills, then empty
        skills: newData.skills?.length ? newData.skills : (result.skills?.map(s => s.name) || []),
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
        // Switch to history mode
        if (panel) {
          panel.setMinimalMode(true);
          loadAndShowHistory();
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
