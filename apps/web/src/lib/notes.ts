/**
 * Contact notes management
 * Stores and retrieves notes for contacts with local persistence
 */

export interface Note {
  id: string;
  contactId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddNoteInput {
  contactId: string;
  content: string;
}

export interface SearchOptions {
  contactId?: string;
}

const STORAGE_KEY = 'social-recall:notes';

// In-memory cache
let notesCache: Note[] = [];

/**
 * Generates a unique note ID
 */
function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Adds a new note for a contact
 */
export function addNote(input: AddNoteInput): Note {
  const { contactId, content } = input;

  if (!contactId || contactId.trim() === '') {
    throw new Error('Contact ID is required');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Note content cannot be empty');
  }

  const now = new Date().toISOString();
  const note: Note = {
    id: generateId(),
    contactId,
    content: trimmedContent,
    createdAt: now,
    updatedAt: now,
  };

  notesCache.push(note);
  saveNotesToStorage();

  return note;
}

/**
 * Updates an existing note
 */
export function updateNote(noteId: string, content: string): Note {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Note content cannot be empty');
  }

  const noteIndex = notesCache.findIndex((n) => n.id === noteId);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  const updatedNote: Note = {
    ...notesCache[noteIndex],
    content: trimmedContent,
    updatedAt: new Date().toISOString(),
  };

  notesCache[noteIndex] = updatedNote;
  saveNotesToStorage();

  return updatedNote;
}

/**
 * Deletes a note
 */
export function deleteNote(noteId: string): void {
  const noteIndex = notesCache.findIndex((n) => n.id === noteId);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  notesCache.splice(noteIndex, 1);
  saveNotesToStorage();
}

/**
 * Gets all notes for a specific contact
 * Returns notes sorted by createdAt descending (newest first)
 */
export function getNotesForContact(contactId: string): Note[] {
  return notesCache
    .filter((n) => n.contactId === contactId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Searches notes by content
 */
export function searchNotes(query: string, options: SearchOptions = {}): Note[] {
  const { contactId } = options;
  const lowerQuery = query.toLowerCase();

  return notesCache.filter((note) => {
    // Filter by contactId if provided
    if (contactId && note.contactId !== contactId) {
      return false;
    }

    // If no query, return all (filtered by contactId if provided)
    if (!lowerQuery) {
      return true;
    }

    // Search in content
    return note.content.toLowerCase().includes(lowerQuery);
  });
}

/**
 * Gets all notes
 */
export function getAllNotes(): Note[] {
  return [...notesCache];
}

/**
 * Saves notes to localStorage
 */
export function saveNotesToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notesCache));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

/**
 * Loads notes from localStorage
 */
export function loadNotesFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        notesCache = parsed;
      }
    }
  } catch {
    // Handle corrupted data gracefully
    notesCache = [];
  }
}

/**
 * Clears the notes cache (for testing)
 */
export function clearNotesCache(): void {
  notesCache = [];
}
