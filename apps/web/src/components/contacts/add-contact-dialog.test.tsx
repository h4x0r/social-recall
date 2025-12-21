import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddContactDialog } from './add-contact-dialog';

// Mock contact repository
const mockContactRepository = {
  createContact: vi.fn(),
};

vi.mock('@/lib/contact-repository', () => ({
  createContactRepository: vi.fn(() => mockContactRepository),
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
  })),
}));

describe('AddContactDialog', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockContactRepository.createContact.mockResolvedValue({
      id: 'new-contact',
      userId: 'user-123',
      name: 'John Doe',
    });
  });

  it('renders trigger button', () => {
    render(<AddContactDialog onSuccess={mockOnSuccess} />);
    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<AddContactDialog onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Contact')).toBeInTheDocument();
    });
  });

  it('shows required name field', async () => {
    const user = userEvent.setup();
    render(<AddContactDialog onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });
  });

  it('creates contact when form is submitted', async () => {
    const user = userEvent.setup();
    render(<AddContactDialog onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/headline/i), 'Software Engineer');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockContactRepository.createContact).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'John Doe',
        headline: 'Software Engineer',
      });
    });
  });

  it('calls onSuccess after successful creation', async () => {
    const user = userEvent.setup();
    render(<AddContactDialog onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('disables save button when name is empty', async () => {
    const user = userEvent.setup();
    render(<AddContactDialog onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });
});
