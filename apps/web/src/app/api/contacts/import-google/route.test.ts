/**
 * Tests for /api/contacts/import-google endpoint
 * Fetches Google contacts, runs matching, stores pending matches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock Google contacts service
vi.mock('@/lib/google-contacts', () => ({
  createGoogleContactsService: vi.fn(() => ({
    fetchContacts: vi.fn().mockResolvedValue({
      contacts: [],
      totalCount: 0,
    }),
  })),
}));

// Mock contact matcher
vi.mock('@/lib/contact-matcher', () => ({
  calculateMatchScore: vi.fn(() => ({ score: 0, signals: {} })),
}));

import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { createGoogleContactsService } from '@/lib/google-contacts';

describe('/api/contacts/import-google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  it('returns 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
    });

    const response = await POST(request);
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
        getSession: vi.fn(),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('returns 401 when no Google provider token', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: null } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Google');
  });

  it('fetches Google contacts using provider token', async () => {
    const mockFetchContacts = vi.fn().mockResolvedValue({
      contacts: [],
      totalCount: 0,
    });
    vi.mocked(createGoogleContactsService).mockReturnValue({
      fetchContacts: mockFetchContacts,
      syncContacts: vi.fn(),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: 'google-token-123' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    await POST(request);

    expect(mockFetchContacts).toHaveBeenCalledWith('google-token-123', expect.any(Object));
  });

  it('returns import results with match counts', async () => {
    const mockGoogleContacts = [
      { googleId: 'people/123', name: 'John Doe', email: 'john@example.com' },
      { googleId: 'people/456', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    const mockLinkedInContacts = [
      { id: 'li-1', linkedin_id: 'johndoe', name: 'John Doe', headline: 'Engineer' },
    ];

    vi.mocked(createGoogleContactsService).mockReturnValue({
      fetchContacts: vi.fn().mockResolvedValue({
        contacts: mockGoogleContacts,
        totalCount: 2,
      }),
      syncContacts: vi.fn(),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: 'google-token-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockLinkedInContacts, error: null }),
            }),
          };
        }
        if (table === 'pending_matches') {
          return {
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.googleContactsCount).toBe(2);
    expect(data.linkedInContactsCount).toBe(1);
    expect(typeof data.pendingMatchesCount).toBe('number');
  });

  it('stores high-confidence matches in pending_matches table', async () => {
    const mockGoogleContacts = [
      { googleId: 'people/123', name: 'John Doe', email: 'john@example.com' },
    ];

    const mockLinkedInContacts = [
      { id: 'li-1', linkedin_id: 'johndoe', name: 'John Doe', headline: 'Engineer' },
    ];

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(createGoogleContactsService).mockReturnValue({
      fetchContacts: vi.fn().mockResolvedValue({
        contacts: mockGoogleContacts,
        totalCount: 1,
      }),
      syncContacts: vi.fn(),
    });

    // Mock the calculateMatchScore to return a high score
    const { calculateMatchScore } = await import('@/lib/contact-matcher');
    vi.mocked(calculateMatchScore).mockReturnValue({
      score: 85,
      signals: { nameScore: 35, employerMatch: true },
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: 'google-token-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockLinkedInContacts, error: null }),
            }),
          };
        }
        if (table === 'pending_matches') {
          return {
            upsert: upsertMock,
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    await POST(request);

    expect(upsertMock).toHaveBeenCalled();
  });

  it('skips contacts already merged (with google_id)', async () => {
    const mockGoogleContacts = [
      { googleId: 'people/123', name: 'John Doe', email: 'john@example.com' },
    ];

    // Contact already has google_id - already merged
    const mockLinkedInContacts = [
      { id: 'li-1', linkedin_id: 'johndoe', name: 'John Doe', google_id: 'people/123' },
    ];

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(createGoogleContactsService).mockReturnValue({
      fetchContacts: vi.fn().mockResolvedValue({
        contacts: mockGoogleContacts,
        totalCount: 1,
      }),
      syncContacts: vi.fn(),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: 'google-token-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockLinkedInContacts, error: null }),
            }),
          };
        }
        if (table === 'pending_matches') {
          return {
            upsert: upsertMock,
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alreadyMergedCount).toBe(1);
  });

  it('returns 500 when Google API fails', async () => {
    vi.mocked(createGoogleContactsService).mockReturnValue({
      fetchContacts: vi.fn().mockRejectedValue(new Error('Google API error')),
      syncContacts: vi.fn(),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { provider_token: 'google-token-123' } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/import-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Google');
  });
});
