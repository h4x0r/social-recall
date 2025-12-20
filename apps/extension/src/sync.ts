/**
 * Sync service for Chrome extension
 * Syncs local contacts to Social Recall web app
 */

interface Employer {
  company: string;
  logo: string;
}

interface SocialNote {
  name: string;
  text: string;
  employers?: Employer[];
}

type SocialNotes = Record<string, SocialNote>;

interface StorageResult {
  socialNotes?: SocialNotes;
  syncToken?: string;
  webAppUrl?: string;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  failed?: number;
  error?: string;
}

// Default web app URL (can be configured in settings)
const DEFAULT_WEB_APP_URL = 'http://localhost:3000';

/**
 * Get the configured web app URL
 */
export async function getWebAppUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['webAppUrl'], (result: StorageResult) => {
      resolve(result.webAppUrl || DEFAULT_WEB_APP_URL);
    });
  });
}

/**
 * Set the web app URL
 */
export async function setWebAppUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ webAppUrl: url }, resolve);
  });
}

/**
 * Get stored auth token
 */
export async function getSyncToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['syncToken'], (result: StorageResult) => {
      resolve(result.syncToken || null);
    });
  });
}

/**
 * Store auth token
 */
export async function setSyncToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ syncToken: token }, resolve);
  });
}

/**
 * Clear auth token
 */
export async function clearSyncToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(['syncToken'], resolve);
  });
}

/**
 * Check if we have a valid sync token
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getSyncToken();
  return token !== null && token.length > 0;
}

/**
 * Get all stored contacts
 */
export async function getAllContacts(): Promise<SocialNotes> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['socialNotes'], (result: StorageResult) => {
      resolve(result.socialNotes || {});
    });
  });
}

/**
 * Transform local contact format to API format
 */
function transformContact(profileId: string, note: SocialNote) {
  return {
    profileId,
    name: note.name,
    url: `https://linkedin.com/in/${profileId}`,
    employers: note.employers || [],
    note: note.text || undefined,
  };
}

/**
 * Sync all contacts to web app
 */
export async function syncAllContacts(): Promise<SyncResult> {
  const token = await getSyncToken();

  if (!token) {
    return {
      success: false,
      error: 'Not logged in. Please connect to Social Recall first.',
    };
  }

  const webAppUrl = await getWebAppUrl();
  const contacts = await getAllContacts();
  const profileIds = Object.keys(contacts);

  if (profileIds.length === 0) {
    return {
      success: true,
      synced: 0,
      failed: 0,
    };
  }

  // Transform contacts to API format
  const apiContacts = profileIds.map((profileId) =>
    transformContact(profileId, contacts[profileId])
  );

  try {
    const response = await fetch(`${webAppUrl}/api/contacts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ contacts: apiContacts }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        // Token expired, clear it
        await clearSyncToken();
        return {
          success: false,
          error: 'Session expired. Please reconnect to Social Recall.',
        };
      }

      return {
        success: false,
        error: errorData.error || `Sync failed: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      synced: data.result?.synced || 0,
      failed: data.result?.failed || 0,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

/**
 * Sync a single contact
 */
export async function syncContact(profileId: string): Promise<SyncResult> {
  const token = await getSyncToken();

  if (!token) {
    return {
      success: false,
      error: 'Not logged in',
    };
  }

  const contacts = await getAllContacts();
  const contact = contacts[profileId];

  if (!contact) {
    return {
      success: false,
      error: 'Contact not found',
    };
  }

  const webAppUrl = await getWebAppUrl();

  try {
    const response = await fetch(`${webAppUrl}/api/contacts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ contact: transformContact(profileId, contact) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Sync failed: ${response.status}`,
      };
    }

    return { success: true, synced: 1, failed: 0 };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

/**
 * Open web app login page and listen for auth token
 */
export function openLoginPage(): void {
  getWebAppUrl().then((webAppUrl) => {
    // Open web app with extension auth parameter
    const authUrl = `${webAppUrl}?extension_auth=true`;
    chrome.tabs.create({ url: authUrl });
  });
}
