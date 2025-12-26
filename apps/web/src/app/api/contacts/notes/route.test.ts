/**
 * Tests for /api/contacts/notes endpoint
 * GET: Fetch notes for a contact
 * POST: Create a new note
 * PUT: Update an existing note
 * DELETE: Delete a note
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
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  })),
}));

import { GET, POST, PUT, DELETE } from './route';
import { createClient } from '@supabase/supabase-js';

describe('/api/contacts/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  describe('GET', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/notes?contactId=contact-123', {
        method: 'GET',
      });

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

      const request = new NextRequest('http://localhost/api/contacts/notes?contactId=contact-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('returns 400 when contactId is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('contactId');
    });

    it('returns notes for a contact', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          contact_id: 'contact-123',
          content: 'Met at conference',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'note-2',
          contact_id: 'contact-123',
          content: 'Follow up about project',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockNotes,
                error: null,
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes?contactId=contact-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notes).toHaveLength(2);
      expect(data.notes[0].id).toBe('note-1');
      expect(data.notes[1].id).toBe('note-2');
    });

    it('returns empty array when no notes found', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes?contactId=contact-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notes).toEqual([]);
    });
  });

  describe('POST', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'POST',
        body: JSON.stringify({ contactId: 'contact-123', content: 'Test note' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid Authorization header');
    });

    it('returns 400 when contactId is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ content: 'Test note' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('contactId');
    });

    it('returns 400 when content is empty', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ contactId: 'contact-123', content: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
    });

    it('creates a new note', async () => {
      const createdNote = {
        id: 'note-1',
        contact_id: 'contact-123',
        content: 'Met at conference',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdNote,
            error: null,
          }),
        }),
      });

      // Mock that handles both quota queries and insert
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'contacts') {
            // Return user's contacts for quota check
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'contact-123' }],
                  error: null,
                }),
              }),
            };
          }
          // contact_notes table
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
              in: vi.fn().mockResolvedValue({ count: 10, error: null }),
            }),
            insert: insertMock,
          };
        }),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ contactId: 'contact-123', content: 'Met at conference' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.note).toBeDefined();
      expect(data.note.id).toBe('note-1');
      expect(data.note.content).toBe('Met at conference');
    });

    it('trims whitespace from content', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'note-1', content: 'Trimmed note' },
            error: null,
          }),
        }),
      });

      // Mock that handles both quota queries and insert
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'contacts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'contact-123' }],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
              in: vi.fn().mockResolvedValue({ count: 10, error: null }),
            }),
            insert: insertMock,
          };
        }),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ contactId: 'contact-123', content: '  Trimmed note  ' }),
      });

      await POST(request);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Trimmed note' })
      );
    });
  });

  describe('PUT', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'PUT',
        body: JSON.stringify({ noteId: 'note-1', content: 'Updated note' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid Authorization header');
    });

    it('returns 400 when noteId is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ content: 'Updated note' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('noteId');
    });

    it('returns 400 when content is empty', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ noteId: 'note-1', content: '   ' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
    });

    it('updates an existing note', async () => {
      const updatedNote = {
        id: 'note-1',
        contact_id: 'contact-123',
        content: 'Updated content',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedNote,
              error: null,
            }),
          }),
        }),
      });

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          update: updateMock,
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ noteId: 'note-1', content: 'Updated content' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toBeDefined();
      expect(data.note.content).toBe('Updated content');
    });

    it('returns 404 when note not found', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ noteId: 'non-existent', content: 'Updated note' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Note not found');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when no authorization header', async () => {
      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'DELETE',
        body: JSON.stringify({ noteId: 'note-1' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid Authorization header');
    });

    it('returns 400 when noteId is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('noteId');
    });

    it('deletes a note', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          delete: deleteMock,
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ noteId: 'note-1' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
    });

    it('returns 404 when note not found', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        })),
      };
      vi.mocked(createClient).mockReturnValue(mockClient as any);

      const request = new NextRequest('http://localhost/api/contacts/notes', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ noteId: 'non-existent' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Note not found');
    });
  });
});
