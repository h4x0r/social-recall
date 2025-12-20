/**
 * Supabase client and Edge Function helpers
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for Edge Function responses
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
 * Calls the infer-skills Edge Function to extract skills from a profile
 */
export async function inferSkills(profile: ProfileData): Promise<InferSkillsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('infer-skills', {
      body: { profile },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return data as InferSkillsResponse;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
