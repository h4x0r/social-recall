/**
 * Tests for /api/contacts/search endpoint
 * GET: Search contacts by query string
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
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  })),
}));

import { GET } from './route';
import { createClient } from '@supabase/supabase-js';

describe('/api/contacts/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  it('returns 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost/api/contacts/search?q=test', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Missing or invalid Authorization header');
  });

  it('returns 400 when query is missing', async () => {
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

    const request = new NextRequest('http://localhost/api/contacts/search', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required parameter: q');
  });

  it('returns 400 when query is too short', async () => {
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

    const request = new NextRequest('http://localhost/api/contacts/search?q=a', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query must be at least 2 characters');
  });

  it('searches contacts by name', async () => {
    const mockContacts = [
      { id: 'contact-1', name: 'Sarah Chen', headline: 'Engineer' },
      { id: 'contact-2', name: 'Sarah Smith', headline: 'Designer' },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      })),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/search?q=Sarah', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contacts).toEqual(mockContacts);
    expect(data.contacts.length).toBe(2);
  });

  it('limits results to 20 by default', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitMock,
    };

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockChain),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/contacts/search?q=test', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });

    await GET(request);

    // Verify limit was called with 20
    expect(limitMock).toHaveBeenCalledWith(20);
  });
});
