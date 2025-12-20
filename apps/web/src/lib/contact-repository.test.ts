/**
 * Tests for contact repository (Supabase persistence)
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContactRepository,
  createContactRepository,
  ContactInput,
  ContactWithRelations,
} from './contact-repository';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

// Helper to create chainable mock
function createQueryMock(returnValue: unknown) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    order: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => cb(returnValue)),
  };
  // Make it thenable for await
  mock.select = vi.fn().mockReturnValue(mock);
  mock.insert = vi.fn().mockReturnValue(mock);
  mock.update = vi.fn().mockReturnValue(mock);
  mock.delete = vi.fn().mockReturnValue(mock);
  mock.eq = vi.fn().mockReturnValue(mock);
  mock.order = vi.fn().mockReturnValue(mock);
  return mock;
}

describe('contact-repository', () => {
  let repository: ContactRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createContactRepository(mockSupabaseClient as never);
  });

  describe('createContact', () => {
    it('creates a contact with basic info', async () => {
      const contactData: ContactInput = {
        userId: 'user-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        linkedinId: 'sarah-chen-123',
      };

      const mockContact = {
        id: 'contact-456',
        user_id: 'user-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        linkedin_id: 'sarah-chen-123',
        is_new: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.createContact(contactData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contacts');
      expect(result.id).toBe('contact-456');
      expect(result.name).toBe('Sarah Chen');
    });

    it('creates a contact with employers', async () => {
      const contactData: ContactInput = {
        userId: 'user-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        employers: [
          { company: 'Sequoia Capital', title: 'Partner', isCurrent: true },
          { company: 'Goldman Sachs', title: 'VP', isCurrent: false },
        ],
      };

      const mockContact = {
        id: 'contact-456',
        user_id: 'user-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        is_new: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.createContact(contactData);

      expect(result.id).toBe('contact-456');
      // Should have called from('contact_employers') for each employer
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_employers');
    });

    it('throws error on database failure', async () => {
      const contactData: ContactInput = {
        userId: 'user-123',
        name: 'Sarah Chen',
      };

      const queryMock = createQueryMock({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await expect(repository.createContact(contactData)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getContact', () => {
    it('retrieves a contact by ID with relations', async () => {
      const mockContact = {
        id: 'contact-456',
        user_id: 'user-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        linkedin_id: 'sarah-chen-123',
        is_new: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        employers: [
          { id: 'emp-1', company: 'Sequoia Capital', is_current: true },
        ],
        skills: [
          { id: 'skill-1', name: 'Venture Capital', status: 'confirmed' },
        ],
        notes: [{ id: 'note-1', content: 'Great connection' }],
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.getContact('contact-456');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('contact-456');
      expect(result!.name).toBe('Sarah Chen');
      expect(result!.employers).toHaveLength(1);
      expect(result!.skills).toHaveLength(1);
      expect(result!.notes).toHaveLength(1);
    });

    it('returns null for non-existent contact', async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.getContact('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listContacts', () => {
    it('lists all contacts for a user', async () => {
      const mockContacts = [
        { id: 'contact-1', name: 'Sarah Chen', is_new: true },
        { id: 'contact-2', name: 'Marcus Johnson', is_new: false },
      ];

      const queryMock = createQueryMock({ data: mockContacts, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listContacts('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sarah Chen');
    });

    it('filters by isNew flag', async () => {
      const mockContacts = [{ id: 'contact-1', name: 'Sarah Chen', is_new: true }];

      const queryMock = createQueryMock({ data: mockContacts, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listContacts('user-123', { isNew: true });

      expect(queryMock.eq).toHaveBeenCalledWith('is_new', true);
      expect(result).toHaveLength(1);
    });

    it('orders by updated_at descending by default', async () => {
      const queryMock = createQueryMock({ data: [], error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.listContacts('user-123');

      expect(queryMock.order).toHaveBeenCalledWith('updated_at', {
        ascending: false,
      });
    });
  });

  describe('updateContact', () => {
    it('updates contact fields', async () => {
      const mockContact = {
        id: 'contact-456',
        name: 'Sarah Chen-Wong',
        headline: 'Managing Partner @ Sequoia Capital',
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.updateContact('contact-456', {
        name: 'Sarah Chen-Wong',
        headline: 'Managing Partner @ Sequoia Capital',
      });

      expect(queryMock.update).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'contact-456');
      expect(result.name).toBe('Sarah Chen-Wong');
    });

    it('marks contact as not new', async () => {
      const mockContact = { id: 'contact-456', is_new: false };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.updateContact('contact-456', {
        isNew: false,
      });

      expect(result.isNew).toBe(false);
    });
  });

  describe('deleteContact', () => {
    it('deletes a contact and its relations', async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.deleteContact('contact-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contacts');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'contact-456');
    });
  });

  describe('addEmployer', () => {
    it('adds an employer to a contact', async () => {
      const mockEmployer = {
        id: 'emp-1',
        contact_id: 'contact-456',
        company: 'New Company',
        is_current: true,
      };

      const queryMock = createQueryMock({ data: mockEmployer, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.addEmployer('contact-456', {
        company: 'New Company',
        title: 'CEO',
        isCurrent: true,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_employers');
      expect(result.company).toBe('New Company');
    });
  });

  describe('removeEmployer', () => {
    it('removes an employer from a contact', async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.removeEmployer('emp-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_employers');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'emp-1');
    });
  });

  describe('skill management', () => {
    it('adds a skill to a contact', async () => {
      const mockSkill = {
        id: 'skill-1',
        contact_id: 'contact-456',
        name: 'Python',
        category: 'Engineering',
        confidence: 0.9,
        status: 'pending',
      };

      const queryMock = createQueryMock({ data: mockSkill, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.addSkill('contact-456', {
        name: 'Python',
        category: 'Engineering',
        confidence: 0.9,
        status: 'pending',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_skills');
      expect(result.name).toBe('Python');
      expect(result.status).toBe('pending');
    });

    it('confirms a skill', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Python',
        status: 'confirmed',
      };

      const queryMock = createQueryMock({ data: mockSkill, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.updateSkillStatus('skill-1', 'confirmed');

      expect(queryMock.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(result.status).toBe('confirmed');
    });

    it('rejects a skill', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Python',
        status: 'rejected',
      };

      const queryMock = createQueryMock({ data: mockSkill, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.updateSkillStatus('skill-1', 'rejected');

      expect(queryMock.update).toHaveBeenCalledWith({ status: 'rejected' });
      expect(result.status).toBe('rejected');
    });

    it('lists skills for a contact', async () => {
      const mockSkills = [
        { id: 'skill-1', name: 'Python', status: 'confirmed' },
        { id: 'skill-2', name: 'AWS', status: 'pending' },
      ];

      const queryMock = createQueryMock({ data: mockSkills, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listSkills('contact-456');

      expect(queryMock.eq).toHaveBeenCalledWith('contact_id', 'contact-456');
      expect(result).toHaveLength(2);
    });

    it('filters skills by status', async () => {
      const mockSkills = [{ id: 'skill-1', name: 'Python', status: 'pending' }];

      const queryMock = createQueryMock({ data: mockSkills, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listSkills('contact-456', {
        status: 'pending',
      });

      expect(queryMock.eq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toHaveLength(1);
    });
  });

  describe('note management', () => {
    it('adds a note to a contact', async () => {
      const mockNote = {
        id: 'note-1',
        contact_id: 'contact-456',
        content: 'Great conversation about AI',
        created_at: new Date().toISOString(),
      };

      const queryMock = createQueryMock({ data: mockNote, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.addNote('contact-456', {
        content: 'Great conversation about AI',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_notes');
      expect(result.content).toBe('Great conversation about AI');
    });

    it('updates a note', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Updated content',
      };

      const queryMock = createQueryMock({ data: mockNote, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.updateNote('note-1', {
        content: 'Updated content',
      });

      expect(queryMock.update).toHaveBeenCalledWith({
        content: 'Updated content',
      });
      expect(result.content).toBe('Updated content');
    });

    it('deletes a note', async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.deleteNote('note-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_notes');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'note-1');
    });

    it('lists notes for a contact', async () => {
      const mockNotes = [
        { id: 'note-1', content: 'First note' },
        { id: 'note-2', content: 'Second note' },
      ];

      const queryMock = createQueryMock({ data: mockNotes, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listNotes('contact-456');

      expect(queryMock.eq).toHaveBeenCalledWith('contact_id', 'contact-456');
      expect(queryMock.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('markContactAsSeen', () => {
    it('marks a new contact as seen (isNew = false)', async () => {
      const mockContact = { id: 'contact-456', is_new: false };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.markContactAsSeen('contact-456');

      expect(queryMock.update).toHaveBeenCalledWith({ is_new: false });
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'contact-456');
    });
  });

  describe('upsertFromLinkedIn', () => {
    it('upserts a contact from LinkedIn data', async () => {
      const linkedInData = {
        linkedinId: 'sarah-chen-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
        profileUrl: 'https://linkedin.com/in/sarah-chen-123',
        employers: [{ company: 'Sequoia Capital', title: 'Partner' }],
      };

      const mockContact = {
        id: 'contact-456',
        linkedin_id: 'sarah-chen-123',
        name: 'Sarah Chen',
        headline: 'Partner @ Sequoia Capital',
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.upsertFromLinkedIn(
        'user-123',
        linkedInData
      );

      expect(result.linkedinId).toBe('sarah-chen-123');
      expect(result.name).toBe('Sarah Chen');
    });

    it('updates existing contact if linkedinId matches', async () => {
      const linkedInData = {
        linkedinId: 'sarah-chen-123',
        name: 'Sarah Chen-Wong', // Name changed
        headline: 'Managing Partner @ Sequoia Capital',
      };

      const mockContact = {
        id: 'contact-456',
        linkedin_id: 'sarah-chen-123',
        name: 'Sarah Chen-Wong',
        headline: 'Managing Partner @ Sequoia Capital',
        is_new: false, // Not new because it's an update
      };

      const queryMock = createQueryMock({ data: mockContact, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.upsertFromLinkedIn(
        'user-123',
        linkedInData
      );

      expect(result.name).toBe('Sarah Chen-Wong');
    });
  });
});
