/**
 * Authentication service for Supabase Auth
 * Supports magic link and Google OAuth
 */

import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

// Result types
export interface SignInResult {
  success: boolean;
  error?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserSession {
  user: SessionUser;
  accessToken: string;
  expiresAt: number;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';

export interface GoogleSignInOptions {
  includeContacts?: boolean;
}

export interface AuthService {
  signInWithMagicLink(email: string): Promise<SignInResult>;
  signInWithGoogle(options?: GoogleSignInOptions): Promise<SignInResult>;
  signOut(): Promise<SignInResult>;
  getSession(): Promise<UserSession | null>;
  getCurrentUser(): Promise<SessionUser | null>;
  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  getProviderToken(): Promise<string | null>;
  onAuthStateChange(callback: (event: AuthEvent, session: UserSession | null) => void): () => void;
}

// Get the base URL for auth redirects
function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  // Fallback for server-side
  return process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : 'http://localhost:3000/auth/callback';
}

// Transform Supabase user to our SessionUser type
function transformUser(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; avatar_url?: string };
  created_at?: string;
}): SessionUser {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || null,
    avatarUrl: user.user_metadata?.avatar_url || null,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

// Transform Supabase session to our UserSession type
function transformSession(session: Session): UserSession {
  return {
    user: transformUser(session.user),
    accessToken: session.access_token,
    expiresAt: session.expires_at || 0,
  };
}

export function createAuthService(supabase: SupabaseClient): AuthService {
  const redirectTo = getAuthRedirectUrl();

  return {
    async signInWithMagicLink(email: string): Promise<SignInResult> {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },

    async signInWithGoogle(options?: GoogleSignInOptions): Promise<SignInResult> {
      try {
        // Build scopes - always include email and profile
        let scopes = 'email profile';

        // Add contacts scope if requested (for Google Contacts sync)
        if (options?.includeContacts) {
          scopes += ' https://www.googleapis.com/auth/contacts.readonly';
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            scopes,
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },

    async signOut(): Promise<SignInResult> {
      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },

    async getSession(): Promise<UserSession | null> {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          return null;
        }

        return transformSession(session);
      } catch {
        return null;
      }
    },

    async getCurrentUser(): Promise<SessionUser | null> {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          return null;
        }

        return transformUser(user);
      } catch {
        return null;
      }
    },

    async isAuthenticated(): Promise<boolean> {
      const session = await this.getSession();
      return session !== null;
    },

    async getAccessToken(): Promise<string | null> {
      const session = await this.getSession();
      return session?.accessToken || null;
    },

    async getProviderToken(): Promise<string | null> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.provider_token || null;
      } catch {
        return null;
      }
    },

    onAuthStateChange(
      callback: (event: AuthEvent, session: UserSession | null) => void
    ): () => void {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          const userSession = session ? transformSession(session) : null;
          callback(event as AuthEvent, userSession);
        }
      );

      return () => subscription.unsubscribe();
    },
  };
}
