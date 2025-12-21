import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OpportunitiesPage from './page';

// Mock the components
vi.mock('@/components/opportunities/opportunity-feed', () => ({
  OpportunityFeed: () => <div data-testid="opportunity-feed">Mocked Feed</div>,
}));

vi.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Mocked Header</div>,
}));

vi.mock('@/components/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('OpportunitiesPage', () => {
  it('renders the page title', () => {
    render(<OpportunitiesPage />);
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
  });

  it('renders the OpportunityFeed component', () => {
    render(<OpportunitiesPage />);
    expect(screen.getByTestId('opportunity-feed')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<OpportunitiesPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
