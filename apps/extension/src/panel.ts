/**
 * Floating Intelligence Panel for Social Recall
 * Art deco styled floating panel that displays profile intelligence
 */

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

export interface ProfileIntelligence {
  name: string;
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
}

export interface Position {
  x: number;
  y: number;
}

export const FREE_PROFILE_LIMIT = 10;

export interface ExtractionProgress {
  step: string;
  label: string;
  progress: number; // 0-1
  elapsed: number; // ms
}

export interface Panel {
  element: HTMLElement;
  getState: () => PanelState;
  toggle: () => void;
  setIntelligence: (intelligence: ProfileIntelligence) => void;
  setPosition: (x: number, y: number) => void;
  getPosition: () => Position;
  setProfileCount: (count: number) => void;
  setAuthenticated: (authenticated: boolean) => void;
  showGate: () => void;
  setMinimalMode: (minimal: boolean) => void;
  setProgress: (progress: ExtractionProgress | null) => void;
  showHistory: (profiles: { profileId: string; name: string; headline?: string; avatarUrl?: string; lastSeen: string }[]) => void;
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
        <h2 class="sr-tarot-popup__title">${info.title}</h2>
        <h3 class="sr-tarot-popup__subtitle">${info.subtitle}</h3>
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

  const element = document.createElement('div');
  element.className = 'sr-panel sr-panel--minimized sr-panel--draggable';
  element.style.transform = `translate(${position.x}px, ${position.y}px)`;

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
    console.log('[Social Recall Panel] setIntelligence called with:', intelligence);

    // Normalize archetype - use Unknown if not in current set
    const validArchetype = intelligence.archetype && intelligence.archetype in ARCHETYPE_TAROT
      ? intelligence.archetype
      : Archetype.Unknown;
    const tarotCard = ARCHETYPE_TAROT[validArchetype];
    console.log('[Social Recall Panel] Using archetype:', validArchetype, 'tarot:', tarotCard);

    const jobAlertHtml = intelligence.jobChange
      ? `<div class="sr-panel__job-alert">
          <span class="sr-panel__job-alert-icon">🔥</span>
          <span class="sr-panel__job-alert-text">NEW: ${intelligence.jobChange.current} (was ${intelligence.jobChange.previous})</span>
        </div>`
      : '';

    content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">${intelligence.name}</span>
        <button class="sr-panel__minimize">━</button>
      </div>
      <div class="sr-panel__body">
        ${jobAlertHtml}
        <div class="sr-panel__archetype">
          <div class="sr-panel__tarot sr-panel__tarot--clickable" data-card="${tarotCard}" title="Click to learn more"></div>
          <span class="sr-panel__archetype-name">${capitalizeFirst(validArchetype)}</span>
        </div>
        <div class="sr-panel__skills">
          ${intelligence.skills.map(s => `<span class="sr-panel__skill">${s}</span>`).join(' · ')}
        </div>
        <div class="sr-panel__could-be">
          <span class="sr-panel__label">COULD BE</span>
          ${intelligence.couldBe.join(' · ')}
        </div>
        <div class="sr-panel__good-for">
          <span class="sr-panel__label">GOOD FOR</span>
          ${intelligence.goodFor.join(' · ')}
        </div>
        ${intelligence.firstSeen ? `
          <div class="sr-panel__first-seen">
            First seen ${formatRelativeTime(intelligence.firstSeen)}
          </div>
        ` : ''}
      </div>
      <div class="sr-panel__footer">
        <button class="sr-panel__add-note">+ Add note</button>
      </div>
    `;

    console.log('[Social Recall Panel] Content updated, innerHTML length:', content.innerHTML.length);
    console.log('[Social Recall Panel] Content visible class:', content.classList.contains('sr-panel__content--visible'));
    console.log('[Social Recall Panel] Panel state:', state);

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);

    // Add click handler for tarot card popup
    const tarotEl = content.querySelector('.sr-panel__tarot');
    tarotEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      showTarotPopup(validArchetype);
    });
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
    } else {
      element.classList.remove('sr-panel--minimal');
      orb.title = '';
    }
  }

  function showHistory(profiles: RecentProfile[]): void {
    const recentHtml = profiles.length > 0
      ? profiles.map(p => {
          const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const avatarContent = p.avatarUrl
            ? `<img src="${p.avatarUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : initials;
          const timeAgo = formatRelativeTime(new Date(p.lastSeen));
          return `
            <div class="sr-panel__history-item" data-profile-id="${p.profileId}">
              <div class="sr-panel__history-avatar">${avatarContent}</div>
              <div class="sr-panel__history-info">
                <div class="sr-panel__history-name">${p.name}</div>
                <div class="sr-panel__history-meta">${p.headline?.slice(0, 40) || 'LinkedIn'}</div>
                <div class="sr-panel__history-time">${timeAgo}</div>
              </div>
            </div>
          `;
        }).join('')
      : '<div class="sr-panel__history-empty">No profiles viewed yet</div>';

    content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">Recent Profiles</span>
        <button class="sr-panel__minimize">━</button>
      </div>
      <div class="sr-panel__body sr-panel__history">
        ${recentHtml}
      </div>
    `;

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);

    // Add click handlers to open LinkedIn profiles
    content.querySelectorAll('.sr-panel__history-item').forEach((item) => {
      item.addEventListener('click', () => {
        const profileId = item.getAttribute('data-profile-id');
        if (profileId) {
          window.open(`https://linkedin.com/in/${profileId}`, '_blank');
        }
      });
    });
  }

  orb.addEventListener('click', () => {
    toggle();
  });

  function setProgress(progress: ExtractionProgress | null): void {
    const labelEl = progressBar.querySelector('.sr-panel__progress-label') as HTMLElement;
    const timeEl = progressBar.querySelector('.sr-panel__progress-time') as HTMLElement;
    const fillEl = progressBar.querySelector('.sr-panel__progress-fill') as HTMLElement;

    if (!progress) {
      // Hide progress bar
      progressBar.remove();
      progressBar.classList.remove('sr-panel__progress--complete');
      return;
    }

    // Show progress bar in content area
    if (!content.contains(progressBar)) {
      content.insertBefore(progressBar, content.firstChild);
    }

    labelEl.textContent = progress.label;
    timeEl.textContent = `${(progress.elapsed / 1000).toFixed(1)}s`;
    fillEl.style.width = `${Math.round(progress.progress * 100)}%`;

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

  return {
    element,
    getState: () => state,
    toggle,
    setIntelligence,
    setPosition,
    getPosition,
    setProfileCount,
    setAuthenticated,
    showGate,
    setMinimalMode,
    setProgress,
    showHistory,
  };
}
