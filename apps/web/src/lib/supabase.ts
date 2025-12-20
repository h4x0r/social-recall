/**
 * Supabase client and AI inference helpers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create typed Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Re-export repository factories for dependency injection
export { createContactRepository } from './contact-repository';
export type { ContactRepository } from './contact-repository';
export { createOpportunityRepository } from './opportunity-repository';
export type { OpportunityRepository, Opportunity } from './opportunity-repository';

// Types for AI inference responses
export interface InferSkillsResponse {
  success: boolean;
  skills?: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ProfileData {
  name: string;
  headline: string;
  employers?: Array<{ company: string; logo: string }>;
  notes?: string;
}

/**
 * Calls the Next.js API route to extract skills from a profile using Claude
 */
export async function inferSkills(profile: ProfileData): Promise<InferSkillsResponse> {
  try {
    const response = await fetch('/api/infer-skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error: ${response.status}`,
      };
    }

    return await response.json() as InferSkillsResponse;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
