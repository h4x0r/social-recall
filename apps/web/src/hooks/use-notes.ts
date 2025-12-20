"use client";

import { useState, useCallback, useEffect } from 'react';
import {
  Note,
  addNote as addNoteToStore,
  updateNote as updateNoteInStore,
  deleteNote as deleteNoteFromStore,
  getNotesForContact,
  loadNotesFromStorage,
} from '@/lib/notes';

interface UseNotesReturn {
  notes: Note[];
  noteCount: number;
  isLoading: boolean;
  addNote: (content: string) => void;
  updateNote: (noteId: string, content: string) => void;
  deleteNote: (noteId: string) => void;
}

// Track if we've loaded from storage
let hasLoadedFromStorage = false;

export function useNotes(contactId: string): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load notes from storage on first mount
  useEffect(() => {
    if (!hasLoadedFromStorage) {
      loadNotesFromStorage();
      hasLoadedFromStorage = true;
    }
    setNotes(getNotesForContact(contactId));
  }, [contactId]);

  const addNote = useCallback(
    (content: string) => {
      addNoteToStore({ contactId, content });
      setNotes(getNotesForContact(contactId));
    },
    [contactId]
  );

  const updateNote = useCallback(
    (noteId: string, content: string) => {
      updateNoteInStore(noteId, content);
      setNotes(getNotesForContact(contactId));
    },
    [contactId]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      deleteNoteFromStore(noteId);
      setNotes(getNotesForContact(contactId));
    },
    [contactId]
  );

  return {
    notes,
    noteCount: notes.length,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
  };
}
