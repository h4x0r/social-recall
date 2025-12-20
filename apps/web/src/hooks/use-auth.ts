"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createAuthService,
  SessionUser,
  SignInResult,
  GoogleSignInOptions,
} from '@/lib/auth';

interface UseAuthReturn {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithMagicLink: (email: string) => Promise<SignInResult>;
  signInWithGoogle: (options?: GoogleSignInOptions) => Promise<SignInResult>;
  signOut: () => Promise<SignInResult>;
  getProviderToken: () => Promise<string | null>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authService = useMemo(() => createAuthService(supabase), []);

  // Load initial session
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const session = await authService.getSession();
        if (mounted) {
          setUser(session?.user || null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    // Subscribe to auth changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authService]);

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<SignInResult> => {
      setIsLoading(true);
      try {
        return await authService.signInWithMagicLink(email);
      } finally {
        setIsLoading(false);
      }
    },
    [authService]
  );

  const signInWithGoogle = useCallback(
    async (options?: GoogleSignInOptions): Promise<SignInResult> => {
      setIsLoading(true);
      try {
        return await authService.signInWithGoogle(options);
      } finally {
        // Loading state will be updated by auth state change listener
        // after redirect completes
      }
    },
    [authService]
  );

  const signOut = useCallback(async (): Promise<SignInResult> => {
    setIsLoading(true);
    try {
      const result = await authService.signOut();
      if (result.success) {
        setUser(null);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [authService]);

  const getProviderToken = useCallback(async (): Promise<string | null> => {
    return authService.getProviderToken();
  }, [authService]);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
    getProviderToken,
  };
}
