/**
 * Tests for authentication utilities
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthService,
  createAuthService,
  SignInResult,
  SessionUser,
} from './auth';

// Mock Supabase auth
const mockSupabaseAuth = {
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
};

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
};

describe('auth', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = createAuthService(mockSupabaseClient as never);
  });

  describe('signInWithMagicLink', () => {
    it('sends magic link email successfully', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await authService.signInWithMagicLink('user@example.com');

      expect(mockSupabaseAuth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });
      expect(result.success).toBe(true);
    });

    it('returns error for invalid email', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      });

      const result = await authService.signInWithMagicLink('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email');
    });

    it('handles network errors', async () => {
      mockSupabaseAuth.signInWithOtp.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.signInWithMagicLink('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('signInWithGoogle', () => {
    it('initiates Google OAuth flow', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/...' },
        error: null,
      });

      const result = await authService.signInWithGoogle();

      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          scopes: 'email profile',
        },
      });
      expect(result.success).toBe(true);
    });

    it('includes contacts scope when requested', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/...' },
        error: null,
      });

      await authService.signInWithGoogle({ includeContacts: true });

      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          scopes: 'email profile https://www.googleapis.com/auth/contacts.readonly',
        },
      });
    });

    it('returns error on OAuth failure', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth error' },
      });

      const result = await authService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth error');
    });
  });

  describe('signOut', () => {
    it('signs out the current user', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const result = await authService.signOut();

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('handles signout errors', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({
        error: { message: 'Session expired' },
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });
  });

  describe('getSession', () => {
    it('returns current session', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          user_metadata: { full_name: 'John Doe' },
        },
        access_token: 'token-abc',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await authService.getSession();

      expect(session).not.toBeNull();
      expect(session!.user.id).toBe('user-123');
      expect(session!.user.email).toBe('user@example.com');
    });

    it('returns null when not authenticated', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await authService.getSession();

      expect(session).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user details', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        user_metadata: {
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-123');
      expect(user!.email).toBe('user@example.com');
      expect(user!.name).toBe('John Doe');
      expect(user!.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('returns null when not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('subscribes to auth state changes', () => {
      const mockUnsubscribe = vi.fn();
      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const callback = vi.fn();
      const unsubscribe = authService.onAuthStateChange(callback);

      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback on auth events', () => {
      const callback = vi.fn();
      let capturedCallback: (event: string, session: unknown) => void;

      mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      authService.onAuthStateChange(callback);

      // Simulate sign in event
      capturedCallback!('SIGNED_IN', { user: { id: 'user-123' } });

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', expect.any(Object));
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when user has valid session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('returns false when no session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('returns access token from session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'token-xyz',
            user: { id: 'user-123' },
          },
        },
        error: null,
      });

      const token = await authService.getAccessToken();

      expect(token).toBe('token-xyz');
    });

    it('returns null when no session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const token = await authService.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('getProviderToken', () => {
    it('returns provider token for Google', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: {
          session: {
            provider_token: 'google-token-123',
            provider_refresh_token: 'refresh-token',
            user: { id: 'user-123', app_metadata: { provider: 'google' } },
          },
        },
        error: null,
      });

      const token = await authService.getProviderToken();

      expect(token).toBe('google-token-123');
    });

    it('returns null for magic link users', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: {
          session: {
            provider_token: null,
            user: { id: 'user-123', app_metadata: { provider: 'email' } },
          },
        },
        error: null,
      });

      const token = await authService.getProviderToken();

      expect(token).toBeNull();
    });
  });
});
