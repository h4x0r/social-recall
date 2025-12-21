import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagManager } from './tag-manager';

// Mock tag repository
const mockTagRepository = {
  listTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
};

vi.mock('@/lib/tag-repository', () => ({
  createTagRepository: vi.fn(() => mockTagRepository),
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

describe('TagManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTagRepository.listTags.mockResolvedValue([]);
    mockTagRepository.createTag.mockResolvedValue({ id: 'new-tag', name: 'New Tag', color: '#6366f1' });
    mockTagRepository.deleteTag.mockResolvedValue(undefined);
  });

  it('renders loading state initially', () => {
    render(<TagManager />);
    expect(screen.getByText('Loading tags...')).toBeInTheDocument();
  });

  it('displays existing tags', async () => {
    mockTagRepository.listTags.mockResolvedValue([
      { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '2024-01-01' },
      { id: 'tag-2', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-01' },
    ]);

    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('Important')).toBeInTheDocument();
    });
  });

  it('shows empty state when no tags exist', async () => {
    mockTagRepository.listTags.mockResolvedValue([]);

    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByText('No tags yet')).toBeInTheDocument();
    });
  });

  it('creates a new tag', async () => {
    const user = userEvent.setup();
    mockTagRepository.listTags.mockResolvedValue([]);
    mockTagRepository.createTag.mockResolvedValue({
      id: 'new-tag',
      userId: 'user-1',
      name: 'New Tag',
      color: '#6366f1',
      createdAt: '2024-01-01',
    });

    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('New tag name')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('New tag name'), 'New Tag');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockTagRepository.createTag).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'New Tag',
        color: expect.any(String),
      });
    });
  });

  it('deletes a tag with confirmation', async () => {
    const user = userEvent.setup();
    mockTagRepository.listTags.mockResolvedValue([
      { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '2024-01-01' },
    ]);

    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText(/confirm/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockTagRepository.deleteTag).toHaveBeenCalledWith('tag-1');
    });
  });
});
