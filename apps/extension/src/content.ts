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
  employers?: Employer[];
  skills?: string[];
  archetype?: Archetype;
  couldBe?: string[];
  goodFor?: string[];
  firstSeen: string;
  lastSeen: string;
  note?: string;
}

interface StorageData {
  socialNotes?: Record<string, StoredProfile>;
}

let panel: Panel | null = null;
let currentProfileId: string | null = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

/**
 * Initialize the floating panel on LinkedIn profile pages
 */
function initialize(): void {
  console.log('[Social Recall] Content script loaded on:', window.location.href);

  if (!isLinkedInProfileUrl(window.location.href)) {
    console.log('[Social Recall] Not a profile page, skipping');
    return;
  }

  console.log('[Social Recall] Initializing panel...');

  // Inject CSS
  injectStyles();
  console.log('[Social Recall] CSS injected');

  // Create panel
  panel = createPanel(document.body);
  console.log('[Social Recall] Panel created:', panel?.element);

  // Setup drag functionality
  setupDragListeners();

  // Extract and display profile intelligence
  handleProfilePage();

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

  // Load saved position
  const savedPosition = await loadPosition();
  if (savedPosition && panel) {
    panel.setPosition(savedPosition.x, savedPosition.y);
  }

  // Extract profile data from page
  const profileData = extractProfileData();

  // Get stored data for this profile
  const storedData = await getStoredProfile(profileId);

  // Merge and save (Robocop mode - auto-capture with AI intelligence)
  const mergedData = await mergeProfileData(profileData, storedData);
  await saveProfile(profileId, mergedData);

  // Check for job changes
  const jobChange = detectJobChange(profileData, storedData);

  // Build intelligence object
  const intelligence = buildIntelligence(mergedData, jobChange);

  // Update panel
  if (panel) {
    panel.setIntelligence(intelligence);

    // Add alert class if job change detected
    const orb = panel.element.querySelector('.sr-panel__orb');
    if (jobChange && orb) {
      orb.classList.add('sr-panel__orb--alert');
    }
  }
}

/**
 * Extract profile data from the current LinkedIn page
 */
function extractProfileData(): Partial<StoredProfile> {
  const name = extractName();
  const headline = extractHeadline();
  const avatarUrl = extractAvatarUrl();
  const employers = extractEmployers();

  return {
    name,
    headline,
    avatarUrl,
    employers,
    lastSeen: new Date().toISOString(),
  };
}

function extractName(): string {
  // Try various selectors LinkedIn uses
  const nameEl = document.querySelector('h1.text-heading-xlarge');
  if (nameEl?.textContent) {
    return nameEl.textContent.trim();
  }

  // Fallback to page title
  const title = document.title;
  const parts = title.split(/\s[|–-]\s/);
  return parts[0]?.trim() || 'Unknown';
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

  // Find experience section
  const experienceSection = document.querySelector('#experience');
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
      employers: newData.employers,
      firstSeen: now,
      lastSeen: now,
      // Default intelligence values from local heuristics
      archetype: inferArchetype(newData),
      skills: inferSkills(newData),
      couldBe: inferCouldBe(newData),
      goodFor: inferGoodFor(newData),
    };
  }

  return {
    ...storedData,
    name: newData.name || storedData.name,
    headline: newData.headline || storedData.headline,
    avatarUrl: newData.avatarUrl || storedData.avatarUrl,
    employers: newData.employers || storedData.employers,
    lastSeen: now,
  };
}

/**
 * Get the web app URL from storage or use default
 */
async function getApiUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['webAppUrl'], (result) => {
      resolve(result.webAppUrl || 'http://localhost:3000');
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

  // If we already have stored data with AI intelligence, just update timestamps
  if (storedData && storedData.archetype) {
    return {
      ...storedData,
      name: newData.name || storedData.name,
      headline: newData.headline || storedData.headline,
      avatarUrl: newData.avatarUrl || storedData.avatarUrl,
      employers: newData.employers || storedData.employers,
      lastSeen: now,
    };
  }

  // For new profiles, try AI inference first
  const aiProfileData: AIProfileData = {
    name: newData.name || 'Unknown',
    headline: newData.headline || '',
    employers: newData.employers,
  };

  try {
    const apiUrl = await getApiUrl();
    const result = await inferIntelligence(aiProfileData, { apiUrl, timeoutMs: 5000 });

    if (result.success && result.archetype) {
      // AI inference succeeded
      const archetypeMap: Record<string, Archetype> = {
        builder: Archetype.Builder,
        architect: Archetype.Architect,
        designer: Archetype.Designer,
        scientist: Archetype.Scientist,
        strategist: Archetype.Strategist,
        seller: Archetype.Seller,
        marketer: Archetype.Marketer,
        connector: Archetype.Connector,
        specialist: Archetype.Specialist,
      };

      return {
        name: newData.name || 'Unknown',
        headline: newData.headline,
        avatarUrl: newData.avatarUrl,
        employers: newData.employers,
        firstSeen: storedData?.firstSeen || now,
        lastSeen: now,
        archetype: archetypeMap[result.archetype] || Archetype.Specialist,
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
 * Infer archetype from profile data (placeholder - would use AI in production)
 */
function inferArchetype(data: Partial<StoredProfile>): Archetype {
  const headline = (data.headline || '').toLowerCase();

  if (headline.includes('engineer') || headline.includes('developer')) {
    return Archetype.Builder;
  }
  if (headline.includes('architect')) {
    return Archetype.Architect;
  }
  if (headline.includes('design')) {
    return Archetype.Designer;
  }
  if (headline.includes('data') || headline.includes('scientist') || headline.includes('ml')) {
    return Archetype.Scientist;
  }
  if (headline.includes('ceo') || headline.includes('founder') || headline.includes('strategy')) {
    return Archetype.Strategist;
  }
  if (headline.includes('sales') || headline.includes('account')) {
    return Archetype.Seller;
  }
  if (headline.includes('marketing') || headline.includes('growth')) {
    return Archetype.Marketer;
  }
  if (headline.includes('partner') || headline.includes('community') || headline.includes('bd')) {
    return Archetype.Connector;
  }

  return Archetype.Specialist;
}

/**
 * Infer skills from profile data (placeholder - would use AI in production)
 */
function inferSkills(data: Partial<StoredProfile>): string[] {
  const headline = data.headline || '';
  const skills: string[] = [];

  // Very basic skill extraction from headline
  const keywords = ['React', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java',
    'Machine Learning', 'AI', 'Product', 'Design', 'Strategy', 'Leadership',
    'Sales', 'Marketing', 'Growth', 'Data', 'Cloud', 'AWS', 'Infrastructure'];

  keywords.forEach(skill => {
    if (headline.toLowerCase().includes(skill.toLowerCase())) {
      skills.push(skill);
    }
  });

  return skills.length > 0 ? skills.slice(0, 4) : ['Professional'];
}

/**
 * Infer relationship types (placeholder - would use AI in production)
 */
function inferCouldBe(data: Partial<StoredProfile>): string[] {
  const archetype = inferArchetype(data);

  switch (archetype) {
    case Archetype.Builder:
    case Archetype.Architect:
      return ['Co-founder', 'Tech Advisor', 'Contractor'];
    case Archetype.Designer:
      return ['Co-founder', 'Design Lead', 'Consultant'];
    case Archetype.Strategist:
      return ['Co-founder', 'Advisor', 'Board Member'];
    case Archetype.Seller:
      return ['Sales Lead', 'BD Partner', 'Advisor'];
    case Archetype.Connector:
      return ['Advisor', 'Investor Intro', 'Partner'];
    default:
      return ['Advisor', 'Consultant', 'Collaborator'];
  }
}

/**
 * Infer project fit (placeholder - would use AI in production)
 */
function inferGoodFor(data: Partial<StoredProfile>): string[] {
  const employers = data.employers || [];
  const industries: string[] = [];

  employers.forEach(emp => {
    const company = emp.company.toLowerCase();
    if (company.includes('stripe') || company.includes('square') || company.includes('paypal')) {
      industries.push('Fintech');
    }
    if (company.includes('google') || company.includes('meta') || company.includes('amazon')) {
      industries.push('Big Tech');
    }
  });

  return industries.length > 0 ? industries : ['Startups', 'Tech'];
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
    archetype: data.archetype || Archetype.Specialist,
    skills: data.skills || ['Professional'],
    couldBe: data.couldBe || ['Collaborator'],
    goodFor: data.goodFor || ['Projects'],
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
        // Small delay to let page content load
        setTimeout(() => handleProfilePage(), 500);
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
