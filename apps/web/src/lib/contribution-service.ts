/**
 * Contribution Service
 * Handles tracking contributions to master profiles with conflict detection
 *
 * Conflict types:
 * - Concurrent: Multiple users submit different values within 24h
 * - Rollback: New value matches an older historical value
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export type ContributionField =
  | 'name'
  | 'headline'
  | 'location'
  | 'avatar'
  | 'employers'
  | 'education'
  | 'certifications'
  | 'skills'
  | 'about'
  | 'projects'
  | 'publications'
  | 'services'
  | 'languages'
  | 'websites';

export type ContributionStatus = 'pending' | 'accepted' | 'rejected';

export interface Contribution {
  id: string;
  masterProfileId: string;
  contributedBy: string;
  field: ContributionField;
  value: unknown;
  status: ContributionStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ContributionInput {
  masterProfileId: string;
  contributedBy: string;
  field: ContributionField;
  value: unknown;
  status?: ContributionStatus;
}

export interface ContributionResult {
  success: boolean;
  contribution?: Contribution;
  error?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'concurrent' | 'rollback';
  existingContributions?: RawContribution[];
}

export interface RollbackCheckResult {
  isRollback: boolean;
  rollingBackTo?: RawContribution;
}

// Raw database row type
interface RawContribution {
  id: string;
  master_profile_id: string;
  contributed_by: string;
  field: string;
  value: string;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

function transformContribution(raw: RawContribution): Contribution {
  return {
    id: raw.id,
    masterProfileId: raw.master_profile_id,
    contributedBy: raw.contributed_by,
    field: raw.field as ContributionField,
    value: raw.value,
    status: raw.status as ContributionStatus,
    resolvedBy: raw.resolved_by,
    resolvedAt: raw.resolved_at,
    createdAt: raw.created_at,
  };
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface ContributionService {
  /**
   * Record a contribution for a master profile field
   */
  recordContribution(input: ContributionInput): Promise<ContributionResult>;

  /**
   * Check for concurrent conflicts (other contributions within 24h)
   */
  checkForConflicts(
    masterProfileId: string,
    field: ContributionField,
    newValue: unknown
  ): Promise<ConflictCheckResult>;

  /**
   * Check if new value matches an older historical value (rollback detection)
   */
  checkForRollback(
    masterProfileId: string,
    field: ContributionField,
    newValue: unknown
  ): Promise<RollbackCheckResult>;

  /**
   * Get contribution history for a profile/field
   */
  getContributionHistory(
    masterProfileId: string,
    field?: ContributionField
  ): Promise<RawContribution[]>;

  /**
   * Resolve a conflict (accept or reject a contribution)
   */
  resolveConflict(
    contributionId: string,
    resolvedBy: string,
    status: 'accepted' | 'rejected'
  ): Promise<ContributionResult>;

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(masterProfileId?: string): Promise<RawContribution[]>;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

const CONFLICT_WINDOW_HOURS = 24;

export function createContributionService(
  supabase: SupabaseClient
): ContributionService {
  return {
    async recordContribution(input: ContributionInput): Promise<ContributionResult> {
      const { data, error } = await supabase
        .from('master_profile_contributions')
        .insert({
          master_profile_id: input.masterProfileId,
          contributed_by: input.contributedBy,
          field: input.field,
          value: JSON.stringify(input.value),
          status: input.status || 'accepted',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        contribution: transformContribution(data),
      };
    },

    async checkForConflicts(
      masterProfileId: string,
      field: ContributionField,
      newValue: unknown
    ): Promise<ConflictCheckResult> {
      // Look for contributions within the conflict window
      const windowStart = new Date(
        Date.now() - CONFLICT_WINDOW_HOURS * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from('master_profile_contributions')
        .select('*')
        .eq('master_profile_id', masterProfileId)
        .eq('field', field)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return { hasConflict: false };
      }

      // Check if any contribution has a different value
      const newValueStr = JSON.stringify(newValue);
      const hasConflict = data.some((c) => c.value !== newValueStr);

      if (hasConflict) {
        return {
          hasConflict: true,
          conflictType: 'concurrent',
          existingContributions: data,
        };
      }

      return { hasConflict: false };
    },

    async checkForRollback(
      masterProfileId: string,
      field: ContributionField,
      newValue: unknown
    ): Promise<RollbackCheckResult> {
      // Get all historical contributions for this field
      const { data, error } = await supabase
        .from('master_profile_contributions')
        .select('*')
        .eq('master_profile_id', masterProfileId)
        .eq('field', field)
        .order('created_at', { ascending: false });

      if (error || !data || data.length < 2) {
        return { isRollback: false };
      }

      // Skip the most recent value, check if new value matches any older value
      const newValueStr = JSON.stringify(newValue);
      const olderContributions = data.slice(1);

      const matchingOld = olderContributions.find((c) => c.value === newValueStr);

      if (matchingOld) {
        return {
          isRollback: true,
          rollingBackTo: matchingOld,
        };
      }

      return { isRollback: false };
    },

    async getContributionHistory(
      masterProfileId: string,
      field?: ContributionField
    ): Promise<RawContribution[]> {
      let query = supabase
        .from('master_profile_contributions')
        .select('*')
        .eq('master_profile_id', masterProfileId);

      if (field) {
        query = query.eq('field', field);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    },

    async resolveConflict(
      contributionId: string,
      resolvedBy: string,
      status: 'accepted' | 'rejected'
    ): Promise<ContributionResult> {
      const { data, error } = await supabase
        .from('master_profile_contributions')
        .update({
          status,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', contributionId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        contribution: transformContribution(data),
      };
    },

    async getPendingConflicts(masterProfileId?: string): Promise<RawContribution[]> {
      let query = supabase
        .from('master_profile_contributions')
        .select('*')
        .eq('status', 'pending');

      if (masterProfileId) {
        query = query.eq('master_profile_id', masterProfileId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    },
  };
}
