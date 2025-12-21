"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { supabase, createTagRepository } from '@/lib/supabase';
import type { Tag, TagInput } from '@/lib/tag-repository';

interface UseTagsOptions {
  contactId?: string;
}

interface UseTagsReturn {
  tags: Tag[];
  contactTags: Tag[];
  isLoading: boolean;
  error: string | null;
  createTag: (input: Omit<TagInput, 'userId'>) => Promise<Tag | undefined>;
  deleteTag: (tagId: string) => Promise<void>;
  addTagToContact: (tagId: string) => Promise<void>;
  removeTagFromContact: (tagId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTags(options?: UseTagsOptions): UseTagsReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [contactTags, setContactTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => createTagRepository(supabase), []);

  const fetchTags = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setTags([]);
      setContactTags([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all user tags
      const fetchedTags = await repository.listTags(user.id);
      setTags(fetchedTags);

      // If contactId is provided, also fetch tags for that contact
      if (options?.contactId) {
        const fetchedContactTags = await repository.getContactTags(options.contactId);
        setContactTags(fetchedContactTags);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tags');
      setTags([]);
      setContactTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, repository, options?.contactId]);

  // Fetch tags on mount and when dependencies change
  useEffect(() => {
    if (!authLoading) {
      fetchTags();
    }
  }, [fetchTags, authLoading]);

  const refresh = useCallback(async () => {
    await fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(async (input: Omit<TagInput, 'userId'>): Promise<Tag | undefined> => {
    if (!user) return;

    try {
      const newTag = await repository.createTag({
        userId: user.id,
        name: input.name,
        color: input.color,
      });
      setTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tag');
    }
  }, [user, repository]);

  const deleteTag = useCallback(async (tagId: string) => {
    try {
      await repository.deleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setContactTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tag');
    }
  }, [repository]);

  const addTagToContact = useCallback(async (tagId: string) => {
    if (!options?.contactId) return;

    try {
      await repository.addTagToContact(options.contactId, tagId);
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        setContactTags((prev) => [...prev, tag]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag to contact');
    }
  }, [options?.contactId, repository, tags]);

  const removeTagFromContact = useCallback(async (tagId: string) => {
    if (!options?.contactId) return;

    try {
      await repository.removeTagFromContact(options.contactId, tagId);
      setContactTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove tag from contact');
    }
  }, [options?.contactId, repository]);

  return {
    tags,
    contactTags,
    isLoading: isLoading || authLoading,
    error,
    createTag,
    deleteTag,
    addTagToContact,
    removeTagFromContact,
    refresh,
  };
}
