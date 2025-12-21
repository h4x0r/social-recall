/**
 * Tag repository for Supabase persistence
 * Handles CRUD operations for tags and contact-tag associations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbTag, DbContactTag } from './database.types';

// Input types (camelCase for app use)
export interface TagInput {
  userId: string;
  name: string;
  color?: string;
}

// Output types (camelCase for app use)
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

// Default tag colors (Tailwind palette)
const DEFAULT_TAG_COLOR = '#6366f1'; // indigo-500

// Transform DB row to app type
function toTag(row: DbTag): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

export interface TagRepository {
  createTag(input: TagInput): Promise<Tag>;
  listTags(userId: string): Promise<Tag[]>;
  deleteTag(tagId: string): Promise<void>;
  addTagToContact(contactId: string, tagId: string): Promise<void>;
  removeTagFromContact(contactId: string, tagId: string): Promise<void>;
  getContactTags(contactId: string): Promise<Tag[]>;
}

export function createTagRepository(supabase: SupabaseClient): TagRepository {
  return {
    async createTag(input: TagInput): Promise<Tag> {
      const { data, error } = await (supabase as any)
        .from('tags')
        .insert({
          user_id: input.userId,
          name: input.name,
          color: input.color || DEFAULT_TAG_COLOR,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create tag: ${error.message}`);
      }

      return toTag(data);
    },

    async listTags(userId: string): Promise<Tag[]> {
      const { data, error } = await (supabase as any)
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to list tags: ${error.message}`);
      }

      return (data || []).map(toTag);
    },

    async deleteTag(tagId: string): Promise<void> {
      const { error } = await (supabase as any)
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        throw new Error(`Failed to delete tag: ${error.message}`);
      }
    },

    async addTagToContact(contactId: string, tagId: string): Promise<void> {
      const { error } = await (supabase as any)
        .from('contact_tags')
        .insert({
          contact_id: contactId,
          tag_id: tagId,
        });

      if (error) {
        throw new Error(`Failed to add tag to contact: ${error.message}`);
      }
    },

    async removeTagFromContact(contactId: string, tagId: string): Promise<void> {
      const { error } = await (supabase as any)
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);

      if (error) {
        throw new Error(`Failed to remove tag from contact: ${error.message}`);
      }
    },

    async getContactTags(contactId: string): Promise<Tag[]> {
      const { data, error } = await (supabase as any)
        .from('contact_tags')
        .select('tag_id, tags(*)')
        .eq('contact_id', contactId);

      if (error) {
        throw new Error(`Failed to get contact tags: ${error.message}`);
      }

      return (data || []).map((row: { tags: DbTag }) => toTag(row.tags));
    },
  };
}
