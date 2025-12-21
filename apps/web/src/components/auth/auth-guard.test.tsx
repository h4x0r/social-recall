import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './auth-guard';

// Mock useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock LoginForm
vi.mock('./login-form', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

import { useAuth } from '@/hooks/use-auth';

describe('AuthGuard', () => {
  it('shows loading state when isLoading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows login form when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' },
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  it('uses custom fallback when provided and loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGuard fallback={<div>Custom Loading...</div>}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
