/**
 * Tests for ContactPicker component
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactPicker } from './contact-picker';

// Mock useContacts hook
vi.mock('@/hooks/use-contacts', () => ({
  useContacts: vi.fn(),
}));

import { useContacts } from '@/hooks/use-contacts';

describe('ContactPicker', () => {
  const mockContacts = [
    { id: 'contact-1', name: 'John Doe', headline: 'CEO' },
    { id: 'contact-2', name: 'Jane Smith', headline: 'CTO' },
    { id: 'contact-3', name: 'Bob Wilson', headline: 'VP Engineering' },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useContacts as ReturnType<typeof vi.fn>).mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
    });
  });

  describe('rendering', () => {
    it('renders a combobox to open picker', () => {
      render(<ContactPicker onSelect={mockOnSelect} />);

      const combobox = screen.getByRole('combobox', { name: /select contact/i });
      expect(combobox).toBeInTheDocument();
    });

    it('shows placeholder text when no contact selected', () => {
      render(<ContactPicker onSelect={mockOnSelect} placeholder="Who introduced you?" />);

      expect(screen.getByText(/who introduced you/i)).toBeInTheDocument();
    });

    it('shows selected contact name when provided', () => {
      render(
        <ContactPicker
          onSelect={mockOnSelect}
          selectedContactId="contact-1"
          selectedContactName="John Doe"
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('search and selection', () => {
    it('shows dropdown with contacts when clicked', async () => {
      render(<ContactPicker onSelect={mockOnSelect} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('filters contacts by search input', async () => {
      render(<ContactPicker onSelect={mockOnSelect} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      fireEvent.change(searchInput, { target: { value: 'Jane' } });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('calls onSelect when a contact is clicked', async () => {
      render(<ContactPicker onSelect={mockOnSelect} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      await waitFor(() => {
        const contactOption = screen.getByText('Jane Smith');
        fireEvent.click(contactOption);
      });

      expect(mockOnSelect).toHaveBeenCalledWith('contact-2', 'Jane Smith');
    });
  });

  describe('clear selection', () => {
    it('shows clear button when contact is selected', () => {
      render(
        <ContactPicker
          onSelect={mockOnSelect}
          selectedContactId="contact-1"
          selectedContactName="John Doe"
        />
      );

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('calls onSelect with null when cleared', () => {
      render(
        <ContactPicker
          onSelect={mockOnSelect}
          selectedContactId="contact-1"
          selectedContactName="John Doe"
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null, null);
    });
  });

  describe('exclusions', () => {
    it('excludes specified contact IDs from the list', async () => {
      render(<ContactPicker onSelect={mockOnSelect} excludeIds={['contact-1']} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });
});
