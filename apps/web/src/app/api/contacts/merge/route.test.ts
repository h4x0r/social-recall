/**
 * Tests for /api/contacts/merge endpoint
 * Merges a LinkedIn contact with a Google contact
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
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

import { POST } from './route';
import { createClient } from '@supabase/supabase-js';

describe('/api/contacts/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  const validMergeRequest = {
    linkedinContactId: 'li-contact-123',
    googleContact: {
      resourceName: 'people/456',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
    },
    fieldSelections: [
      { field: 'name', source: 'linkedin', linkedinValue: 'John Doe', googleValue: 'J. Doe' },
      { field: 'email', source: 'google', linkedinValue: null, googleValue: 'john@example.com' },
      { field: 'phone', source: 'google', linkedinValue: null, googleValue: '+1-555-1234' },
    ],
    matchScore: 85,
    matchSignals: { nameScore: 35, employerMatch: true },
  };

  it('returns 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      body: JSON.stringify(validMergeRequest),
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
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
      body: JSON.stringify(validMergeRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('returns 400 when linkedinContactId is missing', async () => {
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

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ ...validMergeRequest, linkedinContactId: undefined }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('linkedinContactId');
  });

  it('returns 400 when googleContact is missing', async () => {
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

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ ...validMergeRequest, googleContact: undefined }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('googleContact');
  });

  it('updates contact with merged data', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            update: updateMock,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'li-contact-123', user_id: 'user-123', linkedin_id: 'johndoe', name: 'John Doe' },
                  error: null,
                }),
              }),
            }),
            eq: vi.fn().mockResolvedValue({ data: { id: 'li-contact-123' }, error: null }),
          };
        }
        if (table === 'contact_sources') {
          return { insert: insertMock };
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

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(validMergeRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(updateMock).toHaveBeenCalled();
  });

  it('creates contact_sources records for both sources', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'li-contact-123', user_id: 'user-123', linkedin_id: 'johndoe', name: 'John Doe' },
                  error: null,
                }),
              }),
            }),
            eq: vi.fn().mockResolvedValue({ data: { id: 'li-contact-123' }, error: null }),
          };
        }
        if (table === 'contact_sources') {
          return { insert: insertMock };
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

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(validMergeRequest),
    });

    await POST(request);

    // Should insert two source records (LinkedIn and Google)
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('returns 403 when contact belongs to different user', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'li-contact-123', user_id: 'different-user' },
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(validMergeRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 404 when contact not found', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/merge', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(validMergeRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Contact not found');
  });
});
