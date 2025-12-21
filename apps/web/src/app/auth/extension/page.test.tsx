import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock supabase module - must use factory function
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock chrome.runtime.sendMessage
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
    lastError: undefined,
  },
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Import after mocks are set up
import ExtensionAuthPage from './page';
import { supabase } from '@/lib/supabase';

// Get typed mock references
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockSendMessage = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;

describe('ExtensionAuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chrome.runtime.lastError
    (chrome.runtime as { lastError?: unknown }).lastError = undefined;
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
    });

    it('shows login redirect message', async () => {
      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
      });
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-access-token-abc123',
            user: { id: 'user-123' },
          },
        },
        error: null,
      });
    });

    it('shows connecting message initially', async () => {
      // Never call the callback
      mockSendMessage.mockImplementation(() => {});

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });
    });

    it('sends token to extension', async () => {
      mockSendMessage.mockImplementation(
        (_extId: string, _msg: unknown, callback: (response: unknown) => void) => {
          callback({ success: true });
        }
      );

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
        const call = mockSendMessage.mock.calls[0];
        expect(call[1]).toEqual({
          type: 'AUTH_TOKEN',
          token: 'test-access-token-abc123',
        });
        expect(typeof call[2]).toBe('function');
      });
    });

    it('shows success message when extension responds', async () => {
      mockSendMessage.mockImplementation(
        (_extId: string, _msg: unknown, callback: (response: unknown) => void) => {
          callback({ success: true });
        }
      );

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('shows close tab instruction on success', async () => {
      mockSendMessage.mockImplementation(
        (_extId: string, _msg: unknown, callback: (response: unknown) => void) => {
          callback({ success: true });
        }
      );

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/close this tab/i)).toBeInTheDocument();
      });
    });
  });

  describe('when extension is not installed', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'user-123' },
          },
        },
        error: null,
      });
    });

    it('shows error when extension does not respond', async () => {
      mockSendMessage.mockImplementation(
        (_extId: string, _msg: unknown, callback: (response: unknown) => void) => {
          callback({ success: false, error: 'Extension not found' });
        }
      );

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to connect/i)).toBeInTheDocument();
      });
    });

    it('shows install extension prompt on error', async () => {
      mockSendMessage.mockImplementation(
        (_extId: string, _msg: unknown, callback: (response: unknown) => void) => {
          callback({ success: false });
        }
      );

      render(<ExtensionAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/extension installed/i)).toBeInTheDocument();
      });
    });
  });
});
