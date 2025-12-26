/**
 * Sync Service with Contribution Tracking
 * Handles syncing profile data from extension with contribution tracking and avatar storage
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { downloadAndUploadAvatar } from './r2-storage';
import {
  createContributionService,
  type ContributionField,
  type ContributionService,
} from './contribution-service';

// =============================================================================
// TYPES
// =============================================================================

export interface ProfileSyncInput {
  userId: string;
  linkedinId: string;
  name: string;
  headline?: string;
  location?: string;
  avatarUrl?: string;
  about?: string;
}

export interface EmployerInput {
  company: string;
  title?: string;
  logoUrl?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SyncResult {
  success: boolean;
  isNew?: boolean;
  masterProfileId?: string;
  changedFields?: ContributionField[];
  hasConflicts?: boolean;
  conflictFields?: ContributionField[];
  avatarError?: string;
  error?: string;
}

export interface EmployerSyncResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface SyncService {
  /**
   * Sync a profile from extension data
   */
  syncProfile(input: ProfileSyncInput): Promise<SyncResult>;

  /**
   * Sync employers for a profile
   */
  syncEmployers(
    masterProfileId: string,
    userId: string,
    employers: EmployerInput[]
  ): Promise<EmployerSyncResult>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Fields that we track for contributions
const TRACKED_FIELDS: ContributionField[] = [
  'name',
  'headline',
  'location',
  'avatar',
  'about',
];

interface MasterProfileRow {
  id: string;
  linkedin_id: string;
  name: string;
  headline: string | null;
  location: string | null;
  avatar_path: string | null;
  about: string | null;
}

// Helper: Get field value from input
function getFieldValue(
  input: ProfileSyncInput,
  field: ContributionField,
  avatarPath: string | null
): string | null {
  switch (field) {
    case 'name':
      return input.name;
    case 'headline':
      return input.headline || null;
    case 'location':
      return input.location || null;
    case 'avatar':
      return avatarPath;
    case 'about':
      return input.about || null;
    default:
      return null;
  }
}

// Helper: Get existing field value from database row
function getExistingFieldValue(
  profile: MasterProfileRow,
  field: ContributionField
): string | null {
  switch (field) {
    case 'name':
      return profile.name;
    case 'headline':
      return profile.headline;
    case 'location':
      return profile.location;
    case 'avatar':
      return profile.avatar_path;
    case 'about':
      return profile.about;
    default:
      return null;
  }
}

// Helper: Convert field name to database column name
function getDbFieldName(field: ContributionField): string {
  switch (field) {
    case 'avatar':
      return 'avatar_path';
    default:
      return field;
  }
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export function createSyncService(supabase: SupabaseClient): SyncService {
  const contributionService: ContributionService = createContributionService(supabase);

  return {
    async syncProfile(input: ProfileSyncInput): Promise<SyncResult> {
      const changedFields: ContributionField[] = [];
      const conflictFields: ContributionField[] = [];
      let hasConflicts = false;
      let avatarError: string | undefined;

      try {
        // 1. Check if profile exists
        const { data: existing } = await supabase
          .from('master_profiles')
          .select('*')
          .eq('linkedin_id', input.linkedinId)
          .single();

        let masterProfileId: string;
        let isNew = false;

        // 2. Handle avatar upload
        let avatarPath: string | null = null;
        if (input.avatarUrl) {
          const uploadResult = await downloadAndUploadAvatar(
            input.linkedinId,
            input.avatarUrl
          );
          if (uploadResult.success) {
            avatarPath = uploadResult.path || null;
          } else {
            avatarError = uploadResult.error;
          }
        }

        if (!existing) {
          // 3a. Create new profile
          isNew = true;

          const { data: created, error: createError } = await supabase
            .from('master_profiles')
            .insert({
              linkedin_id: input.linkedinId,
              name: input.name,
              headline: input.headline || null,
              location: input.location || null,
              avatar_path: avatarPath,
              about: input.about || null,
            })
            .select()
            .single();

          if (createError || !created) {
            return { success: false, error: createError?.message || 'Failed to create profile' };
          }

          masterProfileId = (created as { id: string }).id;

          // Record initial contributions for all fields
          for (const field of TRACKED_FIELDS) {
            const value = getFieldValue(input, field, avatarPath);
            if (value !== null && value !== undefined) {
              await contributionService.recordContribution({
                masterProfileId,
                contributedBy: input.userId,
                field,
                value,
              });
              changedFields.push(field);
            }
          }
        } else {
          // 3b. Update existing profile
          masterProfileId = (existing as { id: string }).id;
          const existingProfile = existing as MasterProfileRow;

          // Check each field for changes
          for (const field of TRACKED_FIELDS) {
            const newValue = getFieldValue(input, field, avatarPath);
            const oldValue = getExistingFieldValue(existingProfile, field);

            if (newValue !== null && newValue !== oldValue) {
              // Check for conflicts
              const conflictCheck = await contributionService.checkForConflicts(
                masterProfileId,
                field,
                newValue
              );

              if (conflictCheck.hasConflict) {
                hasConflicts = true;
                conflictFields.push(field);

                // Record as pending
                await contributionService.recordContribution({
                  masterProfileId,
                  contributedBy: input.userId,
                  field,
                  value: newValue,
                  status: 'pending',
                });
              } else {
                // No conflict, record as accepted and update profile
                await contributionService.recordContribution({
                  masterProfileId,
                  contributedBy: input.userId,
                  field,
                  value: newValue,
                });
                changedFields.push(field);
              }
            }
          }

          // Update profile with accepted changes only
          if (changedFields.length > 0) {
            const updateData: Record<string, unknown> = {};
            for (const field of changedFields) {
              const value = getFieldValue(input, field, avatarPath);
              const dbField = getDbFieldName(field);
              updateData[dbField] = value;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('master_profiles')
              .update(updateData)
              .eq('id', masterProfileId);
          }
        }

        // 4. Upsert user_profile_data to track relationship
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('user_profile_data')
          .upsert({
            user_id: input.userId,
            master_profile_id: masterProfileId,
            last_seen_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,master_profile_id',
          })
          .select()
          .single();

        return {
          success: true,
          isNew,
          masterProfileId,
          changedFields,
          hasConflicts,
          conflictFields: hasConflicts ? conflictFields : undefined,
          avatarError,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    async syncEmployers(
      masterProfileId: string,
      userId: string,
      employers: EmployerInput[]
    ): Promise<EmployerSyncResult> {
      try {
        if (employers.length === 0) {
          return { success: true };
        }

        // Prepare employer records
        const employerRecords = employers.map((emp, index) => ({
          master_profile_id: masterProfileId,
          company: emp.company,
          title: emp.title || null,
          logo_url: emp.logoUrl || null,
          is_current: emp.isCurrent ?? (index === 0),
          start_date: emp.startDate || null,
          end_date: emp.endDate || null,
          sort_order: index,
        }));

        // Upsert employers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: upsertError } = await (supabase as any)
          .from('master_profile_employers')
          .upsert(employerRecords, {
            onConflict: 'master_profile_id,company,title',
          })
          .select();

        if (upsertError) {
          return { success: false, error: upsertError.message };
        }

        // Record contribution for employers
        await contributionService.recordContribution({
          masterProfileId,
          contributedBy: userId,
          field: 'employers',
          value: employers,
        });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}
