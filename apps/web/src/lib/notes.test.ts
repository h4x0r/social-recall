/**
 * Tests for contact notes functionality
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Note,
  addNote,
  updateNote,
  deleteNote,
  getNotesForContact,
  searchNotes,
  saveNotesToStorage,
  loadNotesFromStorage,
  getAllNotes,
  clearNotesCache,
} from './notes';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('notes', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearNotesCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
  });

  describe('addNote', () => {
    it('creates a note with auto-generated id and timestamps', () => {
      const note = addNote({
        contactId: 'contact-123',
        content: 'Met at TechCrunch Disrupt 2024',
      });

      expect(note.id).toBeDefined();
      expect(note.id).toMatch(/^note-/);
      expect(note.contactId).toBe('contact-123');
      expect(note.content).toBe('Met at TechCrunch Disrupt 2024');
      expect(note.createdAt).toBe('2025-01-15T10:00:00.000Z');
      expect(note.updatedAt).toBe('2025-01-15T10:00:00.000Z');
    });

    it('trims whitespace from content', () => {
      const note = addNote({
        contactId: 'contact-123',
        content: '  Some note with spaces  ',
      });

      expect(note.content).toBe('Some note with spaces');
    });

    it('throws error for empty content', () => {
      expect(() =>
        addNote({
          contactId: 'contact-123',
          content: '',
        })
      ).toThrow('Note content cannot be empty');
    });

    it('throws error for whitespace-only content', () => {
      expect(() =>
        addNote({
          contactId: 'contact-123',
          content: '   ',
        })
      ).toThrow('Note content cannot be empty');
    });

    it('throws error for missing contactId', () => {
      expect(() =>
        addNote({
          contactId: '',
          content: 'Some note',
        })
      ).toThrow('Contact ID is required');
    });
  });

  describe('updateNote', () => {
    it('updates note content and updatedAt timestamp', () => {
      const note = addNote({
        contactId: 'contact-123',
        content: 'Original note',
      });

      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const updated = updateNote(note.id, 'Updated note content');

      expect(updated.content).toBe('Updated note content');
      expect(updated.createdAt).toBe('2025-01-15T10:00:00.000Z');
      expect(updated.updatedAt).toBe('2025-01-15T12:00:00.000Z');
    });

    it('throws error for non-existent note', () => {
      expect(() => updateNote('non-existent-id', 'New content')).toThrow(
        'Note not found'
      );
    });

    it('throws error for empty content', () => {
      const note = addNote({
        contactId: 'contact-123',
        content: 'Original note',
      });

      expect(() => updateNote(note.id, '')).toThrow(
        'Note content cannot be empty'
      );
    });
  });

  describe('deleteNote', () => {
    it('removes note from storage', () => {
      const note = addNote({
        contactId: 'contact-123',
        content: 'Note to delete',
      });

      deleteNote(note.id);

      const notes = getNotesForContact('contact-123');
      expect(notes).toHaveLength(0);
    });

    it('throws error for non-existent note', () => {
      expect(() => deleteNote('non-existent-id')).toThrow('Note not found');
    });
  });

  describe('getNotesForContact', () => {
    it('returns empty array for contact with no notes', () => {
      const notes = getNotesForContact('contact-with-no-notes');
      expect(notes).toEqual([]);
    });

    it('returns all notes for a contact', () => {
      addNote({ contactId: 'contact-123', content: 'First note' });
      addNote({ contactId: 'contact-123', content: 'Second note' });
      addNote({ contactId: 'contact-456', content: 'Different contact' });

      const notes = getNotesForContact('contact-123');

      expect(notes).toHaveLength(2);
      expect(notes[0].content).toBe('First note');
      expect(notes[1].content).toBe('Second note');
    });

    it('returns notes sorted by createdAt descending (newest first)', () => {
      addNote({ contactId: 'contact-123', content: 'First note' });
      vi.setSystemTime(new Date('2025-01-15T11:00:00Z'));
      addNote({ contactId: 'contact-123', content: 'Second note' });
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      addNote({ contactId: 'contact-123', content: 'Third note' });

      const notes = getNotesForContact('contact-123');

      expect(notes[0].content).toBe('Third note');
      expect(notes[1].content).toBe('Second note');
      expect(notes[2].content).toBe('First note');
    });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
      addNote({ contactId: 'contact-1', content: 'Met at TechCrunch Disrupt' });
      addNote({ contactId: 'contact-2', content: 'Interested in AI startups' });
      addNote({ contactId: 'contact-3', content: 'Former Google engineer' });
      addNote({ contactId: 'contact-1', content: 'Follow up about Series A' });
    });

    it('finds notes containing search term (case-insensitive)', () => {
      const results = searchNotes('techcrunch');

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('TechCrunch');
    });

    it('finds notes with partial matches', () => {
      const results = searchNotes('start');

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('startups');
    });

    it('returns empty array for no matches', () => {
      const results = searchNotes('cryptocurrency');

      expect(results).toHaveLength(0);
    });

    it('returns all matching notes across contacts', () => {
      const results = searchNotes('a');

      expect(results.length).toBeGreaterThan(1);
    });

    it('can filter by contactId', () => {
      const results = searchNotes('', { contactId: 'contact-1' });

      expect(results).toHaveLength(2);
      results.forEach((note) => {
        expect(note.contactId).toBe('contact-1');
      });
    });
  });

  describe('persistence', () => {
    it('saves notes to localStorage', () => {
      addNote({ contactId: 'contact-123', content: 'Test note' });

      saveNotesToStorage();

      const stored = localStorageMock.getItem('social-recall:notes');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('Test note');
    });

    it('loads notes from localStorage', () => {
      const notesData = [
        {
          id: 'note-existing',
          contactId: 'contact-123',
          content: 'Existing note',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      localStorageMock.setItem('social-recall:notes', JSON.stringify(notesData));

      loadNotesFromStorage();

      const notes = getNotesForContact('contact-123');
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe('Existing note');
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('social-recall:notes', 'invalid json{{{');

      expect(() => loadNotesFromStorage()).not.toThrow();

      const notes = getAllNotes();
      expect(notes).toEqual([]);
    });

    it('auto-saves after adding a note', () => {
      addNote({ contactId: 'contact-123', content: 'Auto-saved note' });

      // Clear cache and reload from storage
      clearNotesCache();
      loadNotesFromStorage();

      const notes = getNotesForContact('contact-123');
      expect(notes).toHaveLength(1);
    });
  });

  describe('getAllNotes', () => {
    it('returns all notes across all contacts', () => {
      addNote({ contactId: 'contact-1', content: 'Note 1' });
      addNote({ contactId: 'contact-2', content: 'Note 2' });
      addNote({ contactId: 'contact-3', content: 'Note 3' });

      const allNotes = getAllNotes();

      expect(allNotes).toHaveLength(3);
    });
  });
});
