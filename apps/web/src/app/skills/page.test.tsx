import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillsPage from './page';

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock components
vi.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Mocked Header</div>,
}));

vi.mock('@/components/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useContacts to get skills data
const mockUseContacts = {
  contacts: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  newCount: 0,
  refresh: vi.fn(),
};

vi.mock('@/hooks/use-contacts', () => ({
  useContacts: vi.fn(() => mockUseContacts),
}));

import { useContacts } from '@/hooks/use-contacts';

describe('SkillsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue(mockUseContacts);
  });

  it('renders the page title', () => {
    render(<SkillsPage />);
    expect(screen.getByText('Skills Explorer')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<SkillsPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseContacts,
      isLoading: true,
    });

    render(<SkillsPage />);
    expect(screen.getByText('Loading skills...')).toBeInTheDocument();
  });

  it('displays aggregated skills from contacts', async () => {
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseContacts,
      contacts: [
        {
          id: '1',
          name: 'John',
          skills: [
            { id: 's1', name: 'React', status: 'confirmed' },
            { id: 's2', name: 'TypeScript', status: 'confirmed' },
          ],
        },
        {
          id: '2',
          name: 'Jane',
          skills: [
            { id: 's3', name: 'React', status: 'confirmed' },
            { id: 's4', name: 'Python', status: 'confirmed' },
          ],
        },
      ],
    });

    render(<SkillsPage />);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });
  });

  it('shows contact count for each skill', async () => {
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseContacts,
      contacts: [
        {
          id: '1',
          name: 'John',
          skills: [{ id: 's1', name: 'React', status: 'confirmed' }],
        },
        {
          id: '2',
          name: 'Jane',
          skills: [{ id: 's2', name: 'React', status: 'confirmed' }],
        },
      ],
    });

    render(<SkillsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 contacts')).toBeInTheDocument();
    });
  });
});
