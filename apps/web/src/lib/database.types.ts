/**
 * Supabase database types for Social Recall
 * Generated from schema - keep in sync with migrations
 */

export type SkillStatus = 'pending' | 'confirmed' | 'rejected' | 'manual';

export interface DbContact {
  id: string;
  user_id: string;
  linkedin_id: string | null;
  name: string;
  headline: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  last_synced_at: string | null;
  is_new: boolean;
  // Contact consolidation fields
  google_id: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbContactEmployer {
  id: string;
  contact_id: string;
  company: string;
  title: string | null;
  logo_url: string | null;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbContactSkill {
  id: string;
  contact_id: string;
  name: string;
  category: string | null;
  confidence: number;
  status: SkillStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface DbContactNote {
  id: string;
  contact_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type ContactHistoryField = 'name' | 'headline' | 'location' | 'employers' | 'education';

export interface DbContactHistory {
  id: string;
  contact_id: string;
  field: ContactHistoryField;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  detected_at: string;
  created_at: string;
}

export interface DbContactHistoryInsert {
  contact_id: string;
  field: ContactHistoryField;
  old_value?: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  detected_at: string;
}

// =============================================================================
// CONTACT CONSOLIDATION (LinkedIn + Google merging)
// =============================================================================

export type ContactSourceType = 'linkedin' | 'google' | 'icloud' | 'manual';

export interface DbContactSource {
  id: string;
  contact_id: string;
  source: ContactSourceType;
  source_id: string;
  raw_data: Record<string, unknown> | null;
  imported_at: string;
  created_at: string;
}

export interface DbContactSourceInsert {
  contact_id: string;
  source: ContactSourceType;
  source_id: string;
  raw_data?: Record<string, unknown> | null;
  imported_at?: string;
}

export type PendingMatchStatus = 'pending' | 'confirmed' | 'rejected' | 'skipped';

export interface DbPendingMatch {
  id: string;
  user_id: string;
  linkedin_contact_id: string;
  google_resource_name: string;
  google_contact_data: Record<string, unknown>;
  score: number;
  signals: Record<string, unknown>;
  status: PendingMatchStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPendingMatchInsert {
  user_id: string;
  linkedin_contact_id: string;
  google_resource_name: string;
  google_contact_data: Record<string, unknown>;
  score: number;
  signals?: Record<string, unknown>;
  status?: PendingMatchStatus;
}

export interface DbPendingMatchUpdate {
  status?: PendingMatchStatus;
  reviewed_at?: string;
}

export type OpportunityType = 'new_company' | 'role_change' | 'left_job';

export interface DbOpportunity {
  id: string;
  contact_id: string;
  type: OpportunityType;
  description: string;
  detected_at: string;
  dismissed: boolean;
  snoozed_until: string | null;
  created_at: string;
}

// Relationship context - how you know someone
export type RelationshipType =
  | 'intro'           // Introduced by someone
  | 'conference'      // Met at event
  | 'worked_together' // Former colleague
  | 'co_investor'     // Co-invested in same company
  | 'portfolio'       // Founder in your portfolio
  | 'advisor'         // Advisory relationship
  | 'cold_outreach'   // Cold email/LinkedIn
  | 'other';          // Custom

export interface DbContactRelationship {
  id: string;
  contact_id: string;
  type: RelationshipType;
  context: string | null;           // "TechCrunch Disrupt 2024", "Series A"
  introduced_by_id: string | null;  // Reference to another contact
  shared_company: string | null;    // Company you both worked at / invested in
  relationship_date: string | null; // When you met/connected
  strength: number;                 // 1-5, how strong is the relationship
  created_at: string;
  updated_at: string;
}

// Insert types (without auto-generated fields)
export interface DbContactInsert {
  user_id: string;
  linkedin_id?: string | null;
  name: string;
  headline?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  last_synced_at?: string | null;
  is_new?: boolean;
  google_id?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
}

export interface DbContactEmployerInsert {
  contact_id: string;
  company: string;
  title?: string | null;
  logo_url?: string | null;
  is_current?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number;
}

export interface DbContactSkillInsert {
  contact_id: string;
  name: string;
  category?: string | null;
  confidence?: number;
  status: SkillStatus;
  source?: string;
}

export interface DbContactNoteInsert {
  contact_id: string;
  content: string;
}

export interface DbOpportunityInsert {
  contact_id: string;
  type: OpportunityType;
  description: string;
  detected_at?: string;
  dismissed?: boolean;
  snoozed_until?: string | null;
}

export interface DbOpportunityUpdate {
  dismissed?: boolean;
  snoozed_until?: string | null;
}

export interface DbContactRelationshipInsert {
  contact_id: string;
  type: RelationshipType;
  context?: string | null;
  introduced_by_id?: string | null;
  shared_company?: string | null;
  relationship_date?: string | null;
  strength?: number;
}

export interface DbContactRelationshipUpdate {
  type?: RelationshipType;
  context?: string | null;
  introduced_by_id?: string | null;
  shared_company?: string | null;
  relationship_date?: string | null;
  strength?: number;
}

// Update types
export interface DbContactUpdate {
  name?: string;
  headline?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  last_synced_at?: string | null;
  is_new?: boolean;
  google_id?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
}

export interface DbContactSkillUpdate {
  status?: SkillStatus;
  confidence?: number;
}

export interface DbContactNoteUpdate {
  content?: string;
}

// =============================================================================
// MASTER PROFILES (Crowdsourced LinkedIn Data)
// =============================================================================

export interface DbMasterProfile {
  id: string;
  linkedin_id: string;
  name: string;
  headline: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  location: string | null;
  first_contributed_by: string | null;
  first_seen_at: string;
  last_updated_at: string;
  contributor_count: number;
  update_count: number;
  created_at: string;
}

export interface DbMasterProfileEmployer {
  id: string;
  master_profile_id: string;
  company: string;
  title: string | null;
  logo_url: string | null;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  last_updated_by: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface DbMasterProfileHistory {
  id: string;
  master_profile_id: string;
  name: string;
  headline: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  location: string | null;
  contributed_by: string | null;
  created_at: string;
}

export type UserRelationshipType =
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

export interface DbUserProfileData {
  id: string;
  user_id: string;
  master_profile_id: string;
  notes: string | null;
  relationship_type: UserRelationshipType | null;
  relationship_context: string | null;
  relationship_strength: number;
  introduced_by_master_profile_id: string | null;
  is_new: boolean;
  first_seen_at: string;
  last_seen_at: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface DbUserProfileDataHistory {
  id: string;
  user_id: string;
  master_profile_id: string;
  version: number;
  notes: string | null;
  relationship_type: string | null;
  relationship_context: string | null;
  relationship_strength: number | null;
  tags_snapshot: string[]; // JSON array of tag names
  created_at: string;
}

export interface DbUserProfileTag {
  user_id: string;
  master_profile_id: string;
  tag_id: string;
  created_at: string;
}

// Insert types for master profiles
export interface DbMasterProfileInsert {
  linkedin_id: string;
  name: string;
  headline?: string | null;
  avatar_url?: string | null;
  profile_url?: string | null;
  location?: string | null;
  first_contributed_by?: string | null;
}

export interface DbMasterProfileEmployerInsert {
  master_profile_id: string;
  company: string;
  title?: string | null;
  logo_url?: string | null;
  is_current?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number;
  last_updated_by?: string | null;
}

export interface DbUserProfileDataInsert {
  user_id: string;
  master_profile_id: string;
  notes?: string | null;
  relationship_type?: UserRelationshipType | null;
  relationship_context?: string | null;
  relationship_strength?: number;
  introduced_by_master_profile_id?: string | null;
  is_new?: boolean;
}

export interface DbUserProfileDataUpdate {
  notes?: string | null;
  relationship_type?: UserRelationshipType | null;
  relationship_context?: string | null;
  relationship_strength?: number;
  introduced_by_master_profile_id?: string | null;
  is_new?: boolean;
  last_seen_at?: string;
}

// Tags for organizing contacts
export interface DbTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DbContactTag {
  contact_id: string;
  tag_id: string;
  created_at: string;
}

export interface DbTagInsert {
  user_id: string;
  name: string;
  color?: string;
}

export interface DbContactTagInsert {
  contact_id: string;
  tag_id: string;
}

// Full contact with relations
export interface ContactWithRelations extends DbContact {
  employers: DbContactEmployer[];
  skills: DbContactSkill[];
  notes: DbContactNote[];
}

// Database type definition for Supabase client
export interface Database {
  public: {
    Tables: {
      // Legacy contacts tables (being migrated to master profiles)
      contacts: {
        Row: DbContact;
        Insert: DbContactInsert;
        Update: DbContactUpdate;
      };
      contact_employers: {
        Row: DbContactEmployer;
        Insert: DbContactEmployerInsert;
        Update: Partial<DbContactEmployerInsert>;
      };
      contact_skills: {
        Row: DbContactSkill;
        Insert: DbContactSkillInsert;
        Update: DbContactSkillUpdate;
      };
      contact_notes: {
        Row: DbContactNote;
        Insert: DbContactNoteInsert;
        Update: DbContactNoteUpdate;
      };
      contact_history: {
        Row: DbContactHistory;
        Insert: DbContactHistoryInsert;
        Update: never;
      };
      contact_sources: {
        Row: DbContactSource;
        Insert: DbContactSourceInsert;
        Update: never;
      };
      pending_matches: {
        Row: DbPendingMatch;
        Insert: DbPendingMatchInsert;
        Update: DbPendingMatchUpdate;
      };
      opportunities: {
        Row: DbOpportunity;
        Insert: DbOpportunityInsert;
        Update: DbOpportunityUpdate;
      };
      contact_relationships: {
        Row: DbContactRelationship;
        Insert: DbContactRelationshipInsert;
        Update: DbContactRelationshipUpdate;
      };
      tags: {
        Row: DbTag;
        Insert: DbTagInsert;
        Update: Partial<DbTagInsert>;
      };
      contact_tags: {
        Row: DbContactTag;
        Insert: DbContactTagInsert;
        Update: never;
      };

      // Master profiles tables (crowdsourced data architecture)
      master_profiles: {
        Row: DbMasterProfile;
        Insert: DbMasterProfileInsert;
        Update: Partial<DbMasterProfileInsert>;
      };
      master_profile_employers: {
        Row: DbMasterProfileEmployer;
        Insert: DbMasterProfileEmployerInsert;
        Update: Partial<DbMasterProfileEmployerInsert>;
      };
      master_profile_history: {
        Row: DbMasterProfileHistory;
        Insert: never; // Inserted by trigger only
        Update: never;
      };
      user_profile_data: {
        Row: DbUserProfileData;
        Insert: DbUserProfileDataInsert;
        Update: DbUserProfileDataUpdate;
      };
      user_profile_data_history: {
        Row: DbUserProfileDataHistory;
        Insert: never; // Inserted by trigger only
        Update: never;
      };
      user_profile_tags: {
        Row: DbUserProfileTag;
        Insert: Omit<DbUserProfileTag, 'created_at'>;
        Update: never;
      };
    };
  };
}
