/**
 * Tests for Google Contacts sync service
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GoogleContactsService,
  createGoogleContactsService,
  GoogleContact,
  SyncResult,
} from './google-contacts';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('google-contacts', () => {
  let service: GoogleContactsService;
  const mockToken = 'google-oauth-token-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = createGoogleContactsService();
  });

  describe('fetchContacts', () => {
    it('fetches contacts from Google People API', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'John Doe' }],
            emailAddresses: [{ value: 'john@example.com' }],
            organizations: [
              { name: 'Acme Corp', title: 'CEO' },
            ],
            photos: [{ url: 'https://photo.url/john.jpg' }],
          },
        ],
        totalPeople: 1,
        nextPageToken: undefined,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('people.googleapis.com/v1/people/me/connections'),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('John Doe');
      expect(result.contacts[0].email).toBe('john@example.com');
    });

    it('handles pagination', async () => {
      const page1 = {
        connections: [
          {
            resourceName: 'people/c1',
            names: [{ displayName: 'Contact 1' }],
          },
        ],
        totalPeople: 2,
        nextPageToken: 'token-page-2',
      };

      const page2 = {
        connections: [
          {
            resourceName: 'people/c2',
            names: [{ displayName: 'Contact 2' }],
          },
        ],
        totalPeople: 2,
        nextPageToken: undefined,
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => page1 })
        .mockResolvedValueOnce({ ok: true, json: async () => page2 });

      const result = await service.fetchContacts(mockToken);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.contacts).toHaveLength(2);
    });

    it('handles empty contacts list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [], totalPeople: 0 }),
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts).toHaveLength(0);
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(service.fetchContacts(mockToken)).rejects.toThrow(
        'Google API error: 401 Unauthorized'
      );
    });

    it('extracts multiple organizations as employer history', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'Jane Smith' }],
            organizations: [
              { name: 'Current Corp', title: 'CTO', current: true },
              { name: 'Previous Inc', title: 'VP Engineering' },
              { name: 'First Job LLC', title: 'Developer' },
            ],
          },
        ],
        totalPeople: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts[0].employers).toHaveLength(3);
      expect(result.contacts[0].employers[0].company).toBe('Current Corp');
      expect(result.contacts[0].employers[0].isCurrent).toBe(true);
      expect(result.contacts[0].employers[1].company).toBe('Previous Inc');
    });

    it('extracts LinkedIn profile URL if present', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'John Doe' }],
            urls: [
              { value: 'https://linkedin.com/in/johndoe', type: 'profile' },
              { value: 'https://twitter.com/johndoe', type: 'other' },
            ],
          },
        ],
        totalPeople: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts[0].linkedinUrl).toBe(
        'https://linkedin.com/in/johndoe'
      );
    });

    it('extracts LinkedIn ID from profile URL', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'John Doe' }],
            urls: [
              { value: 'https://www.linkedin.com/in/john-doe-123', type: 'profile' },
            ],
          },
        ],
        totalPeople: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts[0].linkedinId).toBe('john-doe-123');
    });
  });

  describe('transformContact', () => {
    it('creates headline from current organization', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'Jane Smith' }],
            organizations: [
              { name: 'Acme Corp', title: 'CEO', current: true },
            ],
          },
        ],
        totalPeople: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts[0].headline).toBe('CEO @ Acme Corp');
    });

    it('uses first organization if no current flag', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            names: [{ displayName: 'Jane Smith' }],
            organizations: [
              { name: 'Acme Corp', title: 'CEO' },
            ],
          },
        ],
        totalPeople: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts[0].headline).toBe('CEO @ Acme Corp');
    });

    it('skips contacts without names', async () => {
      const mockResponse = {
        connections: [
          {
            resourceName: 'people/c123',
            emailAddresses: [{ value: 'noname@example.com' }],
          },
          {
            resourceName: 'people/c456',
            names: [{ displayName: 'Has Name' }],
          },
        ],
        totalPeople: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchContacts(mockToken);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Has Name');
    });
  });

  describe('syncContacts', () => {
    it('syncs contacts to the repository', async () => {
      const mockContacts: GoogleContact[] = [
        {
          googleId: 'people/c123',
          name: 'John Doe',
          email: 'john@example.com',
          headline: 'CEO @ Acme Corp',
          avatarUrl: 'https://photo.url/john.jpg',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          linkedinId: 'johndoe',
          employers: [{ company: 'Acme Corp', title: 'CEO', isCurrent: true }],
        },
      ];

      const mockRepository = {
        upsertFromLinkedIn: vi.fn().mockResolvedValue({ id: 'contact-456' }),
      };

      const result = await service.syncContacts(
        'user-123',
        mockContacts,
        mockRepository as never
      );

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'John Doe',
          linkedinId: 'johndoe',
        })
      );
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('reports sync failures', async () => {
      const mockContacts: GoogleContact[] = [
        {
          googleId: 'people/c123',
          name: 'John Doe',
          email: 'john@example.com',
          linkedinId: 'johndoe',
        },
        {
          googleId: 'people/c456',
          name: 'Jane Smith',
          email: 'jane@example.com',
          linkedinId: 'janesmith',
        },
      ];

      const mockRepository = {
        upsertFromLinkedIn: vi
          .fn()
          .mockResolvedValueOnce({ id: 'contact-1' })
          .mockRejectedValueOnce(new Error('Database error')),
      };

      const result = await service.syncContacts(
        'user-123',
        mockContacts,
        mockRepository as never
      );

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].contactName).toBe('Jane Smith');
    });

    it('uses googleId as linkedinId fallback', async () => {
      const mockContacts: GoogleContact[] = [
        {
          googleId: 'people/c123',
          name: 'No LinkedIn User',
          email: 'user@example.com',
        },
      ];

      const mockRepository = {
        upsertFromLinkedIn: vi.fn().mockResolvedValue({ id: 'contact-1' }),
      };

      await service.syncContacts('user-123', mockContacts, mockRepository as never);

      expect(mockRepository.upsertFromLinkedIn).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          linkedinId: 'people/c123',
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('respects rate limits with delays', async () => {
      const startTime = Date.now();

      // Mock two pages to test rate limiting
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            connections: [{ resourceName: 'c1', names: [{ displayName: 'A' }] }],
            nextPageToken: 'next',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            connections: [{ resourceName: 'c2', names: [{ displayName: 'B' }] }],
          }),
        });

      await service.fetchContacts(mockToken, { rateLimit: 100 });

      const elapsed = Date.now() - startTime;

      // Should have waited at least 100ms between requests
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});
