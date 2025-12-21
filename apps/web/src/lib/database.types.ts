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
}

export interface DbContactSkillUpdate {
  status?: SkillStatus;
  confidence?: number;
}

export interface DbContactNoteUpdate {
  content?: string;
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
    };
  };
}
