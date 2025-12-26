/**
 * Tests for API input validation schemas
 * Ensures all API inputs are validated with proper constraints
 */

import { describe, it, expect } from 'vitest';
import {
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  syncContactSchema,
  syncBatchSchema,
  historyEntrySchema,
  syncHistorySchema,
  API_LIMITS,
} from './api-validation';

describe('API Validation Schemas', () => {
  describe('API_LIMITS constants', () => {
    it('defines maximum lengths for all fields', () => {
      expect(API_LIMITS.MAX_NOTE_LENGTH).toBe(5000);
      expect(API_LIMITS.MAX_NAME_LENGTH).toBe(200);
      expect(API_LIMITS.MAX_HEADLINE_LENGTH).toBe(500);
      expect(API_LIMITS.MAX_URL_LENGTH).toBe(500);
      expect(API_LIMITS.MAX_COMPANY_LENGTH).toBe(200);
      expect(API_LIMITS.MAX_TITLE_LENGTH).toBe(200);
      expect(API_LIMITS.MAX_EMPLOYERS_PER_CONTACT).toBe(50);
      expect(API_LIMITS.MAX_CONTACTS_PER_BATCH).toBe(100);
      expect(API_LIMITS.MAX_HISTORY_ENTRIES_PER_REQUEST).toBe(50);
    });
  });

  describe('createNoteSchema', () => {
    it('accepts valid note with contactId', () => {
      const result = createNoteSchema.safeParse({
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Met at conference, discussed AI projects',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid note with linkedinId', () => {
      const result = createNoteSchema.safeParse({
        linkedinId: 'john-doe',
        content: 'Great conversation about startups',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const result = createNoteSchema.safeParse({
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only content', () => {
      const result = createNoteSchema.safeParse({
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        content: '   \n\t  ',
      });
      expect(result.success).toBe(false);
    });

    it('rejects content exceeding max length', () => {
      const result = createNoteSchema.safeParse({
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'a'.repeat(API_LIMITS.MAX_NOTE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing both contactId and linkedinId', () => {
      const result = createNoteSchema.safeParse({
        content: 'Some note',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateNoteSchema', () => {
    it('accepts valid update', () => {
      const result = updateNoteSchema.safeParse({
        noteId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Updated content',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing noteId', () => {
      const result = updateNoteSchema.safeParse({
        content: 'Updated content',
      });
      expect(result.success).toBe(false);
    });

    it('rejects content exceeding max length', () => {
      const result = updateNoteSchema.safeParse({
        noteId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'a'.repeat(API_LIMITS.MAX_NOTE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteNoteSchema', () => {
    it('accepts valid noteId', () => {
      const result = deleteNoteSchema.safeParse({
        noteId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing noteId', () => {
      const result = deleteNoteSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty noteId', () => {
      const result = deleteNoteSchema.safeParse({
        noteId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('syncContactSchema', () => {
    it('accepts valid contact data', () => {
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe',
        headline: 'Software Engineer at Google',
        employers: [
          { company: 'Google', logo: 'https://logo.com/google.png', title: 'Senior Engineer' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects name exceeding max length', () => {
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'a'.repeat(API_LIMITS.MAX_NAME_LENGTH + 1),
        url: 'https://linkedin.com/in/john-doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects headline exceeding max length', () => {
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe',
        headline: 'a'.repeat(API_LIMITS.MAX_HEADLINE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it('rejects too many employers', () => {
      const employers = Array.from({ length: API_LIMITS.MAX_EMPLOYERS_PER_CONTACT + 1 }, (_, i) => ({
        company: `Company ${i}`,
        logo: '',
      }));
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe',
        employers,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid LinkedIn URL', () => {
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'John Doe',
        url: 'https://twitter.com/johndoe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects company name exceeding max length', () => {
      const result = syncContactSchema.safeParse({
        profileId: 'john-doe',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe',
        employers: [
          { company: 'a'.repeat(API_LIMITS.MAX_COMPANY_LENGTH + 1), logo: '' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('syncBatchSchema', () => {
    it('accepts valid batch', () => {
      const result = syncBatchSchema.safeParse({
        contacts: [
          {
            profileId: 'john-doe',
            name: 'John Doe',
            url: 'https://linkedin.com/in/john-doe',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts single contact format', () => {
      const result = syncBatchSchema.safeParse({
        contact: {
          profileId: 'john-doe',
          name: 'John Doe',
          url: 'https://linkedin.com/in/john-doe',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects batch exceeding max contacts', () => {
      const contacts = Array.from({ length: API_LIMITS.MAX_CONTACTS_PER_BATCH + 1 }, (_, i) => ({
        profileId: `profile-${i}`,
        name: `Person ${i}`,
        url: `https://linkedin.com/in/profile-${i}`,
      }));
      const result = syncBatchSchema.safeParse({ contacts });
      expect(result.success).toBe(false);
    });

    it('rejects empty batch', () => {
      const result = syncBatchSchema.safeParse({ contacts: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('historyEntrySchema', () => {
    it('accepts valid history entry', () => {
      const result = historyEntrySchema.safeParse({
        field: 'name',
        oldValue: 'John',
        newValue: 'John Doe',
        detectedAt: '2024-01-15T10:30:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid field', () => {
      const result = historyEntrySchema.safeParse({
        field: 'invalid_field',
        oldValue: 'old',
        newValue: 'new',
        detectedAt: '2024-01-15T10:30:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid field types', () => {
      const validFields = ['name', 'headline', 'location', 'employers', 'education'];
      for (const field of validFields) {
        const result = historyEntrySchema.safeParse({
          field,
          oldValue: 'old',
          newValue: 'new',
          detectedAt: '2024-01-15T10:30:00Z',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('syncHistorySchema', () => {
    it('accepts valid history sync request', () => {
      const result = syncHistorySchema.safeParse({
        profileId: 'john-doe',
        entries: [
          {
            field: 'headline',
            oldValue: 'Engineer',
            newValue: 'Senior Engineer',
            detectedAt: '2024-01-15T10:30:00Z',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects too many entries', () => {
      const entries = Array.from({ length: API_LIMITS.MAX_HISTORY_ENTRIES_PER_REQUEST + 1 }, () => ({
        field: 'name' as const,
        oldValue: 'old',
        newValue: 'new',
        detectedAt: '2024-01-15T10:30:00Z',
      }));
      const result = syncHistorySchema.safeParse({
        profileId: 'john-doe',
        entries,
      });
      expect(result.success).toBe(false);
    });

    it('accepts empty entries array', () => {
      const result = syncHistorySchema.safeParse({
        profileId: 'john-doe',
        entries: [],
      });
      expect(result.success).toBe(true);
    });
  });
});
