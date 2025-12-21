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

    it('searches contacts by skill name', async () => {
      // First mock: get contact_ids with matching skill
      const skillQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [{ contact_id: 'contact-1' }, { contact_id: 'contact-2' }],
          error: null,
        }),
      };

      // Second mock: get contacts with those IDs
      const contactQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'contact-1', name: 'Sarah Chen', is_new: true },
            { id: 'contact-2', name: 'Marcus Johnson', is_new: false },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(skillQueryMock)
        .mockReturnValueOnce(contactQueryMock);

      const result = await repository.listContacts('user-123', { skill: 'React' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_skills');
      expect(skillQueryMock.ilike).toHaveBeenCalledWith('name', '%React%');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sarah Chen');
    });

    it('returns empty array when no contacts have matching skill', async () => {
      const skillQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(skillQueryMock);

      const result = await repository.listContacts('user-123', { skill: 'COBOL' });

      expect(result).toHaveLength(0);
    });

    it('searches contacts by note content', async () => {
      // First mock: get contact_ids with matching note
      const noteQueryMock = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [{ contact_id: 'contact-1' }],
          error: null,
        }),
      };

      // Second mock: get contacts with those IDs
      const contactQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'contact-1', name: 'Sarah Chen', is_new: true },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(noteQueryMock)
        .mockReturnValueOnce(contactQueryMock);

      const result = await repository.listContacts('user-123', { note: 'AI project' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_notes');
      expect(noteQueryMock.ilike).toHaveBeenCalledWith('content', '%AI project%');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sarah Chen');
    });

    it('returns empty array when no contacts have matching note', async () => {
      const noteQueryMock = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(noteQueryMock);

      const result = await repository.listContacts('user-123', { note: 'nonexistent' });

      expect(result).toHaveLength(0);
    });

    it('filters contacts by tag name', async () => {
      const tagQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [{ contact_id: 'contact-1' }],
          error: null,
        }),
      };

      const contactQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'contact-1', name: 'Sarah Chen', is_new: true },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(tagQueryMock)
        .mockReturnValueOnce(contactQueryMock);

      const result = await repository.listContacts('user-123', { tag: 'VIP' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contact_tags');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sarah Chen');
    });

    it('returns empty array when no contacts have matching tag', async () => {
      const tagQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(tagQueryMock);

      const result = await repository.listContacts('user-123', { tag: 'nonexistent' });

      expect(result).toHaveLength(0);
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

  describe('listContactsWithRelations', () => {
    it('lists contacts with employers and skills for list view', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          user_id: 'user-123',
          name: 'Sarah Chen',
          headline: 'Partner @ Sequoia',
          linkedin_id: 'sarah-chen',
          profile_url: null,
          avatar_url: null,
          last_synced_at: null,
          is_new: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-15',
          employers: [
            { id: 'e1', contact_id: 'contact-1', company: 'Sequoia Capital', title: 'Partner', logo_url: 'https://logo.url/sequoia.png', is_current: true, start_date: null, end_date: null, sort_order: 0, created_at: '2024-01-01' },
            { id: 'e2', contact_id: 'contact-1', company: 'Goldman Sachs', title: 'VP', logo_url: null, is_current: false, start_date: null, end_date: null, sort_order: 1, created_at: '2024-01-01' },
          ],
          skills: [
            { id: 's1', contact_id: 'contact-1', name: 'Venture Capital', category: 'Finance', confidence: 0.9, status: 'confirmed', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 's2', contact_id: 'contact-1', name: 'Fundraising', category: 'Finance', confidence: 0.85, status: 'confirmed', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
          ],
        },
        {
          id: 'contact-2',
          user_id: 'user-123',
          name: 'Marcus Johnson',
          headline: 'CTO @ TechCorp',
          linkedin_id: 'marcus-johnson',
          profile_url: null,
          avatar_url: null,
          last_synced_at: null,
          is_new: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-10',
          employers: [
            { id: 'e3', contact_id: 'contact-2', company: 'TechCorp', title: 'CTO', logo_url: null, is_current: true, start_date: null, end_date: null, sort_order: 0, created_at: '2024-01-01' },
          ],
          skills: [
            { id: 's3', contact_id: 'contact-2', name: 'Python', category: 'Engineering', confidence: 0.95, status: 'confirmed', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
          ],
        },
      ];

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listContactsWithRelations('user-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contacts');
      expect(queryMock.select).toHaveBeenCalledWith(expect.stringContaining('employers:contact_employers'));
      expect(queryMock.select).toHaveBeenCalledWith(expect.stringContaining('skills:contact_skills'));
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sarah Chen');
      expect(result[0].employers).toHaveLength(2);
      expect(result[0].employers[0].company).toBe('Sequoia Capital');
      expect(result[0].skills).toHaveLength(2);
      expect(result[0].skills[0].name).toBe('Venture Capital');
    });

    it('filters skills to only show confirmed status', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          user_id: 'user-123',
          name: 'Sarah Chen',
          headline: 'Partner',
          linkedin_id: null,
          profile_url: null,
          avatar_url: null,
          last_synced_at: null,
          is_new: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          employers: [],
          skills: [
            { id: 's1', contact_id: 'contact-1', name: 'Confirmed Skill', category: null, confidence: 0.9, status: 'confirmed', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 's2', contact_id: 'contact-1', name: 'Pending Skill', category: null, confidence: 0.8, status: 'pending', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 's3', contact_id: 'contact-1', name: 'Rejected Skill', category: null, confidence: 0.7, status: 'rejected', source: 'inferred', created_at: '2024-01-01', updated_at: '2024-01-01' },
          ],
        },
      ];

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listContactsWithRelations('user-123');

      // Should only include confirmed skills
      expect(result[0].skills).toHaveLength(1);
      expect(result[0].skills[0].name).toBe('Confirmed Skill');
    });

    it('respects limit option', async () => {
      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await repository.listContactsWithRelations('user-123', { limit: 10 });

      expect(queryMock.limit).toHaveBeenCalledWith(10);
    });

    it('includes tags in the result', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          user_id: 'user-123',
          name: 'Sarah Chen',
          headline: 'Partner',
          linkedin_id: null,
          profile_url: null,
          avatar_url: null,
          last_synced_at: null,
          is_new: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          employers: [],
          skills: [],
          tags: [
            { tag_id: 't1', tags: { id: 't1', name: 'VIP', color: '#ef4444' } },
            { tag_id: 't2', tags: { id: 't2', name: 'Important', color: '#6366f1' } },
          ],
        },
      ];

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.listContactsWithRelations('user-123');

      expect(queryMock.select).toHaveBeenCalledWith(expect.stringContaining('tags:contact_tags'));
      expect(result[0].tags).toHaveLength(2);
      expect(result[0].tags[0].name).toBe('VIP');
    });
  });

  describe('countContacts', () => {
    it('returns total and new count for a user', async () => {
      // Create chainable mocks for each query
      const totalMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 150, error: null }),
      };

      const newMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 12, error: null }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(totalMock)
        .mockReturnValueOnce(newMock);

      const result = await repository.countContacts('user-123');

      expect(result.total).toBe(150);
      expect(result.new).toBe(12);
    });

    it('returns zero counts on error', async () => {
      const totalErrorMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
      };

      const newErrorMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(totalErrorMock)
        .mockReturnValueOnce(newErrorMock);

      const result = await repository.countContacts('user-123');

      expect(result.total).toBe(0);
      expect(result.new).toBe(0);
    });
  });
});
