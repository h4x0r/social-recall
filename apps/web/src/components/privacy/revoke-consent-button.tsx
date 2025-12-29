'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { revokeConsent } from '@/lib/actions/consent';

export function RevokeConsentButton() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-neutral-400">Loading...</p>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <p className="text-neutral-400 mb-3">Sign in to revoke your consent.</p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
        <p className="text-green-400">Consent revoked successfully. Data collection has stopped.</p>
      </div>
    );
  }

  const handleRevoke = async () => {
    setStatus('loading');
    setErrorMessage(null);

    const result = await revokeConsent(user.id);

    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Failed to revoke consent');
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleRevoke}
        disabled={status === 'loading'}
        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Revoking...' : 'Revoke Consent'}
      </button>
      {status === 'error' && errorMessage && (
        <p className="text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
