"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { supabase, createContactRepository } from '@/lib/supabase';
import type { Contact } from '@/lib/contact-repository';

interface UseContactsOptions {
  isNew?: boolean;
  search?: string;
  limit?: number;
}

interface UseContactsReturn {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  newCount: number;
  refresh: () => Promise<void>;
  markAsSeen: (contactId: string) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
}

export function useContacts(options?: UseContactsOptions): UseContactsReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => createContactRepository(supabase), []);

  const fetchContacts = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedContacts = await repository.listContacts(user.id, {
        isNew: options?.isNew,
        search: options?.search,
        limit: options?.limit,
      });
      setContacts(fetchedContacts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, repository, options?.isNew, options?.search, options?.limit]);

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

  const totalCount = contacts.length;
  const newCount = contacts.filter((c) => c.isNew).length;

  return {
    contacts,
    isLoading: isLoading || authLoading,
    error,
    totalCount,
    newCount,
    refresh,
    markAsSeen,
    deleteContact,
  };
}
