import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagSelector } from './tag-selector';

// Mock useTags hook
const mockUseTags = {
  tags: [],
  contactTags: [],
  isLoading: false,
  error: null,
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  addTagToContact: vi.fn(),
  removeTagFromContact: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/hooks/use-tags', () => ({
  useTags: vi.fn(() => mockUseTags),
}));

import { useTags } from '@/hooks/use-tags';

describe('TagSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTags.tags = [];
    mockUseTags.contactTags = [];
    mockUseTags.isLoading = false;
    mockUseTags.createTag.mockResolvedValue({ id: 'new-tag', name: 'New Tag', color: '#6366f1' });
    mockUseTags.addTagToContact.mockResolvedValue(undefined);
    mockUseTags.removeTagFromContact.mockResolvedValue(undefined);
    (useTags as ReturnType<typeof vi.fn>).mockReturnValue(mockUseTags);
  });

  it('renders loading state', () => {
    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      isLoading: true,
    });

    render(<TagSelector contactId="contact-1" />);
    expect(screen.getByText('Loading tags...')).toBeInTheDocument();
  });

  it('renders Add Tag button when no tags assigned', () => {
    render(<TagSelector contactId="contact-1" />);
    expect(screen.getByText('Add Tag')).toBeInTheDocument();
  });

  it('renders assigned tags as badges', () => {
    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      contactTags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
        { id: 'tag-2', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '' },
      ],
    });

    render(<TagSelector contactId="contact-1" />);
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
  });

  it('opens popover when Add Tag is clicked', async () => {
    const user = userEvent.setup();

    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      tags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
      ],
      contactTags: [],
    });

    render(<TagSelector contactId="contact-1" />);

    await user.click(screen.getByText('Add Tag'));

    await waitFor(() => {
      expect(screen.getByText('Add existing tag')).toBeInTheDocument();
    });
  });

  it('shows unassigned tags in popover', async () => {
    const user = userEvent.setup();

    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      tags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
        { id: 'tag-2', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '' },
      ],
      contactTags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
      ],
    });

    render(<TagSelector contactId="contact-1" />);

    await user.click(screen.getByText('Add Tag'));

    await waitFor(() => {
      // VIP is already assigned, so only Important should appear in unassigned
      expect(screen.getByText('Important')).toBeInTheDocument();
    });
  });

  it('calls addTagToContact when clicking unassigned tag', async () => {
    const user = userEvent.setup();

    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      tags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
      ],
      contactTags: [],
    });

    render(<TagSelector contactId="contact-1" />);

    await user.click(screen.getByText('Add Tag'));

    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    // Click the VIP tag in the popover
    const vipBadges = screen.getAllByText('VIP');
    await user.click(vipBadges[vipBadges.length - 1]); // Click the one in popover

    expect(mockUseTags.addTagToContact).toHaveBeenCalledWith('tag-1');
  });

  it('calls removeTagFromContact when clicking X on assigned tag', async () => {
    const user = userEvent.setup();

    (useTags as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockUseTags,
      contactTags: [
        { id: 'tag-1', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '' },
      ],
    });

    render(<TagSelector contactId="contact-1" />);

    // Find and click the X button on the VIP tag
    const removeButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(removeButton);

    expect(mockUseTags.removeTagFromContact).toHaveBeenCalledWith('tag-1');
  });

  it('creates new tag when typing name and clicking add', async () => {
    const user = userEvent.setup();

    // Mock successful tag creation
    const newTag = { id: 'new-tag', userId: 'user-1', name: 'New Tag', color: '#6366f1', createdAt: '' };
    mockUseTags.createTag.mockResolvedValue(newTag);

    render(<TagSelector contactId="contact-1" />);

    await user.click(screen.getByText('Add Tag'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Tag name'), 'New Tag');

    // Find and click the add button (the small one next to input, not the main Add Tag button)
    const buttons = screen.getAllByRole('button');
    // The button should have size="sm" and be inside the popover - find it by filtering
    const addButton = buttons.find(btn => {
      const svg = btn.querySelector('svg');
      // Plus icon has a specific path
      return svg && btn.className.includes('h-8');
    });

    if (addButton) {
      await user.click(addButton);
    }

    await waitFor(() => {
      expect(mockUseTags.createTag).toHaveBeenCalledWith({
        name: 'New Tag',
        color: '#6366f1', // default color
      });
    });
  });

  it('creates new tag when pressing Enter in input', async () => {
    const user = userEvent.setup();

    // Mock successful tag creation
    const newTag = { id: 'new-tag', userId: 'user-1', name: 'New Tag', color: '#6366f1', createdAt: '' };
    mockUseTags.createTag.mockResolvedValue(newTag);

    render(<TagSelector contactId="contact-1" />);

    await user.click(screen.getByText('Add Tag'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Tag name');
    await user.type(input, 'New Tag');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockUseTags.createTag).toHaveBeenCalledWith({
        name: 'New Tag',
        color: '#6366f1',
      });
    });
  });
});
