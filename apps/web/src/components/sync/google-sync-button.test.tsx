/**
 * Tests for GoogleSyncButton component
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleSyncButton } from './google-sync-button';

// Mock useGoogleSync hook
vi.mock('@/hooks/use-google-sync', () => ({
  useGoogleSync: vi.fn(),
}));

import { useGoogleSync } from '@/hooks/use-google-sync';

describe('GoogleSyncButton', () => {
  const mockSync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
      isSyncing: false,
      lastSyncResult: null,
      error: null,
      sync: mockSync,
    });
  });

  describe('rendering', () => {
    it('renders sync button with Google icon', () => {
      render(<GoogleSyncButton />);

      const button = screen.getByRole('button', { name: /sync google contacts/i });
      expect(button).toBeInTheDocument();
    });

    it('shows "Sync Google Contacts" text when not syncing', () => {
      render(<GoogleSyncButton />);

      expect(screen.getByText(/sync google contacts/i)).toBeInTheDocument();
    });
  });

  describe('syncing state', () => {
    it('shows loading state when syncing', () => {
      (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
        isSyncing: true,
        lastSyncResult: null,
        error: null,
        sync: mockSync,
      });

      render(<GoogleSyncButton />);

      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    });

    it('disables button when syncing', () => {
      (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
        isSyncing: true,
        lastSyncResult: null,
        error: null,
        sync: mockSync,
      });

      render(<GoogleSyncButton />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('sync action', () => {
    it('calls sync when button is clicked', async () => {
      mockSync.mockResolvedValue({ synced: 5, failed: 0, errors: [] });

      render(<GoogleSyncButton />);

      const button = screen.getByRole('button', { name: /sync google contacts/i });
      fireEvent.click(button);

      expect(mockSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('sync results', () => {
    it('shows success message after successful sync', () => {
      (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
        isSyncing: false,
        lastSyncResult: { synced: 5, failed: 0, errors: [] },
        error: null,
        sync: mockSync,
      });

      render(<GoogleSyncButton />);

      expect(screen.getByText(/5 contacts synced/i)).toBeInTheDocument();
    });

    it('shows partial success when some contacts failed', () => {
      (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
        isSyncing: false,
        lastSyncResult: { synced: 3, failed: 2, errors: [] },
        error: null,
        sync: mockSync,
      });

      render(<GoogleSyncButton />);

      expect(screen.getByText(/3 synced, 2 failed/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error message when sync fails', () => {
      (useGoogleSync as ReturnType<typeof vi.fn>).mockReturnValue({
        isSyncing: false,
        lastSyncResult: null,
        error: 'No Google access token available',
        sync: mockSync,
      });

      render(<GoogleSyncButton />);

      expect(screen.getByText(/no google access token/i)).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders as icon-only button when compact', () => {
      render(<GoogleSyncButton compact />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Should not show text in compact mode
      expect(screen.queryByText(/sync google contacts/i)).not.toBeInTheDocument();
    });
  });
});
