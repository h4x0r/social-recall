/**
 * Tests for admin profiles API
 * Browse all shared master profiles with contribution history
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn(),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

import { isAdmin } from '@/lib/admin';

describe('GET /api/admin/profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/profiles');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects non-admin users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/admin/profiles');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Admin');
  });

  it('returns profiles for admin users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'profile-1',
                linkedin_id: 'john-doe',
                name: 'John Doe',
                headline: 'Software Engineer',
                location: 'San Francisco, CA',
                avatar_path: 'avatars/john-doe.jpg',
                update_count: 3,
                created_at: '2024-12-24T00:00:00Z',
              },
            ],
            error: null,
            count: 1,
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].name).toBe('John Doe');
  });

  it('supports pagination', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const mockRange = vi.fn().mockResolvedValue({
      data: [],
      error: null,
      count: 100,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles?page=2&limit=20');
    await GET(request);

    // Page 2 with limit 20 = offset 20, end 39
    expect(mockRange).toHaveBeenCalledWith(20, 39);
  });

  it('supports search by name', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const mockIlike = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: mockIlike,
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles?search=john');
    await GET(request);

    expect(mockIlike).toHaveBeenCalledWith('name', '%john%');
  });
});
