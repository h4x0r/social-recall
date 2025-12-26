/**
 * Tests for sync API route
 * Tests the integration with master profiles and contribution tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/contact-repository', () => ({
  createContactRepository: vi.fn(() => mockRepository),
}));

vi.mock('@/lib/contact-sync', () => ({
  createContactSyncService: vi.fn(() => mockSyncService),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(() => null),
}));

vi.mock('@/lib/cors', () => ({
  getCorsHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })),
}));

vi.mock('@/lib/api-validation', () => ({
  syncBatchSchema: {},
  validateInput: vi.fn((schema: unknown, data: unknown) => {
    const d = data as { contacts?: Array<{ profileId?: string; name?: string; url?: string }>; contact?: unknown };
    // Check for valid contacts
    if (d.contacts && d.contacts.length > 0) {
      const hasValidContact = d.contacts.some(c => c.profileId && c.name && c.url);
      if (!hasValidContact) {
        return { success: false, error: 'Validation failed: name is required' };
      }
      return { success: true, data: d };
    }
    if (d.contact) {
      return { success: true, data: d };
    }
    return { success: false, error: 'Validation failed' };
  }),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

const mockRepository = {
  upsertFromLinkedIn: vi.fn(),
};

const mockSyncService = {
  syncBatch: vi.fn(),
  syncContact: vi.fn(),
  validateExtensionData: vi.fn(),
};

describe('POST /api/contacts/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles CORS preflight', async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(200);
  });

  it('rejects requests without auth header', async () => {
    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Authorization');
  });

  it('rejects invalid tokens', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({ contacts: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid');
  });

  it('syncs valid contacts successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSyncService.syncBatch.mockResolvedValue({
      total: 1,
      synced: 1,
      failed: 0,
      errors: [],
    });

    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        contacts: [
          {
            profileId: 'john-doe',
            name: 'John Doe',
            url: 'https://linkedin.com/in/john-doe',
            headline: 'Software Engineer',
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.synced).toBe(1);
  });

  it('handles single contact format', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSyncService.syncBatch.mockResolvedValue({
      total: 1,
      synced: 1,
      failed: 0,
      errors: [],
    });

    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        contact: {
          profileId: 'jane-doe',
          name: 'Jane Doe',
          url: 'https://linkedin.com/in/jane-doe',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns validation errors for invalid data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        contacts: [
          {
            // Missing required fields
            name: '',
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('reports sync errors in response', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSyncService.syncBatch.mockResolvedValue({
      total: 2,
      synced: 1,
      failed: 1,
      errors: [{ profileId: 'bad-contact', error: 'Failed to sync' }],
    });

    const request = new NextRequest('http://localhost/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        contacts: [
          { profileId: 'good', name: 'Good', url: 'https://linkedin.com/in/good' },
          { profileId: 'bad-contact', name: 'Bad', url: 'https://linkedin.com/in/bad' },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.failed).toBe(1);
    expect(data.result.errors).toHaveLength(1);
  });
});
