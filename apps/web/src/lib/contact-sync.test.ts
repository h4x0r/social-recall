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

    it('generates headline from first employer', async () => {
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
