import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

// Mock useAuth hook
const mockSignInWithMagicLink = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signInWithMagicLink: mockSignInWithMagicLink,
    signInWithGoogle: mockSignInWithGoogle,
    isLoading: false,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithMagicLink.mockResolvedValue({ success: true });
    mockSignInWithGoogle.mockResolvedValue({ success: true });
  });

  it('renders login form with Google and email options', () => {
    render(<LoginForm />);

    expect(screen.getByText('Social Recall')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(mockSignInWithGoogle).toHaveBeenCalledWith({ includeContacts: true });
  });

  it('shows error when submitting empty email', async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    expect(mockSignInWithMagicLink).not.toHaveBeenCalled();
  });

  it('calls signInWithMagicLink when email is submitted', async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(mockSignInWithMagicLink).toHaveBeenCalledWith('test@example.com');
  });

  it('shows confirmation message after magic link is sent', async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('allows using different email after magic link sent', async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /use a different email/i }));

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });

  it('shows error when magic link fails', async () => {
    mockSignInWithMagicLink.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded'
    });

    render(<LoginForm />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });
  });

  it('shows error when Google sign in fails', async () => {
    mockSignInWithGoogle.mockResolvedValue({
      success: false,
      error: 'Google auth failed'
    });

    render(<LoginForm />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(screen.getByText('Google auth failed')).toBeInTheDocument();
    });
  });
});
