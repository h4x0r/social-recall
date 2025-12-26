import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn(),
}));

import { isAdmin } from '@/lib/admin';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/network');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url, {
    method: 'GET',
    headers: { Cookie: 'test-cookie' },
  });
}

describe('/api/admin/network', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if not admin', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@test.com' } },
          error: null,
        }),
      },
    });
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const response = await GET(makeRequest());
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Admin access required');
  });

  it('returns empty network if no profiles', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.nodes).toEqual([]);
    expect(data.edges).toEqual([]);
  });

  it('returns profiles as nodes with company connections', async () => {
    const profiles = [
      { id: 'p1', linkedin_id: 'john', name: 'John Doe', headline: 'Engineer', avatar_path: null },
      { id: 'p2', linkedin_id: 'jane', name: 'Jane Smith', headline: 'Designer', avatar_path: null },
    ];
    const employers = [
      { master_profile_id: 'p1', company: 'Acme Inc', title: 'Engineer' },
      { master_profile_id: 'p2', company: 'Acme Inc', title: 'Designer' },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@test.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: profiles, error: null }),
              }),
            }),
          };
        }
        if (table === 'master_profile_employers') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: employers, error: null }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            select: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'master_profile_education') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const response = await GET(makeRequest({ minConnections: '0' }));
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]).toMatchObject({
      source: 'p1',
      target: 'p2',
      type: 'company',
      label: 'acme inc',
    });
  });

  it('filters nodes by minConnections', async () => {
    const profiles = [
      { id: 'p1', linkedin_id: 'john', name: 'John', headline: null, avatar_path: null },
      { id: 'p2', linkedin_id: 'jane', name: 'Jane', headline: null, avatar_path: null },
      { id: 'p3', linkedin_id: 'bob', name: 'Bob', headline: null, avatar_path: null },
    ];
    // Only p1 and p2 share a company
    const employers = [
      { master_profile_id: 'p1', company: 'Acme', title: null },
      { master_profile_id: 'p2', company: 'Acme', title: null },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@test.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: profiles, error: null }),
              }),
            }),
          };
        }
        if (table === 'master_profile_employers') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: employers, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    (isAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    // With minConnections=1, only p1 and p2 should be included
    const response = await GET(makeRequest({ minConnections: '1' }));
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.nodes).toHaveLength(2);
    expect(data.nodes.map((n: { name: string }) => n.name)).toContain('John');
    expect(data.nodes.map((n: { name: string }) => n.name)).toContain('Jane');
    expect(data.nodes.map((n: { name: string }) => n.name)).not.toContain('Bob');
  });
});
