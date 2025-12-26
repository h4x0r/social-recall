/**
 * Tests for admin reset API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
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

describe('POST /api/admin/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.ADMIN_EMAIL = 'admin@example.com';
  });

  it('returns 401 without auth header', async () => {
    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      body: JSON.stringify({ action: 'clear_history' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'user@example.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ action: 'clear_history' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns 400 for missing action', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('action');
  });

  it('returns 400 for missing confirmation', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ action: 'clear_history' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('DELETE');
  });

  it('clears history when confirmed', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    const mockDelete = vi.fn().mockResolvedValue({ error: null, count: 10 });
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        neq: vi.fn().mockResolvedValue({ error: null, count: 10 }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ action: 'clear_history', confirm: 'DELETE' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('clears contacts when confirmed', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'admin@example.com' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        neq: vi.fn().mockResolvedValue({ error: null, count: 5 }),
      }),
    });

    const request = new NextRequest('http://localhost/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ action: 'clear_contacts', confirm: 'DELETE' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
