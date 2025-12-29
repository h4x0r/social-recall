'use client';

import { useSearchParams } from 'next/navigation';

export function StatusBanner() {
  const searchParams = useSearchParams();
  const deleted = searchParams.get('deleted');
  const error = searchParams.get('error');

  if (deleted === 'true') {
    return (
      <div className="mb-8 p-4 bg-green-900/30 border border-green-700 rounded-lg">
        <p className="text-green-400 font-medium">Your data has been permanently deleted.</p>
        <p className="text-green-300/80 text-sm mt-1">
          A confirmation email has been sent. If you have the extension installed, please uninstall it.
        </p>
      </div>
    );
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      'missing-token': 'Invalid deletion link. Please request a new deletion link.',
      'invalid-token': 'This deletion link is invalid or has already been used.',
      'expired-token': 'This deletion link has expired. Please request a new deletion link.',
      'server-error': 'An error occurred while processing your request. Please try again.',
    };

    return (
      <div className="mb-8 p-4 bg-red-900/30 border border-red-700 rounded-lg">
        <p className="text-red-400 font-medium">Error</p>
        <p className="text-red-300/80 text-sm mt-1">
          {errorMessages[error] || 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  return null;
}
