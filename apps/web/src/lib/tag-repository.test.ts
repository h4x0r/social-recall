import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTagRepository, Tag, TagInput } from './tag-repository';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

describe('TagRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTag', () => {
    it('should create a tag with name and default color', async () => {
      const repository = createTagRepository(mockSupabase as any);
      const input: TagInput = {
        userId: 'user-1',
        name: 'Important',
      };

      const mockTag = {
        id: 'tag-1',
        user_id: 'user-1',
        name: 'Important',
        color: '#6366f1',
        created_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTag, error: null }),
          }),
        }),
      });

      const result = await repository.createTag(input);

      expect(result).toEqual({
        id: 'tag-1',
        userId: 'user-1',
        name: 'Important',
        color: '#6366f1',
        createdAt: '2024-01-15T10:00:00Z',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('tags');
    });

    it('should create a tag with custom color', async () => {
      const repository = createTagRepository(mockSupabase as any);
      const input: TagInput = {
        userId: 'user-1',
        name: 'VIP',
        color: '#ef4444',
      };

      const mockTag = {
        id: 'tag-2',
        user_id: 'user-1',
        name: 'VIP',
        color: '#ef4444',
        created_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTag, error: null }),
          }),
        }),
      });

      const result = await repository.createTag(input);

      expect(result.color).toBe('#ef4444');
    });
  });

  describe('listTags', () => {
    it('should list all tags for a user', async () => {
      const repository = createTagRepository(mockSupabase as any);

      const mockTags = [
        { id: 'tag-1', user_id: 'user-1', name: 'Important', color: '#6366f1', created_at: '2024-01-15T10:00:00Z' },
        { id: 'tag-2', user_id: 'user-1', name: 'VIP', color: '#ef4444', created_at: '2024-01-15T11:00:00Z' },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
          }),
        }),
      });

      const result = await repository.listTags('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Important');
      expect(result[1].name).toBe('VIP');
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const repository = createTagRepository(mockSupabase as any);

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await repository.deleteTag('tag-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('tags');
    });
  });

  describe('addTagToContact', () => {
    it('should add a tag to a contact', async () => {
      const repository = createTagRepository(mockSupabase as any);

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await repository.addTagToContact('contact-1', 'tag-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('contact_tags');
    });
  });

  describe('removeTagFromContact', () => {
    it('should remove a tag from a contact', async () => {
      const repository = createTagRepository(mockSupabase as any);

      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq1,
        }),
      });

      await repository.removeTagFromContact('contact-1', 'tag-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('contact_tags');
    });
  });

  describe('getContactTags', () => {
    it('should get all tags for a contact', async () => {
      const repository = createTagRepository(mockSupabase as any);

      const mockContactTags = [
        { tag_id: 'tag-1', tags: { id: 'tag-1', name: 'Important', color: '#6366f1', user_id: 'user-1', created_at: '2024-01-15T10:00:00Z' } },
        { tag_id: 'tag-2', tags: { id: 'tag-2', name: 'VIP', color: '#ef4444', user_id: 'user-1', created_at: '2024-01-15T11:00:00Z' } },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockContactTags, error: null }),
        }),
      });

      const result = await repository.getContactTags('contact-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Important');
      expect(result[1].name).toBe('VIP');
    });
  });
});
