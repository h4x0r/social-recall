/**
 * Tests for contact sync service (extension → web app)
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContactSyncService,
  createContactSyncService,
  ExtensionContactData,
  SyncContactResult,
} from './contact-sync';

describe('contact-sync', () => {
  let service: ContactSyncService;
  let mockRepository: {
    upsertFromLinkedIn: ReturnType<typeof vi.fn>;
    addNote: ReturnType<typeof vi.fn>;
    listNotes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      upsertFromLinkedIn: vi.fn(),
      addNote: vi.fn(),
      listNotes: vi.fn().mockResolvedValue([]),
    };
    service = createContactSyncService(mockRepository as never);
  });

  describe('syncContact', () => {
    it('syncs a single contact from extension data', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'john-doe-123',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe-123',
        employers: [
          { company: 'Acme Corp', logo: 'https://logo.url/acme.png' },
          { company: 'Previous Inc', logo: '' },
        ],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-456',
        name: 'John Doe',
        linkedinId: 'john-doe-123',
      });

      const result = await service.syncContact('user-123', extensionData);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          linkedinId: 'john-doe-123',
          name: 'John Doe',
          profileUrl: 'https://linkedin.com/in/john-doe-123',
          employers: expect.arrayContaining([
            expect.objectContaining({ company: 'Acme Corp' }),
          ]),
        })
      );
      expect(result.success).toBe(true);
      expect(result.contactId).toBe('contact-456');
    });

    it('syncs contact with note', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'jane-smith',
        name: 'Jane Smith',
        url: 'https://linkedin.com/in/jane-smith',
        note: 'Met at TechCrunch Disrupt. Interested in AI.',
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-789',
        name: 'Jane Smith',
      });

      const result = await service.syncContact('user-123', extensionData);

      expect(mockRepository.addNote).toHaveBeenCalledWith('contact-789', {
        content: 'Met at TechCrunch Disrupt. Interested in AI.',
      });
      expect(result.success).toBe(true);
    });

    it('does not add duplicate notes', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'jane-smith',
        name: 'Jane Smith',
        url: 'https://linkedin.com/in/jane-smith',
        note: 'Existing note content',
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-789',
        name: 'Jane Smith',
      });

      // Note already exists
      mockRepository.listNotes.mockResolvedValue([
        { id: 'note-1', content: 'Existing note content' },
      ]);

      await service.syncContact('user-123', extensionData);

      expect(mockRepository.addNote).not.toHaveBeenCalled();
    });

    it('generates headline from first employer when no headline provided', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'ceo-person',
        name: 'CEO Person',
        url: 'https://linkedin.com/in/ceo-person',
        employers: [{ company: 'StartupXYZ', logo: '' }],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-101',
      });

      await service.syncContact('user-123', extensionData);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          headline: 'StartupXYZ',
        })
      );
    });

    it('uses explicit headline when provided', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'ceo-person',
        name: 'CEO Person',
        url: 'https://linkedin.com/in/ceo-person',
        headline: 'CEO at StartupXYZ | Forbes 30 Under 30',
        employers: [{ company: 'StartupXYZ', logo: '' }],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-101',
      });

      await service.syncContact('user-123', extensionData);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          headline: 'CEO at StartupXYZ | Forbes 30 Under 30',
        })
      );
    });

    it('syncs avatar URL when provided', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'person-with-avatar',
        name: 'Person With Avatar',
        url: 'https://linkedin.com/in/person-with-avatar',
        avatarUrl: 'https://media.licdn.com/profile-photo.jpg',
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-avatar',
      });

      await service.syncContact('user-123', extensionData);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          avatarUrl: 'https://media.licdn.com/profile-photo.jpg',
        })
      );
    });

    it('syncs employer job titles when provided', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'person-with-titles',
        name: 'Person With Titles',
        url: 'https://linkedin.com/in/person-with-titles',
        employers: [
          { company: 'CurrentCorp', logo: '', title: 'Senior Engineer' },
          { company: 'PreviousCorp', logo: '', title: 'Junior Engineer' },
        ],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-titles',
      });

      await service.syncContact('user-123', extensionData);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          employers: [
            expect.objectContaining({ company: 'CurrentCorp', title: 'Senior Engineer' }),
            expect.objectContaining({ company: 'PreviousCorp', title: 'Junior Engineer' }),
          ],
        })
      );
    });

    it('handles empty employers array', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'no-job',
        name: 'No Job Person',
        url: 'https://linkedin.com/in/no-job',
        employers: [],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-102',
      });

      const result = await service.syncContact('user-123', extensionData);

      expect(result.success).toBe(true);
      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          employers: [],
        })
      );
    });

    it('returns error on repository failure', async () => {
      const extensionData: ExtensionContactData = {
        profileId: 'fail-person',
        name: 'Fail Person',
        url: 'https://linkedin.com/in/fail-person',
      };

      mockRepository.upsertFromLinkedIn.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.syncContact('user-123', extensionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('validates required fields', async () => {
      const invalidData = {
        profileId: '',
        name: '',
        url: '',
      } as ExtensionContactData;

      const result = await service.syncContact('user-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
      expect(mockRepository.upsertFromLinkedIn).not.toHaveBeenCalled();
    });
  });

  describe('syncBatch', () => {
    it('syncs multiple contacts', async () => {
      const contacts: ExtensionContactData[] = [
        { profileId: 'person-1', name: 'Person One', url: 'https://linkedin.com/in/person-1' },
        { profileId: 'person-2', name: 'Person Two', url: 'https://linkedin.com/in/person-2' },
        { profileId: 'person-3', name: 'Person Three', url: 'https://linkedin.com/in/person-3' },
      ];

      mockRepository.upsertFromLinkedIn
        .mockResolvedValueOnce({ id: 'c1' })
        .mockResolvedValueOnce({ id: 'c2' })
        .mockResolvedValueOnce({ id: 'c3' });

      const result = await service.syncBatch('user-123', contacts);

      expect(result.total).toBe(3);
      expect(result.synced).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('reports partial failures', async () => {
      const contacts: ExtensionContactData[] = [
        { profileId: 'success-1', name: 'Success One', url: 'https://linkedin.com/in/success-1' },
        { profileId: 'fail-1', name: 'Fail One', url: 'https://linkedin.com/in/fail-1' },
        { profileId: 'success-2', name: 'Success Two', url: 'https://linkedin.com/in/success-2' },
      ];

      mockRepository.upsertFromLinkedIn
        .mockResolvedValueOnce({ id: 'c1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ id: 'c3' });

      const result = await service.syncBatch('user-123', contacts);

      expect(result.total).toBe(3);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].profileId).toBe('fail-1');
    });

    it('handles empty batch', async () => {
      const result = await service.syncBatch('user-123', []);

      expect(result.total).toBe(0);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('opportunity detection', () => {
    it('detects new employer and creates opportunity during sync', async () => {
      // Existing contact with old employer
      const existingContact = {
        id: 'contact-456',
        name: 'John Doe',
        linkedinId: 'john-doe-123',
        employers: [{ id: 'e1', contactId: 'contact-456', company: 'OldCorp', logoUrl: '', isCurrent: true, title: null, startDate: null, endDate: null, sortOrder: 0, createdAt: '2024-01-01' }],
        skills: [],
        notes: [],
        relationships: [],
        userId: 'user-123',
        headline: 'OldCorp',
        profileUrl: 'https://linkedin.com/in/john-doe-123',
        avatarUrl: null,
        lastSyncedAt: null,
        isNew: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      // Mock listContacts to return existing contact (find by linkedinId)
      const mockListContacts = vi.fn().mockResolvedValue([{ id: 'contact-456', linkedinId: 'john-doe-123', name: 'John Doe' }]);
      (mockRepository as { listContacts?: typeof mockListContacts }).listContacts = mockListContacts;

      // Mock getContact to return full existing contact
      const mockGetContact = vi.fn().mockResolvedValue(existingContact);
      (mockRepository as { getContact?: typeof mockGetContact }).getContact = mockGetContact;

      // New data with new employer
      const extensionData: ExtensionContactData = {
        profileId: 'john-doe-123',
        name: 'John Doe',
        url: 'https://linkedin.com/in/john-doe-123',
        employers: [
          { company: 'NewCorp', logo: '' },
          { company: 'OldCorp', logo: '' },
        ],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-456',
        name: 'John Doe',
        linkedinId: 'john-doe-123',
      });

      // Mock opportunity repository
      const mockOpportunityRepo = {
        detectAndCreateOpportunities: vi.fn().mockResolvedValue([
          {
            id: 'opp-123',
            contactId: 'contact-456',
            type: 'new_company',
            description: 'Started new role at NewCorp',
            detectedAt: '2024-02-01T00:00:00Z',
          },
        ]),
      };

      const serviceWithOpportunities = createContactSyncService(
        mockRepository as never,
        mockOpportunityRepo as never
      );

      const result = await serviceWithOpportunities.syncContact('user-123', extensionData);

      expect(result.success).toBe(true);
      expect(mockOpportunityRepo.detectAndCreateOpportunities).toHaveBeenCalled();
    });

    it('does not detect opportunities for new contacts', async () => {
      // Mock listContacts to return empty (no existing contact)
      const mockListContacts = vi.fn().mockResolvedValue([]);
      (mockRepository as { listContacts?: typeof mockListContacts }).listContacts = mockListContacts;

      const extensionData: ExtensionContactData = {
        profileId: 'new-person',
        name: 'New Person',
        url: 'https://linkedin.com/in/new-person',
        employers: [{ company: 'SomeCorp', logo: '' }],
      };

      mockRepository.upsertFromLinkedIn.mockResolvedValue({
        id: 'contact-new',
        name: 'New Person',
        linkedinId: 'new-person',
      });

      const mockOpportunityRepo = {
        detectAndCreateOpportunities: vi.fn(),
      };

      const serviceWithOpportunities = createContactSyncService(
        mockRepository as never,
        mockOpportunityRepo as never
      );

      await serviceWithOpportunities.syncContact('user-123', extensionData);

      // Should not detect opportunities for brand new contacts
      expect(mockOpportunityRepo.detectAndCreateOpportunities).not.toHaveBeenCalled();
    });
  });

  describe('validateExtensionData', () => {
    it('accepts valid data', () => {
      const data: ExtensionContactData = {
        profileId: 'valid-id',
        name: 'Valid Name',
        url: 'https://linkedin.com/in/valid-id',
      };

      const result = service.validateExtensionData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing profileId', () => {
      const data = {
        profileId: '',
        name: 'Name',
        url: 'https://linkedin.com/in/test',
      } as ExtensionContactData;

      const result = service.validateExtensionData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('profileId is required');
    });

    it('rejects missing name', () => {
      const data = {
        profileId: 'test-id',
        name: '',
        url: 'https://linkedin.com/in/test',
      } as ExtensionContactData;

      const result = service.validateExtensionData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('rejects invalid LinkedIn URL', () => {
      const data = {
        profileId: 'test-id',
        name: 'Test Name',
        url: 'https://twitter.com/test',
      } as ExtensionContactData;

      const result = service.validateExtensionData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('url must be a valid LinkedIn profile URL');
    });

    it('accepts URL without protocol', () => {
      const data: ExtensionContactData = {
        profileId: 'test-id',
        name: 'Test Name',
        url: 'linkedin.com/in/test-id',
      };

      const result = service.validateExtensionData(data);

      expect(result.valid).toBe(true);
    });
  });
});
