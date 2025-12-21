import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpportunityFeed } from './opportunity-feed';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useOpportunities
const mockDismiss = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/hooks/use-opportunities', () => ({
  useOpportunities: vi.fn(() => ({
    opportunities: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    dismiss: mockDismiss,
  })),
}));

// Import after mock setup
import { useOpportunities } from '@/hooks/use-opportunities';

describe('OpportunityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no opportunities', () => {
    render(<OpportunityFeed />);
    expect(screen.getByText('No opportunities yet')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useOpportunities).mockReturnValue({
      opportunities: [],
      isLoading: true,
      error: null,
      refresh: mockRefresh,
      dismiss: mockDismiss,
    });

    render(<OpportunityFeed />);
    // Should show skeleton loaders
    expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('shows error state with retry button', async () => {
    vi.mocked(useOpportunities).mockReturnValue({
      opportunities: [],
      isLoading: false,
      error: 'Failed to load',
      refresh: mockRefresh,
      dismiss: mockDismiss,
    });

    render(<OpportunityFeed />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders opportunity cards', () => {
    vi.mocked(useOpportunities).mockReturnValue({
      opportunities: [
        {
          id: 'opp-1',
          contactId: 'contact-123',
          type: 'new_company',
          description: 'Started new role at Acme',
          detectedAt: new Date().toISOString(),
          dismissed: false,
          snoozedUntil: null,
          contact: {
            id: 'contact-123',
            name: 'John Doe',
            headline: 'Software Engineer',
          },
        },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      dismiss: mockDismiss,
    });

    render(<OpportunityFeed />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Started new role at Acme')).toBeInTheDocument();
    expect(screen.getByText('New Company')).toBeInTheDocument();
  });

  it('navigates to contact profile when View Profile is clicked', async () => {
    vi.mocked(useOpportunities).mockReturnValue({
      opportunities: [
        {
          id: 'opp-1',
          contactId: 'contact-123',
          type: 'role_change',
          description: 'Got promoted',
          detectedAt: new Date().toISOString(),
          dismissed: false,
          snoozedUntil: null,
          contact: {
            id: 'contact-123',
            name: 'Jane Smith',
            headline: 'Tech Lead',
          },
        },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      dismiss: mockDismiss,
    });

    render(<OpportunityFeed />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /view profile/i }));
    expect(mockPush).toHaveBeenCalledWith('/contacts/contact-123');
  });

  it('dismisses opportunity when Dismiss is clicked', async () => {
    vi.mocked(useOpportunities).mockReturnValue({
      opportunities: [
        {
          id: 'opp-1',
          contactId: 'contact-123',
          type: 'left_job',
          description: 'Left previous company',
          detectedAt: new Date().toISOString(),
          dismissed: false,
          snoozedUntil: null,
          contact: {
            id: 'contact-123',
            name: 'Bob Wilson',
            headline: 'Product Manager',
          },
        },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      dismiss: mockDismiss,
    });

    render(<OpportunityFeed />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(mockDismiss).toHaveBeenCalledWith('opp-1');
  });
});
