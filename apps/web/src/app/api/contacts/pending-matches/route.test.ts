/**
 * Tests for /api/contacts/pending-matches endpoint
 * GET: Fetch pending matches for review
 * PUT: Update match status (confirm, reject, skip)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}));

import { GET, PUT } from './route';
import { createClient } from '@supabase/supabase-js';

describe('/api/contacts/pending-matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  describe('GET', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid Authorization header');
    });

    it('returns 401 when token is invalid', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
        from: vi.fn(),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('returns pending matches for authenticated user', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          user_id: 'user-123',
          linkedin_contact_id: 'li-contact-1',
          google_resource_name: 'people/123',
          google_contact_data: { name: 'John Doe', email: 'john@example.com' },
          score: 85,
          signals: { nameScore: 35, employerMatch: true },
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'match-2',
          user_id: 'user-123',
          linkedin_contact_id: 'li-contact-2',
          google_resource_name: 'people/456',
          google_contact_data: { name: 'Jane Smith' },
          score: 72,
          signals: { nameScore: 32 },
          status: 'pending',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockMatches,
                  error: null,
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matches).toHaveLength(2);
      expect(data.matches[0].id).toBe('match-1');
      expect(data.matches[1].id).toBe('match-2');
    });

    it('filters by status when provided', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          status: 'confirmed',
          score: 85,
        },
      ];

      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockMatches,
          error: null,
        }),
      });

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock,
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches?status=confirmed', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(eqMock).toHaveBeenCalledWith('status', 'confirmed');
    });

    it('returns empty array when no matches found', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matches).toEqual([]);
    });
  });

  describe('PUT', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        body: JSON.stringify({ matchId: 'match-1', status: 'rejected' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid Authorization header');
    });

    it('returns 400 when matchId is missing', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('matchId');
    });

    it('returns 400 when status is invalid', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ matchId: 'match-1', status: 'invalid-status' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('status');
    });

    it('updates match status to rejected', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'match-1', status: 'rejected' },
            error: null,
          }),
        }),
      });

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          update: updateMock,
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ matchId: 'match-1', status: 'rejected' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected',
        reviewed_at: expect.any(String),
      }));
    });

    it('updates match status to skipped', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'match-1', status: 'skipped' },
            error: null,
          }),
        }),
      });

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          update: updateMock,
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ matchId: 'match-1', status: 'skipped' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 404 when match not found', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/pending-matches', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ matchId: 'non-existent', status: 'rejected' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Match not found');
    });
  });
});
