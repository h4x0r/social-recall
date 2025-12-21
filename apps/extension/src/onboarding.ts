/**
 * Onboarding module for Social Recall
 * Handles free tier limits and gate display
 */

export const FREE_PROFILE_LIMIT = 10;

interface StorageResult {
  profileCount?: number;
  syncToken?: string;
}

/**
 * Get the current profile count
 */
export async function getProfileCount(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['profileCount'], (result: StorageResult) => {
      resolve(result.profileCount || 0);
    });
  });
}

/**
 * Increment the profile count
 */
export async function incrementProfileCount(): Promise<number> {
  const currentCount = await getProfileCount();
  const newCount = currentCount + 1;

  return new Promise((resolve) => {
    chrome.storage.sync.set({ profileCount: newCount }, () => {
      resolve(newCount);
    });
  });
}

/**
 * Check if user is within the free profile limit
 */
export async function isWithinFreeLimit(): Promise<boolean> {
  const count = await getProfileCount();
  return count <= FREE_PROFILE_LIMIT;
}

/**
 * Check if user is authenticated (has sync token)
 */
export async function isAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['syncToken'], (result: StorageResult) => {
      resolve(!!result.syncToken && result.syncToken.length > 0);
    });
  });
}

/**
 * Determine if the gate should be shown
 * Gate appears when: over limit AND not authenticated
 */
export async function shouldShowGate(): Promise<boolean> {
  const withinLimit = await isWithinFreeLimit();
  if (withinLimit) {
    return false;
  }

  const authenticated = await isAuthenticated();
  return !authenticated;
}
