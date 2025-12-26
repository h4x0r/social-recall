/**
 * Tests for MergeDialog component
 * Side-by-side field picker for merging contacts
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MergeDialog } from './merge-dialog';
import type { MatchResult } from '@/lib/contact-matcher';

describe('MergeDialog', () => {
  const mockMatch: MatchResult = {
    linkedInContact: {
      id: 'li-1',
      linkedinId: 'johndoe',
      name: 'John Doe',
      headline: 'Engineer at Acme',
      location: 'San Francisco',
      employers: [{ company: 'Acme Corp', title: 'Engineer' }],
    },
    googleContact: {
      resourceName: 'people/123',
      name: 'J. Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
      linkedinUrl: null,
      organization: 'Acme Inc',
    },
    score: 85,
    confidence: 'high',
    signals: {
      linkedinUrl: false,
      nameScore: 35,
      employerMatch: true,
      locationMatch: false,
    },
  };

  it('renders the dialog title', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /merge contact/i })).toBeInTheDocument();
  });

  it('renders field sections for name, email, phone', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('shows LinkedIn and Google values for each field', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // LinkedIn name
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    // Google name
    expect(screen.getByText('J. Doe')).toBeInTheDocument();
    // Google email
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    // Google phone
    expect(screen.getByText('+1-555-1234')).toBeInTheDocument();
  });

  it('shows (none) for empty values', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // LinkedIn doesn't have email
    const noneElements = screen.getAllByText('(none)');
    expect(noneElements.length).toBeGreaterThan(0);
  });

  it('allows selecting LinkedIn value for a field', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // Find LinkedIn radio for name field
    const linkedinRadios = screen.getAllByRole('radio');
    const linkedinNameRadio = linkedinRadios.find(
      r => r.getAttribute('value') === 'linkedin' && r.getAttribute('name') === 'name'
    );

    expect(linkedinNameRadio).toBeDefined();
    fireEvent.click(linkedinNameRadio!);
    expect(linkedinNameRadio).toBeChecked();
  });

  it('allows selecting Google value for a field', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    const googleRadios = screen.getAllByRole('radio');
    const googleNameRadio = googleRadios.find(
      r => r.getAttribute('value') === 'google' && r.getAttribute('name') === 'name'
    );

    expect(googleNameRadio).toBeDefined();
    fireEvent.click(googleNameRadio!);
    expect(googleNameRadio).toBeChecked();
  });

  it('allows entering custom value for a field', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // Select custom option
    const customRadios = screen.getAllByRole('radio');
    const customNameRadio = customRadios.find(
      r => r.getAttribute('value') === 'custom' && r.getAttribute('name') === 'name'
    );

    expect(customNameRadio).toBeDefined();
    fireEvent.click(customNameRadio!);

    // Type in custom input
    const customInputs = screen.getAllByPlaceholderText(/custom/i);
    expect(customInputs.length).toBeGreaterThan(0);
    fireEvent.change(customInputs[0], { target: { value: 'Jonathan Doe' } });

    expect(customInputs[0]).toHaveValue('Jonathan Doe');
  });

  it('calls onMerge with field selections when Merge button clicked', () => {
    const onMerge = vi.fn();
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={onMerge}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /merge contact/i }));

    expect(onMerge).toHaveBeenCalledWith(
      mockMatch,
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn();
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={onClose}
        onMerge={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={false}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    expect(screen.queryByText(/merge contact/i)).not.toBeInTheDocument();
  });

  it('auto-selects Google when LinkedIn value is empty', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // Email field - LinkedIn is empty, Google has value
    const googleRadios = screen.getAllByRole('radio');
    const googleEmailRadio = googleRadios.find(
      r => r.getAttribute('value') === 'google' && r.getAttribute('name') === 'email'
    );

    expect(googleEmailRadio).toBeChecked();
  });

  it('auto-selects LinkedIn when Google value is empty', () => {
    render(
      <MergeDialog
        match={mockMatch}
        isOpen={true}
        onClose={vi.fn()}
        onMerge={vi.fn()}
      />
    );

    // Headline field - Google is empty, LinkedIn has value
    const linkedinRadios = screen.getAllByRole('radio');
    const linkedinHeadlineRadio = linkedinRadios.find(
      r => r.getAttribute('value') === 'linkedin' && r.getAttribute('name') === 'headline'
    );

    expect(linkedinHeadlineRadio).toBeChecked();
  });
});
