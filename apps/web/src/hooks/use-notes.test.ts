/**
 * Tests for useNotes hook
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotes } from './use-notes';
import { clearNotesCache } from '@/lib/notes';

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

describe('useNotes', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearNotesCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
  });

  describe('initial state', () => {
    it('returns empty notes array for contact with no notes', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      expect(result.current.notes).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addNote', () => {
    it('adds a note and updates the notes list', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      act(() => {
        result.current.addNote('Met at conference');
      });

      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0].content).toBe('Met at conference');
    });

    it('adds multiple notes in correct order (newest first)', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      act(() => {
        result.current.addNote('First note');
      });

      vi.setSystemTime(new Date('2025-01-15T11:00:00Z'));

      act(() => {
        result.current.addNote('Second note');
      });

      expect(result.current.notes).toHaveLength(2);
      expect(result.current.notes[0].content).toBe('Second note');
      expect(result.current.notes[1].content).toBe('First note');
    });
  });

  describe('updateNote', () => {
    it('updates existing note content', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      act(() => {
        result.current.addNote('Original content');
      });

      const noteId = result.current.notes[0].id;

      act(() => {
        result.current.updateNote(noteId, 'Updated content');
      });

      expect(result.current.notes[0].content).toBe('Updated content');
    });
  });

  describe('deleteNote', () => {
    it('removes note from the list', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      act(() => {
        result.current.addNote('Note to delete');
      });

      const noteId = result.current.notes[0].id;

      act(() => {
        result.current.deleteNote(noteId);
      });

      expect(result.current.notes).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('persists notes across hook instances', () => {
      const { result: result1, unmount } = renderHook(() =>
        useNotes('contact-123')
      );

      act(() => {
        result1.current.addNote('Persisted note');
      });

      unmount();

      const { result: result2 } = renderHook(() => useNotes('contact-123'));

      expect(result2.current.notes).toHaveLength(1);
      expect(result2.current.notes[0].content).toBe('Persisted note');
    });
  });

  describe('contact isolation', () => {
    it('only shows notes for the specified contact', () => {
      const { result: result1 } = renderHook(() => useNotes('contact-1'));
      const { result: result2 } = renderHook(() => useNotes('contact-2'));

      act(() => {
        result1.current.addNote('Note for contact 1');
      });

      act(() => {
        result2.current.addNote('Note for contact 2');
      });

      expect(result1.current.notes).toHaveLength(1);
      expect(result1.current.notes[0].content).toBe('Note for contact 1');

      expect(result2.current.notes).toHaveLength(1);
      expect(result2.current.notes[0].content).toBe('Note for contact 2');
    });
  });

  describe('noteCount', () => {
    it('returns correct count of notes', () => {
      const { result } = renderHook(() => useNotes('contact-123'));

      expect(result.current.noteCount).toBe(0);

      act(() => {
        result.current.addNote('Note 1');
        result.current.addNote('Note 2');
      });

      expect(result.current.noteCount).toBe(2);
    });
  });
});
