"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { supabase, createContactRepository } from '@/lib/supabase';
import type { Contact, ContactWithEmployersAndSkills } from '@/lib/contact-repository';

interface UseContactsOptions {
  isNew?: boolean;
  search?: string;
  skill?: string;
  note?: string;
  tag?: string;
  limit?: number;
  withRelations?: boolean;
}

// Return type depends on withRelations option
type ContactType<T extends UseContactsOptions | undefined> = T extends { withRelations: true }
  ? ContactWithEmployersAndSkills
  : Contact;

interface UseContactsReturn<T extends UseContactsOptions | undefined> {
  contacts: ContactType<T>[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  newCount: number;
  refresh: () => Promise<void>;
  markAsSeen: (contactId: string) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
}

export function useContacts<T extends UseContactsOptions | undefined = undefined>(options?: T): UseContactsReturn<T> {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<(Contact | ContactWithEmployersAndSkills)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  const repository = useMemo(() => createContactRepository(supabase), []);

  const fetchContacts = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setContacts([]);
      setTotalCount(0);
      setNewCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Choose fetch method based on withRelations option
      const fetchPromise = options?.withRelations
        ? repository.listContactsWithRelations(user.id, {
            limit: options?.limit,
            search: options?.search,
            skill: options?.skill,
            note: options?.note,
            tag: options?.tag,
          })
        : repository.listContacts(user.id, {
            isNew: options?.isNew,
            search: options?.search,
            skill: options?.skill,
            note: options?.note,
            tag: options?.tag,
            limit: options?.limit,
          });

      // Fetch contacts and counts in parallel
      const [fetchedContacts, counts] = await Promise.all([
        fetchPromise,
        repository.countContacts(user.id),
      ]);
      setContacts(fetchedContacts);
      setTotalCount(counts.total);
      setNewCount(counts.new);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, repository, options?.isNew, options?.search, options?.skill, options?.note, options?.tag, options?.limit, options?.withRelations]);

  // Fetch contacts on mount and when dependencies change
  useEffect(() => {
    if (!authLoading) {
      fetchContacts();
    }
  }, [fetchContacts, authLoading]);

  const refresh = useCallback(async () => {
    await fetchContacts();
  }, [fetchContacts]);

  const markAsSeen = useCallback(async (contactId: string) => {
    try {
      await repository.markContactAsSeen(contactId);
      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, isNew: false } : c
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark as seen');
    }
  }, [repository]);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      await repository.deleteContact(contactId);
      // Remove from local state
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete contact');
    }
  }, [repository]);

  return {
    contacts: contacts as ContactType<T>[],
    isLoading: isLoading || authLoading,
    error,
    totalCount,
    newCount,
    refresh,
    markAsSeen,
    deleteContact,
  };
}
