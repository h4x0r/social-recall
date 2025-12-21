import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SyncPage from './page';

// Mock components
vi.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Mocked Header</div>,
}));

vi.mock('@/components/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/sync/google-sync-button', () => ({
  GoogleSyncButton: () => <div data-testid="google-sync-button">Google Sync</div>,
}));

// Mock useContacts
vi.mock('@/hooks/use-contacts', () => ({
  useContacts: vi.fn(() => ({
    contacts: [],
    isLoading: false,
    totalCount: 42,
    newCount: 5,
  })),
}));

describe('SyncPage', () => {
  it('renders the page title', () => {
    render(<SyncPage />);
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<SyncPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('displays sync sources section', () => {
    render(<SyncPage />);
    expect(screen.getByText('Connected Sources')).toBeInTheDocument();
  });

  it('displays Google Contacts sync option', () => {
    render(<SyncPage />);
    expect(screen.getByText('Google Contacts')).toBeInTheDocument();
    expect(screen.getByTestId('google-sync-button')).toBeInTheDocument();
  });

  it('displays contact statistics', () => {
    render(<SyncPage />);
    expect(screen.getByText('42')).toBeInTheDocument(); // total count
    expect(screen.getByText('5')).toBeInTheDocument(); // new count
  });
});
