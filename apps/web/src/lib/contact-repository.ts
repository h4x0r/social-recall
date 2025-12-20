/**
 * Contact repository for Supabase persistence
 * Handles CRUD operations for contacts, employers, skills, and notes
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbContact,
  DbContactEmployer,
  DbContactSkill,
  DbContactNote,
  DbContactRelationship,
  SkillStatus,
  RelationshipType,
} from './database.types';

// Input types (camelCase for app use)
export interface ContactInput {
  userId: string;
  name: string;
  headline?: string;
  linkedinId?: string;
  profileUrl?: string;
  avatarUrl?: string;
  employers?: EmployerInput[];
}

export interface EmployerInput {
  company: string;
  title?: string;
  logoUrl?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SkillInput {
  name: string;
  category?: string;
  confidence?: number;
  status: SkillStatus;
  source?: string;
}

export interface NoteInput {
  content: string;
}

// Output types (camelCase for app use)
export interface Contact {
  id: string;
  userId: string;
  linkedinId: string | null;
  name: string;
  headline: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  lastSyncedAt: string | null;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employer {
  id: string;
  contactId: string;
  company: string;
  title: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Skill {
  id: string;
  contactId: string;
  name: string;
  category: string | null;
  confidence: number;
  status: SkillStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  contactId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  contactId: string;
  type: RelationshipType;
  context: string | null;
  introducedById: string | null;
  introducedByName: string | null;
  sharedCompany: string | null;
  relationshipDate: string | null;
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipInput {
  type: RelationshipType;
  context?: string | null;
  introducedById?: string | null;
  sharedCompany?: string | null;
  relationshipDate?: string | null;
  strength?: number;
}

export interface ContactWithRelations extends Contact {
  employers: Employer[];
  skills: Skill[];
  notes: Note[];
  relationships: Relationship[];
}

export interface ContactUpdateInput {
  name?: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
  isNew?: boolean;
}

export interface ListContactsOptions {
  isNew?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListSkillsOptions {
  status?: SkillStatus;
}

export interface LinkedInData {
  linkedinId: string;
  name: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
  employers?: EmployerInput[];
}

// Transform functions: snake_case (DB) -> camelCase (App)
function transformContact(db: DbContact): Contact {
  return {
    id: db.id,
    userId: db.user_id,
    linkedinId: db.linkedin_id,
    name: db.name,
    headline: db.headline,
    profileUrl: db.profile_url,
    avatarUrl: db.avatar_url,
    lastSyncedAt: db.last_synced_at,
    isNew: db.is_new,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function transformEmployer(db: DbContactEmployer): Employer {
  return {
    id: db.id,
    contactId: db.contact_id,
    company: db.company,
    title: db.title,
    logoUrl: db.logo_url,
    isCurrent: db.is_current,
    startDate: db.start_date,
    endDate: db.end_date,
    sortOrder: db.sort_order,
    createdAt: db.created_at,
  };
}

function transformSkill(db: DbContactSkill): Skill {
  return {
    id: db.id,
    contactId: db.contact_id,
    name: db.name,
    category: db.category,
    confidence: db.confidence,
    status: db.status,
    source: db.source,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function transformNote(db: DbContactNote): Note {
  return {
    id: db.id,
    contactId: db.contact_id,
    content: db.content,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function transformRelationship(
  db: DbContactRelationship,
  introducedByName?: string | null
): Relationship {
  return {
    id: db.id,
    contactId: db.contact_id,
    type: db.type,
    context: db.context,
    introducedById: db.introduced_by_id,
    introducedByName: introducedByName ?? null,
    sharedCompany: db.shared_company,
    relationshipDate: db.relationship_date,
    strength: db.strength,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export interface ContactRepository {
  createContact(input: ContactInput): Promise<Contact>;
  getContact(id: string): Promise<ContactWithRelations | null>;
  listContacts(userId: string, options?: ListContactsOptions): Promise<Contact[]>;
  updateContact(id: string, input: ContactUpdateInput): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  markContactAsSeen(id: string): Promise<void>;
  upsertFromLinkedIn(userId: string, data: LinkedInData): Promise<Contact>;

  addEmployer(contactId: string, input: EmployerInput): Promise<Employer>;
  removeEmployer(id: string): Promise<void>;

  addSkill(contactId: string, input: SkillInput): Promise<Skill>;
  updateSkillStatus(id: string, status: SkillStatus): Promise<Skill>;
  listSkills(contactId: string, options?: ListSkillsOptions): Promise<Skill[]>;

  addNote(contactId: string, input: NoteInput): Promise<Note>;
  updateNote(id: string, input: NoteInput): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  listNotes(contactId: string): Promise<Note[]>;

  // Relationship methods
  addRelationship(contactId: string, input: RelationshipInput): Promise<Relationship>;
  updateRelationship(id: string, input: Partial<RelationshipInput>): Promise<Relationship>;
  deleteRelationship(id: string): Promise<void>;
  getRelationship(contactId: string): Promise<Relationship | null>;
}

export function createContactRepository(
  supabase: SupabaseClient
): ContactRepository {
  return {
    async createContact(input: ContactInput): Promise<Contact> {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: input.userId,
          name: input.name,
          headline: input.headline,
          linkedin_id: input.linkedinId,
          profile_url: input.profileUrl,
          avatar_url: input.avatarUrl,
          is_new: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Add employers if provided
      if (input.employers && input.employers.length > 0) {
        const employerInserts = input.employers.map((emp, index) => ({
          contact_id: data.id,
          company: emp.company,
          title: emp.title,
          logo_url: emp.logoUrl,
          is_current: emp.isCurrent ?? false,
          start_date: emp.startDate,
          end_date: emp.endDate,
          sort_order: index,
        }));

        await supabase.from('contact_employers').insert(employerInserts);
      }

      return transformContact(data);
    },

    async getContact(id: string): Promise<ContactWithRelations | null> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contacts')
        .select(
          `
          *,
          employers:contact_employers(*),
          skills:contact_skills(*),
          notes:contact_notes(*),
          relationships:contact_relationships(*)
        `
        )
        .eq('id', id)
        .single();

      if (error || !data) return null;

      // Fetch introducer names for relationships
      const relationships = await Promise.all(
        (data.relationships || []).map(async (rel: DbContactRelationship) => {
          let introducedByName: string | null = null;
          if (rel.introduced_by_id) {
            const { data: introducer } = await supabase
              .from('contacts')
              .select('name')
              .eq('id', rel.introduced_by_id)
              .single();
            introducedByName = introducer?.name ?? null;
          }
          return transformRelationship(rel, introducedByName);
        })
      );

      return {
        ...transformContact(data),
        employers: (data.employers || []).map(transformEmployer),
        skills: (data.skills || []).map(transformSkill),
        notes: (data.notes || []).map(transformNote),
        relationships,
      };
    },

    async listContacts(
      userId: string,
      options?: ListContactsOptions
    ): Promise<Contact[]> {
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (options?.isNew !== undefined) {
        query = query.eq('is_new', options.isNew);
      }

      // Search by name or headline (case-insensitive)
      if (options?.search) {
        const searchPattern = `%${options.search}%`;
        query = query.or(`name.ilike.${searchPattern},headline.ilike.${searchPattern}`);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data || []).map(transformContact);
    },

    async updateContact(id: string, input: ContactUpdateInput): Promise<Contact> {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.headline !== undefined) updateData.headline = input.headline;
      if (input.profileUrl !== undefined) updateData.profile_url = input.profileUrl;
      if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
      if (input.isNew !== undefined) updateData.is_new = input.isNew;

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformContact(data);
    },

    async deleteContact(id: string): Promise<void> {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async markContactAsSeen(id: string): Promise<void> {
      const { error } = await supabase
        .from('contacts')
        .update({ is_new: false })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async upsertFromLinkedIn(
      userId: string,
      data: LinkedInData
    ): Promise<Contact> {
      // First, try to find existing contact by linkedinId
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('linkedin_id', data.linkedinId)
        .single();

      if (existing) {
        // Update existing contact
        const { data: updated, error } = await supabase
          .from('contacts')
          .update({
            name: data.name,
            headline: data.headline,
            profile_url: data.profileUrl,
            avatar_url: data.avatarUrl,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Update employers if provided
        if (data.employers && data.employers.length > 0) {
          // Delete old employers and add new ones
          await supabase
            .from('contact_employers')
            .delete()
            .eq('contact_id', existing.id);

          const employerInserts = data.employers.map((emp, index) => ({
            contact_id: existing.id,
            company: emp.company,
            title: emp.title,
            logo_url: emp.logoUrl,
            is_current: emp.isCurrent ?? false,
            sort_order: index,
          }));

          await supabase.from('contact_employers').insert(employerInserts);
        }

        return transformContact(updated);
      } else {
        // Create new contact
        return this.createContact({
          userId,
          name: data.name,
          headline: data.headline,
          linkedinId: data.linkedinId,
          profileUrl: data.profileUrl,
          avatarUrl: data.avatarUrl,
          employers: data.employers,
        });
      }
    },

    async addEmployer(contactId: string, input: EmployerInput): Promise<Employer> {
      const { data, error } = await supabase
        .from('contact_employers')
        .insert({
          contact_id: contactId,
          company: input.company,
          title: input.title,
          logo_url: input.logoUrl,
          is_current: input.isCurrent ?? false,
          start_date: input.startDate,
          end_date: input.endDate,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformEmployer(data);
    },

    async removeEmployer(id: string): Promise<void> {
      const { error } = await supabase
        .from('contact_employers')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async addSkill(contactId: string, input: SkillInput): Promise<Skill> {
      const { data, error } = await supabase
        .from('contact_skills')
        .insert({
          contact_id: contactId,
          name: input.name,
          category: input.category,
          confidence: input.confidence ?? 1.0,
          status: input.status,
          source: input.source ?? 'inferred',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformSkill(data);
    },

    async updateSkillStatus(id: string, status: SkillStatus): Promise<Skill> {
      const { data, error } = await supabase
        .from('contact_skills')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformSkill(data);
    },

    async listSkills(
      contactId: string,
      options?: ListSkillsOptions
    ): Promise<Skill[]> {
      let query = supabase
        .from('contact_skills')
        .select('*')
        .eq('contact_id', contactId);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data || []).map(transformSkill);
    },

    async addNote(contactId: string, input: NoteInput): Promise<Note> {
      const { data, error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: contactId,
          content: input.content,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformNote(data);
    },

    async updateNote(id: string, input: NoteInput): Promise<Note> {
      const { data, error } = await supabase
        .from('contact_notes')
        .update({ content: input.content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return transformNote(data);
    },

    async deleteNote(id: string): Promise<void> {
      const { error } = await supabase
        .from('contact_notes')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async listNotes(contactId: string): Promise<Note[]> {
      const { data, error } = await supabase
        .from('contact_notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map(transformNote);
    },

    async addRelationship(
      contactId: string,
      input: RelationshipInput
    ): Promise<Relationship> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contact_relationships')
        .insert({
          contact_id: contactId,
          type: input.type,
          context: input.context,
          introduced_by_id: input.introducedById,
          shared_company: input.sharedCompany,
          relationship_date: input.relationshipDate,
          strength: input.strength ?? 3,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Fetch introducer name if needed
      let introducedByName: string | null = null;
      if (data.introduced_by_id) {
        const { data: introducer } = await supabase
          .from('contacts')
          .select('name')
          .eq('id', data.introduced_by_id)
          .single();
        introducedByName = introducer?.name ?? null;
      }

      return transformRelationship(data, introducedByName);
    },

    async updateRelationship(
      id: string,
      input: Partial<RelationshipInput>
    ): Promise<Relationship> {
      const updateData: Record<string, unknown> = {};
      if (input.type !== undefined) updateData.type = input.type;
      if (input.context !== undefined) updateData.context = input.context;
      if (input.introducedById !== undefined) updateData.introduced_by_id = input.introducedById;
      if (input.sharedCompany !== undefined) updateData.shared_company = input.sharedCompany;
      if (input.relationshipDate !== undefined) updateData.relationship_date = input.relationshipDate;
      if (input.strength !== undefined) updateData.strength = input.strength;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contact_relationships')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Fetch introducer name if needed
      let introducedByName: string | null = null;
      if (data.introduced_by_id) {
        const { data: introducer } = await supabase
          .from('contacts')
          .select('name')
          .eq('id', data.introduced_by_id)
          .single();
        introducedByName = introducer?.name ?? null;
      }

      return transformRelationship(data, introducedByName);
    },

    async deleteRelationship(id: string): Promise<void> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('contact_relationships')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async getRelationship(contactId: string): Promise<Relationship | null> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contact_relationships')
        .select('*')
        .eq('contact_id', contactId)
        .single();

      if (error || !data) return null;

      // Fetch introducer name if needed
      let introducedByName: string | null = null;
      if (data.introduced_by_id) {
        const { data: introducer } = await supabase
          .from('contacts')
          .select('name')
          .eq('id', data.introduced_by_id)
          .single();
        introducedByName = introducer?.name ?? null;
      }

      return transformRelationship(data, introducedByName);
    },
  };
}
