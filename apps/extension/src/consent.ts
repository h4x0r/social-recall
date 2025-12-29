/**
 * Consent management module for Social Recall extension
 * Handles storage and verification of user consent for authenticated proxy data collection
 *
 * Flow: OAuth login → consent dialog → log consent with auth token
 */

import { logger } from './logger';

// Extension version - should match manifest
const EXTENSION_VERSION = '0.0.7';

/**
 * The consent text shown to users - hash this for version tracking
 */
export const CONSENT_TEXT = `This extension acts as an AUTHENTICATED PROXY.

It captures LinkedIn profile data visible through YOUR logged-in session—including connection-restricted information you can access because of your credentials.

This data is transmitted to our servers. By proceeding, you acknowledge you are acting as a data collection proxy.`;

/**
 * Consent record stored locally
 * Simplified - no IP address, linked to OAuth session
 */
export interface ConsentRecord {
  given: boolean;
  timestamp: string;
  extensionVersion: string;
  consentTextVersion: string;
  consentId: string; // Server-side consent log ID
  revokedAt?: string;
}

/**
 * Simple hash function for consent text versioning
 * Not cryptographic - just for change detection
 */
export function getConsentTextHash(): string {
  let hash = 0;
  for (let i = 0; i < CONSENT_TEXT.length; i++) {
    const char = CONSENT_TEXT.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get current consent record from local storage
 */
export async function getConsent(): Promise<ConsentRecord | null> {
  try {
    const result = await chrome.storage.local.get(['consent']);
    return result.consent || null;
  } catch (error) {
    logger.error('Failed to get consent:', error);
    return null;
  }
}

/**
 * Quick check if user has active consent locally
 */
export async function hasLocalConsent(): Promise<boolean> {
  const consent = await getConsent();
  return consent?.given === true && !consent.revokedAt;
}

/**
 * Check consent status from server (requires auth)
 */
export async function checkServerConsent(apiUrl: string, authToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/consent/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.hasConsent === true;
  } catch (error) {
    logger.error('Failed to check server consent:', error);
    return false;
  }
}

/**
 * Log consent to server (requires auth token from OAuth)
 */
export async function logConsentToServer(
  apiUrl: string,
  authToken: string
): Promise<{ success: boolean; consentId?: string; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/consent/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        extensionVersion: EXTENSION_VERSION,
        consentTextVersion: getConsentTextHash(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, consentId: data.consentId };
  } catch (error) {
    logger.error('Failed to log consent to server:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Store consent locally after server confirms
 */
async function storeLocalConsent(consentId: string): Promise<void> {
  const consentRecord: ConsentRecord = {
    given: true,
    timestamp: new Date().toISOString(),
    extensionVersion: EXTENSION_VERSION,
    consentTextVersion: getConsentTextHash(),
    consentId,
  };

  try {
    await chrome.storage.local.set({ consent: consentRecord });
    logger.info('Consent stored successfully');
  } catch (error) {
    logger.error('Failed to store consent:', error);
    throw error;
  }
}

/**
 * Grant consent: log to server with auth token, then store locally
 */
export async function grantConsent(
  apiUrl: string,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  const result = await logConsentToServer(apiUrl, authToken);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  await storeLocalConsent(result.consentId!);
  return { success: true };
}

/**
 * Clear local consent (used when user revokes via web app)
 */
export async function clearLocalConsent(): Promise<void> {
  try {
    const existing = await getConsent();
    if (existing) {
      const revokedRecord: ConsentRecord = {
        ...existing,
        given: false,
        revokedAt: new Date().toISOString(),
      };
      await chrome.storage.local.set({ consent: revokedRecord });
      logger.info('Local consent cleared');
    }
  } catch (error) {
    logger.error('Failed to clear local consent:', error);
    throw error;
  }
}

/**
 * Open privacy page for consent revocation
 * Revocation now happens on the web app, not in extension
 */
export function openPrivacyPage(baseUrl: string): void {
  chrome.tabs.create({ url: `${baseUrl}/privacy#revoke-consent` });
}
