"use client";

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DbOpportunity, DbContact } from './database.types';
import type { OpportunityType, Contact as DetectionContact } from './opportunities';
import { detectOpportunities } from './opportunities';

export interface OpportunityContactDisplay {
  id: string;
  name: string;
  headline: string | null;
}

export interface Opportunity {
  id: string;
  contactId: string;
  type: OpportunityType;
  description: string;
  detectedAt: string;
  dismissed: boolean;
  snoozedUntil: string | null;
  contact: OpportunityContactDisplay;
}

export interface CreateOpportunityInput {
  contactId: string;
  type: OpportunityType;
  description: string;
}

export interface CreatedOpportunity {
  id: string;
  contactId: string;
  type: OpportunityType;
  description: string;
  detectedAt: string;
}

export interface ListOpportunitiesOptions {
  type?: OpportunityType;
  includeDismissed?: boolean;
  includeSnoozed?: boolean;
  limit?: number;
}

export interface OpportunityRepository {
  listOpportunities(userId: string, options?: ListOpportunitiesOptions): Promise<Opportunity[]>;
  dismissOpportunity(opportunityId: string): Promise<void>;
  snoozeOpportunity(opportunityId: string, days: number): Promise<void>;
  createOpportunity(input: CreateOpportunityInput): Promise<CreatedOpportunity>;
  detectAndCreateOpportunities(before: DetectionContact, after: DetectionContact): Promise<CreatedOpportunity[]>;
}

// Type for the joined query result
interface OpportunityWithContact extends DbOpportunity {
  contacts: Pick<DbContact, 'id' | 'name' | 'headline'>;
}

export function createOpportunityRepository(
  supabase: SupabaseClient<Database>
): OpportunityRepository {
  return {
    async listOpportunities(
      userId: string,
      options: ListOpportunitiesOptions = {}
    ): Promise<Opportunity[]> {
      const { type, includeDismissed = false, includeSnoozed = false, limit = 50 } = options;

      // Build query with proper typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('opportunities')
        .select(`
          id,
          contact_id,
          type,
          description,
          detected_at,
          dismissed,
          snoozed_until,
          created_at,
          contacts!inner (
            id,
            name,
            headline
          )
        `)
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      if (!includeDismissed) {
        query = query.eq('dismissed', false);
      }

      if (!includeSnoozed) {
        query = query.or('snoozed_until.is.null,snoozed_until.lt.now()');
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch opportunities: ${error.message}`);
      }

      // Cast to proper type and filter by user
      const opportunities = (data as unknown as OpportunityWithContact[]) || [];

      return opportunities.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        type: row.type as OpportunityType,
        description: row.description,
        detectedAt: row.detected_at,
        dismissed: row.dismissed,
        snoozedUntil: row.snoozed_until,
        contact: {
          id: row.contacts.id,
          name: row.contacts.name,
          headline: row.contacts.headline,
        },
      }));
    },

    async dismissOpportunity(opportunityId: string): Promise<void> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('opportunities')
        .update({ dismissed: true })
        .eq('id', opportunityId);

      if (error) {
        throw new Error(`Failed to dismiss opportunity: ${error.message}`);
      }
    },

    async snoozeOpportunity(opportunityId: string, days: number): Promise<void> {
      const snoozeDate = new Date();
      snoozeDate.setDate(snoozeDate.getDate() + days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('opportunities')
        .update({ snoozed_until: snoozeDate.toISOString() })
        .eq('id', opportunityId);

      if (error) {
        throw new Error(`Failed to snooze opportunity: ${error.message}`);
      }
    },

    async createOpportunity(input: CreateOpportunityInput): Promise<CreatedOpportunity> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('opportunities')
        .insert({
          contact_id: input.contactId,
          type: input.type,
          description: input.description,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create opportunity: ${error.message}`);
      }

      return {
        id: data.id,
        contactId: data.contact_id,
        type: data.type as OpportunityType,
        description: data.description,
        detectedAt: data.detected_at,
      };
    },

    async detectAndCreateOpportunities(
      before: DetectionContact,
      after: DetectionContact
    ): Promise<CreatedOpportunity[]> {
      const detectedOpportunities = detectOpportunities(before, after);

      if (detectedOpportunities.length === 0) {
        return [];
      }

      const createdOpportunities: CreatedOpportunity[] = [];

      for (const opportunity of detectedOpportunities) {
        const created = await this.createOpportunity({
          contactId: after.id,
          type: opportunity.type,
          description: opportunity.description,
        });
        createdOpportunities.push(created);
      }

      return createdOpportunities;
    },
  };
}
