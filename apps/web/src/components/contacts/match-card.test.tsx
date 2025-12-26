/**
 * Tests for MatchCard component
 * Displays a potential Google contact match with score and signals
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchCard } from './match-card';
import type { MatchResult } from '@/lib/contact-matcher';

describe('MatchCard', () => {
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
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
      linkedinUrl: null,
      organization: 'Acme Corp',
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

  it('renders the Google contact name', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders the match score as percentage', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    expect(screen.getByText('85% match')).toBeInTheDocument();
  });

  it('renders the email when present', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders the organization when present', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('calls onSelect when Select button is clicked', () => {
    const onSelect = vi.fn();
    render(<MatchCard match={mockMatch} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    expect(onSelect).toHaveBeenCalledWith(mockMatch);
  });

  it('shows LinkedIn URL indicator when linkedinUrl signal is true', () => {
    const matchWithUrl: MatchResult = {
      ...mockMatch,
      score: 100,
      signals: { ...mockMatch.signals, linkedinUrl: true },
    };

    render(<MatchCard match={matchWithUrl} onSelect={vi.fn()} />);

    expect(screen.getByText(/linkedin verified/i)).toBeInTheDocument();
  });

  it('shows employer match indicator when employerMatch signal is true', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    expect(screen.getByText(/same company/i)).toBeInTheDocument();
  });

  it('applies high confidence styling for scores >= 80', () => {
    render(<MatchCard match={mockMatch} onSelect={vi.fn()} />);

    const scoreElement = screen.getByText('85% match');
    expect(scoreElement.className).toMatch(/green|high/i);
  });

  it('applies medium confidence styling for scores 50-79', () => {
    const mediumMatch: MatchResult = {
      ...mockMatch,
      score: 65,
      confidence: 'medium',
    };

    render(<MatchCard match={mediumMatch} onSelect={vi.fn()} />);

    const scoreElement = screen.getByText('65% match');
    expect(scoreElement.className).toMatch(/yellow|orange|medium/i);
  });

  it('handles missing email gracefully', () => {
    const matchNoEmail: MatchResult = {
      ...mockMatch,
      googleContact: { ...mockMatch.googleContact, email: undefined },
    };

    render(<MatchCard match={matchNoEmail} onSelect={vi.fn()} />);

    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  });

  it('handles missing organization gracefully', () => {
    const matchNoOrg: MatchResult = {
      ...mockMatch,
      googleContact: { ...mockMatch.googleContact, organization: null },
      signals: { ...mockMatch.signals, employerMatch: false },
    };

    render(<MatchCard match={matchNoOrg} onSelect={vi.fn()} />);

    expect(screen.queryByText(/same company/i)).not.toBeInTheDocument();
  });
});
