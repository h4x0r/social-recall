/**
 * Tests for admin profile detail API
 * Get single profile with contribution history
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from './route';
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

describe('GET /api/admin/profiles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/profiles/profile-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'profile-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('returns profile with contributions for admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'master_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'profile-1',
                  linkedin_id: 'john-doe',
                  name: 'John Doe',
                  headline: 'Software Engineer',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'master_profile_contributions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'c1',
                    field: 'headline',
                    value: '"Software Engineer"',
                    status: 'accepted',
                    contributed_by: 'user-1',
                    created_at: '2024-12-24T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'master_profile_employers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const request = new NextRequest('http://localhost/api/admin/profiles/profile-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'profile-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.name).toBe('John Doe');
    expect(data.contributions).toHaveLength(1);
  });

  it('returns 404 for non-existent profile', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles/non-existent');
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('PATCH /api/admin/profiles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it('resolves a pending contribution', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'c1',
                status: 'accepted',
                resolved_by: 'admin-1',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles/profile-1', {
      method: 'PATCH',
      body: JSON.stringify({
        contributionId: 'c1',
        action: 'accept',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'profile-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.contribution.status).toBe('accepted');
  });

  it('rejects a contribution', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'c1',
                status: 'rejected',
                resolved_by: 'admin-1',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/profiles/profile-1', {
      method: 'PATCH',
      body: JSON.stringify({
        contributionId: 'c1',
        action: 'reject',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'profile-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contribution.status).toBe('rejected');
  });
});
