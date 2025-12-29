/**
 * Floating Intelligence Panel for Social Recall
 * Art deco styled floating panel that displays profile intelligence
 */

import { logger } from './logger';

export enum PanelState {
  Minimized = 'minimized',
  Expanded = 'expanded',
}

export enum Archetype {
  // I - The Magician
  Builder = 'builder',
  // II - The High Priestess
  Advisor = 'advisor',
  // III - The Empress
  Creator = 'creator',
  // IV - The Emperor
  Executive = 'executive',
  // VI - The Lovers
  Connector = 'connector',
  // VII - The Chariot
  Operator = 'operator',
  // VIII - Strength
  Seller = 'seller',
  // IX - The Hermit
  Researcher = 'researcher',
  // XIV - Temperance
  Integrator = 'integrator',
  // XVII - The Star
  Evangelist = 'evangelist',
  // XX - Judgement
  Investor = 'investor',
  // ? - Unknown
  Unknown = 'unknown',
}

// Map archetypes to tarot cards (Major Arcana)
const ARCHETYPE_TAROT: Record<Archetype, string> = {
  [Archetype.Builder]: 'magician',
  [Archetype.Advisor]: 'high-priestess',
  [Archetype.Creator]: 'empress',
  [Archetype.Executive]: 'emperor',
  [Archetype.Connector]: 'lovers',
  [Archetype.Operator]: 'chariot',
  [Archetype.Seller]: 'strength',
  [Archetype.Researcher]: 'hermit',
  [Archetype.Integrator]: 'temperance',
  [Archetype.Evangelist]: 'star',
  [Archetype.Investor]: 'judgement',
  [Archetype.Unknown]: 'unknown',
};

// Archetype descriptions for the builder/entrepreneur/investor ecosystem
const ARCHETYPE_DESCRIPTIONS: Record<Archetype, { title: string; subtitle: string; description: string }> = {
  [Archetype.Builder]: {
    title: 'The Magician',
    subtitle: 'The Builder',
    description: 'Technical founders and engineers who turn ideas into reality. They wield code, systems, and tools to create products from nothing. Often the first hire or co-founder you need to ship.',
  },
  [Archetype.Advisor]: {
    title: 'The High Priestess',
    subtitle: 'The Advisor',
    description: 'Keepers of hidden knowledge and institutional wisdom. Board members, executive coaches, and seasoned advisors who see what others miss. They speak rarely but their counsel shapes destinies.',
  },
  [Archetype.Creator]: {
    title: 'The Empress',
    subtitle: 'The Creator',
    description: 'Creative forces who birth new ideas and nurture them to fruition. Designers, brand builders, and product visionaries who shape how things feel. They bring beauty and meaning to functional things.',
  },
  [Archetype.Executive]: {
    title: 'The Emperor',
    subtitle: 'The Executive',
    description: 'Leaders who build structure and command respect. CEOs, presidents, and managing directors who create order from chaos. They establish the rules, set the culture, and hold the line.',
  },
  [Archetype.Connector]: {
    title: 'The Lovers',
    subtitle: 'The Connector',
    description: 'Network weavers who make valuable introductions. They know everyone and understand who needs to meet whom. The person whose text gets returned by anyone in the ecosystem.',
  },
  [Archetype.Operator]: {
    title: 'The Chariot',
    subtitle: 'The Operator',
    description: 'Execution machines who drive toward goals through sheer will. COOs, Chiefs of Staff, and program managers who make things happen. They turn strategy into results through discipline and focus.',
  },
  [Archetype.Seller]: {
    title: 'Strength',
    subtitle: 'The Seller',
    description: 'Revenue generators who close deals through persistence and persuasion. They understand customer psychology and can sell vision as effectively as product. First sales hire material.',
  },
  [Archetype.Researcher]: {
    title: 'The Hermit',
    subtitle: 'The Researcher',
    description: 'Deep thinkers who illuminate through solitary study. Scientists, analysts, and domain experts who find truth through rigorous investigation. They validate assumptions before you bet the company.',
  },
  [Archetype.Integrator]: {
    title: 'Temperance',
    subtitle: 'The Integrator',
    description: 'Masters of balance who blend opposing forces. Product managers, generalists, and bridge-builders who synthesize different perspectives. They find harmony between competing priorities.',
  },
  [Archetype.Evangelist]: {
    title: 'The Star',
    subtitle: 'The Evangelist',
    description: 'Beacons who inspire and attract through authentic sharing. Developer advocates, thought leaders, and community builders who draw others to the mission. They turn users into believers.',
  },
  [Archetype.Investor]: {
    title: 'Judgement',
    subtitle: 'The Investor',
    description: 'Evaluators who decide which ventures deserve capital and support. Angels, VCs, and LPs who place bets on people and ideas. Their judgment determines who gets the chance to build.',
  },
  [Archetype.Unknown]: {
    title: '?',
    subtitle: 'Unknown',
    description: 'A profile that doesn\'t clearly fit the core entrepreneurial archetypes. They may be early in their journey, in a specialized field, or simply haven\'t revealed enough to classify yet.',
  },
};

export interface HistoryEntry {
  date: string;
  field: 'name' | 'headline' | 'location' | 'employers' | 'education';
  oldValue: unknown;
  newValue: unknown;
}

export interface ProfileIntelligence {
  name: string;
  headline?: string;
  location?: string;
  avatarUrl?: string;
  archetype: Archetype;
  skills: string[];
  couldBe: string[];
  goodFor: string[];
  firstSeen?: Date;
  jobChange?: {
    current: string;
    previous: string;
  };
  history?: HistoryEntry[];
  verified?: boolean; // Whether profile data was verified via scraper
}

export interface Position {
  x: number;
  y: number;
}

export const FREE_PROFILE_LIMIT = 10;

export type WorkerStatus = 'pending' | 'loading' | 'complete';

export interface WorkerState {
  name: string;
  status: WorkerStatus;
}

export interface ExtractionProgress {
  step: string;
  label: string;
  progress: number; // 0-1
  elapsed: number; // ms
  workers?: WorkerState[]; // For parallel scraping display
}

export interface ContactNote {
  id: string;
  contact_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipScore {
  score: number; // 0-100
  interactions: number;
  lastInteraction: Date;
  notesCount: number;
}

export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  memberCount: number;
}

export interface ActivityItem {
  id: string;
  type: 'note_added' | 'profile_viewed' | 'tag_added' | 'group_added' | 'skill_confirmed';
  description: string;
  timestamp: Date;
}

export interface NetworkContact {
  id: string;
  name: string;
  sharedTags: string[];
}

export interface IntroductionInfo {
  introducedBy?: string;
  metAt?: string;
}

export interface ContactStats {
  totalContacts: number;
  totalNotes: number;
  totalTags: number;
  thisWeekContacts: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

export interface Panel {
  element: HTMLElement;
  getState: () => PanelState;
  toggle: () => void;
  setIntelligence: (intelligence: ProfileIntelligence) => void;
  primeForProfile: (name: string, headline?: string, location?: string, avatarUrl?: string) => void;
  setPosition: (x: number, y: number) => void;
  getPosition: () => Position;
  setProfileCount: (count: number) => void;
  setAuthenticated: (authenticated: boolean) => void;
  showGate: () => void;
  setMinimalMode: (minimal: boolean) => void;
  setProgress: (progress: ExtractionProgress | null) => void;
  showHistory: (profiles: { profileId: string; name: string; headline?: string; avatarUrl?: string; lastSeen: string }[]) => void;
  onReanalyze: (callback: () => void) => void;
  onAddNote: (callback: (content: string) => Promise<{ success: boolean; error?: string }>) => void;
  onEditNote: (callback: (noteId: string, content: string) => Promise<{ success: boolean; error?: string }>) => void;
  onDeleteNote: (callback: (noteId: string) => Promise<{ success: boolean; error?: string }>) => void;
  onSkillConfirm: (callback: (skill: string) => Promise<{ success: boolean; error?: string }>) => void;
  onSkillDismiss: (callback: (skill: string) => Promise<{ success: boolean; error?: string }>) => void;
  setCurrentProfile: (profileId: string) => void;
  setNotes: (notes: ContactNote[]) => void;
  setNotesLoading: (loading: boolean) => void;
  setRelationshipScore: (score: RelationshipScore) => void;
  setTags: (tags: ContactTag[]) => void;
  onTagRemove: (callback: (tagId: string) => void) => void;
  setGroups: (groups: ContactGroup[]) => void;
  setAvailableGroups: (groups: ContactGroup[]) => void;
  onAddToGroup: (callback: (groupId: string) => void) => void;
  onRemoveFromGroup: (callback: (groupId: string) => void) => void;
  setActivityFeed: (activities: ActivityItem[]) => void;
  setNetworkContacts: (contacts: NetworkContact[]) => void;
  setIntroduction: (intro: IntroductionInfo) => void;
  onBulkTagApply: (callback: (profileIds: string[], tagName: string) => void) => void;
  setStats: (stats: ContactStats) => void;
  getTemplates: () => NoteTemplate[];
  addTemplate: (template: Omit<NoteTemplate, 'id'>) => void;
  editTemplate: (id: string, updates: Partial<Omit<NoteTemplate, 'id'>>) => void;
  deleteTemplate: (id: string) => void;
  showTemplatesManager: () => void;
  showConsentOverlay: () => void;
  hideConsentOverlay: () => void;
  onConsentAccept: (callback: () => void) => void;
  destroy: () => void;
}

function formatContactForClipboard(intelligence: ProfileIntelligence): string {
  const lines: string[] = [];
  lines.push(intelligence.name);
  if (intelligence.archetype) {
    lines.push(`Archetype: ${capitalizeFirst(intelligence.archetype)}`);
  }
  if (intelligence.skills && intelligence.skills.length > 0) {
    lines.push(`Skills: ${intelligence.skills.join(', ')}`);
  }
  if (intelligence.couldBe && intelligence.couldBe.length > 0) {
    lines.push(`Could Be: ${intelligence.couldBe.join(', ')}`);
  }
  if (intelligence.goodFor && intelligence.goodFor.length > 0) {
    lines.push(`Good For: ${intelligence.goodFor.join(', ')}`);
  }
  return lines.join('\n');
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return 'today';
}

/**
 * Filter history entries to only show meaningful changes.
 * Excludes entries from the same day as firstSeen (initial data capture).
 */
function filterMeaningfulHistory(history: HistoryEntry[], firstSeen?: Date): HistoryEntry[] {
  if (!history || !firstSeen) return history || [];

  // Get firstSeen date at midnight for comparison
  const firstSeenDate = new Date(firstSeen);
  firstSeenDate.setHours(0, 0, 0, 0);

  return history.filter(entry => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    // Only show entries from days AFTER the first seen date
    return entryDate.getTime() > firstSeenDate.getTime();
  });
}

function formatHistoryEntry(entry: HistoryEntry): string {
  const date = formatRelativeTime(new Date(entry.date));
  const fieldLabels: Record<string, string> = {
    name: 'Name',
    headline: 'Title',
    location: 'Location',
    employers: 'Company',
    education: 'Education',
  };
  const field = fieldLabels[entry.field] || entry.field;

  // Format the change description
  if (entry.field === 'employers') {
    const oldCompany = Array.isArray(entry.oldValue) && entry.oldValue[0]?.company;
    const newCompany = Array.isArray(entry.newValue) && entry.newValue[0]?.company;
    if (oldCompany && newCompany) {
      return `${date}: Joined ${newCompany} (was ${oldCompany})`;
    } else if (newCompany) {
      return `${date}: Joined ${newCompany}`;
    }
  }

  if (entry.field === 'education') {
    const oldSchool = Array.isArray(entry.oldValue) && entry.oldValue[0]?.school;
    const newSchool = Array.isArray(entry.newValue) && entry.newValue[0]?.school;
    if (newSchool && newSchool !== oldSchool) {
      return `${date}: Added ${newSchool}`;
    }
  }

  // For simple string fields
  const oldVal = typeof entry.oldValue === 'string' ? entry.oldValue : '';
  const newVal = typeof entry.newValue === 'string' ? entry.newValue : '';

  if (oldVal && newVal) {
    // Truncate long values
    const truncOld = oldVal.length > 30 ? oldVal.slice(0, 27) + '...' : oldVal;
    const truncNew = newVal.length > 30 ? newVal.slice(0, 27) + '...' : newVal;
    return `${date}: ${field} → ${truncNew}`;
  } else if (newVal) {
    return `${date}: ${field} set to ${newVal}`;
  }

  return `${date}: ${field} changed`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show tarot card popup modal with Rider-Waite image and archetype description
 */
function showTarotPopup(archetype: Archetype): void {
  // Remove existing popup if any
  const existingPopup = document.querySelector('.sr-tarot-popup');
  existingPopup?.remove();

  // Normalize archetype - use Unknown if not in current set
  const validArchetype = archetype && archetype in ARCHETYPE_TAROT ? archetype : Archetype.Unknown;
  const tarotCard = ARCHETYPE_TAROT[validArchetype];
  const info = ARCHETYPE_DESCRIPTIONS[validArchetype];
  const cardImageUrl = chrome.runtime.getURL(`tarot/${tarotCard}.jpg`);

  const popup = document.createElement('div');
  popup.className = 'sr-tarot-popup';
  popup.innerHTML = `
    <div class="sr-tarot-popup__backdrop"></div>
    <div class="sr-tarot-popup__content">
      <button class="sr-tarot-popup__close">&times;</button>
      <div class="sr-tarot-popup__card">
        <img src="${cardImageUrl}" alt="${info.title}" />
      </div>
      <div class="sr-tarot-popup__info">
        <h2 class="sr-tarot-popup__title">${info.subtitle}</h2>
        <p class="sr-tarot-popup__description">${info.description}</p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Animate in
  requestAnimationFrame(() => {
    popup.classList.add('sr-tarot-popup--visible');
  });

  // Close handlers
  const closePopup = () => {
    popup.classList.remove('sr-tarot-popup--visible');
    setTimeout(() => popup.remove(), 300);
  };

  popup.querySelector('.sr-tarot-popup__backdrop')?.addEventListener('click', closePopup);
  popup.querySelector('.sr-tarot-popup__close')?.addEventListener('click', closePopup);

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

export function createPanel(container: HTMLElement): Panel {
  let state: PanelState = PanelState.Minimized;
  let position: Position = { x: 20, y: 20 }; // Default bottom-right offset
  let profileCount = 0;
  let isAuthenticated = false;
  let reanalyzeCallback: (() => void) | null = null;
  let addNoteCallback: ((content: string) => Promise<{ success: boolean; error?: string }>) | null = null;
  let editNoteCallback: ((noteId: string, content: string) => Promise<{ success: boolean; error?: string }>) | null = null;
  let deleteNoteCallback: ((noteId: string) => Promise<{ success: boolean; error?: string }>) | null = null;
  let skillConfirmCallback: ((skill: string) => Promise<{ success: boolean; error?: string }>) | null = null;
  let skillDismissCallback: ((skill: string) => Promise<{ success: boolean; error?: string }>) | null = null;
  let currentProfileId: string | null = null;
  let currentIntelligence: ProfileIntelligence | null = null;
  let currentNotes: ContactNote[] = [];
  let notesSortOrder: 'desc' | 'asc' = 'desc';
  let pendingDeleteNote: ContactNote | null = null;
  let pendingDeleteTimer: ReturnType<typeof setTimeout> | null = null;
  let tagRemoveCallback: ((tagId: string) => void) | null = null;
  let currentGroups: ContactGroup[] = [];
  let availableGroups: ContactGroup[] = [];
  let addToGroupCallback: ((groupId: string) => void) | null = null;
  let removeFromGroupCallback: ((groupId: string) => void) | null = null;
  let networkContacts: NetworkContact[] = [];
  let currentIntroduction: IntroductionInfo | null = null;
  let bulkTagCallback: ((profileIds: string[], tagName: string) => void) | null = null;
  let consentAcceptCallback: (() => void) | null = null;
  let bulkSelectMode = false;
  let selectedProfiles: Set<string> = new Set();
  let currentStats: ContactStats | null = null;

  // Default note templates
  const defaultTemplates: NoteTemplate[] = [
    { id: 'default-1', name: 'Met at [event]', content: 'Met at [event] - ', isDefault: true },
    { id: 'default-2', name: 'Intro from [person]', content: 'Intro from [person] - ', isDefault: true },
    { id: 'default-3', name: 'Follow up', content: 'Follow up: ', isDefault: true },
    { id: 'default-4', name: 'Discussed', content: 'Discussed: ', isDefault: true },
    { id: 'default-5', name: 'Action item', content: 'Action item: ', isDefault: true },
  ];
  let noteTemplates: NoteTemplate[] = [...defaultTemplates];

  const element = document.createElement('div');
  element.className = 'sr-panel sr-panel--minimized sr-panel--draggable';
  element.style.transform = `translate(${position.x}px, ${position.y}px)`;
  element.setAttribute('tabindex', '0'); // Make panel focusable for keyboard shortcuts

  const orb = document.createElement('div');
  orb.className = 'sr-panel__orb sr-panel__orb--visible';
  element.appendChild(orb);

  const content = document.createElement('div');
  content.className = 'sr-panel__content';
  element.appendChild(content);

  // Progress bar element
  const progressBar = document.createElement('div');
  progressBar.className = 'sr-panel__progress';
  progressBar.innerHTML = `
    <div class="sr-panel__progress-header">
      <span class="sr-panel__progress-label">Loading...</span>
      <span class="sr-panel__progress-time">0.0s</span>
    </div>
    <div class="sr-panel__progress-workers"></div>
    <div class="sr-panel__progress-track">
      <div class="sr-panel__progress-fill"></div>
    </div>
  `;

  container.appendChild(element);

  function toggle(): void {
    if (state === PanelState.Minimized) {
      state = PanelState.Expanded;
      element.classList.remove('sr-panel--minimized');
      element.classList.add('sr-panel--expanded');
      orb.classList.remove('sr-panel__orb--visible');
      content.classList.add('sr-panel__content--visible');
    } else {
      state = PanelState.Minimized;
      element.classList.remove('sr-panel--expanded');
      element.classList.add('sr-panel--minimized');
      orb.classList.add('sr-panel__orb--visible');
      content.classList.remove('sr-panel__content--visible');
    }
  }

  function setIntelligence(intelligence: ProfileIntelligence): void {
    logger.debug(' setIntelligence called with:', intelligence);
    currentIntelligence = intelligence;

    // Normalize archetype - use Unknown if not in current set
    const validArchetype = intelligence.archetype && intelligence.archetype in ARCHETYPE_TAROT
      ? intelligence.archetype
      : Archetype.Unknown;
    const tarotCard = ARCHETYPE_TAROT[validArchetype];
    logger.debug(' Using archetype:', validArchetype, 'tarot:', tarotCard);

    const jobAlertHtml = intelligence.jobChange
      ? `<div class="sr-panel__job-alert">
          <span class="sr-panel__job-alert-icon">🔥</span>
          <span class="sr-panel__job-alert-text">NEW: ${intelligence.jobChange.current} (was ${intelligence.jobChange.previous})</span>
        </div>`
      : '';

    // Build subtitle from headline and location
    const subtitleParts: string[] = [];
    if (intelligence.headline) subtitleParts.push(intelligence.headline);
    if (intelligence.location) subtitleParts.push(intelligence.location);
    const subtitleHtml = subtitleParts.length > 0
      ? `<div class="sr-panel__subtitle">${subtitleParts.join(' · ')}</div>`
      : '';

    // Unverified indicator (muted question mark)
    const unverifiedIndicator = intelligence.verified === false
      ? '<span class="sr-panel__unverified" title="Profile data from community - not yet verified">?</span>'
      : '';

    content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">${intelligence.name}</span>${unverifiedIndicator}
        <div class="sr-panel__header-actions">
          <button class="sr-panel__network-graph-btn" title="View network graph">🕸️</button>
          <button class="sr-panel__copy-btn" title="Copy contact info">📋</button>
          <button class="sr-panel__minimize">━</button>
        </div>
      </div>
      ${subtitleHtml}
      <div class="sr-panel__body">
        ${jobAlertHtml}
        <div class="sr-panel__archetype">
          <div class="sr-panel__tarot sr-panel__tarot--clickable" data-card="${tarotCard}" title="Click to learn more"></div>
          <span class="sr-panel__archetype-name">${capitalizeFirst(validArchetype)}</span>
        </div>
        <div class="sr-panel__skills">
          ${intelligence.skills.map(s => `
            <div class="sr-panel__skill-item" data-skill="${s}">
              <span class="sr-panel__skill">${s}</span>
              <div class="sr-panel__skill-actions">
                <button class="sr-panel__skill-confirm" title="Confirm this skill">✓</button>
                <button class="sr-panel__skill-dismiss" title="Dismiss this skill">×</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="sr-panel__could-be">
          <span class="sr-panel__label">COULD BE</span>
          ${intelligence.couldBe.join(' · ')}
        </div>
        <div class="sr-panel__good-for">
          <span class="sr-panel__label">GOOD FOR</span>
          ${intelligence.goodFor.join(' · ')}
        </div>
        ${currentIntroduction && (currentIntroduction.introducedBy || currentIntroduction.metAt) ? `
          <div class="sr-panel__introduction">
            ${currentIntroduction.introducedBy ? `
              <div class="sr-panel__intro-field">
                <span class="sr-panel__intro-label">Introduced by</span>
                <span class="sr-panel__intro-value">${currentIntroduction.introducedBy}</span>
              </div>
            ` : ''}
            ${currentIntroduction.metAt ? `
              <div class="sr-panel__intro-field">
                <span class="sr-panel__intro-label">Met at</span>
                <span class="sr-panel__intro-value">${currentIntroduction.metAt}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${(() => {
          const meaningfulHistory = filterMeaningfulHistory(intelligence.history || [], intelligence.firstSeen);
          return meaningfulHistory.length > 0 ? `
          <div class="sr-panel__history-section">
            <span class="sr-panel__label">HISTORY</span>
            <div class="sr-panel__history-entries">
              ${meaningfulHistory.slice(-5).reverse().map(entry =>
                `<div class="sr-panel__history-entry">${formatHistoryEntry(entry)}</div>`
              ).join('')}
            </div>
          </div>
        ` : '';
        })()}
        ${currentStats ? `
          <div class="sr-panel__stats">
            <span class="sr-panel__label">STATS</span>
            <div class="sr-panel__stats-grid">
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalContacts}</span>
                <span class="sr-panel__stat-label">Contacts</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalNotes}</span>
                <span class="sr-panel__stat-label">Notes</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalTags}</span>
                <span class="sr-panel__stat-label">Tags</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.thisWeekContacts}</span>
                <span class="sr-panel__stat-label">This Week</span>
              </div>
            </div>
          </div>
        ` : ''}
        ${intelligence.firstSeen ? `
          <div class="sr-panel__first-seen">First seen ${formatRelativeTime(intelligence.firstSeen)}</div>
        ` : ''}
      </div>
      <div class="sr-panel__footer">
        <button class="sr-panel__add-note">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 3.5L10.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Add note</span>
        </button>
        <button class="sr-panel__add-introduction">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="10" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M1 12.5C1 10.5 2.5 9 4.5 9C5.5 9 6.5 9.5 7 10C7.5 9.5 8.5 9 9.5 9C11.5 9 13 10.5 13 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Add intro</span>
        </button>
        <button class="sr-panel__reanalyze" title="Re-run AI analysis">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 7C1.5 4 4 1.5 7 1.5C10 1.5 12.5 4 12.5 7C12.5 10 10 12.5 7 12.5C5 12.5 3.3 11.5 2.3 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M1 7.5L2.3 10L4.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Re-analyze</span>
        </button>
      </div>
    `;

    logger.debug(' Content updated, innerHTML length:', content.innerHTML.length);
    logger.debug(' Content visible class:', content.classList.contains('sr-panel__content--visible'));
    logger.debug(' Panel state:', state);

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);

    // Add click handler for copy button
    const copyBtn = content.querySelector('.sr-panel__copy-btn');
    copyBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (currentIntelligence) {
        const text = formatContactForClipboard(currentIntelligence);
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add('sr-panel__copy-btn--success');
        setTimeout(() => copyBtn.classList.remove('sr-panel__copy-btn--success'), 2000);
      }
    });

    // Add click handler for network graph button
    const networkGraphBtn = content.querySelector('.sr-panel__network-graph-btn');
    networkGraphBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      showNetworkGraph();
    });

    // Add click handler for tarot card popup
    const tarotEl = content.querySelector('.sr-panel__tarot');
    tarotEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      showTarotPopup(validArchetype);
    });

    // Add click handler for re-analyze button
    const reanalyzeBtn = content.querySelector('.sr-panel__reanalyze');
    reanalyzeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (reanalyzeCallback) {
        reanalyzeCallback();
      }
    });

    // Add click handler for add note button
    const addNoteBtn = content.querySelector('.sr-panel__add-note');
    addNoteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      showNoteInput();
    });

    // Add click handler for add introduction button
    const addIntroBtn = content.querySelector('.sr-panel__add-introduction');
    addIntroBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      showIntroductionForm();
    });

    // Wire up skill confirm/dismiss buttons
    content.querySelectorAll('.sr-panel__skill-confirm').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skillItem = (btn as HTMLElement).closest('.sr-panel__skill-item');
        const skill = skillItem?.getAttribute('data-skill');

        if (!skill || !skillConfirmCallback) return;

        const result = await skillConfirmCallback(skill);
        if (result.success) {
          skillItem?.classList.add('sr-panel__skill-item--confirmed');
        }
      });
    });

    content.querySelectorAll('.sr-panel__skill-dismiss').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skillItem = (btn as HTMLElement).closest('.sr-panel__skill-item');
        const skill = skillItem?.getAttribute('data-skill');

        if (!skill || !skillDismissCallback) return;

        const result = await skillDismissCallback(skill);
        if (result.success) {
          skillItem?.remove();
        }
      });
    });
  }

  const MAX_NOTE_LENGTH = 500;

  function showNoteInput(): void {
    // Remove existing note input if any
    const existingInput = content.querySelector('.sr-panel__note-input');
    existingInput?.remove();

    // Create note input form with refined Art Deco design
    const noteInput = document.createElement('div');
    noteInput.className = 'sr-panel__note-input';
    noteInput.innerHTML = `
      <div class="sr-panel__note-header">
        <div class="sr-panel__note-header-line"></div>
        <span class="sr-panel__note-header-title">NEW NOTE</span>
        <div class="sr-panel__note-header-line"></div>
      </div>
      <div class="sr-panel__note-composer">
        <div class="sr-panel__note-textarea-wrapper">
          <textarea class="sr-panel__note-textarea" placeholder="What would you like to remember about this person?" rows="4" maxlength="${MAX_NOTE_LENGTH}"></textarea>
          <div class="sr-panel__note-toolbar">
            <button class="sr-panel__template-btn" title="Insert template">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="2" rx="0.5" fill="currentColor"/>
                <rect x="2" y="7" width="8" height="2" rx="0.5" fill="currentColor"/>
                <rect x="2" y="11" width="10" height="2" rx="0.5" fill="currentColor"/>
              </svg>
            </button>
            <div class="sr-panel__note-char-indicator">
              <svg class="sr-panel__char-ring" viewBox="0 0 36 36">
                <circle class="sr-panel__char-ring-bg" cx="18" cy="18" r="16" fill="none" stroke-width="2"/>
                <circle class="sr-panel__char-ring-progress" cx="18" cy="18" r="16" fill="none" stroke-width="2" stroke-dasharray="100.53" stroke-dashoffset="100.53"/>
              </svg>
              <span class="sr-panel__char-count-text">0</span>
            </div>
          </div>
        </div>
      </div>
      <div class="sr-panel__note-actions">
        <button class="sr-panel__note-cancel">
          <span>Cancel</span>
        </button>
        <button class="sr-panel__note-save">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 3.5L5.5 10.5L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Save Note</span>
        </button>
      </div>
      <div class="sr-panel__note-status"></div>
    `;

    // Insert before footer
    const footer = content.querySelector('.sr-panel__footer');
    if (footer) {
      footer.insertAdjacentElement('beforebegin', noteInput);
    } else {
      content.appendChild(noteInput);
    }

    // Focus the textarea
    const textarea = noteInput.querySelector('.sr-panel__note-textarea') as HTMLTextAreaElement;
    const charCountText = noteInput.querySelector('.sr-panel__char-count-text') as HTMLElement;
    const charRingProgress = noteInput.querySelector('.sr-panel__char-ring-progress') as SVGCircleElement;
    const charIndicator = noteInput.querySelector('.sr-panel__note-char-indicator') as HTMLElement;
    const circumference = 2 * Math.PI * 16; // r=16
    textarea?.focus();

    // Update character count and circular progress on input
    function updateCharCount(): void {
      const currentLength = textarea.value.length;
      const percentage = currentLength / MAX_NOTE_LENGTH;
      const offset = circumference - (percentage * circumference);

      if (charCountText) charCountText.textContent = `${currentLength}`;
      if (charRingProgress) charRingProgress.style.strokeDashoffset = `${offset}`;

      // Change color when approaching limit
      if (charIndicator) {
        charIndicator.classList.remove('sr-panel__note-char-indicator--warning', 'sr-panel__note-char-indicator--danger');
        if (percentage >= 0.9) {
          charIndicator.classList.add('sr-panel__note-char-indicator--danger');
        } else if (percentage >= 0.75) {
          charIndicator.classList.add('sr-panel__note-char-indicator--warning');
        }
      }
    }

    textarea?.addEventListener('input', updateCharCount);

    // Cancel button handler
    const cancelBtn = noteInput.querySelector('.sr-panel__note-cancel');
    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      noteInput.remove();
    });

    // Template button handler
    const templateBtn = noteInput.querySelector('.sr-panel__template-btn');
    templateBtn?.addEventListener('click', (e) => {
      e.stopPropagation();

      // Remove existing dropdown if any
      const existingDropdown = noteInput.querySelector('.sr-panel__template-dropdown');
      if (existingDropdown) {
        existingDropdown.remove();
        return;
      }

      // Create dropdown with dynamic templates
      const dropdown = document.createElement('div');
      dropdown.className = 'sr-panel__template-dropdown';

      const templatesHtml = noteTemplates.map(t =>
        `<button class="sr-panel__template-option" data-template="${t.content}">${t.name}</button>`
      ).join('');

      dropdown.innerHTML = `
        ${templatesHtml}
        <div class="sr-panel__template-divider"></div>
        <button class="sr-panel__template-manage">⚙️ Manage Templates</button>
      `;

      // Wire up template options
      dropdown.querySelectorAll('.sr-panel__template-option').forEach(option => {
        option.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const template = option.getAttribute('data-template') || '';
          textarea.value = template;
          textarea.focus();
          updateCharCount();
          dropdown.remove();
        });
      });

      // Wire up manage templates button
      dropdown.querySelector('.sr-panel__template-manage')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropdown.remove();
        noteInput.remove();
        showTemplatesManager();
      });

      // Insert dropdown after template button
      templateBtn.insertAdjacentElement('afterend', dropdown);
    });

    // Save button handler
    const saveBtn = noteInput.querySelector('.sr-panel__note-save');
    const statusEl = noteInput.querySelector('.sr-panel__note-status') as HTMLElement;

    saveBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const noteContent = textarea?.value.trim();

      if (!noteContent) {
        statusEl.textContent = 'Please enter a note';
        statusEl.className = 'sr-panel__note-status sr-panel__note-status--error';
        return;
      }

      if (!addNoteCallback) {
        statusEl.textContent = 'Note saving not configured';
        statusEl.className = 'sr-panel__note-status sr-panel__note-status--error';
        return;
      }

      // Disable buttons while saving
      (saveBtn as HTMLButtonElement).disabled = true;
      (cancelBtn as HTMLButtonElement).disabled = true;
      statusEl.textContent = 'Saving...';
      statusEl.className = 'sr-panel__note-status';

      try {
        const result = await addNoteCallback(noteContent);

        if (result.success) {
          statusEl.textContent = 'Note saved!';
          statusEl.className = 'sr-panel__note-status sr-panel__note-status--success';
          // Remove input after short delay
          setTimeout(() => noteInput.remove(), 1000);
        } else {
          statusEl.textContent = result.error || 'Failed to save note';
          statusEl.className = 'sr-panel__note-status sr-panel__note-status--error';
          (saveBtn as HTMLButtonElement).disabled = false;
          (cancelBtn as HTMLButtonElement).disabled = false;
        }
      } catch (err) {
        statusEl.textContent = 'Network error';
        statusEl.className = 'sr-panel__note-status sr-panel__note-status--error';
        (saveBtn as HTMLButtonElement).disabled = false;
        (cancelBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  function primeForProfile(name: string, headline?: string, location?: string, avatarUrl?: string): void {
    logger.debug(' Priming for profile:', name, headline, location);

    // Use unknown tarot as placeholder
    const tarotCard = ARCHETYPE_TAROT[Archetype.Unknown];

    // Build subtitle from headline and location
    const subtitleParts: string[] = [];
    if (headline) subtitleParts.push(headline);
    if (location) subtitleParts.push(location);
    const subtitleHtml = subtitleParts.length > 0
      ? `<div class="sr-panel__subtitle">${subtitleParts.join(' · ')}</div>`
      : '';

    content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">${name}</span>
        <button class="sr-panel__minimize">━</button>
      </div>
      ${subtitleHtml}
      <div class="sr-panel__body">
        <div class="sr-panel__archetype">
          <div class="sr-panel__tarot sr-panel__tarot--loading" data-card="${tarotCard}" title="Analyzing..."></div>
          <span class="sr-panel__archetype-name sr-panel__archetype-name--loading">Analyzing...</span>
        </div>
        <div class="sr-panel__skills sr-panel__skills--loading">
          <span class="sr-panel__skill sr-panel__skill--placeholder">···</span>
        </div>
        <div class="sr-panel__could-be sr-panel__could-be--loading">
          <span class="sr-panel__label">COULD BE</span>
          <span class="sr-panel__placeholder-text">Analyzing profile...</span>
        </div>
        <div class="sr-panel__good-for sr-panel__good-for--loading">
          <span class="sr-panel__label">GOOD FOR</span>
          <span class="sr-panel__placeholder-text">Analyzing profile...</span>
        </div>
      </div>
    `;

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);

    // Auto-expand to show loading state
    if (state === PanelState.Minimized) {
      toggle();
    }
  }

  function setPosition(x: number, y: number): void {
    position = { x, y };
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  function getPosition(): Position {
    return { ...position };
  }

  function setProfileCount(count: number): void {
    profileCount = count;
    updateCounter();
  }

  function setAuthenticated(authenticated: boolean): void {
    isAuthenticated = authenticated;
    updateCounter();
    // Remove gate if authenticated
    if (authenticated) {
      const existingGate = content.querySelector('.sr-panel__gate');
      existingGate?.remove();
      const body = content.querySelector('.sr-panel__body');
      body?.classList.remove('sr-panel__body--hidden');
    }
  }

  function updateCounter(): void {
    // Remove existing counter
    const existingCounter = content.querySelector('.sr-panel__counter');
    existingCounter?.remove();

    // Don't show counter if authenticated
    if (isAuthenticated) {
      return;
    }

    // Add counter to footer if within limit
    if (profileCount > 0 && profileCount <= FREE_PROFILE_LIMIT) {
      const footer = content.querySelector('.sr-panel__footer');
      if (footer) {
        const counter = document.createElement('div');
        counter.className = 'sr-panel__counter';
        counter.innerHTML = `<span>${profileCount} of ${FREE_PROFILE_LIMIT} free profiles</span>`;
        footer.insertBefore(counter, footer.firstChild);
      }
    }
  }

  function showGate(): void {
    // Don't show gate if authenticated
    if (isAuthenticated) {
      return;
    }

    // Hide body content
    const body = content.querySelector('.sr-panel__body');
    body?.classList.add('sr-panel__body--hidden');

    // Remove existing gate
    const existingGate = content.querySelector('.sr-panel__gate');
    existingGate?.remove();

    // Create gate
    const gate = document.createElement('div');
    gate.className = 'sr-panel__gate';
    gate.innerHTML = `
      <div class="sr-panel__gate-header">
        <span class="sr-panel__gate-diamond">◇</span>
        You've tracked ${profileCount} people.
        <br>Your network is growing.
      </div>
      <div class="sr-panel__gate-body">
        <p class="sr-panel__gate-intro">Create a free account to unlock:</p>

        <div class="sr-panel__gate-section">
          <span class="sr-panel__gate-label">EXTENSION</span>
          <ul class="sr-panel__gate-list">
            <li>Track unlimited connections</li>
            <li>Never lose your network</li>
          </ul>
        </div>

        <div class="sr-panel__gate-section">
          <span class="sr-panel__gate-label">WEB APP</span>
          <ul class="sr-panel__gate-list">
            <li>Search "Who can help with X?"</li>
            <li>Dashboard of all contacts</li>
            <li>Relationship management</li>
            <li>Full CRM features</li>
          </ul>
        </div>
      </div>
      <button class="sr-panel__gate-cta">
        Continue with Google
      </button>
      <div class="sr-panel__gate-footer">
        <span class="sr-panel__gate-diamond">◇</span>
      </div>
    `;

    // Insert gate after header
    const header = content.querySelector('.sr-panel__header');
    if (header) {
      header.insertAdjacentElement('afterend', gate);
    }
  }

  let isMinimalMode = false;

  interface RecentProfile {
    profileId: string;
    name: string;
    headline?: string;
    avatarUrl?: string;
    lastSeen: string;
  }

  function setMinimalMode(minimal: boolean): void {
    isMinimalMode = minimal;
    if (minimal) {
      element.classList.add('sr-panel--minimal');
      orb.title = 'Social Recall - Click to see recent profiles';
      // Force collapse when entering minimal mode (non-profile page)
      if (state === PanelState.Expanded) {
        state = PanelState.Minimized;
        element.classList.remove('sr-panel--expanded');
        element.classList.add('sr-panel--minimized');
        orb.classList.add('sr-panel__orb--visible');
        content.classList.remove('sr-panel__content--visible');
      }
    } else {
      element.classList.remove('sr-panel--minimal');
      orb.title = '';
      // When leaving minimal mode (switching to profile), show loading immediately
      // This ensures the history content is cleared while waiting for profile data
      const tarotCard = ARCHETYPE_TAROT[Archetype.Unknown];
      content.innerHTML = `
        <div class="sr-panel__header">
          <span class="sr-panel__name">Loading...</span>
          <button class="sr-panel__minimize">━</button>
        </div>
        <div class="sr-panel__body">
          <div class="sr-panel__archetype">
            <div class="sr-panel__tarot sr-panel__tarot--loading" data-card="${tarotCard}" title="Analyzing..."></div>
            <span class="sr-panel__archetype-name sr-panel__archetype-name--loading">Analyzing...</span>
          </div>
        </div>
      `;
      const minimizeBtn = content.querySelector('.sr-panel__minimize');
      minimizeBtn?.addEventListener('click', toggle);
    }
  }

  function showHistory(profiles: RecentProfile[]): void {
    // Reset bulk select state
    bulkSelectMode = false;
    selectedProfiles.clear();

    function renderHistoryItems(): string {
      return profiles.length > 0
        ? profiles.map(p => {
            const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const avatarContent = p.avatarUrl
              ? `<img src="${p.avatarUrl}" alt="${p.name}">`
              : initials;
            const timeAgo = formatRelativeTime(new Date(p.lastSeen));
            const checkboxHtml = bulkSelectMode
              ? `<input type="checkbox" class="sr-panel__bulk-checkbox" data-profile-id="${p.profileId}" ${selectedProfiles.has(p.profileId) ? 'checked' : ''} />`
              : '';
            return `
              <div class="sr-panel__history-item ${bulkSelectMode ? 'sr-panel__history-item--bulk' : ''}" data-profile-id="${p.profileId}">
                ${checkboxHtml}
                <div class="sr-panel__history-avatar">${avatarContent}</div>
                <div class="sr-panel__history-info">
                  <div class="sr-panel__history-name">${p.name}</div>
                  <div class="sr-panel__history-meta">${p.headline?.slice(0, 50) || 'LinkedIn'} · ${timeAgo}</div>
                </div>
              </div>
            `;
          }).join('')
        : `<div class="sr-panel__history-empty">
            <p>No profiles yet</p>
            <p>Visit LinkedIn to start tracking</p>
          </div>`;
    }

    function renderBulkActionsBar(): string {
      if (!bulkSelectMode || selectedProfiles.size === 0) return '';
      return `
        <div class="sr-panel__bulk-actions">
          <span class="sr-panel__bulk-count">${selectedProfiles.size} selected</span>
          <button class="sr-panel__bulk-add-tag">+ Tag</button>
        </div>
      `;
    }

    function updateUI(): void {
      const historyList = content.querySelector('.sr-panel__history-list');
      const bulkActionsContainer = content.querySelector('.sr-panel__bulk-actions-container');

      if (historyList) {
        historyList.innerHTML = renderHistoryItems();
        wireUpHistoryItems();
      }

      if (bulkActionsContainer) {
        bulkActionsContainer.innerHTML = renderBulkActionsBar();
        wireUpBulkActions();
      }

      // Update toggle button text
      const toggleBtn = content.querySelector('.sr-panel__bulk-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = bulkSelectMode ? 'Cancel' : 'Select';
      }
    }

    function wireUpHistoryItems(): void {
      // Wire up checkbox changes
      content.querySelectorAll('.sr-panel__bulk-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          const profileId = (checkbox as HTMLElement).getAttribute('data-profile-id');
          if (profileId) {
            if ((checkbox as HTMLInputElement).checked) {
              selectedProfiles.add(profileId);
            } else {
              selectedProfiles.delete(profileId);
            }
            updateUI();
          }
        });
      });

      // Add click handlers to open LinkedIn profiles (only if not in bulk mode)
      content.querySelectorAll('.sr-panel__history-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          if (bulkSelectMode) {
            // In bulk mode, clicking the item toggles the checkbox
            const checkbox = item.querySelector('.sr-panel__bulk-checkbox') as HTMLInputElement;
            if (checkbox && e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            const profileId = item.getAttribute('data-profile-id');
            if (profileId) {
              window.open(`https://linkedin.com/in/${profileId}`, '_blank');
            }
          }
        });
      });
    }

    function wireUpBulkActions(): void {
      const addTagBtn = content.querySelector('.sr-panel__bulk-add-tag');
      addTagBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showBulkTagInput();
      });
    }

    function showBulkTagInput(): void {
      const existingInput = content.querySelector('.sr-panel__bulk-tag-form');
      if (existingInput) {
        existingInput.remove();
        return;
      }

      const form = document.createElement('div');
      form.className = 'sr-panel__bulk-tag-form';
      form.innerHTML = `
        <input type="text" class="sr-panel__bulk-tag-input" placeholder="Tag name..." />
        <button class="sr-panel__bulk-tag-submit">Apply</button>
      `;

      const bulkActionsContainer = content.querySelector('.sr-panel__bulk-actions-container');
      bulkActionsContainer?.appendChild(form);

      const input = form.querySelector('.sr-panel__bulk-tag-input') as HTMLInputElement;
      input?.focus();

      const submitBtn = form.querySelector('.sr-panel__bulk-tag-submit');
      submitBtn?.addEventListener('click', () => {
        const tagName = input?.value.trim();
        if (tagName && bulkTagCallback && selectedProfiles.size > 0) {
          bulkTagCallback(Array.from(selectedProfiles), tagName);
          form.remove();
        }
      });
    }

    content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">Social Recall</span>
        <div class="sr-panel__header-actions">
          ${profiles.length > 0 ? '<button class="sr-panel__bulk-toggle">Select</button>' : ''}
          <button class="sr-panel__minimize">━</button>
        </div>
      </div>
      <div class="sr-panel__bulk-actions-container"></div>
      <div class="sr-panel__body sr-panel__history">
        <div class="sr-panel__history-header">
          <span class="sr-panel__history-label">RECENT</span>
        </div>
        <div class="sr-panel__history-list">
          ${renderHistoryItems()}
        </div>
      </div>
    `;

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);

    // Wire up bulk toggle
    const bulkToggle = content.querySelector('.sr-panel__bulk-toggle');
    bulkToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      bulkSelectMode = !bulkSelectMode;
      if (!bulkSelectMode) {
        selectedProfiles.clear();
      }
      updateUI();
    });

    wireUpHistoryItems();
  }

  orb.addEventListener('click', () => {
    toggle();
  });

  function setProgress(progress: ExtractionProgress | null): void {
    const labelEl = progressBar.querySelector('.sr-panel__progress-label') as HTMLElement;
    const timeEl = progressBar.querySelector('.sr-panel__progress-time') as HTMLElement;
    const fillEl = progressBar.querySelector('.sr-panel__progress-fill') as HTMLElement;
    const workersEl = progressBar.querySelector('.sr-panel__progress-workers') as HTMLElement;

    if (!progress) {
      // Hide progress bar
      progressBar.remove();
      progressBar.classList.remove('sr-panel__progress--complete');
      workersEl.innerHTML = '';
      return;
    }

    // Show progress bar in content area
    if (!content.contains(progressBar)) {
      content.insertBefore(progressBar, content.firstChild);
    }

    labelEl.textContent = progress.label;
    timeEl.textContent = `${(progress.elapsed / 1000).toFixed(1)}s`;
    fillEl.style.width = `${Math.round(progress.progress * 100)}%`;

    // Render worker grid if workers provided
    if (progress.workers && progress.workers.length > 0) {
      const workerStatusIcon = (status: WorkerStatus): string => {
        switch (status) {
          case 'pending': return '○';
          case 'loading': return '◐';
          case 'complete': return '✓';
        }
      };
      const workerStatusClass = (status: WorkerStatus): string => {
        return `sr-panel__progress-worker--${status}`;
      };

      workersEl.innerHTML = progress.workers.map(w =>
        `<span class="sr-panel__progress-worker ${workerStatusClass(w.status)}" title="${w.name}">
          <span class="sr-panel__progress-worker-icon">${workerStatusIcon(w.status)}</span>
          <span class="sr-panel__progress-worker-name">${w.name}</span>
        </span>`
      ).join('');
    } else {
      workersEl.innerHTML = '';
    }

    if (progress.step === 'complete') {
      progressBar.classList.add('sr-panel__progress--complete');
      // Auto-expand panel to show results
      if (state === PanelState.Minimized && !isMinimalMode) {
        toggle();
      }
    } else {
      progressBar.classList.remove('sr-panel__progress--complete');
      // Auto-expand panel to show progress
      if (state === PanelState.Minimized && !isMinimalMode) {
        toggle();
      }
    }
  }

  function onReanalyze(callback: () => void): void {
    reanalyzeCallback = callback;
  }

  function onAddNote(callback: (content: string) => Promise<{ success: boolean; error?: string }>): void {
    addNoteCallback = callback;
  }

  function setCurrentProfile(profileId: string): void {
    currentProfileId = profileId;
  }

  function setNotes(notes: ContactNote[]): void {
    // Store notes for re-rendering on sort change
    currentNotes = notes;

    // Remove existing notes section
    const existingNotes = content.querySelector('.sr-panel__notes-section');
    existingNotes?.remove();

    // Create notes section
    const notesSection = document.createElement('div');
    notesSection.className = 'sr-panel__notes-section';

    const sortArrow = notesSortOrder === 'desc' ? '↓' : '↑';
    const sortTitle = notesSortOrder === 'desc' ? 'Newest first' : 'Oldest first';

    // Helper function to escape HTML for XSS prevention
    function escapeHtml(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Helper function to format note content with markdown-like syntax
    function formatNoteContent(text: string): string {
      // First escape HTML to prevent XSS
      let formatted = escapeHtml(text);

      // Convert bullet points: lines starting with "- " become list items
      const lines = formatted.split('\n');
      let inList = false;
      const processedLines: string[] = [];

      for (const line of lines) {
        if (line.match(/^- /)) {
          if (!inList) {
            processedLines.push('<ul class="sr-panel__note-list">');
            inList = true;
          }
          processedLines.push(`<li>${line.substring(2)}</li>`);
        } else {
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          processedLines.push(line);
        }
      }
      if (inList) {
        processedLines.push('</ul>');
      }

      formatted = processedLines.join('\n');

      // Convert **text** to bold (must be done before single asterisk)
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      // Convert *text* to italic (single asterisk, not double)
      formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

      return formatted;
    }

    // Helper function to highlight matching text
    function highlightText(text: string, query: string): string {
      if (!query) return text;
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="sr-panel__note-highlight">$1</span>');
    }

    // Helper function to render notes with optional search query
    function renderNotesList(searchQuery: string = ''): string {
      // Sort notes by created_at based on current sort order
      const sortedNotes = [...notes].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return notesSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });

      // Filter notes if search query exists
      const filteredNotes = searchQuery
        ? sortedNotes.filter(note => note.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : sortedNotes;

      if (filteredNotes.length === 0 && searchQuery) {
        return '<div class="sr-panel__notes-no-results">No notes matching your search</div>';
      }

      return sortedNotes.map(note => {
        const timeAgo = formatRelativeTime(new Date(note.created_at));
        const wasEdited = note.updated_at && note.updated_at !== note.created_at;
        const editedIndicator = wasEdited ? '<span class="sr-panel__note-edited">(edited)</span>' : '';
        const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const hiddenClass = matchesSearch ? '' : 'sr-panel__note--hidden';
        // Format content first (escapes HTML, adds bold/italic/bullets), then highlight search matches
        const formattedContent = formatNoteContent(note.content);
        const displayContent = searchQuery && matchesSearch ? highlightText(formattedContent, searchQuery) : formattedContent;
        return `
          <div class="sr-panel__note-item ${hiddenClass}" data-note-id="${note.id}">
            <div class="sr-panel__note-header">
              <div class="sr-panel__note-time">${timeAgo} ${editedIndicator}</div>
              <div class="sr-panel__note-actions-inline">
                <button class="sr-panel__note-edit" title="Edit">✎</button>
                <button class="sr-panel__note-delete" title="Delete">×</button>
              </div>
            </div>
            <div class="sr-panel__note-content">${displayContent}</div>
          </div>
        `;
      }).join('');
    }

    // Don't show notes section if there are no notes
    if (notes.length === 0) {
      return;
    }

    notesSection.innerHTML = `
      <div class="sr-panel__notes-header">
        <span class="sr-panel__label">NOTES</span>
        <input type="text" class="sr-panel__notes-search" placeholder="Search notes..." />
        <button class="sr-panel__notes-sort" title="${sortTitle}">${sortArrow}</button>
      </div>
      <div class="sr-panel__notes-list">${renderNotesList()}</div>
    `;

    // Wire up search input
    const searchInput = notesSection.querySelector('.sr-panel__notes-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.trim();
      const notesList = notesSection.querySelector('.sr-panel__notes-list');
      if (notesList) {
        notesList.innerHTML = renderNotesList(query);
        wireUpNoteButtons(notesSection);
      }
    });

    // Insert notes at end of body (so footer stays at bottom)
    const body = content.querySelector('.sr-panel__body');
    if (body) {
      body.appendChild(notesSection);
    } else {
      // Fallback: insert before footer
      const footer = content.querySelector('.sr-panel__footer');
      if (footer) {
        footer.insertAdjacentElement('beforebegin', notesSection);
      } else {
        content.appendChild(notesSection);
      }
    }

    // Wire up sort button
    const sortBtn = notesSection.querySelector('.sr-panel__notes-sort');
    sortBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      notesSortOrder = notesSortOrder === 'desc' ? 'asc' : 'desc';
      setNotes(currentNotes);
    });

    // Wire up note buttons
    wireUpNoteButtons(notesSection);
  }

  function wireUpNoteButtons(notesSection: HTMLElement): void {
    // Wire up edit buttons
    notesSection.querySelectorAll('.sr-panel__note-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteItem = (btn as HTMLElement).closest('.sr-panel__note-item');
        const noteId = noteItem?.getAttribute('data-note-id');
        const contentEl = noteItem?.querySelector('.sr-panel__note-content');
        const currentContent = contentEl?.textContent || '';

        if (!noteId || !noteItem) return;

        // Replace content with edit form
        const editForm = document.createElement('div');
        editForm.className = 'sr-panel__note-edit-form';
        editForm.innerHTML = `
          <textarea class="sr-panel__note-edit-textarea">${currentContent}</textarea>
          <div class="sr-panel__note-edit-actions">
            <button class="sr-panel__note-cancel-edit">Cancel</button>
            <button class="sr-panel__note-save-edit">Save</button>
          </div>
        `;

        // Hide original content
        contentEl?.classList.add('sr-panel__note-content--hidden');
        noteItem.appendChild(editForm);

        // Focus textarea
        const textarea = editForm.querySelector('textarea') as HTMLTextAreaElement;
        textarea?.focus();

        // Cancel handler
        editForm.querySelector('.sr-panel__note-cancel-edit')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          editForm.remove();
          contentEl?.classList.remove('sr-panel__note-content--hidden');
        });

        // Save handler
        editForm.querySelector('.sr-panel__note-save-edit')?.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const newContent = textarea?.value.trim();
          if (!newContent || !editNoteCallback) return;

          await editNoteCallback(noteId, newContent);
        });
      });
    });

    // Wire up delete buttons
    notesSection.querySelectorAll('.sr-panel__note-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteItem = (btn as HTMLElement).closest('.sr-panel__note-item');
        const noteId = noteItem?.getAttribute('data-note-id');

        if (!noteId) return;

        // Find the note to delete
        const noteToDelete = currentNotes.find(n => n.id === noteId);
        if (!noteToDelete) return;

        // Store for potential undo
        pendingDeleteNote = noteToDelete;

        // Remove note from UI immediately
        const notesWithoutDeleted = currentNotes.filter(n => n.id !== noteId);
        setNotes(notesWithoutDeleted);

        // Show undo toast
        showUndoToast();

        // Clear any existing timer
        if (pendingDeleteTimer) {
          clearTimeout(pendingDeleteTimer);
        }

        // Start 5-second timer for permanent delete
        pendingDeleteTimer = setTimeout(async () => {
          if (pendingDeleteNote && deleteNoteCallback) {
            await deleteNoteCallback(pendingDeleteNote.id);
          }
          hideUndoToast();
          pendingDeleteNote = null;
          pendingDeleteTimer = null;
        }, 5000);
      });
    });
  }

  function showUndoToast(): void {
    // Remove existing toast if any
    hideUndoToast();

    const toast = document.createElement('div');
    toast.className = 'sr-panel__undo-toast';
    toast.innerHTML = `
      <span class="sr-panel__undo-text">Note deleted</span>
      <button class="sr-panel__undo-btn">Undo</button>
    `;

    // Wire up undo button
    const undoBtn = toast.querySelector('.sr-panel__undo-btn');
    undoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();

      // Cancel the pending delete
      if (pendingDeleteTimer) {
        clearTimeout(pendingDeleteTimer);
        pendingDeleteTimer = null;
      }

      // Restore the note
      if (pendingDeleteNote) {
        currentNotes = [...currentNotes, pendingDeleteNote];
        setNotes(currentNotes);
        pendingDeleteNote = null;
      }

      hideUndoToast();
    });

    content.appendChild(toast);
  }

  function hideUndoToast(): void {
    const existingToast = content.querySelector('.sr-panel__undo-toast');
    existingToast?.remove();
  }

  function onEditNote(callback: (noteId: string, content: string) => Promise<{ success: boolean; error?: string }>): void {
    editNoteCallback = callback;
  }

  function onDeleteNote(callback: (noteId: string) => Promise<{ success: boolean; error?: string }>): void {
    deleteNoteCallback = callback;
  }

  function onSkillConfirm(callback: (skill: string) => Promise<{ success: boolean; error?: string }>): void {
    skillConfirmCallback = callback;
  }

  function onSkillDismiss(callback: (skill: string) => Promise<{ success: boolean; error?: string }>): void {
    skillDismissCallback = callback;
  }

  function setNotesLoading(loading: boolean): void {
    // Find or create notes section
    let notesSection = content.querySelector('.sr-panel__notes-section');

    if (loading) {
      // Remove any existing notes section
      notesSection?.remove();

      // Create loading section
      const loadingSection = document.createElement('div');
      loadingSection.className = 'sr-panel__notes-section';
      loadingSection.innerHTML = `
        <span class="sr-panel__label">NOTES</span>
        <div class="sr-panel__notes-loading">Loading notes...</div>
      `;

      // Insert into body (so footer stays at bottom)
      const body = content.querySelector('.sr-panel__body');
      if (body) {
        body.appendChild(loadingSection);
      } else {
        const footer = content.querySelector('.sr-panel__footer');
        if (footer) {
          footer.insertAdjacentElement('beforebegin', loadingSection);
        } else {
          content.appendChild(loadingSection);
        }
      }
    } else {
      // Remove loading indicator
      const loadingIndicator = content.querySelector('.sr-panel__notes-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }
  }

  function setRelationshipScore(scoreData: RelationshipScore): void {
    // Remove existing score section
    const existingScore = content.querySelector('.sr-panel__relationship-score');
    existingScore?.remove();

    // Determine level based on score
    let level: string;
    let levelClass: string;
    if (scoreData.score >= 70) {
      level = 'Strong';
      levelClass = 'sr-panel__score-level--strong';
    } else if (scoreData.score >= 40) {
      level = 'Moderate';
      levelClass = 'sr-panel__score-level--moderate';
    } else {
      level = 'Weak';
      levelClass = 'sr-panel__score-level--weak';
    }

    // Create score section
    const scoreSection = document.createElement('div');
    scoreSection.className = 'sr-panel__relationship-score';
    scoreSection.innerHTML = `
      <div class="sr-panel__score-header">
        <span class="sr-panel__label">RELATIONSHIP STRENGTH</span>
        <span class="sr-panel__score-value">${scoreData.score}</span>
      </div>
      <div class="sr-panel__score-bar">
        <div class="sr-panel__score-bar-fill" style="width: ${scoreData.score}%"></div>
      </div>
      <span class="sr-panel__score-level ${levelClass}">${level}</span>
    `;

    // Insert after archetype section or at start of body
    const archetypeSection = content.querySelector('.sr-panel__archetype');
    const body = content.querySelector('.sr-panel__body');
    if (archetypeSection) {
      archetypeSection.insertAdjacentElement('afterend', scoreSection);
    } else if (body) {
      body.insertBefore(scoreSection, body.firstChild);
    }
  }

  function setTags(tags: ContactTag[]): void {
    // Remove existing tags section
    const existingTags = content.querySelector('.sr-panel__tags');
    existingTags?.remove();

    // Create tags section
    const tagsSection = document.createElement('div');
    tagsSection.className = 'sr-panel__tags';

    const tagsHtml = tags.map(tag => `
      <span class="sr-panel__tag-chip" data-tag-id="${tag.id}" style="--tag-color: ${tag.color}">
        <span class="sr-panel__tag-name">${tag.name}</span>
        <button class="sr-panel__tag-remove" title="Remove tag">×</button>
      </span>
    `).join('');

    tagsSection.innerHTML = `
      <div class="sr-panel__tags-header">
        <span class="sr-panel__label">TAGS</span>
      </div>
      <div class="sr-panel__tags-list">
        ${tagsHtml}
        <button class="sr-panel__add-tag-btn" title="Add tag">+</button>
      </div>
    `;

    // Wire up remove buttons
    tagsSection.querySelectorAll('.sr-panel__tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chip = (btn as HTMLElement).closest('.sr-panel__tag-chip');
        const tagId = chip?.getAttribute('data-tag-id');
        if (tagId && tagRemoveCallback) {
          tagRemoveCallback(tagId);
        }
      });
    });

    // Wire up add tag button
    const addTagBtn = tagsSection.querySelector('.sr-panel__add-tag-btn');
    addTagBtn?.addEventListener('click', (e) => {
      e.stopPropagation();

      // Remove existing input if any
      const existingInput = tagsSection.querySelector('.sr-panel__tag-input');
      if (existingInput) {
        existingInput.remove();
        return;
      }

      // Create tag input
      const tagInput = document.createElement('input');
      tagInput.className = 'sr-panel__tag-input';
      tagInput.type = 'text';
      tagInput.placeholder = 'Enter tag name...';

      // Insert before add button
      addTagBtn.insertAdjacentElement('beforebegin', tagInput);
      tagInput.focus();
    });

    // Insert after skills section or relationship score or archetype
    const skillsSection = content.querySelector('.sr-panel__skills');
    const scoreSection = content.querySelector('.sr-panel__relationship-score');
    const archetypeSection = content.querySelector('.sr-panel__archetype');
    const body = content.querySelector('.sr-panel__body');

    if (skillsSection) {
      skillsSection.insertAdjacentElement('afterend', tagsSection);
    } else if (scoreSection) {
      scoreSection.insertAdjacentElement('afterend', tagsSection);
    } else if (archetypeSection) {
      archetypeSection.insertAdjacentElement('afterend', tagsSection);
    } else if (body) {
      body.appendChild(tagsSection);
    }
  }

  function onTagRemove(callback: (tagId: string) => void): void {
    tagRemoveCallback = callback;
  }

  function setGroups(groups: ContactGroup[]): void {
    currentGroups = groups;

    // Remove existing groups section
    const existingGroups = content.querySelector('.sr-panel__groups');
    existingGroups?.remove();

    // Create groups section
    const groupsSection = document.createElement('div');
    groupsSection.className = 'sr-panel__groups';

    const groupsHtml = groups.map(group => `
      <div class="sr-panel__group-item" data-group-id="${group.id}">
        <span class="sr-panel__group-name">${group.name}</span>
        <span class="sr-panel__group-count">${group.memberCount}</span>
        <button class="sr-panel__group-remove" title="Remove from group">×</button>
      </div>
    `).join('');

    groupsSection.innerHTML = `
      <div class="sr-panel__groups-header">
        <span class="sr-panel__label">GROUPS</span>
      </div>
      <div class="sr-panel__groups-list">
        ${groupsHtml}
        <button class="sr-panel__add-to-group-btn" title="Add to group">+ Add to Group</button>
      </div>
    `;

    // Wire up remove buttons
    groupsSection.querySelectorAll('.sr-panel__group-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (btn as HTMLElement).closest('.sr-panel__group-item');
        const groupId = item?.getAttribute('data-group-id');
        if (groupId && removeFromGroupCallback) {
          removeFromGroupCallback(groupId);
        }
      });
    });

    // Wire up add to group button
    const addToGroupBtn = groupsSection.querySelector('.sr-panel__add-to-group-btn');
    addToGroupBtn?.addEventListener('click', (e) => {
      e.stopPropagation();

      // Remove existing dropdown if any
      const existingDropdown = groupsSection.querySelector('.sr-panel__group-dropdown');
      if (existingDropdown) {
        existingDropdown.remove();
        return;
      }

      // Filter out groups contact is already in
      const currentGroupIds = currentGroups.map(g => g.id);
      const availableToAdd = availableGroups.filter(g => !currentGroupIds.includes(g.id));

      // Create dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'sr-panel__group-dropdown';
      dropdown.innerHTML = availableToAdd.map(group => `
        <button class="sr-panel__group-option" data-group-id="${group.id}">${group.name}</button>
      `).join('') || '<div class="sr-panel__group-dropdown-empty">No groups available</div>';

      // Wire up options
      dropdown.querySelectorAll('.sr-panel__group-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const groupId = (option as HTMLElement).getAttribute('data-group-id');
          if (groupId && addToGroupCallback) {
            addToGroupCallback(groupId);
          }
          dropdown.remove();
        });
      });

      addToGroupBtn.insertAdjacentElement('afterend', dropdown);
    });

    // Insert after tags section or skills section
    const tagsSection = content.querySelector('.sr-panel__tags');
    const skillsSection = content.querySelector('.sr-panel__skills');
    const scoreSection = content.querySelector('.sr-panel__relationship-score');
    const archetypeSection = content.querySelector('.sr-panel__archetype');
    const body = content.querySelector('.sr-panel__body');

    if (tagsSection) {
      tagsSection.insertAdjacentElement('afterend', groupsSection);
    } else if (skillsSection) {
      skillsSection.insertAdjacentElement('afterend', groupsSection);
    } else if (scoreSection) {
      scoreSection.insertAdjacentElement('afterend', groupsSection);
    } else if (archetypeSection) {
      archetypeSection.insertAdjacentElement('afterend', groupsSection);
    } else if (body) {
      body.appendChild(groupsSection);
    }
  }

  function setAvailableGroups(groups: ContactGroup[]): void {
    availableGroups = groups;
  }

  function onAddToGroup(callback: (groupId: string) => void): void {
    addToGroupCallback = callback;
  }

  function onRemoveFromGroup(callback: (groupId: string) => void): void {
    removeFromGroupCallback = callback;
  }

  function setActivityFeed(activities: ActivityItem[]): void {
    // Remove existing activity feed section
    const existingFeed = content.querySelector('.sr-panel__activity-feed');
    existingFeed?.remove();

    // Create activity feed section
    const feedSection = document.createElement('div');
    feedSection.className = 'sr-panel__activity-feed';

    // Activity type icons
    const activityIcons: Record<string, string> = {
      note_added: '📝',
      profile_viewed: '👁️',
      tag_added: '🏷️',
      group_added: '👥',
      skill_confirmed: '✅',
    };

    // Limit to 5 activities
    const displayActivities = activities.slice(0, 5);

    if (displayActivities.length === 0) {
      feedSection.innerHTML = `
        <div class="sr-panel__activity-header">
          <span class="sr-panel__label">RECENT ACTIVITY</span>
        </div>
        <div class="sr-panel__activity-empty">No recent activity</div>
      `;
    } else {
      const activitiesHtml = displayActivities.map(activity => {
        const icon = activityIcons[activity.type] || '📌';
        const timeAgo = formatRelativeTime(activity.timestamp);
        return `
          <div class="sr-panel__activity-item" data-activity-id="${activity.id}">
            <span class="sr-panel__activity-icon">${icon}</span>
            <span class="sr-panel__activity-description">${activity.description}</span>
            <span class="sr-panel__activity-time">${timeAgo}</span>
          </div>
        `;
      }).join('');

      feedSection.innerHTML = `
        <div class="sr-panel__activity-header">
          <span class="sr-panel__label">RECENT ACTIVITY</span>
        </div>
        <div class="sr-panel__activity-list">
          ${activitiesHtml}
        </div>
      `;
    }

    // Insert after groups section or tags section
    const groupsSection = content.querySelector('.sr-panel__groups');
    const tagsSection = content.querySelector('.sr-panel__tags');
    const skillsSection = content.querySelector('.sr-panel__skills');
    const body = content.querySelector('.sr-panel__body');

    if (groupsSection) {
      groupsSection.insertAdjacentElement('afterend', feedSection);
    } else if (tagsSection) {
      tagsSection.insertAdjacentElement('afterend', feedSection);
    } else if (skillsSection) {
      skillsSection.insertAdjacentElement('afterend', feedSection);
    } else if (body) {
      body.appendChild(feedSection);
    }
  }

  function setNetworkContacts(contacts: NetworkContact[]): void {
    networkContacts = contacts;
  }

  function setIntroduction(intro: IntroductionInfo): void {
    currentIntroduction = intro;
    // Re-render if already showing intelligence
    if (currentIntelligence) {
      setIntelligence(currentIntelligence);
    }
  }

  function onBulkTagApply(callback: (profileIds: string[], tagName: string) => void): void {
    bulkTagCallback = callback;
  }

  function setStats(stats: ContactStats): void {
    currentStats = stats;
    // Re-render if already showing intelligence
    if (currentIntelligence) {
      setIntelligence(currentIntelligence);
    }
  }

  function generateTemplateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  function getTemplates(): NoteTemplate[] {
    return [...noteTemplates];
  }

  function addTemplate(template: Omit<NoteTemplate, 'id'>): void {
    const newTemplate: NoteTemplate = {
      ...template,
      id: generateTemplateId(),
    };
    noteTemplates.push(newTemplate);
  }

  function editTemplate(id: string, updates: Partial<Omit<NoteTemplate, 'id'>>): void {
    const index = noteTemplates.findIndex(t => t.id === id);
    if (index !== -1) {
      noteTemplates[index] = { ...noteTemplates[index], ...updates };
    }
  }

  function deleteTemplate(id: string): void {
    noteTemplates = noteTemplates.filter(t => t.id !== id);
  }

  function showTemplatesManager(): void {
    // Remove existing manager if any
    const existingManager = content.querySelector('.sr-panel__templates-manager');
    if (existingManager) {
      existingManager.remove();
      return;
    }

    const manager = document.createElement('div');
    manager.className = 'sr-panel__templates-manager';

    function renderTemplatesList(): string {
      return noteTemplates.map(template => `
        <div class="sr-panel__template-item" data-template-id="${template.id}">
          <div class="sr-panel__template-info">
            <span class="sr-panel__template-name">${template.name}</span>
            <span class="sr-panel__template-preview">${template.content}</span>
          </div>
          <div class="sr-panel__template-actions">
            <button class="sr-panel__template-edit-btn" title="Edit">✎</button>
            <button class="sr-panel__template-delete-btn" title="Delete">×</button>
          </div>
        </div>
      `).join('');
    }

    function renderManager(): void {
      manager.innerHTML = `
        <div class="sr-panel__templates-header">
          <span class="sr-panel__label">MANAGE TEMPLATES</span>
          <button class="sr-panel__templates-close">×</button>
        </div>
        <div class="sr-panel__templates-list">
          ${renderTemplatesList()}
        </div>
        <button class="sr-panel__template-add-new">+ Add Template</button>
      `;

      // Wire up close button
      const closeBtn = manager.querySelector('.sr-panel__templates-close');
      closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        manager.remove();
      });

      // Wire up edit buttons
      manager.querySelectorAll('.sr-panel__template-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest('.sr-panel__template-item');
          const templateId = item?.getAttribute('data-template-id');
          if (templateId) {
            showTemplateForm(templateId);
          }
        });
      });

      // Wire up delete buttons
      manager.querySelectorAll('.sr-panel__template-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest('.sr-panel__template-item');
          const templateId = item?.getAttribute('data-template-id');
          if (templateId) {
            deleteTemplate(templateId);
            renderManager();
          }
        });
      });

      // Wire up add new button
      const addNewBtn = manager.querySelector('.sr-panel__template-add-new');
      addNewBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showTemplateForm();
      });
    }

    function showTemplateForm(editId?: string): void {
      const existing = editId ? noteTemplates.find(t => t.id === editId) : null;

      const form = document.createElement('div');
      form.className = 'sr-panel__template-form';
      form.innerHTML = `
        <div class="sr-panel__template-form-field">
          <label class="sr-panel__template-form-label">Template Name</label>
          <input type="text" class="sr-panel__template-name-input" value="${existing?.name || ''}" placeholder="e.g., Weekly check-in" />
        </div>
        <div class="sr-panel__template-form-field">
          <label class="sr-panel__template-form-label">Template Content</label>
          <input type="text" class="sr-panel__template-content-input" value="${existing?.content || ''}" placeholder="e.g., Weekly check-in: " />
        </div>
        <div class="sr-panel__template-form-actions">
          <button class="sr-panel__template-cancel-btn">Cancel</button>
          <button class="sr-panel__template-save-btn">${editId ? 'Update' : 'Add'}</button>
        </div>
      `;

      // Replace list with form
      const list = manager.querySelector('.sr-panel__templates-list');
      const addBtn = manager.querySelector('.sr-panel__template-add-new');
      list?.classList.add('sr-panel__templates-list--hidden');
      addBtn?.classList.add('sr-panel__template-add-new--hidden');
      manager.appendChild(form);

      // Wire up cancel
      form.querySelector('.sr-panel__template-cancel-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        form.remove();
        list?.classList.remove('sr-panel__templates-list--hidden');
        addBtn?.classList.remove('sr-panel__template-add-new--hidden');
      });

      // Wire up save
      form.querySelector('.sr-panel__template-save-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const nameInput = form.querySelector('.sr-panel__template-name-input') as HTMLInputElement;
        const contentInput = form.querySelector('.sr-panel__template-content-input') as HTMLInputElement;
        const name = nameInput?.value.trim();
        const templateContent = contentInput?.value;

        if (name && templateContent) {
          if (editId) {
            editTemplate(editId, { name, content: templateContent });
          } else {
            addTemplate({ name, content: templateContent });
          }
          form.remove();
          renderManager();
        }
      });
    }

    renderManager();

    // Insert manager into content
    const footer = content.querySelector('.sr-panel__footer');
    if (footer) {
      footer.insertAdjacentElement('beforebegin', manager);
    } else {
      content.appendChild(manager);
    }
  }

  function showConsentOverlay(): void {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.sr-consent-modal');
    if (existingOverlay) return;

    const modal = document.createElement('div');
    modal.className = 'sr-consent-modal';
    modal.innerHTML = `
      <div class="sr-consent-modal__backdrop"></div>
      <div class="sr-consent-modal__container">
        <div class="sr-consent-modal__border-top"></div>
        <div class="sr-consent-modal__content">
          <div class="sr-consent-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
            </svg>
          </div>
          <div class="sr-consent-modal__label">NOTICE</div>
          <h2 class="sr-consent-modal__title">Authenticated Proxy</h2>
          <div class="sr-consent-modal__divider">
            <span class="sr-consent-modal__diamond">◆</span>
          </div>
          <div class="sr-consent-modal__text">
            <p>This extension captures LinkedIn profile data visible through <strong>your authenticated session</strong>.</p>
            <p>This includes connection-restricted information accessible only through your credentials.</p>
            <p><strong>Consent is required</strong> for AI-powered analysis and server synchronization.</p>
            <p class="sr-consent-modal__highlight">By proceeding, you consent to act as a data collection proxy.</p>
          </div>
          <a href="https://socialrecall.now/privacy" target="_blank" class="sr-consent-modal__privacy-link">
            <span>Read Full Privacy Policy</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
          <button class="sr-consent-modal__accept">
            <span class="sr-consent-modal__accept-text">I Understand & Accept</span>
          </button>
          <p class="sr-consent-modal__footnote">You can revoke consent anytime in Settings</p>
        </div>
        <div class="sr-consent-modal__border-bottom"></div>
      </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('sr-consent-modal--visible');
    });

    // Wire up accept button
    const acceptBtn = modal.querySelector('.sr-consent-modal__accept');
    acceptBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (consentAcceptCallback) {
        consentAcceptCallback();
      }
    });
  }

  function hideConsentOverlay(): void {
    const modal = document.querySelector('.sr-consent-modal');
    if (modal) {
      modal.classList.remove('sr-consent-modal--visible');
      setTimeout(() => modal.remove(), 300);
    }
  }

  function onConsentAccept(callback: () => void): void {
    consentAcceptCallback = callback;
  }

  function showIntroductionForm(): void {
    // Remove existing form if any
    const existingForm = content.querySelector('.sr-panel__introduction-form');
    if (existingForm) {
      existingForm.remove();
      return;
    }

    const form = document.createElement('div');
    form.className = 'sr-panel__introduction-form';
    form.innerHTML = `
      <div class="sr-panel__intro-form-field">
        <label class="sr-panel__intro-form-label">Introduced by</label>
        <input type="text" class="sr-panel__intro-form-input" name="introducedBy" value="${currentIntroduction?.introducedBy || ''}" placeholder="Who introduced you?" />
      </div>
      <div class="sr-panel__intro-form-field">
        <label class="sr-panel__intro-form-label">Met at</label>
        <input type="text" class="sr-panel__intro-form-input" name="metAt" value="${currentIntroduction?.metAt || ''}" placeholder="Event, conference, etc." />
      </div>
      <div class="sr-panel__intro-form-actions">
        <button class="sr-panel__intro-form-cancel">Cancel</button>
        <button class="sr-panel__intro-form-save">Save</button>
      </div>
    `;

    // Wire up cancel button
    const cancelBtn = form.querySelector('.sr-panel__intro-form-cancel');
    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      form.remove();
    });

    // Wire up save button
    const saveBtn = form.querySelector('.sr-panel__intro-form-save');
    saveBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const introducedByInput = form.querySelector('input[name="introducedBy"]') as HTMLInputElement;
      const metAtInput = form.querySelector('input[name="metAt"]') as HTMLInputElement;
      currentIntroduction = {
        introducedBy: introducedByInput?.value.trim() || undefined,
        metAt: metAtInput?.value.trim() || undefined,
      };
      form.remove();
      // Re-render to show the introduction section
      if (currentIntelligence) {
        setIntelligence(currentIntelligence);
      }
    });

    // Insert form before footer
    const footer = content.querySelector('.sr-panel__footer');
    if (footer) {
      footer.insertAdjacentElement('beforebegin', form);
    } else {
      content.appendChild(form);
    }
  }

  // Track if panel is destroyed
  let isDestroyed = false;

  // Helper to close note input
  function closeNoteInput(): boolean {
    const noteInput = content.querySelector('.sr-panel__note-input');
    if (noteInput) {
      noteInput.remove();
      return true;
    }
    return false;
  }

  // Quick actions menu state
  let quickActionsOpen = false;

  // Keyboard navigation state
  let focusedNoteIndex = -1;

  function updateNoteFocus(): void {
    // Clear all focus
    content.querySelectorAll('.sr-panel__note-item--focused').forEach(el => {
      el.classList.remove('sr-panel__note-item--focused');
    });

    // Set focus on current index
    const notes = content.querySelectorAll('.sr-panel__note-item:not(.sr-panel__note--hidden)');
    if (focusedNoteIndex >= 0 && focusedNoteIndex < notes.length) {
      notes[focusedNoteIndex].classList.add('sr-panel__note-item--focused');
      // Scroll into view if needed (guard for JSDOM)
      const el = notes[focusedNoteIndex] as HTMLElement;
      if (el.scrollIntoView) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function clearNoteFocus(): void {
    focusedNoteIndex = -1;
    content.querySelectorAll('.sr-panel__note-item--focused').forEach(el => {
      el.classList.remove('sr-panel__note-item--focused');
    });
  }

  function triggerEditOnFocusedNote(): void {
    const focusedNote = content.querySelector('.sr-panel__note-item--focused');
    if (focusedNote) {
      const editBtn = focusedNote.querySelector('.sr-panel__note-edit') as HTMLButtonElement;
      editBtn?.click();
    }
  }

  function showNetworkGraph(): void {
    // Remove existing modal if any
    const existingModal = content.querySelector('.sr-panel__network-graph-modal');
    if (existingModal) {
      existingModal.remove();
      return;
    }

    const currentName = currentIntelligence?.name || 'Unknown';

    // Build connected nodes HTML
    const connectedNodesHtml = networkContacts.length > 0
      ? networkContacts.map((contact, index) => {
          const angle = (index / networkContacts.length) * 2 * Math.PI;
          const radius = 80;
          const x = 100 + radius * Math.cos(angle);
          const y = 100 + radius * Math.sin(angle);
          return `
            <div class="sr-panel__graph-node sr-panel__graph-node--connected" style="left: ${x}px; top: ${y}px;" title="${contact.sharedTags.join(', ')}">
              <span class="sr-panel__graph-node-name">${contact.name}</span>
            </div>
            <svg class="sr-panel__graph-edge" style="position: absolute; left: 0; top: 0; width: 200px; height: 200px; pointer-events: none;">
              <line x1="100" y1="100" x2="${x}" y2="${y}" stroke="var(--sr-gold)" stroke-width="1" opacity="0.5" />
            </svg>
          `;
        }).join('')
      : '<div class="sr-panel__graph-empty">No connections yet</div>';

    const modal = document.createElement('div');
    modal.className = 'sr-panel__network-graph-modal';
    modal.innerHTML = `
      <div class="sr-panel__graph-header">
        <span class="sr-panel__graph-title">Network Graph</span>
        <button class="sr-panel__graph-close">×</button>
      </div>
      <div class="sr-panel__graph-container">
        <div class="sr-panel__graph-node sr-panel__graph-node--center">
          <span class="sr-panel__graph-node-name">${currentName}</span>
        </div>
        ${connectedNodesHtml}
      </div>
    `;

    // Wire up close button
    const closeBtn = modal.querySelector('.sr-panel__graph-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.remove();
    });

    // Insert modal into content
    content.appendChild(modal);
  }

  function showQuickActionsMenu(): void {
    // Remove existing menu if any
    const existingMenu = content.querySelector('.sr-panel__quick-actions');
    if (existingMenu) {
      existingMenu.remove();
      quickActionsOpen = false;
      return;
    }

    quickActionsOpen = true;

    const quickActionsMenu = document.createElement('div');
    quickActionsMenu.className = 'sr-panel__quick-actions';

    const actions = [
      { id: 'add-note', label: 'Add Note', shortcut: 'N', icon: '📝' },
      { id: 'copy-contact', label: 'Copy Contact Info', shortcut: 'C', icon: '📋' },
      { id: 'add-tag', label: 'Add Tag', shortcut: 'T', icon: '🏷️' },
      { id: 'add-to-group', label: 'Add to Group', shortcut: 'G', icon: '👥' },
      { id: 'reanalyze', label: 'Reanalyze Profile', shortcut: 'R', icon: '🔄' },
      { id: 'toggle-panel', label: 'Toggle Panel', shortcut: 'M', icon: '📌' },
    ];

    const actionsHtml = actions.map(action => `
      <button class="sr-panel__quick-action-item" data-action="${action.id}">
        <span class="sr-panel__quick-action-icon">${action.icon}</span>
        <span class="sr-panel__quick-action-label">${action.label}</span>
        <span class="sr-panel__quick-action-shortcut">${action.shortcut}</span>
      </button>
    `).join('');

    quickActionsMenu.innerHTML = `
      <div class="sr-panel__quick-actions-header">
        <input type="text" class="sr-panel__quick-actions-input" placeholder="Type a command..." />
      </div>
      <div class="sr-panel__quick-actions-list">
        ${actionsHtml}
      </div>
    `;

    // Wire up search filtering
    const searchInput = quickActionsMenu.querySelector('.sr-panel__quick-actions-input') as HTMLInputElement;
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      quickActionsMenu.querySelectorAll('.sr-panel__quick-action-item').forEach(item => {
        const label = item.querySelector('.sr-panel__quick-action-label')?.textContent?.toLowerCase() || '';
        if (label.includes(query)) {
          (item as HTMLElement).classList.remove('sr-panel__quick-action-item--hidden');
        } else {
          (item as HTMLElement).classList.add('sr-panel__quick-action-item--hidden');
        }
      });
    });

    // Wire up action buttons
    quickActionsMenu.querySelectorAll('.sr-panel__quick-action-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        closeQuickActionsMenu();
        executeQuickAction(action);
      });
    });

    // Insert at top of content
    content.insertBefore(quickActionsMenu, content.firstChild);

    // Focus the search input
    searchInput.focus();
  }

  function closeQuickActionsMenu(): void {
    const menu = content.querySelector('.sr-panel__quick-actions');
    if (menu) {
      menu.remove();
      quickActionsOpen = false;
    }
  }

  function executeQuickAction(action: string | null): void {
    switch (action) {
      case 'add-note':
        showNoteInput();
        break;
      case 'copy-contact':
        if (currentIntelligence) {
          const text = formatContactForClipboard(currentIntelligence);
          navigator.clipboard.writeText(text);
        }
        break;
      case 'add-tag':
        // Trigger add tag input
        const addTagBtn = content.querySelector('.sr-panel__add-tag-btn') as HTMLButtonElement;
        addTagBtn?.click();
        break;
      case 'add-to-group':
        // Trigger add to group dropdown
        const addToGroupBtn = content.querySelector('.sr-panel__add-to-group-btn') as HTMLButtonElement;
        addToGroupBtn?.click();
        break;
      case 'reanalyze':
        if (reanalyzeCallback) {
          reanalyzeCallback();
        }
        break;
      case 'toggle-panel':
        toggle();
        break;
    }
  }

  // Keyboard shortcuts handler
  function handleKeydown(e: KeyboardEvent): void {
    // Don't handle if panel is destroyed
    if (isDestroyed) return;

    const key = e.key.toLowerCase();
    const target = e.target as HTMLElement;

    // Check if panel has focus (panel itself or any element within it)
    const panelHasFocus = element.contains(document.activeElement) || element === document.activeElement;

    // Check if we're in an editable area within the panel
    const isEditableInPanel = panelHasFocus && target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA'
    );

    // Handle Escape globally (standard close behavior)
    if (key === 'escape') {
      if (quickActionsOpen) {
        closeQuickActionsMenu();
        return;
      }
      if (focusedNoteIndex >= 0) {
        clearNoteFocus();
        return;
      }
      if (closeNoteInput()) {
        return;
      }
      if (state === PanelState.Expanded) {
        toggle();
      }
      return;
    }

    // All other shortcuts only work when panel has focus
    if (!panelHasFocus) return;

    // Don't capture shortcuts when typing in input/textarea within panel
    // (except for special cases handled below)
    if (isEditableInPanel) {
      // Allow Enter to submit in note input
      if (key === 'enter' && !e.shiftKey && target.closest('.sr-panel__note-input')) {
        // Let the form handle submit naturally
        return;
      }
      return;
    }

    // K - Quick actions menu
    if (key === 'k') {
      e.preventDefault();
      if (state === PanelState.Expanded) {
        showQuickActionsMenu();
      }
    }
    // M - Toggle minimize/expand
    else if (key === 'm') {
      e.preventDefault();
      toggle();
    }
    // N - Open note input
    else if (key === 'n') {
      e.preventDefault();
      if (state === PanelState.Expanded) {
        showNoteInput();
      }
    }
    // ArrowDown - Navigate to next note
    else if (key === 'arrowdown' && state === PanelState.Expanded) {
      e.preventDefault();
      const notes = content.querySelectorAll('.sr-panel__note-item:not(.sr-panel__note--hidden)');
      if (notes.length > 0) {
        focusedNoteIndex = Math.min(focusedNoteIndex + 1, notes.length - 1);
        updateNoteFocus();
      }
    }
    // ArrowUp - Navigate to previous note
    else if (key === 'arrowup' && state === PanelState.Expanded) {
      e.preventDefault();
      const notes = content.querySelectorAll('.sr-panel__note-item:not(.sr-panel__note--hidden)');
      if (notes.length > 0 && focusedNoteIndex > 0) {
        focusedNoteIndex = Math.max(focusedNoteIndex - 1, 0);
        updateNoteFocus();
      }
    }
    // Enter - Edit focused note
    else if (key === 'enter' && focusedNoteIndex >= 0) {
      e.preventDefault();
      triggerEditOnFocusedNote();
    }
  }

  // Register keyboard listener
  document.addEventListener('keydown', handleKeydown);

  function destroy(): void {
    isDestroyed = true;
    document.removeEventListener('keydown', handleKeydown);
    element.remove();
  }

  return {
    element,
    getState: () => state,
    toggle,
    setIntelligence,
    primeForProfile,
    setPosition,
    getPosition,
    setProfileCount,
    setAuthenticated,
    showGate,
    setMinimalMode,
    setProgress,
    showHistory,
    onReanalyze,
    onAddNote,
    onEditNote,
    onDeleteNote,
    onSkillConfirm,
    onSkillDismiss,
    setCurrentProfile,
    setNotes,
    setNotesLoading,
    setRelationshipScore,
    setTags,
    onTagRemove,
    setGroups,
    setAvailableGroups,
    onAddToGroup,
    onRemoveFromGroup,
    setActivityFeed,
    setNetworkContacts,
    setIntroduction,
    onBulkTagApply,
    setStats,
    getTemplates,
    addTemplate,
    editTemplate,
    deleteTemplate,
    showTemplatesManager,
    showConsentOverlay,
    hideConsentOverlay,
    onConsentAccept,
    destroy,
  };
}
