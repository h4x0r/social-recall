/**
 * Tests for /api/export endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === 'sb-access-token') {
        return { value: 'mock-token' };
      }
      return undefined;
    },
  }),
}));

describe('/api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful auth
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Setup chain for contacts query
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new NextRequest('http://localhost/api/export');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns contacts with all relations for authenticated user', async () => {
    const mockContacts = [
      {
        id: 'contact-1',
        user_id: 'user-123',
        name: 'John Doe',
        headline: 'Software Engineer',
        linkedin_id: 'johndoe',
        profile_url: 'https://linkedin.com/in/johndoe',
        avatar_url: 'https://example.com/avatar.jpg',
        is_new: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        last_synced_at: '2024-01-02T00:00:00Z',
        employers: [
          {
            id: 'emp-1',
            company: 'Acme Corp',
            title: 'Senior Engineer',
            is_current: true,
          },
        ],
        skills: [
          {
            id: 'skill-1',
            name: 'TypeScript',
            status: 'confirmed',
          },
        ],
        notes: [
          {
            id: 'note-1',
            content: 'Met at conference',
          },
        ],
        tags: [
          {
            tags: {
              id: 'tag-1',
              name: 'VIP',
              color: '#ff0000',
            },
          },
        ],
      },
    ];

    mockOrder.mockResolvedValue({
      data: mockContacts,
      error: null,
    });

    const request = new NextRequest('http://localhost/api/export');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0].name).toBe('John Doe');
    expect(body.contacts[0].employers).toHaveLength(1);
    expect(body.contacts[0].skills).toHaveLength(1);
    expect(body.contacts[0].notes).toHaveLength(1);
    expect(body.contacts[0].tags).toHaveLength(1);
    expect(body.exportedAt).toBeDefined();
    expect(body.version).toBe('1.0');
  });

  it('returns empty array when user has no contacts', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    const request = new NextRequest('http://localhost/api/export');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const request = new NextRequest('http://localhost/api/export');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to export data');
  });
});
