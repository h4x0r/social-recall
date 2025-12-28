/**
 * Chrome storage wrapper functions
 * Provides a clean interface for storing and retrieving profile data
 */

import type { StoredProfile } from './types';
import { isExtensionContextValid } from './types';
import { logger } from './logger';

// Re-export for convenience
export { isExtensionContextValid };

// Storage data shape
interface StorageData {
  socialNotes?: Record<string, StoredProfile>;
  webAppUrl?: string;
}

export const DEFAULT_WEB_APP_URL = 'https://www.socialrecall.now';

/**
 * Get stored profile data by profile ID
 */
export async function getStoredProfile(profileId: string): Promise<StoredProfile | null> {
  if (!isExtensionContextValid()) {
    return null;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        const notes = result.socialNotes || {};
        resolve(notes[profileId] || null);
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save profile data
 */
export async function saveProfile(profileId: string, data: StoredProfile): Promise<void> {
  if (!isExtensionContextValid()) {
    return;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }
        const notes = result.socialNotes || {};
        notes[profileId] = data;
        chrome.storage.sync.set({ socialNotes: notes }, () => {
          if (chrome.runtime.lastError) {
            logger.warn('Failed to save:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    } catch {
      resolve();
    }
  });
}

/**
 * Get all stored profiles
 */
export async function getAllProfiles(): Promise<Record<string, StoredProfile>> {
  if (!isExtensionContextValid()) {
    return {};
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve({});
          return;
        }
        resolve(result.socialNotes || {});
      });
    } catch {
      resolve({});
    }
  });
}

/**
 * Delete a profile from storage
 */
export async function deleteProfile(profileId: string): Promise<void> {
  if (!isExtensionContextValid()) {
    return;
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['socialNotes'], (result: StorageData) => {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }
        const notes = result.socialNotes || {};
        delete notes[profileId];
        chrome.storage.sync.set({ socialNotes: notes }, () => {
          resolve();
        });
      });
    } catch {
      resolve();
    }
  });
}

/**
 * Get the web app URL from storage or use default
 */
export async function getApiUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['webAppUrl'], (result: StorageData) => {
      resolve(result.webAppUrl || DEFAULT_WEB_APP_URL);
    });
  });
}
