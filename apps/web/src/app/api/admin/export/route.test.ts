/**
 * Tests for /api/admin/export endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock admin module
vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn(),
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  })),
}));

import { GET } from './route';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@supabase/supabase-js';

describe('/api/admin/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  it('returns 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost/api/admin/export');

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

    const request = new NextRequest('http://localhost/api/admin/export', {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('returns 403 when user is not admin', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    vi.mocked(isAdmin).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/admin/export', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns JSON export with contacts and history', async () => {
    const mockContacts = [
      { id: '1', name: 'John Doe', linkedin_id: 'johndoe' },
      { id: '2', name: 'Jane Smith', linkedin_id: 'janesmith' },
    ];
    const mockHistory = [
      { id: 'h1', contact_id: '1', field: 'headline', old_value: 'Dev', new_value: 'Senior Dev' },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: 'admin@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => ({
        select: vi.fn().mockResolvedValue({
          data: table === 'contacts' ? mockContacts : mockHistory,
          error: null,
        }),
      })),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    vi.mocked(isAdmin).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/admin/export', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contacts).toEqual(mockContacts);
    expect(data.history).toEqual(mockHistory);
    expect(data.exportedAt).toBeDefined();
  });

  it('returns 500 when database query fails', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: 'admin@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    vi.mocked(isAdmin).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/admin/export', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
