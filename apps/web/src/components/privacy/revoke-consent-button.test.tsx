/**
 * Tests for RevokeConsentButton component
 * TDD: Write tests first, watch fail, implement minimal code
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevokeConsentButton } from './revoke-consent-button';

// Mock the server action
const mockRevokeConsent = vi.fn();
vi.mock('@/lib/actions/consent', () => ({
  revokeConsent: (userId: string) => mockRevokeConsent(userId),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('RevokeConsentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when user is not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(<RevokeConsentButton />);
    expect(screen.getByText(/sign in to revoke/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin');
  });

  it('shows loading state while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(<RevokeConsentButton />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows revoke button when user is logged in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(<RevokeConsentButton />);
    expect(screen.getByRole('button', { name: /revoke consent/i })).toBeInTheDocument();
  });

  it('calls revokeConsent with user id when clicked', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockRevokeConsent.mockResolvedValue({ success: true });

    render(<RevokeConsentButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revoke consent/i }));

    await waitFor(() => {
      expect(mockRevokeConsent).toHaveBeenCalledWith('user-123');
    });
  });

  it('shows success message after revocation', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockRevokeConsent.mockResolvedValue({ success: true });

    render(<RevokeConsentButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revoke consent/i }));

    await waitFor(() => {
      expect(screen.getByText(/consent revoked/i)).toBeInTheDocument();
    });
  });

  it('shows error message when revocation fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockRevokeConsent.mockResolvedValue({ success: false, error: 'Database error' });

    render(<RevokeConsentButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revoke consent/i }));

    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument();
    });
  });
});
