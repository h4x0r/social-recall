'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Declare chrome as a global for extension messaging
declare const chrome: {
  runtime?: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (response: any) => void
    ) => void;
    lastError?: { message?: string };
  };
};

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID;

type AuthStatus = 'loading' | 'connecting' | 'success' | 'error' | 'no-session';

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function sendTokenToExtension() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus('no-session');
        // Redirect to login with return URL
        window.location.href = '/login?redirect=/auth/extension';
        return;
      }

      setStatus('connecting');

      // Check if chrome.runtime is available
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        setStatus('error');
        setErrorMessage('Chrome extension API not available');
        return;
      }

      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID!,
          { type: 'AUTH_TOKEN', token: session.access_token },
          (response: { success: boolean; error?: string } | undefined) => {
            if (chrome.runtime?.lastError) {
              setStatus('error');
              setErrorMessage(chrome.runtime.lastError.message || 'Extension not found');
              return;
            }

            if (response?.success) {
              setStatus('success');
            } else {
              setStatus('error');
              setErrorMessage(response?.error || 'Failed to connect');
            }
          }
        );
      } catch (e) {
        setStatus('error');
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error');
      }
    }

    sendTokenToExtension();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </>
        )}

        {status === 'no-session' && (
          <>
            <div className="h-8 w-8 mx-auto mb-4">🔐</div>
            <p className="text-gray-600">Redirecting to login...</p>
          </>
        )}

        {status === 'connecting' && (
          <>
            <div className="animate-pulse h-8 w-8 bg-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Connecting to extension...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connected!</h2>
            <p className="text-gray-600">
              You can close this tab and return to the extension.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to connect
            </h2>
            <p className="text-gray-600 mb-4">
              {errorMessage || 'Could not connect to the extension.'}
            </p>
            <p className="text-sm text-gray-500">
              Is the extension installed? Make sure Social Recall is installed and enabled.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
