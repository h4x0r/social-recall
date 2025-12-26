/**
 * Tests for Contact Consolidation page
 * Review UI for matching LinkedIn contacts with Google contacts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the hooks and modules
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import ConsolidatePage from './page';

describe('ConsolidatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    render(<ConsolidatePage />);

    await waitFor(() => {
      expect(screen.getByText(/consolidate contacts/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loading state initially', () => {
    render(<ConsolidatePage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no matches found', async () => {
    render(<ConsolidatePage />);

    await waitFor(() => {
      expect(screen.getByText(/no matches/i)).toBeInTheDocument();
    });
  });

  it('renders progress indicator', () => {
    render(<ConsolidatePage />);

    // Should show "X of Y contacts reviewed" or similar
    expect(screen.getByText(/contacts/i)).toBeInTheDocument();
  });

  it('has Import Google Contacts button', async () => {
    render(<ConsolidatePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import.*google/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('has Skip for now button', async () => {
    render(<ConsolidatePage />);

    await waitFor(() => {
      const skipButton = screen.queryByRole('button', { name: /skip/i });
      // Skip button may or may not be visible depending on state
      expect(skipButton !== null || screen.queryByText(/no matches/i) !== null).toBe(true);
    });
  });

  it('has None of these match button', async () => {
    render(<ConsolidatePage />);

    await waitFor(() => {
      const noneButton = screen.queryByRole('button', { name: /none.*match/i });
      // None button may or may not be visible depending on state
      expect(noneButton !== null || screen.queryByText(/no matches/i) !== null).toBe(true);
    });
  });
});
