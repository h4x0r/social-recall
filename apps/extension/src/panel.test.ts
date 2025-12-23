import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  describe('keyboard shortcuts', () => {
    it('toggles panel with "m" key when panel is focused', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand first
      expect(panel.getState()).toBe(PanelState.Expanded);

      // Simulate 'm' key press
      const event = new KeyboardEvent('keydown', { key: 'm' });
      document.dispatchEvent(event);

      expect(panel.getState()).toBe(PanelState.Minimized);
    });

    it('toggles panel with "M" key (uppercase)', () => {
      const panel = createPanel(container);
      expect(panel.getState()).toBe(PanelState.Minimized);

      const event = new KeyboardEvent('keydown', { key: 'M' });
      document.dispatchEvent(event);

      expect(panel.getState()).toBe(PanelState.Expanded);
    });

    it('minimizes panel with Escape key', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand first
      expect(panel.getState()).toBe(PanelState.Expanded);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(panel.getState()).toBe(PanelState.Minimized);
    });

    it('opens note input with "n" key when expanded', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand

      const event = new KeyboardEvent('keydown', { key: 'n' });
      document.dispatchEvent(event);

      const noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).not.toBeNull();
    });

    it('does not open note input with "n" key when minimized', () => {
      const panel = createPanel(container);
      expect(panel.getState()).toBe(PanelState.Minimized);

      const event = new KeyboardEvent('keydown', { key: 'n' });
      document.dispatchEvent(event);

      const noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).toBeNull();
    });

    it('ignores shortcuts when typing in textarea', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand

      // Create a textarea and dispatch event from it
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', { key: 'm', bubbles: true });
      textarea.dispatchEvent(event);

      // Panel should still be expanded (shortcut ignored)
      expect(panel.getState()).toBe(PanelState.Expanded);
    });

    it('ignores shortcuts when typing in input', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand

      // Create an input and dispatch event from it
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', { key: 'm', bubbles: true });
      input.dispatchEvent(event);

      // Panel should still be expanded (shortcut ignored)
      expect(panel.getState()).toBe(PanelState.Expanded);
    });

    it('closes note input with Escape key when note input is open', () => {
      const panel = createPanel(container);
      panel.toggle(); // expand

      // Open note input
      const nEvent = new KeyboardEvent('keydown', { key: 'n' });
      document.dispatchEvent(nEvent);

      let noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).not.toBeNull();

      // Press Escape
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).toBeNull();
      // Panel should still be expanded
      expect(panel.getState()).toBe(PanelState.Expanded);
    });

    it('cleans up keyboard listeners when panel is destroyed', () => {
      const panel = createPanel(container);
      panel.destroy();

      // After destroy, shortcuts should not work
      const event = new KeyboardEvent('keydown', { key: 'm' });
      document.dispatchEvent(event);

      // Panel state should remain minimized (default)
      expect(panel.getState()).toBe(PanelState.Minimized);
    });
  });

  describe('notes display', () => {
    const baseIntelligence: ProfileIntelligence = {
      name: 'Test User',
      archetype: Archetype.Builder,
      skills: ['Go'],
      couldBe: ['Advisor'],
      goodFor: ['Startups'],
    };

    const mockNotes = [
      {
        id: 'note-1',
        contact_id: 'contact-123',
        content: 'Met at conference, interested in AI',
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      },
      {
        id: 'note-2',
        contact_id: 'contact-123',
        content: 'Follow up about partnership',
        created_at: '2024-07-01T14:30:00Z',
        updated_at: '2024-07-01T14:30:00Z',
      },
    ];

    it('displays notes section when notes are set', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle(); // expand

      panel.setNotes(mockNotes);

      const notesSection = panel.element.querySelector('.sr-panel__notes-section');
      expect(notesSection).not.toBeNull();
    });

    it('displays note content in notes section', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      panel.setNotes(mockNotes);

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      expect(noteItems.length).toBe(2);
      // Both notes should be present
      const allContent = Array.from(noteItems).map(el => el.textContent).join('');
      expect(allContent).toContain('Met at conference');
      expect(allContent).toContain('Follow up about partnership');
    });

    it('displays notes in reverse chronological order (newest first)', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      panel.setNotes(mockNotes);

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      // Newest note (July) should be first
      expect(noteItems[0].textContent).toContain('Follow up about partnership');
    });

    it('shows empty state when no notes', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      panel.setNotes([]);

      const emptyState = panel.element.querySelector('.sr-panel__notes-empty');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('No notes');
    });

    it('displays relative time for notes', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      // Create a note from "today"
      const today = new Date();
      const recentNote = [{
        id: 'note-recent',
        contact_id: 'contact-123',
        content: 'Recent note',
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
      }];

      panel.setNotes(recentNote);

      const noteTime = panel.element.querySelector('.sr-panel__note-time');
      expect(noteTime?.textContent).toContain('today');
    });

    it('clears notes when setNotes called with empty array after having notes', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      panel.setNotes(mockNotes);
      expect(panel.element.querySelectorAll('.sr-panel__note-item').length).toBe(2);

      panel.setNotes([]);
      expect(panel.element.querySelectorAll('.sr-panel__note-item').length).toBe(0);
      expect(panel.element.querySelector('.sr-panel__notes-empty')).not.toBeNull();
    });

    it('shows edit and delete buttons on each note', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      panel.setNotes(mockNotes);

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      noteItems.forEach(item => {
        expect(item.querySelector('.sr-panel__note-edit')).not.toBeNull();
        expect(item.querySelector('.sr-panel__note-delete')).not.toBeNull();
      });
    });

    it('calls onEditNote callback when edit button clicked', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const editCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onEditNote(editCallback);
      panel.setNotes(mockNotes);

      // Click edit on first note
      const editBtn = panel.element.querySelector('.sr-panel__note-edit') as HTMLButtonElement;
      editBtn.click();

      // Should show edit form
      const editForm = panel.element.querySelector('.sr-panel__note-edit-form');
      expect(editForm).not.toBeNull();

      // Submit the edit
      const textarea = editForm?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Updated content';
      const saveBtn = editForm?.querySelector('.sr-panel__note-save-edit') as HTMLButtonElement;
      saveBtn.click();

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      // note-2 is newer (July) so it appears first after sorting by created_at desc
      expect(editCallback).toHaveBeenCalledWith('note-2', 'Updated content');
    });

    it('calls onDeleteNote callback when delete button clicked (after undo timeout)', async () => {
      vi.useFakeTimers();

      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const deleteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onDeleteNote(deleteCallback);
      panel.setNotes(mockNotes);

      // Click delete on first note
      const deleteBtn = panel.element.querySelector('.sr-panel__note-delete') as HTMLButtonElement;
      deleteBtn.click();

      // Callback should NOT be called immediately (undo window)
      expect(deleteCallback).not.toHaveBeenCalled();

      // Wait for 5 second undo timeout
      await vi.advanceTimersByTimeAsync(5100);

      // note-2 is newer (July) so it appears first after sorting by created_at desc
      expect(deleteCallback).toHaveBeenCalledWith('note-2');

      vi.useRealTimers();
    });

    it('cancels edit when cancel button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();
      panel.setNotes(mockNotes);

      // Click edit
      const editBtn = panel.element.querySelector('.sr-panel__note-edit') as HTMLButtonElement;
      editBtn.click();

      // Should show edit form
      expect(panel.element.querySelector('.sr-panel__note-edit-form')).not.toBeNull();

      // Click cancel
      const cancelBtn = panel.element.querySelector('.sr-panel__note-cancel-edit') as HTMLButtonElement;
      cancelBtn.click();

      // Edit form should be gone
      expect(panel.element.querySelector('.sr-panel__note-edit-form')).toBeNull();
    });

    it('shows "edited" indicator when note was modified', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const editedNotes = [
        {
          id: 'note-1',
          contact_id: 'contact-123',
          content: 'Original note, later edited',
          created_at: '2024-06-15T10:00:00Z',
          updated_at: '2024-06-16T14:30:00Z', // Different from created_at
        },
        {
          id: 'note-2',
          contact_id: 'contact-123',
          content: 'Never edited note',
          created_at: '2024-07-01T10:00:00Z',
          updated_at: '2024-07-01T10:00:00Z', // Same as created_at
        },
      ];

      panel.setNotes(editedNotes);

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      // note-2 is newer so it appears first
      const uneditedNote = noteItems[0];
      const editedNote = noteItems[1];

      // The edited note should show "(edited)" indicator
      expect(editedNote.querySelector('.sr-panel__note-edited')).not.toBeNull();
      // The unedited note should not have "(edited)" indicator
      expect(uneditedNote.querySelector('.sr-panel__note-edited')).toBeNull();
    });

    it('shows loading state while fetching notes', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      // Set loading state
      panel.setNotesLoading(true);

      // Should show loading indicator
      expect(panel.element.querySelector('.sr-panel__notes-loading')).not.toBeNull();
      expect(panel.element.querySelector('.sr-panel__notes-loading')?.textContent).toContain('Loading notes');

      // Clear loading state
      panel.setNotesLoading(false);

      // Loading indicator should be gone
      expect(panel.element.querySelector('.sr-panel__notes-loading')).toBeNull();
    });

    it('shows character count on note input', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      // Press 'N' to open note input
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
      document.dispatchEvent(event);

      // Should show note input with character count
      const noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).not.toBeNull();

      const charCount = noteInput?.querySelector('.sr-panel__note-char-count');
      expect(charCount).not.toBeNull();
      expect(charCount?.textContent).toBe('0/500');

      // Type some text
      const textarea = noteInput?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Hello world';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Character count should update
      expect(charCount?.textContent).toBe('11/500');
    });
  });

  describe('skill confirmation', () => {
    const baseIntelligence: ProfileIntelligence = {
      name: 'Test User',
      archetype: Archetype.Builder,
      skills: ['Go', 'Kubernetes', 'API Design'],
      couldBe: ['Advisor'],
      goodFor: ['Startups'],
    };

    it('shows confirm and dismiss buttons on skill hover', () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      // Find a skill item
      const skillItem = panel.element.querySelector('.sr-panel__skill-item');
      expect(skillItem).not.toBeNull();

      // Should have confirm and dismiss buttons
      expect(skillItem?.querySelector('.sr-panel__skill-confirm')).not.toBeNull();
      expect(skillItem?.querySelector('.sr-panel__skill-dismiss')).not.toBeNull();
    });

    it('calls onSkillConfirm callback when confirm button clicked', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const confirmCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onSkillConfirm(confirmCallback);

      // Click confirm on first skill
      const confirmBtn = panel.element.querySelector('.sr-panel__skill-confirm') as HTMLButtonElement;
      confirmBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(confirmCallback).toHaveBeenCalledWith('Go');
    });

    it('calls onSkillDismiss callback when dismiss button clicked', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const dismissCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onSkillDismiss(dismissCallback);

      // Click dismiss on first skill
      const dismissBtn = panel.element.querySelector('.sr-panel__skill-dismiss') as HTMLButtonElement;
      dismissBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(dismissCallback).toHaveBeenCalledWith('Go');
    });

    it('marks skill as confirmed after confirmation', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(baseIntelligence);
      panel.toggle();

      const confirmCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onSkillConfirm(confirmCallback);

      // Click confirm
      const confirmBtn = panel.element.querySelector('.sr-panel__skill-confirm') as HTMLButtonElement;
      confirmBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      // Skill should be marked as confirmed
      const skillItem = panel.element.querySelector('.sr-panel__skill-item');
      expect(skillItem?.classList.contains('sr-panel__skill-item--confirmed')).toBe(true);
    });
  });

  describe('copy to clipboard', () => {
    const mockIntelligence: ProfileIntelligence = {
      name: 'Sarah Chen',
      archetype: Archetype.Builder,
      skills: ['Go', 'Kubernetes'],
      couldBe: ['Co-founder', 'Tech Advisor'],
      goodFor: ['Dev tools', 'Payments'],
    };

    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('shows copy button in panel header', () => {
      const panel = createPanel(container);
      panel.setIntelligence(mockIntelligence);
      panel.toggle();

      const copyBtn = panel.element.querySelector('.sr-panel__copy-btn');
      expect(copyBtn).not.toBeNull();
    });

    it('copies contact info to clipboard when clicked', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(mockIntelligence);
      panel.toggle();

      const copyBtn = panel.element.querySelector('.sr-panel__copy-btn') as HTMLButtonElement;
      copyBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Sarah Chen')
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Builder')
      );
    });

    it('shows success feedback after copy', async () => {
      const panel = createPanel(container);
      panel.setIntelligence(mockIntelligence);
      panel.toggle();

      const copyBtn = panel.element.querySelector('.sr-panel__copy-btn') as HTMLButtonElement;
      copyBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(copyBtn.classList.contains('sr-panel__copy-btn--success')).toBe(true);
    });
  });

  describe('sort notes', () => {
    const mockNotes = [
      { id: 'note-1', content: 'First note', created_at: '2024-01-01T10:00:00Z' },
      { id: 'note-2', content: 'Second note', created_at: '2024-01-15T10:00:00Z' },
      { id: 'note-3', content: 'Third note', created_at: '2024-01-10T10:00:00Z' },
    ];

    it('shows sort toggle button in notes section', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes(mockNotes);
      panel.toggle();

      const sortBtn = panel.element.querySelector('.sr-panel__notes-sort');
      expect(sortBtn).not.toBeNull();
    });

    it('displays notes in descending order (newest first) by default', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes(mockNotes);
      panel.toggle();

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      const contents = Array.from(noteItems).map(
        item => item.querySelector('.sr-panel__note-content')?.textContent
      );

      // Newest first: Jan 15, Jan 10, Jan 1
      expect(contents[0]).toBe('Second note');
      expect(contents[1]).toBe('Third note');
      expect(contents[2]).toBe('First note');
    });

    it('toggles to ascending order when sort button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes(mockNotes);
      panel.toggle();

      const sortBtn = panel.element.querySelector('.sr-panel__notes-sort') as HTMLButtonElement;
      sortBtn.click();

      const noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      const contents = Array.from(noteItems).map(
        item => item.querySelector('.sr-panel__note-content')?.textContent
      );

      // Oldest first: Jan 1, Jan 10, Jan 15
      expect(contents[0]).toBe('First note');
      expect(contents[1]).toBe('Third note');
      expect(contents[2]).toBe('Second note');
    });

    it('shows sort direction indicator on button', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes(mockNotes);
      panel.toggle();

      let sortBtn = panel.element.querySelector('.sr-panel__notes-sort');
      // Should show down arrow for descending (newest first)
      expect(sortBtn?.textContent).toContain('↓');

      (sortBtn as HTMLButtonElement).click();
      // Re-query after click since DOM is replaced
      sortBtn = panel.element.querySelector('.sr-panel__notes-sort');
      // Should show up arrow for ascending (oldest first)
      expect(sortBtn?.textContent).toContain('↑');
    });
  });

  describe('undo delete', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows undo toast when note is deleted', async () => {
      const panel = createPanel(container);
      const deleteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onDeleteNote(deleteCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([{ id: 'note-1', content: 'Test note', created_at: '2024-01-01T10:00:00Z' }]);
      panel.toggle();

      const deleteBtn = panel.element.querySelector('.sr-panel__note-delete') as HTMLButtonElement;
      deleteBtn.click();

      await vi.advanceTimersByTimeAsync(10);

      const undoToast = panel.element.querySelector('.sr-panel__undo-toast');
      expect(undoToast).not.toBeNull();
      expect(undoToast?.textContent).toContain('Undo');
    });

    it('restores note when undo is clicked within 5 seconds', async () => {
      const panel = createPanel(container);
      const deleteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onDeleteNote(deleteCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      const testNotes = [{ id: 'note-1', content: 'Test note', created_at: '2024-01-01T10:00:00Z' }];
      panel.setNotes(testNotes);
      panel.toggle();

      const deleteBtn = panel.element.querySelector('.sr-panel__note-delete') as HTMLButtonElement;
      deleteBtn.click();

      await vi.advanceTimersByTimeAsync(10);

      // Note should be visually removed
      let noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      expect(noteItems.length).toBe(0);

      // Click undo
      const undoBtn = panel.element.querySelector('.sr-panel__undo-btn') as HTMLButtonElement;
      undoBtn.click();

      await vi.advanceTimersByTimeAsync(10);

      // Note should be restored
      noteItems = panel.element.querySelectorAll('.sr-panel__note-item');
      expect(noteItems.length).toBe(1);
      // Delete callback should NOT have been called (cancelled)
      expect(deleteCallback).not.toHaveBeenCalled();
    });

    it('permanently deletes note after 5 seconds', async () => {
      const panel = createPanel(container);
      const deleteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onDeleteNote(deleteCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([{ id: 'note-1', content: 'Test note', created_at: '2024-01-01T10:00:00Z' }]);
      panel.toggle();

      const deleteBtn = panel.element.querySelector('.sr-panel__note-delete') as HTMLButtonElement;
      deleteBtn.click();

      // Wait for the full 5 seconds
      await vi.advanceTimersByTimeAsync(5100);

      // Delete callback should have been called
      expect(deleteCallback).toHaveBeenCalledWith('note-1');
    });

    it('hides undo toast after 5 seconds', async () => {
      const panel = createPanel(container);
      const deleteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onDeleteNote(deleteCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([{ id: 'note-1', content: 'Test note', created_at: '2024-01-01T10:00:00Z' }]);
      panel.toggle();

      const deleteBtn = panel.element.querySelector('.sr-panel__note-delete') as HTMLButtonElement;
      deleteBtn.click();

      await vi.advanceTimersByTimeAsync(10);
      expect(panel.element.querySelector('.sr-panel__undo-toast')).not.toBeNull();

      // Wait for the full 5 seconds
      await vi.advanceTimersByTimeAsync(5100);

      // Toast should be gone
      expect(panel.element.querySelector('.sr-panel__undo-toast')).toBeNull();
    });
  });

  describe('note templates', () => {
    it('shows template button in note input area', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add note to show input area
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn.click();

      const templateBtn = panel.element.querySelector('.sr-panel__template-btn');
      expect(templateBtn).not.toBeNull();
    });

    it('shows template dropdown when template button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add note to show input area
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn.click();

      // Click template button
      const templateBtn = panel.element.querySelector('.sr-panel__template-btn') as HTMLButtonElement;
      templateBtn.click();

      const dropdown = panel.element.querySelector('.sr-panel__template-dropdown');
      expect(dropdown).not.toBeNull();
    });

    it('fills textarea with template text when template selected', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add note to show input area
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn.click();

      // Click template button
      const templateBtn = panel.element.querySelector('.sr-panel__template-btn') as HTMLButtonElement;
      templateBtn.click();

      // Click first template option
      const templateOption = panel.element.querySelector('.sr-panel__template-option') as HTMLButtonElement;
      templateOption.click();

      // Textarea should have template text
      const textarea = panel.element.querySelector('.sr-panel__note-textarea') as HTMLTextAreaElement;
      expect(textarea.value).not.toBe('');
    });

    it('includes common templates like "Met at" and "Intro from"', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add note to show input area
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn.click();

      // Click template button
      const templateBtn = panel.element.querySelector('.sr-panel__template-btn') as HTMLButtonElement;
      templateBtn.click();

      const dropdown = panel.element.querySelector('.sr-panel__template-dropdown');
      expect(dropdown?.textContent).toContain('Met at');
      expect(dropdown?.textContent).toContain('Intro from');
    });
  });

  describe('relationship strength score', () => {
    it('displays relationship score when set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setRelationshipScore({
        score: 75,
        interactions: 12,
        lastInteraction: new Date('2024-01-15'),
        notesCount: 5,
      });
      panel.toggle();

      const scoreEl = panel.element.querySelector('.sr-panel__relationship-score');
      expect(scoreEl).not.toBeNull();
      expect(scoreEl?.textContent).toContain('75');
    });

    it('shows score level indicator (weak/moderate/strong)', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setRelationshipScore({
        score: 85,
        interactions: 20,
        lastInteraction: new Date(),
        notesCount: 10,
      });
      panel.toggle();

      const scoreEl = panel.element.querySelector('.sr-panel__relationship-score');
      expect(scoreEl?.textContent).toContain('Strong');
    });

    it('shows moderate level for mid-range scores', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setRelationshipScore({
        score: 50,
        interactions: 5,
        lastInteraction: new Date(),
        notesCount: 2,
      });
      panel.toggle();

      const scoreEl = panel.element.querySelector('.sr-panel__relationship-score');
      expect(scoreEl?.textContent).toContain('Moderate');
    });

    it('shows weak level for low scores', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setRelationshipScore({
        score: 20,
        interactions: 1,
        lastInteraction: new Date('2023-01-01'),
        notesCount: 0,
      });
      panel.toggle();

      const scoreEl = panel.element.querySelector('.sr-panel__relationship-score');
      expect(scoreEl?.textContent).toContain('Weak');
    });

    it('shows visual progress bar for score', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setRelationshipScore({
        score: 60,
        interactions: 8,
        lastInteraction: new Date(),
        notesCount: 3,
      });
      panel.toggle();

      const progressBar = panel.element.querySelector('.sr-panel__score-bar-fill') as HTMLElement;
      expect(progressBar).not.toBeNull();
      expect(progressBar.style.width).toBe('60%');
    });
  });

  describe('tag/label system', () => {
    it('displays tags section in panel', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([
        { id: 'tag-1', name: 'Investor', color: '#4CAF50' },
        { id: 'tag-2', name: 'Mentor', color: '#2196F3' },
      ]);
      panel.toggle();

      const tagsSection = panel.element.querySelector('.sr-panel__tags');
      expect(tagsSection).not.toBeNull();
    });

    it('displays individual tag chips', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([
        { id: 'tag-1', name: 'Investor', color: '#4CAF50' },
        { id: 'tag-2', name: 'Mentor', color: '#2196F3' },
      ]);
      panel.toggle();

      const tagChips = panel.element.querySelectorAll('.sr-panel__tag-chip');
      expect(tagChips.length).toBe(2);
      expect(tagChips[0].textContent).toContain('Investor');
      expect(tagChips[1].textContent).toContain('Mentor');
    });

    it('shows add tag button', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([]);
      panel.toggle();

      const addTagBtn = panel.element.querySelector('.sr-panel__add-tag-btn');
      expect(addTagBtn).not.toBeNull();
    });

    it('calls onTagRemove when tag remove button clicked', () => {
      const panel = createPanel(container);
      const removeCallback = vi.fn();
      panel.onTagRemove(removeCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([{ id: 'tag-1', name: 'Investor', color: '#4CAF50' }]);
      panel.toggle();

      const removeBtn = panel.element.querySelector('.sr-panel__tag-remove') as HTMLButtonElement;
      removeBtn.click();

      expect(removeCallback).toHaveBeenCalledWith('tag-1');
    });

    it('shows tag input when add tag button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([]);
      panel.toggle();

      const addTagBtn = panel.element.querySelector('.sr-panel__add-tag-btn') as HTMLButtonElement;
      addTagBtn.click();

      const tagInput = panel.element.querySelector('.sr-panel__tag-input');
      expect(tagInput).not.toBeNull();
    });
  });

  describe('contact groups/lists', () => {
    it('renders groups section when setGroups is called', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([
        { id: 'group-1', name: 'Investors', memberCount: 5 },
        { id: 'group-2', name: 'Mentors', memberCount: 3 },
      ]);
      panel.toggle();

      const groupsSection = panel.element.querySelector('.sr-panel__groups');
      expect(groupsSection).not.toBeNull();
      expect(groupsSection?.textContent).toContain('Investors');
      expect(groupsSection?.textContent).toContain('Mentors');
    });

    it('shows member count for each group', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([{ id: 'group-1', name: 'Investors', memberCount: 5 }]);
      panel.toggle();

      const groupItem = panel.element.querySelector('.sr-panel__group-item');
      expect(groupItem?.textContent).toContain('5');
    });

    it('shows add to group button', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([]);
      panel.toggle();

      const addToGroupBtn = panel.element.querySelector('.sr-panel__add-to-group-btn');
      expect(addToGroupBtn).not.toBeNull();
    });

    it('shows group dropdown when add to group button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([
        { id: 'group-1', name: 'Investors', memberCount: 5 },
      ]);
      panel.setAvailableGroups([
        { id: 'group-1', name: 'Investors', memberCount: 5 },
        { id: 'group-2', name: 'Mentors', memberCount: 3 },
      ]);
      panel.toggle();

      const addToGroupBtn = panel.element.querySelector('.sr-panel__add-to-group-btn') as HTMLButtonElement;
      addToGroupBtn.click();

      const dropdown = panel.element.querySelector('.sr-panel__group-dropdown');
      expect(dropdown).not.toBeNull();
      expect(dropdown?.textContent).toContain('Mentors');
    });

    it('calls onAddToGroup callback when group selected from dropdown', () => {
      const panel = createPanel(container);
      const addToGroupCallback = vi.fn();
      panel.onAddToGroup(addToGroupCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([]);
      panel.setAvailableGroups([
        { id: 'group-1', name: 'Investors', memberCount: 5 },
      ]);
      panel.toggle();

      const addToGroupBtn = panel.element.querySelector('.sr-panel__add-to-group-btn') as HTMLButtonElement;
      addToGroupBtn.click();

      const groupOption = panel.element.querySelector('.sr-panel__group-option') as HTMLButtonElement;
      groupOption.click();

      expect(addToGroupCallback).toHaveBeenCalledWith('group-1');
    });

    it('calls onRemoveFromGroup callback when remove button clicked', () => {
      const panel = createPanel(container);
      const removeCallback = vi.fn();
      panel.onRemoveFromGroup(removeCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setGroups([{ id: 'group-1', name: 'Investors', memberCount: 5 }]);
      panel.toggle();

      const removeBtn = panel.element.querySelector('.sr-panel__group-remove') as HTMLButtonElement;
      removeBtn.click();

      expect(removeCallback).toHaveBeenCalledWith('group-1');
    });
  });

  describe('activity feed', () => {
    it('renders activity feed section when setActivityFeed is called', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setActivityFeed([
        { id: 'act-1', type: 'note_added', description: 'Added a note', timestamp: new Date() },
        { id: 'act-2', type: 'profile_viewed', description: 'Viewed profile', timestamp: new Date() },
      ]);
      panel.toggle();

      const activitySection = panel.element.querySelector('.sr-panel__activity-feed');
      expect(activitySection).not.toBeNull();
      expect(activitySection?.textContent).toContain('Added a note');
      expect(activitySection?.textContent).toContain('Viewed profile');
    });

    it('shows activity type icons', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setActivityFeed([
        { id: 'act-1', type: 'note_added', description: 'Added a note', timestamp: new Date() },
      ]);
      panel.toggle();

      const activityIcon = panel.element.querySelector('.sr-panel__activity-icon');
      expect(activityIcon).not.toBeNull();
    });

    it('shows relative timestamps for activities', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      panel.setActivityFeed([
        { id: 'act-1', type: 'note_added', description: 'Added a note', timestamp: yesterday },
      ]);
      panel.toggle();

      const activityTime = panel.element.querySelector('.sr-panel__activity-time');
      expect(activityTime).not.toBeNull();
      expect(activityTime?.textContent).toContain('1 day');
    });

    it('shows empty state when no activities', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setActivityFeed([]);
      panel.toggle();

      const emptyState = panel.element.querySelector('.sr-panel__activity-empty');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('No recent activity');
    });

    it('limits displayed activities to 5', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      const activities = Array.from({ length: 10 }, (_, i) => ({
        id: `act-${i}`,
        type: 'note_added' as const,
        description: `Activity ${i}`,
        timestamp: new Date(),
      }));
      panel.setActivityFeed(activities);
      panel.toggle();

      const activityItems = panel.element.querySelectorAll('.sr-panel__activity-item');
      expect(activityItems.length).toBe(5);
    });
  });

  describe('quick actions menu (Cmd+K)', () => {
    it('opens quick actions menu when Cmd+K is pressed', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Simulate Cmd+K
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);

      const quickActionsMenu = panel.element.querySelector('.sr-panel__quick-actions');
      expect(quickActionsMenu).not.toBeNull();
    });

    it('shows search input in quick actions menu', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);

      const searchInput = panel.element.querySelector('.sr-panel__quick-actions-input') as HTMLInputElement;
      expect(searchInput).not.toBeNull();
      expect(document.activeElement).toBe(searchInput);
    });

    it('shows action options in quick actions menu', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);

      const actionOptions = panel.element.querySelectorAll('.sr-panel__quick-action-item');
      expect(actionOptions.length).toBeGreaterThan(0);
    });

    it('filters actions based on search input', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);

      const searchInput = panel.element.querySelector('.sr-panel__quick-actions-input') as HTMLInputElement;
      searchInput.value = 'note';
      searchInput.dispatchEvent(new Event('input'));

      const actionOptions = panel.element.querySelectorAll('.sr-panel__quick-action-item');
      // Should only show note-related actions
      const visibleActions = Array.from(actionOptions).filter(
        (el) => !(el as HTMLElement).classList.contains('sr-panel__quick-action-item--hidden')
      );
      expect(visibleActions.length).toBeGreaterThan(0);
      visibleActions.forEach((action) => {
        expect(action.textContent?.toLowerCase()).toContain('note');
      });
    });

    it('closes quick actions menu on Escape', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Open menu
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      expect(panel.element.querySelector('.sr-panel__quick-actions')).not.toBeNull();

      // Close with Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(panel.element.querySelector('.sr-panel__quick-actions')).toBeNull();
    });

    it('executes action when clicked', () => {
      const panel = createPanel(container);
      const addNoteCallback = vi.fn().mockResolvedValue({ success: true });
      panel.onAddNote(addNoteCallback);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

      const addNoteAction = panel.element.querySelector('[data-action="add-note"]') as HTMLElement;
      addNoteAction?.click();

      // Should open note input
      const noteInput = panel.element.querySelector('.sr-panel__note-input');
      expect(noteInput).not.toBeNull();
    });
  });

  describe('search within notes', () => {
    it('shows search input in notes section', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'Meeting notes', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const searchInput = panel.element.querySelector('.sr-panel__notes-search');
      expect(searchInput).not.toBeNull();
    });

    it('filters notes based on search query', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'Meeting at coffee shop', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-2', contact_id: 'c1', content: 'Follow up on project', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-3', contact_id: 'c1', content: 'Coffee preferences noted', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const searchInput = panel.element.querySelector('.sr-panel__notes-search') as HTMLInputElement;
      searchInput.value = 'coffee';
      searchInput.dispatchEvent(new Event('input'));

      const visibleNotes = panel.element.querySelectorAll('.sr-panel__note-item:not(.sr-panel__note--hidden)');
      expect(visibleNotes.length).toBe(2);
    });

    it('shows no results message when no matches', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'Meeting notes', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const searchInput = panel.element.querySelector('.sr-panel__notes-search') as HTMLInputElement;
      searchInput.value = 'xyz123notfound';
      searchInput.dispatchEvent(new Event('input'));

      const noResults = panel.element.querySelector('.sr-panel__notes-no-results');
      expect(noResults).not.toBeNull();
    });

    it('clears search and shows all notes when search cleared', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'Note one', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-2', contact_id: 'c1', content: 'Note two', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const searchInput = panel.element.querySelector('.sr-panel__notes-search') as HTMLInputElement;
      searchInput.value = 'one';
      searchInput.dispatchEvent(new Event('input'));

      // Clear search
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));

      const visibleNotes = panel.element.querySelectorAll('.sr-panel__note-item:not(.sr-panel__note--hidden)');
      expect(visibleNotes.length).toBe(2);
    });

    it('highlights matching text in search results', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'Meeting at coffee shop', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const searchInput = panel.element.querySelector('.sr-panel__notes-search') as HTMLInputElement;
      searchInput.value = 'coffee';
      searchInput.dispatchEvent(new Event('input'));

      const highlight = panel.element.querySelector('.sr-panel__note-highlight');
      expect(highlight).not.toBeNull();
      expect(highlight?.textContent).toBe('coffee');
    });
  });

  describe('keyboard navigation', () => {
    it('highlights first note when pressing down arrow in notes section', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'First note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-2', contact_id: 'c1', content: 'Second note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      // Press down arrow
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      const highlightedNote = panel.element.querySelector('.sr-panel__note-item--focused');
      expect(highlightedNote).not.toBeNull();
      expect(highlightedNote?.getAttribute('data-note-id')).toBe('note-1');
    });

    it('moves to next note when pressing down arrow again', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'First note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-2', contact_id: 'c1', content: 'Second note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      // Press down arrow twice
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      const highlightedNote = panel.element.querySelector('.sr-panel__note-item--focused');
      expect(highlightedNote?.getAttribute('data-note-id')).toBe('note-2');
    });

    it('moves to previous note when pressing up arrow', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'First note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'note-2', contact_id: 'c1', content: 'Second note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      // Navigate to second, then back to first
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      const highlightedNote = panel.element.querySelector('.sr-panel__note-item--focused');
      expect(highlightedNote?.getAttribute('data-note-id')).toBe('note-1');
    });

    it('triggers edit on focused note when pressing Enter', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'First note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      // Focus note and press Enter
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      const editForm = panel.element.querySelector('.sr-panel__note-edit-form');
      expect(editForm).not.toBeNull();
    });

    it('clears focus when pressing Escape', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'First note', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      // Focus note and press Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      const highlightedNote = panel.element.querySelector('.sr-panel__note-item--focused');
      expect(highlightedNote).toBeNull();
    });
  });

  describe('Note Formatting', () => {
    it('renders bold text with **text** syntax', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'This is **bold** text', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const noteContent = panel.element.querySelector('.sr-panel__note-content');
      expect(noteContent?.innerHTML).toContain('<strong>bold</strong>');
    });

    it('renders italic text with *text* syntax', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'This is *italic* text', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const noteContent = panel.element.querySelector('.sr-panel__note-content');
      expect(noteContent?.innerHTML).toContain('<em>italic</em>');
    });

    it('renders bullet points with - at start of line', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: '- First item\n- Second item', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const noteContent = panel.element.querySelector('.sr-panel__note-content');
      expect(noteContent?.innerHTML).toContain('<ul');
      expect(noteContent?.innerHTML).toContain('<li>First item</li>');
      expect(noteContent?.innerHTML).toContain('<li>Second item</li>');
    });

    it('renders combined formatting (bold and italic)', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: 'This has **bold** and *italic* text', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const noteContent = panel.element.querySelector('.sr-panel__note-content');
      expect(noteContent?.innerHTML).toContain('<strong>bold</strong>');
      expect(noteContent?.innerHTML).toContain('<em>italic</em>');
    });

    it('escapes HTML to prevent XSS', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setNotes([
        { id: 'note-1', contact_id: 'c1', content: '<script>alert("xss")</script>', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      panel.toggle();

      const noteContent = panel.element.querySelector('.sr-panel__note-content');
      expect(noteContent?.innerHTML).not.toContain('<script>');
      expect(noteContent?.innerHTML).toContain('&lt;script&gt;');
    });
  });

  describe('Network Graph', () => {
    it('shows network graph button in panel header', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const graphButton = panel.element.querySelector('.sr-panel__network-graph-btn');
      expect(graphButton).not.toBeNull();
    });

    it('opens network graph modal when button is clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const graphButton = panel.element.querySelector('.sr-panel__network-graph-btn') as HTMLElement;
      graphButton?.click();

      const graphModal = panel.element.querySelector('.sr-panel__network-graph-modal');
      expect(graphModal).not.toBeNull();
    });

    it('displays current contact as center node', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const graphButton = panel.element.querySelector('.sr-panel__network-graph-btn') as HTMLElement;
      graphButton?.click();

      const centerNode = panel.element.querySelector('.sr-panel__graph-node--center');
      expect(centerNode).not.toBeNull();
      expect(centerNode?.textContent).toContain('Sarah Chen');
    });

    it('displays connected contacts from shared tags', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setTags([
        { id: 'tag-1', name: 'Engineering', contacts: ['contact-1', 'contact-2', 'contact-3'] },
        { id: 'tag-2', name: 'Investors', contacts: ['contact-1', 'contact-4'] },
      ]);
      // Mock related contacts for the graph
      panel.setNetworkContacts([
        { id: 'contact-2', name: 'John Doe', sharedTags: ['Engineering'] },
        { id: 'contact-3', name: 'Jane Smith', sharedTags: ['Engineering'] },
        { id: 'contact-4', name: 'Bob Wilson', sharedTags: ['Investors'] },
      ]);
      panel.toggle();

      const graphButton = panel.element.querySelector('.sr-panel__network-graph-btn') as HTMLElement;
      graphButton?.click();

      const connectedNodes = panel.element.querySelectorAll('.sr-panel__graph-node--connected');
      expect(connectedNodes.length).toBe(3);
    });

    it('closes network graph modal when close button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Test User',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const graphButton = panel.element.querySelector('.sr-panel__network-graph-btn') as HTMLElement;
      graphButton?.click();

      const closeButton = panel.element.querySelector('.sr-panel__graph-close') as HTMLElement;
      closeButton?.click();

      const graphModal = panel.element.querySelector('.sr-panel__network-graph-modal');
      expect(graphModal).toBeNull();
    });
  });

  describe('Introduction Tracker', () => {
    it('displays "Introduced by" when set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setIntroduction({ introducedBy: 'John Doe' });
      panel.toggle();

      const introSection = panel.element.querySelector('.sr-panel__introduction');
      expect(introSection).not.toBeNull();
      expect(introSection?.textContent).toContain('John Doe');
    });

    it('displays "Met at" when set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setIntroduction({ metAt: 'Tech Conference 2024' });
      panel.toggle();

      const introSection = panel.element.querySelector('.sr-panel__introduction');
      expect(introSection).not.toBeNull();
      expect(introSection?.textContent).toContain('Tech Conference 2024');
    });

    it('displays both introduction fields when set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setIntroduction({ introducedBy: 'John Doe', metAt: 'Tech Conference 2024' });
      panel.toggle();

      const introSection = panel.element.querySelector('.sr-panel__introduction');
      expect(introSection?.textContent).toContain('John Doe');
      expect(introSection?.textContent).toContain('Tech Conference 2024');
    });

    it('does not display introduction section when no data', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const introSection = panel.element.querySelector('.sr-panel__introduction');
      expect(introSection).toBeNull();
    });

    it('allows editing introduction fields', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add introduction button
      const addBtn = panel.element.querySelector('.sr-panel__add-introduction') as HTMLElement;
      addBtn?.click();

      const editForm = panel.element.querySelector('.sr-panel__introduction-form');
      expect(editForm).not.toBeNull();
    });
  });

  describe('Bulk Tag/Group Assignment', () => {
    it('shows bulk select toggle in history view', () => {
      const panel = createPanel(container);
      panel.showHistory([
        { profileId: 'user1', name: 'John Doe', headline: 'Engineer', lastSeen: new Date().toISOString() },
        { profileId: 'user2', name: 'Jane Smith', headline: 'Designer', lastSeen: new Date().toISOString() },
      ]);
      panel.toggle();

      const bulkToggle = panel.element.querySelector('.sr-panel__bulk-toggle');
      expect(bulkToggle).not.toBeNull();
    });

    it('shows checkboxes when bulk select mode is enabled', () => {
      const panel = createPanel(container);
      panel.showHistory([
        { profileId: 'user1', name: 'John Doe', headline: 'Engineer', lastSeen: new Date().toISOString() },
        { profileId: 'user2', name: 'Jane Smith', headline: 'Designer', lastSeen: new Date().toISOString() },
      ]);
      panel.toggle();

      const bulkToggle = panel.element.querySelector('.sr-panel__bulk-toggle') as HTMLElement;
      bulkToggle?.click();

      const checkboxes = panel.element.querySelectorAll('.sr-panel__bulk-checkbox');
      expect(checkboxes.length).toBe(2);
    });

    it('shows bulk actions bar when contacts are selected', () => {
      const panel = createPanel(container);
      panel.showHistory([
        { profileId: 'user1', name: 'John Doe', headline: 'Engineer', lastSeen: new Date().toISOString() },
        { profileId: 'user2', name: 'Jane Smith', headline: 'Designer', lastSeen: new Date().toISOString() },
      ]);
      panel.toggle();

      // Enable bulk select mode
      const bulkToggle = panel.element.querySelector('.sr-panel__bulk-toggle') as HTMLElement;
      bulkToggle?.click();

      // Select a contact
      const checkbox = panel.element.querySelector('.sr-panel__bulk-checkbox') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));

      const bulkActions = panel.element.querySelector('.sr-panel__bulk-actions');
      expect(bulkActions).not.toBeNull();
    });

    it('displays selected count in bulk actions bar', () => {
      const panel = createPanel(container);
      panel.showHistory([
        { profileId: 'user1', name: 'John Doe', headline: 'Engineer', lastSeen: new Date().toISOString() },
        { profileId: 'user2', name: 'Jane Smith', headline: 'Designer', lastSeen: new Date().toISOString() },
      ]);
      panel.toggle();

      // Enable bulk select mode and select both
      const bulkToggle = panel.element.querySelector('.sr-panel__bulk-toggle') as HTMLElement;
      bulkToggle?.click();

      const checkboxes = panel.element.querySelectorAll('.sr-panel__bulk-checkbox') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const countText = panel.element.querySelector('.sr-panel__bulk-count');
      expect(countText?.textContent).toContain('2');
    });

    it('calls bulk tag callback with selected profile IDs', () => {
      const panel = createPanel(container);
      const bulkTagCallback = vi.fn();
      panel.onBulkTagApply(bulkTagCallback);

      panel.showHistory([
        { profileId: 'user1', name: 'John Doe', headline: 'Engineer', lastSeen: new Date().toISOString() },
        { profileId: 'user2', name: 'Jane Smith', headline: 'Designer', lastSeen: new Date().toISOString() },
      ]);
      panel.toggle();

      // Enable bulk select mode and select contacts
      const bulkToggle = panel.element.querySelector('.sr-panel__bulk-toggle') as HTMLElement;
      bulkToggle?.click();

      const checkboxes = panel.element.querySelectorAll('.sr-panel__bulk-checkbox') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Click add tag button
      const addTagBtn = panel.element.querySelector('.sr-panel__bulk-add-tag') as HTMLElement;
      addTagBtn?.click();

      // Fill in tag name and submit
      const tagInput = panel.element.querySelector('.sr-panel__bulk-tag-input') as HTMLInputElement;
      tagInput.value = 'Team Members';
      const submitBtn = panel.element.querySelector('.sr-panel__bulk-tag-submit') as HTMLElement;
      submitBtn?.click();

      expect(bulkTagCallback).toHaveBeenCalledWith(['user1', 'user2'], 'Team Members');
    });
  });

  describe('Contact Stats Dashboard', () => {
    it('displays stats section when stats are set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setStats({
        totalContacts: 150,
        totalNotes: 45,
        totalTags: 12,
        thisWeekContacts: 5,
      });
      panel.toggle();

      const statsSection = panel.element.querySelector('.sr-panel__stats');
      expect(statsSection).not.toBeNull();
    });

    it('displays total contacts count', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setStats({
        totalContacts: 150,
        totalNotes: 45,
        totalTags: 12,
        thisWeekContacts: 5,
      });
      panel.toggle();

      const statsSection = panel.element.querySelector('.sr-panel__stats');
      expect(statsSection?.textContent).toContain('150');
    });

    it('displays total notes count', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setStats({
        totalContacts: 150,
        totalNotes: 45,
        totalTags: 12,
        thisWeekContacts: 5,
      });
      panel.toggle();

      const statsSection = panel.element.querySelector('.sr-panel__stats');
      expect(statsSection?.textContent).toContain('45');
    });

    it('displays this week activity', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.setStats({
        totalContacts: 150,
        totalNotes: 45,
        totalTags: 12,
        thisWeekContacts: 5,
      });
      panel.toggle();

      const statsSection = panel.element.querySelector('.sr-panel__stats');
      expect(statsSection?.textContent).toContain('5');
      expect(statsSection?.textContent).toMatch(/this week/i);
    });

    it('does not display stats section when no stats set', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      const statsSection = panel.element.querySelector('.sr-panel__stats');
      expect(statsSection).toBeNull();
    });
  });

  describe('Note Templates Manager', () => {
    it('provides default templates', () => {
      const panel = createPanel(container);

      const templates = panel.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'Met at [event]')).toBe(true);
      expect(templates.some(t => t.name === 'Follow up')).toBe(true);
    });

    it('allows adding a custom template', () => {
      const panel = createPanel(container);
      const initialCount = panel.getTemplates().length;

      panel.addTemplate({ name: 'Weekly check-in', content: 'Weekly check-in: ' });

      const templates = panel.getTemplates();
      expect(templates.length).toBe(initialCount + 1);
      expect(templates.some(t => t.name === 'Weekly check-in')).toBe(true);
    });

    it('allows editing an existing template', () => {
      const panel = createPanel(container);
      panel.addTemplate({ name: 'Test Template', content: 'Original content' });
      const template = panel.getTemplates().find(t => t.name === 'Test Template');

      panel.editTemplate(template!.id, { name: 'Updated Template', content: 'Updated content' });

      const updated = panel.getTemplates().find(t => t.id === template!.id);
      expect(updated?.name).toBe('Updated Template');
      expect(updated?.content).toBe('Updated content');
    });

    it('allows deleting a template', () => {
      const panel = createPanel(container);
      panel.addTemplate({ name: 'To Delete', content: 'Delete me' });
      const template = panel.getTemplates().find(t => t.name === 'To Delete');
      const countBefore = panel.getTemplates().length;

      panel.deleteTemplate(template!.id);

      expect(panel.getTemplates().length).toBe(countBefore - 1);
      expect(panel.getTemplates().some(t => t.id === template!.id)).toBe(false);
    });

    it('displays custom templates in dropdown when adding note', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();
      panel.addTemplate({ name: 'Custom Template', content: 'Custom: ' });

      // Click add note button
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn?.click();

      // Click template button to open dropdown
      const templateBtn = panel.element.querySelector('.sr-panel__template-btn') as HTMLButtonElement;
      templateBtn?.click();

      const dropdown = panel.element.querySelector('.sr-panel__template-dropdown');
      expect(dropdown?.textContent).toContain('Custom Template');
    });

    it('opens templates manager when manage button clicked', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();

      // Click add note button
      const addNoteBtn = panel.element.querySelector('.sr-panel__add-note') as HTMLButtonElement;
      addNoteBtn?.click();

      // Click template button to open dropdown
      const templateBtn = panel.element.querySelector('.sr-panel__template-btn') as HTMLButtonElement;
      templateBtn?.click();

      // Click manage templates option
      const manageBtn = panel.element.querySelector('.sr-panel__template-manage') as HTMLButtonElement;
      manageBtn?.click();

      const manager = panel.element.querySelector('.sr-panel__templates-manager');
      expect(manager).not.toBeNull();
    });

    it('shows all templates in manager with edit/delete buttons', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();
      panel.addTemplate({ name: 'Custom One', content: 'Content one' });

      panel.showTemplatesManager();

      const manager = panel.element.querySelector('.sr-panel__templates-manager');
      expect(manager?.textContent).toContain('Custom One');
      expect(manager?.querySelector('.sr-panel__template-edit-btn')).not.toBeNull();
      expect(manager?.querySelector('.sr-panel__template-delete-btn')).not.toBeNull();
    });

    it('allows adding template from manager', () => {
      const panel = createPanel(container);
      panel.setIntelligence({
        name: 'Sarah Chen',
        archetype: Archetype.Builder,
        skills: ['Go'],
        couldBe: ['Advisor'],
        goodFor: ['Startups'],
      });
      panel.toggle();
      const initialCount = panel.getTemplates().length;

      panel.showTemplatesManager();

      // Click add new template button
      const addBtn = panel.element.querySelector('.sr-panel__template-add-new') as HTMLButtonElement;
      addBtn?.click();

      // Fill in form
      const nameInput = panel.element.querySelector('.sr-panel__template-name-input') as HTMLInputElement;
      const contentInput = panel.element.querySelector('.sr-panel__template-content-input') as HTMLInputElement;
      nameInput.value = 'New from Manager';
      contentInput.value = 'New content: ';

      // Click save
      const saveBtn = panel.element.querySelector('.sr-panel__template-save-btn') as HTMLButtonElement;
      saveBtn?.click();

      expect(panel.getTemplates().length).toBe(initialCount + 1);
      expect(panel.getTemplates().some(t => t.name === 'New from Manager')).toBe(true);
    });
  });
});
