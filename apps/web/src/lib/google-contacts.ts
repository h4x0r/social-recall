/**
 * Google Contacts sync service
 * Fetches contacts from Google People API and syncs to repository
 */

import type { ContactRepository, EmployerInput } from './contact-repository';

const PEOPLE_API_BASE = 'https://people.googleapis.com/v1';
const CONNECTIONS_ENDPOINT = `${PEOPLE_API_BASE}/people/me/connections`;
const DEFAULT_PAGE_SIZE = 100;

// Google People API response types
interface GoogleApiOrganization {
  name?: string;
  title?: string;
  current?: boolean;
}

interface GoogleApiUrl {
  value?: string;
  type?: string;
}

interface GoogleApiConnection {
  resourceName?: string;
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  organizations?: GoogleApiOrganization[];
  photos?: Array<{ url?: string }>;
  urls?: GoogleApiUrl[];
}

interface GoogleApiResponse {
  connections?: GoogleApiConnection[];
  totalPeople?: number;
  nextPageToken?: string;
}

// Our contact types
export interface GoogleContactEmployer {
  company: string;
  title?: string;
  isCurrent?: boolean;
}

export interface GoogleContact {
  googleId: string;
  name: string;
  email?: string;
  headline?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  linkedinId?: string;
  employers?: GoogleContactEmployer[];
}

export interface FetchContactsResult {
  contacts: GoogleContact[];
  totalCount: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ contactName: string; error: string }>;
}

export interface FetchOptions {
  pageSize?: number;
  rateLimit?: number; // ms delay between requests
}

export interface GoogleContactsService {
  fetchContacts(token: string, options?: FetchOptions): Promise<FetchContactsResult>;
  syncContacts(
    userId: string,
    contacts: GoogleContact[],
    repository: ContactRepository
  ): Promise<SyncResult>;
}

// Helper to extract LinkedIn ID from URL
function extractLinkedInId(url: string): string | undefined {
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
  return match ? match[1] : undefined;
}

// Helper to create headline from organization
function createHeadline(org: GoogleApiOrganization): string {
  if (org.title && org.name) {
    return `${org.title} @ ${org.name}`;
  }
  return org.title || org.name || '';
}

// Transform Google API contact to our format
function transformContact(connection: GoogleApiConnection): GoogleContact | null {
  // Skip contacts without names
  const name = connection.names?.[0]?.displayName;
  if (!name) {
    return null;
  }

  const email = connection.emailAddresses?.[0]?.value;
  const avatarUrl = connection.photos?.[0]?.url;

  // Find LinkedIn URL
  const linkedinUrl = connection.urls?.find((u) =>
    u.value?.includes('linkedin.com')
  )?.value;
  const linkedinId = linkedinUrl ? extractLinkedInId(linkedinUrl) : undefined;

  // Transform organizations to employers
  const employers: GoogleContactEmployer[] = (connection.organizations || []).map(
    (org) => ({
      company: org.name || 'Unknown',
      title: org.title,
      isCurrent: org.current ?? false,
    })
  );

  // Create headline from current or first organization
  const currentOrg =
    connection.organizations?.find((o) => o.current) ||
    connection.organizations?.[0];
  const headline = currentOrg ? createHeadline(currentOrg) : undefined;

  return {
    googleId: connection.resourceName || '',
    name,
    email,
    headline,
    avatarUrl,
    linkedinUrl,
    linkedinId,
    employers: employers.length > 0 ? employers : undefined,
  };
}

// Helper to delay between requests
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGoogleContactsService(): GoogleContactsService {
  return {
    async fetchContacts(
      token: string,
      options?: FetchOptions
    ): Promise<FetchContactsResult> {
      const pageSize = options?.pageSize || DEFAULT_PAGE_SIZE;
      const rateLimit = options?.rateLimit || 0;

      const allContacts: GoogleContact[] = [];
      let pageToken: string | undefined;
      let totalCount = 0;
      let isFirstRequest = true;

      do {
        // Rate limiting between requests
        if (!isFirstRequest && rateLimit > 0) {
          await delay(rateLimit);
        }
        isFirstRequest = false;

        // Build URL with query params
        const params = new URLSearchParams({
          personFields: 'names,emailAddresses,organizations,photos,urls',
          pageSize: String(pageSize),
        });

        if (pageToken) {
          params.set('pageToken', pageToken);
        }

        const url = `${CONNECTIONS_ENDPOINT}?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Google API error: ${response.status} ${response.statusText}`
          );
        }

        const data: GoogleApiResponse = await response.json();

        // Transform and filter contacts
        const contacts = (data.connections || [])
          .map(transformContact)
          .filter((c): c is GoogleContact => c !== null);

        allContacts.push(...contacts);
        totalCount = data.totalPeople || 0;
        pageToken = data.nextPageToken;
      } while (pageToken);

      return {
        contacts: allContacts,
        totalCount,
      };
    },

    async syncContacts(
      userId: string,
      contacts: GoogleContact[],
      repository: ContactRepository
    ): Promise<SyncResult> {
      let synced = 0;
      let failed = 0;
      const errors: Array<{ contactName: string; error: string }> = [];

      for (const contact of contacts) {
        try {
          // Use linkedinId if available, otherwise use googleId
          const linkedinId = contact.linkedinId || contact.googleId;

          const employers: EmployerInput[] = (contact.employers || []).map(
            (emp) => ({
              company: emp.company,
              title: emp.title,
              isCurrent: emp.isCurrent,
            })
          );

          await repository.upsertFromLinkedIn(userId, {
            linkedinId,
            name: contact.name,
            headline: contact.headline,
            profileUrl: contact.linkedinUrl,
            avatarUrl: contact.avatarUrl,
            employers,
          });

          synced++;
        } catch (e) {
          failed++;
          errors.push({
            contactName: contact.name,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }

      return { synced, failed, errors };
    },
  };
}
