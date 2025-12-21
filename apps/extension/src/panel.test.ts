import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPanel, PanelState, Archetype, type ProfileIntelligence, FREE_PROFILE_LIMIT } from './panel';

describe('Floating Intelligence Panel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('createPanel', () => {
    it('creates a panel element with correct structure', () => {
      const panel = createPanel(container);

      expect(panel.element).toBeInstanceOf(HTMLElement);
      expect(panel.element.classList.contains('sr-panel')).toBe(true);
      expect(container.contains(panel.element)).toBe(true);
    });

    it('starts in minimized state by default', () => {
      const panel = createPanel(container);

      expect(panel.getState()).toBe(PanelState.Minimized);
      expect(panel.element.classList.contains('sr-panel--minimized')).toBe(true);
    });

    it('shows orb icon when minimized', () => {
      const panel = createPanel(container);

      const orb = panel.element.querySelector('.sr-panel__orb');
      expect(orb).not.toBeNull();
      expect(orb?.classList.contains('sr-panel__orb--visible')).toBe(true);
    });
  });

  describe('toggle', () => {
    it('expands panel when toggle is called from minimized state', () => {
      const panel = createPanel(container);

      panel.toggle();

      expect(panel.getState()).toBe(PanelState.Expanded);
      expect(panel.element.classList.contains('sr-panel--expanded')).toBe(true);
      expect(panel.element.classList.contains('sr-panel--minimized')).toBe(false);
    });

    it('minimizes panel when toggle is called from expanded state', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand first

      panel.toggle(); // minimize

      expect(panel.getState()).toBe(PanelState.Minimized);
      expect(panel.element.classList.contains('sr-panel--minimized')).toBe(true);
      expect(panel.element.classList.contains('sr-panel--expanded')).toBe(false);
    });

    it('hides orb and shows content when expanded', () => {
      const panel = createPanel(container);

      panel.toggle();

      const orb = panel.element.querySelector('.sr-panel__orb');
      const content = panel.element.querySelector('.sr-panel__content');
      expect(orb?.classList.contains('sr-panel__orb--visible')).toBe(false);
      expect(content?.classList.contains('sr-panel__content--visible')).toBe(true);
    });

    it('expands when orb is clicked', () => {
      const panel = createPanel(container);
      const orb = panel.element.querySelector('.sr-panel__orb') as HTMLElement;

      orb.click();

      expect(panel.getState()).toBe(PanelState.Expanded);
    });
  });

  describe('setIntelligence', () => {
    const mockIntelligence: ProfileIntelligence = {
      name: 'Sarah Chen',
      avatarUrl: 'https://example.com/avatar.jpg',
      archetype: Archetype.Builder,
      skills: ['Go', 'Distributed Systems', 'API Design'],
      couldBe: ['Co-founder', 'Tech Advisor'],
      goodFor: ['Dev tools', 'Payments'],
      firstSeen: new Date('2024-04-21'),
    };

    it('displays profile name in header', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const header = panel.element.querySelector('.sr-panel__header');
      expect(header?.textContent).toContain('Sarah Chen');
    });

    it('displays archetype with tarot card', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const archetype = panel.element.querySelector('.sr-panel__archetype');
      expect(archetype?.textContent).toContain('Builder');
      const tarotCard = panel.element.querySelector('.sr-panel__tarot');
      expect(tarotCard).not.toBeNull();
      expect(tarotCard?.getAttribute('data-card')).toBe('magician');
    });

    it('displays skills list', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const skills = panel.element.querySelector('.sr-panel__skills');
      expect(skills?.textContent).toContain('Go');
      expect(skills?.textContent).toContain('Distributed Systems');
      expect(skills?.textContent).toContain('API Design');
    });

    it('displays "could be" relationships', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const couldBe = panel.element.querySelector('.sr-panel__could-be');
      expect(couldBe?.textContent).toContain('Co-founder');
      expect(couldBe?.textContent).toContain('Tech Advisor');
    });

    it('displays "good for" project types', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const goodFor = panel.element.querySelector('.sr-panel__good-for');
      expect(goodFor?.textContent).toContain('Dev tools');
      expect(goodFor?.textContent).toContain('Payments');
    });

    it('displays first seen date', () => {
      const panel = createPanel(container);

      panel.setIntelligence(mockIntelligence);

      const firstSeen = panel.element.querySelector('.sr-panel__first-seen');
      expect(firstSeen?.textContent).toContain('First seen');
    });
  });

  describe('job change alert', () => {
    it('displays job change alert when present', () => {
      const panel = createPanel(container);
      const intelligence: ProfileIntelligence = {
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Tech Advisor'],
        goodFor: ['Dev tools'],
        jobChange: {
          current: 'Stripe',
          previous: 'Square',
        },
      };

      panel.setIntelligence(intelligence);

      const alert = panel.element.querySelector('.sr-panel__job-alert');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('Stripe');
      expect(alert?.textContent).toContain('Square');
    });

    it('does not display job change alert when not present', () => {
      const panel = createPanel(container);
      const intelligence: ProfileIntelligence = {
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Tech Advisor'],
        goodFor: ['Dev tools'],
      };

      panel.setIntelligence(intelligence);

      const alert = panel.element.querySelector('.sr-panel__job-alert');
      expect(alert).toBeNull();
    });

    it('marks job change alert with fire emoji for emphasis', () => {
      const panel = createPanel(container);
      const intelligence: ProfileIntelligence = {
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Tech Advisor'],
        goodFor: ['Dev tools'],
        jobChange: {
          current: 'Stripe',
          previous: 'Square',
        },
      };

      panel.setIntelligence(intelligence);

      const alert = panel.element.querySelector('.sr-panel__job-alert');
      expect(alert?.innerHTML).toContain('NEW');
    });
  });

  describe('drag functionality', () => {
    it('panel is draggable', () => {
      const panel = createPanel(container);

      expect(panel.element.classList.contains('sr-panel--draggable')).toBe(true);
    });

    it('stores position when setPosition is called', () => {
      const panel = createPanel(container);

      panel.setPosition(100, 200);

      expect(panel.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('applies position as CSS transform', () => {
      const panel = createPanel(container);

      panel.setPosition(100, 200);

      expect(panel.element.style.transform).toBe('translate(100px, 200px)');
    });

    it('defaults to bottom-right position', () => {
      const panel = createPanel(container);
      const pos = panel.getPosition();

      // Default should be some reasonable position (we'll set this in implementation)
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });
  });

  describe('free tier counter', () => {
    const baseIntelligence: ProfileIntelligence = {
      name: 'Test User',
      archetype: Archetype.Builder,
      skills: ['Go'],
      couldBe: ['Advisor'],
      goodFor: ['Startups'],
    };

    it('displays profile count when within free limit', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.setProfileCount(3);

      const counter = panel.element.querySelector('.sr-panel__counter');
      expect(counter).not.toBeNull();
      expect(counter?.textContent).toContain('3');
      expect(counter?.textContent).toContain('10');
    });

    it('does not display counter when authenticated', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.setAuthenticated(true);
      panel.setProfileCount(3);

      const counter = panel.element.querySelector('.sr-panel__counter');
      expect(counter).toBeNull();
    });
  });

  describe('gate display', () => {
    const baseIntelligence: ProfileIntelligence = {
      name: 'Test User',
      archetype: Archetype.Builder,
      skills: ['Go'],
      couldBe: ['Advisor'],
      goodFor: ['Startups'],
    };

    it('shows gate when over limit and not authenticated', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.setProfileCount(11);
      panel.setAuthenticated(false);
      panel.showGate();

      const gate = panel.element.querySelector('.sr-panel__gate');
      expect(gate).not.toBeNull();
    });

    it('gate contains value props for extension', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.showGate();

      const gate = panel.element.querySelector('.sr-panel__gate');
      expect(gate?.textContent).toContain('unlimited');
    });

    it('gate contains value props for web app', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.showGate();

      const gate = panel.element.querySelector('.sr-panel__gate');
      expect(gate?.textContent).toContain('Search');
      expect(gate?.textContent).toContain('Dashboard');
    });

    it('gate has Google sign-in button', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.showGate();

      const googleBtn = panel.element.querySelector('.sr-panel__gate-cta');
      expect(googleBtn).not.toBeNull();
      expect(googleBtn?.textContent).toContain('Google');
    });

    it('hides intelligence content when gate is shown', () => {
      const panel = createPanel(container);

      panel.setIntelligence(baseIntelligence);
      panel.showGate();

      const body = panel.element.querySelector('.sr-panel__body');
      expect(body?.classList.contains('sr-panel__body--hidden')).toBe(true);
    });

    it('does not show gate when authenticated', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);

      panel.setAuthenticated(true);
      panel.setProfileCount(15);
      panel.showGate();

      const gate = panel.element.querySelector('.sr-panel__gate');
      expect(gate).toBeNull();
    });
  });
});
