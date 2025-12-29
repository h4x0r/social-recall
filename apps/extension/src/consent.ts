/**
 * Consent management module for Social Recall extension
 * Handles storage and verification of user consent for authenticated proxy data collection
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
 * Consent record stored locally and referenced server-side
 */
export interface ConsentRecord {
  given: boolean;
  timestamp: string;
  extensionVersion: string;
  consentTextVersion: string;
  userAgent: string;
  ip: string;
  serverLogId: string;
  revokedAt?: string;
}

/**
 * Server response when logging consent
 */
export interface ConsentServerResponse {
  ip: string;
  logId: string;
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
 * Store consent after user accepts and server logs it
 */
export async function setConsent(serverResponse: ConsentServerResponse): Promise<void> {
  const consentRecord: ConsentRecord = {
    given: true,
    timestamp: new Date().toISOString(),
    extensionVersion: EXTENSION_VERSION,
    consentTextVersion: getConsentTextHash(),
    userAgent: navigator.userAgent,
    ip: serverResponse.ip,
    serverLogId: serverResponse.logId,
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
 * Revoke consent - stops future server sync but preserves record for audit
 */
export async function revokeConsent(): Promise<void> {
  try {
    const existing = await getConsent();
    if (existing) {
      const revokedRecord: ConsentRecord = {
        ...existing,
        given: false,
        revokedAt: new Date().toISOString(),
      };
      await chrome.storage.local.set({ consent: revokedRecord });
      logger.info('Consent revoked');
    }
  } catch (error) {
    logger.error('Failed to revoke consent:', error);
    throw error;
  }
}

/**
 * Quick check if user has active consent
 */
export async function hasConsent(): Promise<boolean> {
  const consent = await getConsent();
  return consent?.given === true;
}

/**
 * Log consent to server and get IP + logId back
 */
export async function logConsentToServer(apiUrl: string): Promise<ConsentServerResponse> {
  const response = await fetch(`${apiUrl}/api/consent-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      extensionVersion: EXTENSION_VERSION,
      consentTextVersion: getConsentTextHash(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to log consent: ${response.status}`);
  }

  return response.json();
}

/**
 * Full consent flow: log to server, then store locally
 */
export async function grantConsent(apiUrl: string): Promise<void> {
  const serverResponse = await logConsentToServer(apiUrl);
  await setConsent(serverResponse);
}
