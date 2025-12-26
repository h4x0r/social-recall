/**
 * Tests for admin stats API
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

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.ADMIN_EMAIL = 'admin@example.com';
  });

  it('returns 401 without auth header', async () => {
    const request = new NextRequest('http://localhost/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'user@example.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/stats', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('returns stats for admin user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    // Mock count queries
    mockSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        then: (resolve: (result: { count: number }) => void) => {
          const counts: Record<string, number> = {
            contacts: 142,
            contact_history: 87,
            // auth.users would be separate but we'll mock it
          };
          resolve({ count: counts[table] || 0 });
        },
      }),
    }));

    const request = new NextRequest('http://localhost/api/admin/stats', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contacts).toBeDefined();
    expect(data.history).toBeDefined();
  });
});
