import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactList } from './contact-list';

// Mock useContacts hook
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

// Mock useSkillInference hook
vi.mock('@/hooks/use-skill-inference', () => ({
  useSkillInference: vi.fn(() => ({
    inferSkills: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

import { useContacts } from '@/hooks/use-contacts';

describe('ContactList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue(mockUseContacts);
  });

  it('renders empty state when no contacts', () => {
    render(<ContactList />);
    expect(screen.getByText('No contacts yet')).toBeInTheDocument();
  });

  it('displays tags on contact cards', () => {
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseContacts,
      contacts: [
        {
          id: 'contact-1',
          userId: 'user-1',
          name: 'John Doe',
          headline: 'Software Engineer',
          linkedinId: null,
          profileUrl: null,
          avatarUrl: null,
          lastSyncedAt: null,
          isNew: false,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          employers: [],
          skills: [],
          tags: [
            { id: 'tag-1', name: 'VIP', color: '#ef4444' },
            { id: 'tag-2', name: 'Important', color: '#6366f1' },
          ],
        },
      ],
      totalCount: 1,
    });

    render(<ContactList />);

    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
  });

  it('limits displayed tags to 3 with overflow indicator', () => {
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseContacts,
      contacts: [
        {
          id: 'contact-1',
          userId: 'user-1',
          name: 'John Doe',
          headline: 'Software Engineer',
          linkedinId: null,
          profileUrl: null,
          avatarUrl: null,
          lastSyncedAt: null,
          isNew: false,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          employers: [],
          skills: [],
          tags: [
            { id: 'tag-1', name: 'VIP', color: '#ef4444' },
            { id: 'tag-2', name: 'Important', color: '#6366f1' },
            { id: 'tag-3', name: 'Urgent', color: '#22c55e' },
            { id: 'tag-4', name: 'Follow-up', color: '#f59e0b' },
          ],
        },
      ],
      totalCount: 1,
    });

    render(<ContactList />);

    // First 3 should be visible
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    // Fourth should be hidden with overflow indicator
    expect(screen.queryByText('Follow-up')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
