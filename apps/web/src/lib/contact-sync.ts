/**
 * Contact sync service for extension → web app data flow
 * Handles validation, transformation, and persistence of extension-scraped contacts
 */

import type { ContactRepository, EmployerInput, ContactWithRelations } from './contact-repository';
import type { OpportunityRepository, CreatedOpportunity } from './opportunity-repository';
import type { Contact as DetectionContact } from './opportunities';

// Data format from extension (matches extension's storage format)
export interface ExtensionEmployer {
  company: string;
  logo: string;
  title?: string;
}

export interface ExtensionContactData {
  profileId: string;
  name: string;
  url: string;
  headline?: string;
  avatarUrl?: string;
  employers?: ExtensionEmployer[];
  note?: string;
}

// Sync result types
export interface SyncContactResult {
  success: boolean;
  contactId?: string;
  error?: string;
  opportunities?: CreatedOpportunity[];
}

export interface SyncBatchResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ profileId: string; error: string }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ContactSyncService {
  syncContact(userId: string, data: ExtensionContactData): Promise<SyncContactResult>;
  syncBatch(userId: string, contacts: ExtensionContactData[]): Promise<SyncBatchResult>;
  validateExtensionData(data: ExtensionContactData): ValidationResult;
}

// Validate LinkedIn URL
function isValidLinkedInUrl(url: string): boolean {
  if (!url) return false;
  return /linkedin\.com\/in\//.test(url);
}

// Generate headline from explicit value or first employer
function generateHeadline(headline?: string, employers?: ExtensionEmployer[]): string | undefined {
  // Prefer explicit headline if provided
  if (headline && headline.trim()) return headline;
  // Fall back to first employer company name
  if (!employers || employers.length === 0) return undefined;
  return employers[0].company;
}

// Transform extension employers to repository format
function transformEmployers(employers?: ExtensionEmployer[]): EmployerInput[] {
  if (!employers) return [];

  return employers.map((emp, index) => ({
    company: emp.company,
    title: emp.title || undefined,
    logoUrl: emp.logo || undefined,
    isCurrent: index === 0, // Assume first employer is current
  }));
}

// Helper to convert ContactWithRelations to DetectionContact format
function toDetectionContact(contact: ContactWithRelations): DetectionContact {
  return {
    id: contact.id,
    name: contact.name,
    employers: contact.employers.map((e) => ({
      company: e.company,
      logo: e.logoUrl || '',
    })),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export function createContactSyncService(
  repository: ContactRepository,
  opportunityRepository?: OpportunityRepository
): ContactSyncService {
  return {
    validateExtensionData(data: ExtensionContactData): ValidationResult {
      const errors: string[] = [];

      if (!data.profileId || data.profileId.trim() === '') {
        errors.push('profileId is required');
      }

      if (!data.name || data.name.trim() === '') {
        errors.push('name is required');
      }

      if (!isValidLinkedInUrl(data.url)) {
        errors.push('url must be a valid LinkedIn profile URL');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    async syncContact(
      userId: string,
      data: ExtensionContactData
    ): Promise<SyncContactResult> {
      // Validate data
      const validation = this.validateExtensionData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}. All fields are required.`,
        };
      }

      try {
        // Capture "before" state for opportunity detection (only for existing contacts)
        let beforeContact: DetectionContact | null = null;
        if (opportunityRepository) {
          // Check if contact already exists by looking up via linkedin ID
          const existingContacts = await repository.listContacts(userId, { limit: 1000 });
          const existing = existingContacts.find((c) => c.linkedinId === data.profileId);
          if (existing) {
            const fullContact = await repository.getContact(existing.id);
            if (fullContact) {
              beforeContact = toDetectionContact(fullContact);
            }
          }
        }

        // Transform and upsert contact
        const contact = await repository.upsertFromLinkedIn(userId, {
          linkedinId: data.profileId,
          name: data.name,
          profileUrl: data.url,
          avatarUrl: data.avatarUrl,
          headline: generateHeadline(data.headline, data.employers),
          employers: transformEmployers(data.employers),
        });

        // Detect opportunities if we have a before state
        let opportunities: CreatedOpportunity[] = [];
        if (opportunityRepository && beforeContact) {
          // Create "after" state from sync data
          const afterContact: DetectionContact = {
            id: contact.id,
            name: data.name,
            employers: (data.employers || []).map((e) => ({
              company: e.company,
              logo: e.logo || '',
            })),
            createdAt: beforeContact.createdAt,
            updatedAt: new Date().toISOString(),
          };

          opportunities = await opportunityRepository.detectAndCreateOpportunities(
            beforeContact,
            afterContact
          );
        }

        // Add note if provided and not duplicate
        if (data.note && data.note.trim()) {
          const existingNotes = await repository.listNotes(contact.id);
          const isDuplicate = existingNotes.some(
            (note) => note.content === data.note
          );

          if (!isDuplicate) {
            await repository.addNote(contact.id, { content: data.note });
          }
        }

        return {
          success: true,
          contactId: contact.id,
          opportunities: opportunities.length > 0 ? opportunities : undefined,
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },

    async syncBatch(
      userId: string,
      contacts: ExtensionContactData[]
    ): Promise<SyncBatchResult> {
      const results: SyncBatchResult = {
        total: contacts.length,
        synced: 0,
        failed: 0,
        errors: [],
      };

      for (const contact of contacts) {
        const result = await this.syncContact(userId, contact);

        if (result.success) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push({
            profileId: contact.profileId,
            error: result.error || 'Unknown error',
          });
        }
      }

      return results;
    },
  };
}
