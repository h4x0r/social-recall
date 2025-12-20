"use client";

import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { supabase, createContactRepository } from '@/lib/supabase';
import { createGoogleContactsService, SyncResult } from '@/lib/google-contacts';

interface UseGoogleSyncReturn {
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;
  sync: () => Promise<SyncResult | null>;
}

export function useGoogleSync(): UseGoogleSyncReturn {
  const { user, getProviderToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setIsSyncing(true);
    setError(null);

    try {
      // Get Google OAuth token
      const token = await getProviderToken();

      if (!token) {
        setError('No Google access token available. Please sign in with Google.');
        return null;
      }

      // Fetch contacts from Google
      const googleService = createGoogleContactsService();
      const { contacts } = await googleService.fetchContacts(token, {
        rateLimit: 100, // 100ms between requests to avoid rate limiting
      });

      // Sync to repository
      const repository = createContactRepository(supabase);
      const result = await googleService.syncContacts(user.id, contacts, repository);

      setLastSyncResult(result);
      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Sync failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, getProviderToken]);

  return {
    isSyncing,
    lastSyncResult,
    error,
    sync,
  };
}
