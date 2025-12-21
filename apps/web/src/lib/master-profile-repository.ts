/**
 * Master Profile Repository
 * Handles operations on the crowdsourced master profiles and user-specific profile data
 *
 * Architecture:
 * - master_profiles: Canonical LinkedIn profile data (never deleted, only updated)
 * - user_profile_data: User's private notes, relationships, tags per profile
 * - History tables automatically track all changes via triggers
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface MasterProfile {
  id: string;
  linkedinId: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  location: string | null;
  firstSeenAt: string;
  lastUpdatedAt: string;
  updateCount: number;
  createdAt: string;
}

export interface MasterProfileEmployer {
  id: string;
  masterProfileId: string;
  company: string;
  title: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface UserProfileData {
  id: string;
  userId: string;
  masterProfileId: string;
  notes: string | null;
  relationshipType: RelationshipType | null;
  relationshipContext: string | null;
  relationshipStrength: number;
  introducedByMasterProfileId: string | null;
  isNew: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType =
  | 'intro'
  | 'conference'
  | 'worked_together'
  | 'co_investor'
  | 'portfolio'
  | 'advisor'
  | 'cold_outreach'
  | 'friend'
  | 'family'
  | 'other';

// Combined view type (master profile + user's data)
export interface UserContact {
  masterProfileId: string;
  linkedinId: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  location: string | null;
  notes: string | null;
  relationshipType: RelationshipType | null;
  relationshipContext: string | null;
  relationshipStrength: number;
  isNew: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  currentVersion: number;
  employers: MasterProfileEmployer[];
  tags: UserContactTag[];
}

export interface UserContactTag {
  id: string;
  name: string;
  color: string;
}

// Input types
export interface MasterProfileInput {
  linkedinId: string;
  name: string;
  headline?: string;
  avatarUrl?: string;
  profileUrl?: string;
  location?: string;
}

export interface EmployerInput {
  company: string;
  title?: string;
  logoUrl?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UserProfileDataInput {
  notes?: string;
  relationshipType?: RelationshipType;
  relationshipContext?: string;
  relationshipStrength?: number;
  introducedByMasterProfileId?: string;
}

// List options
export interface ListUserContactsOptions {
  search?: string;
  isNew?: boolean;
  tag?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMasterProfile(db: any): MasterProfile {
  return {
    id: db.id,
    linkedinId: db.linkedin_id,
    name: db.name,
    headline: db.headline,
    avatarUrl: db.avatar_url,
    profileUrl: db.profile_url,
    location: db.location,
    firstSeenAt: db.first_seen_at,
    lastUpdatedAt: db.last_updated_at,
    updateCount: db.update_count,
    createdAt: db.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformEmployer(db: any): MasterProfileEmployer {
  return {
    id: db.id,
    masterProfileId: db.master_profile_id,
    company: db.company,
    title: db.title,
    logoUrl: db.logo_url,
    isCurrent: db.is_current,
    startDate: db.start_date,
    endDate: db.end_date,
    sortOrder: db.sort_order,
    lastUpdatedAt: db.last_updated_at,
    createdAt: db.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformUserProfileData(db: any): UserProfileData {
  return {
    id: db.id,
    userId: db.user_id,
    masterProfileId: db.master_profile_id,
    notes: db.notes,
    relationshipType: db.relationship_type,
    relationshipContext: db.relationship_context,
    relationshipStrength: db.relationship_strength,
    introducedByMasterProfileId: db.introduced_by_master_profile_id,
    isNew: db.is_new,
    firstSeenAt: db.first_seen_at,
    lastSeenAt: db.last_seen_at,
    currentVersion: db.current_version,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

export interface MasterProfileRepository {
  // Master profiles
  upsertMasterProfile(input: MasterProfileInput): Promise<MasterProfile>;
  getMasterProfile(linkedinId: string): Promise<MasterProfile | null>;
  getMasterProfileById(id: string): Promise<MasterProfile | null>;

  // Master profile employers
  upsertEmployers(masterProfileId: string, employers: EmployerInput[]): Promise<MasterProfileEmployer[]>;
  getEmployers(masterProfileId: string): Promise<MasterProfileEmployer[]>;

  // User profile data
  upsertUserProfileData(userId: string, masterProfileId: string, input?: UserProfileDataInput): Promise<UserProfileData>;
  getUserProfileData(userId: string, masterProfileId: string): Promise<UserProfileData | null>;
  updateUserNotes(userId: string, masterProfileId: string, notes: string): Promise<UserProfileData>;
  updateUserRelationship(userId: string, masterProfileId: string, input: Partial<UserProfileDataInput>): Promise<UserProfileData>;
  markAsSeen(userId: string, masterProfileId: string): Promise<void>;

  // User profile tags
  addTag(userId: string, masterProfileId: string, tagId: string): Promise<void>;
  removeTag(userId: string, masterProfileId: string, tagId: string): Promise<void>;
  getTags(userId: string, masterProfileId: string): Promise<UserContactTag[]>;

  // Combined queries
  listUserContacts(userId: string, options?: ListUserContactsOptions): Promise<UserContact[]>;
  getUserContact(userId: string, linkedinId: string): Promise<UserContact | null>;
  countUserContacts(userId: string): Promise<{ total: number; new: number }>;

  // Sync from extension (combines master profile + user data upsert)
  syncFromExtension(
    userId: string,
    data: {
      linkedinId: string;
      name: string;
      headline?: string;
      avatarUrl?: string;
      profileUrl?: string;
      employers?: EmployerInput[];
      note?: string;
    }
  ): Promise<{ masterProfile: MasterProfile; userProfileData: UserProfileData }>;
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export function createMasterProfileRepository(
  supabase: SupabaseClient
): MasterProfileRepository {
  return {
    // =========================================================================
    // MASTER PROFILES
    // =========================================================================

    async upsertMasterProfile(input: MasterProfileInput): Promise<MasterProfile> {
      // Use the database function for atomic upsert with history
      const { data, error } = await supabase.rpc('upsert_master_profile', {
        p_linkedin_id: input.linkedinId,
        p_name: input.name,
        p_headline: input.headline || null,
        p_avatar_url: input.avatarUrl || null,
        p_profile_url: input.profileUrl || null,
        p_location: input.location || null,
      });

      if (error) throw new Error(error.message);

      // Fetch the profile
      const profile = await this.getMasterProfileById(data);
      if (!profile) throw new Error('Failed to fetch created/updated profile');

      return profile;
    },

    async getMasterProfile(linkedinId: string): Promise<MasterProfile | null> {
      const { data, error } = await supabase
        .from('master_profiles')
        .select('*')
        .eq('linkedin_id', linkedinId)
        .single();

      if (error || !data) return null;
      return transformMasterProfile(data);
    },

    async getMasterProfileById(id: string): Promise<MasterProfile | null> {
      const { data, error } = await supabase
        .from('master_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return transformMasterProfile(data);
    },

    // =========================================================================
    // MASTER PROFILE EMPLOYERS
    // =========================================================================

    async upsertEmployers(
      masterProfileId: string,
      employers: EmployerInput[]
    ): Promise<MasterProfileEmployer[]> {
      if (employers.length === 0) return [];

      // Upsert each employer
      const results: MasterProfileEmployer[] = [];

      for (let i = 0; i < employers.length; i++) {
        const emp = employers[i];

        const { data, error } = await supabase
          .from('master_profile_employers')
          .upsert(
            {
              master_profile_id: masterProfileId,
              company: emp.company,
              title: emp.title || null,
              logo_url: emp.logoUrl || null,
              is_current: emp.isCurrent ?? (i === 0), // First is current by default
              start_date: emp.startDate || null,
              end_date: emp.endDate || null,
              sort_order: i,
              last_updated_at: new Date().toISOString(),
            },
            { onConflict: 'master_profile_id,company,title' }
          )
          .select()
          .single();

        if (error) {
          console.error('Error upserting employer:', error);
          continue;
        }

        results.push(transformEmployer(data));
      }

      return results;
    },

    async getEmployers(masterProfileId: string): Promise<MasterProfileEmployer[]> {
      const { data, error } = await supabase
        .from('master_profile_employers')
        .select('*')
        .eq('master_profile_id', masterProfileId)
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []).map(transformEmployer);
    },

    // =========================================================================
    // USER PROFILE DATA
    // =========================================================================

    async upsertUserProfileData(
      userId: string,
      masterProfileId: string,
      input?: UserProfileDataInput
    ): Promise<UserProfileData> {
      // Check if exists
      const existing = await this.getUserProfileData(userId, masterProfileId);

      if (existing) {
        // Update existing - this will trigger history append
        const { data, error } = await supabase
          .from('user_profile_data')
          .update({
            notes: input?.notes ?? existing.notes,
            relationship_type: input?.relationshipType ?? existing.relationshipType,
            relationship_context: input?.relationshipContext ?? existing.relationshipContext,
            relationship_strength: input?.relationshipStrength ?? existing.relationshipStrength,
            introduced_by_master_profile_id: input?.introducedByMasterProfileId ?? existing.introducedByMasterProfileId,
            last_seen_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('master_profile_id', masterProfileId)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return transformUserProfileData(data);
      } else {
        // Create new - trigger will record initial history
        const { data, error } = await supabase
          .from('user_profile_data')
          .insert({
            user_id: userId,
            master_profile_id: masterProfileId,
            notes: input?.notes || null,
            relationship_type: input?.relationshipType || null,
            relationship_context: input?.relationshipContext || null,
            relationship_strength: input?.relationshipStrength ?? 3,
            introduced_by_master_profile_id: input?.introducedByMasterProfileId || null,
            is_new: true,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            current_version: 1,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return transformUserProfileData(data);
      }
    },

    async getUserProfileData(
      userId: string,
      masterProfileId: string
    ): Promise<UserProfileData | null> {
      const { data, error } = await supabase
        .from('user_profile_data')
        .select('*')
        .eq('user_id', userId)
        .eq('master_profile_id', masterProfileId)
        .single();

      if (error || !data) return null;
      return transformUserProfileData(data);
    },

    async updateUserNotes(
      userId: string,
      masterProfileId: string,
      notes: string
    ): Promise<UserProfileData> {
      return this.upsertUserProfileData(userId, masterProfileId, { notes });
    },

    async updateUserRelationship(
      userId: string,
      masterProfileId: string,
      input: Partial<UserProfileDataInput>
    ): Promise<UserProfileData> {
      return this.upsertUserProfileData(userId, masterProfileId, input);
    },

    async markAsSeen(userId: string, masterProfileId: string): Promise<void> {
      const { error } = await supabase
        .from('user_profile_data')
        .update({ is_new: false })
        .eq('user_id', userId)
        .eq('master_profile_id', masterProfileId);

      if (error) throw new Error(error.message);
    },

    // =========================================================================
    // USER PROFILE TAGS
    // =========================================================================

    async addTag(userId: string, masterProfileId: string, tagId: string): Promise<void> {
      const { error } = await supabase.from('user_profile_tags').upsert(
        {
          user_id: userId,
          master_profile_id: masterProfileId,
          tag_id: tagId,
        },
        { onConflict: 'user_id,master_profile_id,tag_id' }
      );

      if (error) throw new Error(error.message);
    },

    async removeTag(userId: string, masterProfileId: string, tagId: string): Promise<void> {
      const { error } = await supabase
        .from('user_profile_tags')
        .delete()
        .eq('user_id', userId)
        .eq('master_profile_id', masterProfileId)
        .eq('tag_id', tagId);

      if (error) throw new Error(error.message);
    },

    async getTags(userId: string, masterProfileId: string): Promise<UserContactTag[]> {
      const { data, error } = await supabase
        .from('user_profile_tags')
        .select('tag_id, tags(id, name, color)')
        .eq('user_id', userId)
        .eq('master_profile_id', masterProfileId);

      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((row: any) => ({
        id: row.tags.id,
        name: row.tags.name,
        color: row.tags.color,
      }));
    },

    // =========================================================================
    // COMBINED QUERIES
    // =========================================================================

    async listUserContacts(
      userId: string,
      options?: ListUserContactsOptions
    ): Promise<UserContact[]> {
      const limit = options?.limit ?? 50;

      // Use the user_contacts view for efficient querying
      let query = supabase
        .from('user_contacts')
        .select('*')
        .order('last_seen_at', { ascending: false });

      if (options?.search) {
        const searchPattern = `%${options.search}%`;
        query = query.or(`name.ilike.${searchPattern},headline.ilike.${searchPattern}`);
      }

      if (options?.isNew !== undefined) {
        query = query.eq('is_new', options.isNew);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + limit - 1);
      } else {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // For each contact, fetch employers and tags
      const contacts: UserContact[] = [];

      for (const row of data || []) {
        const employers = await this.getEmployers(row.master_profile_id);
        const tags = await this.getTags(userId, row.master_profile_id);

        contacts.push({
          masterProfileId: row.master_profile_id,
          linkedinId: row.linkedin_id,
          name: row.name,
          headline: row.headline,
          avatarUrl: row.avatar_url,
          profileUrl: row.profile_url,
          location: row.location,
          notes: row.notes,
          relationshipType: row.relationship_type,
          relationshipContext: row.relationship_context,
          relationshipStrength: row.relationship_strength,
          isNew: row.is_new,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          currentVersion: row.current_version,
          employers,
          tags,
        });
      }

      return contacts;
    },

    async getUserContact(userId: string, linkedinId: string): Promise<UserContact | null> {
      // First get the master profile
      const masterProfile = await this.getMasterProfile(linkedinId);
      if (!masterProfile) return null;

      // Get user's data for this profile
      const userData = await this.getUserProfileData(userId, masterProfile.id);
      if (!userData) return null;

      // Get employers and tags
      const employers = await this.getEmployers(masterProfile.id);
      const tags = await this.getTags(userId, masterProfile.id);

      return {
        masterProfileId: masterProfile.id,
        linkedinId: masterProfile.linkedinId,
        name: masterProfile.name,
        headline: masterProfile.headline,
        avatarUrl: masterProfile.avatarUrl,
        profileUrl: masterProfile.profileUrl,
        location: masterProfile.location,
        notes: userData.notes,
        relationshipType: userData.relationshipType,
        relationshipContext: userData.relationshipContext,
        relationshipStrength: userData.relationshipStrength,
        isNew: userData.isNew,
        firstSeenAt: userData.firstSeenAt,
        lastSeenAt: userData.lastSeenAt,
        currentVersion: userData.currentVersion,
        employers,
        tags,
      };
    },

    async countUserContacts(userId: string): Promise<{ total: number; new: number }> {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('user_profile_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get new count
      const { count: newCount, error: newError } = await supabase
        .from('user_profile_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_new', true);

      if (totalError || newError) {
        return { total: 0, new: 0 };
      }

      return {
        total: totalCount ?? 0,
        new: newCount ?? 0,
      };
    },

    // =========================================================================
    // SYNC FROM EXTENSION
    // =========================================================================

    async syncFromExtension(
      userId: string,
      data: {
        linkedinId: string;
        name: string;
        headline?: string;
        avatarUrl?: string;
        profileUrl?: string;
        employers?: EmployerInput[];
        note?: string;
      }
    ): Promise<{ masterProfile: MasterProfile; userProfileData: UserProfileData }> {
      // 1. Upsert master profile (canonical data)
      const masterProfile = await this.upsertMasterProfile({
        linkedinId: data.linkedinId,
        name: data.name,
        headline: data.headline,
        avatarUrl: data.avatarUrl,
        profileUrl: data.profileUrl,
      });

      // 2. Upsert employers
      if (data.employers && data.employers.length > 0) {
        await this.upsertEmployers(masterProfile.id, data.employers);
      }

      // 3. Upsert user's profile data
      const userProfileData = await this.upsertUserProfileData(
        userId,
        masterProfile.id,
        data.note ? { notes: data.note } : undefined
      );

      return { masterProfile, userProfileData };
    },
  };
}
