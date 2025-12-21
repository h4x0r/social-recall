/**
 * Floating Intelligence Panel for Social Recall
 * Art deco styled floating panel that displays profile intelligence
 */

export enum PanelState {
  Minimized = 'minimized',
  Expanded = 'expanded',
}

export enum Archetype {
  Builder = 'builder',
  Architect = 'architect',
  Designer = 'designer',
  Scientist = 'scientist',
  Strategist = 'strategist',
  Seller = 'seller',
  Marketer = 'marketer',
  Connector = 'connector',
  Specialist = 'specialist',
}

// Map archetypes to tarot cards
const ARCHETYPE_TAROT: Record<Archetype, string> = {
  [Archetype.Builder]: 'magician',
  [Archetype.Architect]: 'emperor',
  [Archetype.Designer]: 'empress',
  [Archetype.Scientist]: 'hermit',
  [Archetype.Strategist]: 'chariot',
  [Archetype.Seller]: 'strength',
  [Archetype.Marketer]: 'star',
  [Archetype.Connector]: 'lovers',
  [Archetype.Specialist]: 'high-priestess',
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
    const tarotCard = ARCHETYPE_TAROT[intelligence.archetype];

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
          <div class="sr-panel__tarot" data-card="${tarotCard}"></div>
          <span class="sr-panel__archetype-name">${capitalizeFirst(intelligence.archetype)}</span>
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

    const minimizeBtn = content.querySelector('.sr-panel__minimize');
    minimizeBtn?.addEventListener('click', toggle);
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

  orb.addEventListener('click', toggle);

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
  };
}
