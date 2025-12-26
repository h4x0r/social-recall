/**
 * Tests for admin timeline API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

// Mock admin check
vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((email: string) => email === 'admin@example.com'),
}));

describe('GET /api/admin/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.ADMIN_EMAIL = 'admin@example.com';
  });

  it('returns 401 without auth header', async () => {
    const request = new NextRequest('http://localhost/api/admin/timeline');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Missing or invalid Authorization header');
  });

  it('returns 401 for invalid token', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const request = new NextRequest('http://localhost/api/admin/timeline', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'user@example.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/timeline', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns timeline entries for admin user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    const mockHistoryData = [
      {
        id: 'h1',
        field: 'employers',
        old_value: [{ company: 'OldCo' }],
        new_value: [{ company: 'NewCo' }],
        detected_at: '2025-01-01T00:00:00Z',
        contacts: { id: 'c1', name: 'John Doe', linkedin_id: 'johndoe' },
      },
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockHistoryData,
        error: null,
        count: 1,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost/api/admin/timeline', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].contactName).toBe('John Doe');
    expect(data.entries[0].field).toBe('employers');
  });
});
