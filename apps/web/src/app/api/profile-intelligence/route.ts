/**
 * Profile Intelligence API
 * Returns cached or fresh AI analysis for a LinkedIn profile
 * POST /api/profile-intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getCorsHeaders } from '@/lib/cors';
import { isAnalysisStale } from '@/lib/profile-intelligence';

// CORS preflight
export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

interface ProfileData {
  name: string;
  headline: string;
  about?: string;
  location?: string;
  avatar_url?: string;
  employers?: Array<{ company: string; title?: string; logo_url?: string; is_current?: boolean }>;
}

interface RequestBody {
  linkedin_id: string;
  profile_data: ProfileData;
  fingerprint?: string;
}

interface AIAnalysis {
  archetype: string | null;
  skills: Array<{ name: string; category: string; confidence: number }>;
  could_be: string[];
  good_for: string[];
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const body: RequestBody = await request.json();

    // Input validation
    if (!body.linkedin_id) {
      return NextResponse.json(
        { error: 'Missing required field: linkedin_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.profile_data) {
      return NextResponse.json(
        { error: 'Missing required field: profile_data' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.profile_data.name) {
      return NextResponse.json(
        { error: 'Missing required field: profile_data.name' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.profile_data.headline) {
      return NextResponse.json(
        { error: 'Missing required field: profile_data.headline' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // 1. Find or create master profile
    const { data: existingProfile } = await supabase
      .from('master_profiles')
      .select('id, last_updated_at, ai_analyzed_at, verified_at')
      .eq('linkedin_id', body.linkedin_id)
      .maybeSingle();

    let masterProfileId: string;
    let profileVerified = false;

    if (existingProfile) {
      masterProfileId = existingProfile.id;
      profileVerified = existingProfile.verified_at != null;

      // Update profile data
      await supabase
        .from('master_profiles')
        .update({
          name: body.profile_data.name,
          headline: body.profile_data.headline,
          location: body.profile_data.location,
          avatar_url: body.profile_data.avatar_url,
        })
        .eq('id', masterProfileId);
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('master_profiles')
        .insert({
          linkedin_id: body.linkedin_id,
          name: body.profile_data.name,
          headline: body.profile_data.headline,
          location: body.profile_data.location,
          avatar_url: body.profile_data.avatar_url,
        })
        .select('id')
        .single();

      if (insertError || !newProfile) {
        throw new Error('Failed to create profile');
      }

      masterProfileId = newProfile.id;
    }

    // 2. Check if we have a fresh cached analysis
    let analysis: AIAnalysis | null = null;
    let cached = false;

    if (existingProfile && !isAnalysisStale(existingProfile)) {
      // Get cached analysis
      const { data: cachedAnalysis } = await supabase
        .from('master_profile_ai_analysis')
        .select('archetype, skills, could_be, good_for')
        .eq('master_profile_id', masterProfileId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedAnalysis) {
        analysis = {
          archetype: cachedAnalysis.archetype,
          skills: (cachedAnalysis.skills as AIAnalysis['skills']) || [],
          could_be: (cachedAnalysis.could_be as string[]) || [],
          good_for: (cachedAnalysis.good_for as string[]) || [],
        };
        cached = true;
      }
    }

    // 3. If no cached analysis or stale, trigger new analysis
    if (!analysis) {
      // Call the existing infer-skills endpoint internally
      const inferResponse = await fetch(
        new URL('/api/infer-skills', request.url).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: body.profile_data }),
        }
      );

      if (!inferResponse.ok) {
        const errorData = await inferResponse.json();
        return NextResponse.json(
          { error: errorData.error || 'AI analysis failed' },
          { status: inferResponse.status, headers: corsHeaders }
        );
      }

      const inferData = await inferResponse.json();

      analysis = {
        archetype: inferData.archetype || null,
        skills: inferData.skills || [],
        could_be: inferData.couldBe || [],
        good_for: inferData.goodFor || [],
      };

      // Store the analysis
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

      await supabase.from('master_profile_ai_analysis').insert({
        master_profile_id: masterProfileId,
        archetype: analysis.archetype,
        skills: analysis.skills,
        could_be: analysis.could_be,
        good_for: analysis.good_for,
        ai_model: 'claude-3-5-haiku',
        triggered_by_ip: clientIp,
      });

      // Update ai_analyzed_at on master profile
      await supabase
        .from('master_profiles')
        .update({ ai_analyzed_at: new Date().toISOString() })
        .eq('id', masterProfileId);

      cached = false;
    }

    return NextResponse.json(
      {
        archetype: analysis.archetype,
        skills: analysis.skills,
        could_be: analysis.could_be,
        good_for: analysis.good_for,
        verified: profileVerified,
        cached,
        analyzed_at: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Profile intelligence error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
