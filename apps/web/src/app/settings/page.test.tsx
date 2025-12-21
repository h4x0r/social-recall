import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

// Mock components
vi.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Mocked Header</div>,
}));

vi.mock('@/components/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    signOut: vi.fn(),
  })),
}));

describe('SettingsPage', () => {
  it('renders the page title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('displays user profile section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays data management section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Data Management')).toBeInTheDocument();
  });

  it('has export data button', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});
