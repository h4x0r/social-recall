/**
 * Admin Profile Detail API
 * Get single profile with contribution history and resolve conflicts
 *
 * GET /api/admin/profiles/[id] - Get profile with contributions
 * PATCH /api/admin/profiles/[id] - Resolve a contribution (accept/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { isAdmin } from '@/lib/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.email || '');
    if (!adminStatus) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get profile
    const { data: profileData, error: profileError } = await supabase
      .from('master_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Type assertion for the profile data
    const profile = profileData as {
      id: string;
      linkedin_id: string;
      name: string;
      headline: string | null;
      location: string | null;
      avatar_path: string | null;
      about: string | null;
      update_count: number;
      first_seen_at: string;
      last_updated_at: string;
      created_at: string;
    };

    // Get contributions
    const { data: contributionsData } = await supabase
      .from('master_profile_contributions')
      .select('*')
      .eq('master_profile_id', id)
      .order('created_at', { ascending: false });

    const contributions = (contributionsData || []) as Array<{
      id: string;
      field: string;
      value: unknown;
      status: string;
      contributed_by: string;
      resolved_by: string | null;
      resolved_at: string | null;
      created_at: string;
    }>;

    // Get employers
    const { data: employersData } = await supabase
      .from('master_profile_employers')
      .select('*')
      .eq('master_profile_id', id)
      .order('sort_order', { ascending: true });

    const employers = (employersData || []) as Array<{
      id: string;
      company: string;
      title: string | null;
      logo_url: string | null;
      is_current: boolean;
      start_date: string | null;
      end_date: string | null;
      sort_order: number;
    }>;

    // Transform profile
    const transformedProfile = {
      id: profile.id,
      linkedinId: profile.linkedin_id,
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      avatarPath: profile.avatar_path,
      about: profile.about,
      updateCount: profile.update_count,
      firstSeenAt: profile.first_seen_at,
      lastUpdatedAt: profile.last_updated_at,
      createdAt: profile.created_at,
    };

    // Transform contributions
    const transformedContributions = contributions.map((c) => ({
      id: c.id,
      field: c.field,
      value: c.value,
      status: c.status,
      contributedBy: c.contributed_by,
      resolvedBy: c.resolved_by,
      resolvedAt: c.resolved_at,
      createdAt: c.created_at,
    }));

    // Transform employers
    const transformedEmployers = employers.map((e) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      logoUrl: e.logo_url,
      isCurrent: e.is_current,
      startDate: e.start_date,
      endDate: e.end_date,
      sortOrder: e.sort_order,
    }));

    return NextResponse.json({
      profile: transformedProfile,
      employers: transformedEmployers,
      contributions: transformedContributions,
    });
  } catch (error) {
    console.error('Admin profile detail error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.email || '');
    if (!adminStatus) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { contributionId, action } = body;

    if (!contributionId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request: contributionId and action (accept/reject) required' },
        { status: 400 }
      );
    }

    // Update contribution
    const status = action === 'accept' ? 'accepted' : 'rejected';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contributionData, error: updateError } = await (supabase as any)
      .from('master_profile_contributions')
      .update({
        status,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', contributionId)
      .select()
      .single();

    const contribution = contributionData as {
      id: string;
      field: string;
      value: unknown;
      status: string;
      resolved_by: string | null;
      resolved_at: string | null;
    } | null;

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If accepted, update the master profile with the contribution value
    if (action === 'accept' && contribution) {
      const field = contribution.field;
      const value = contribution.value;

      // Map field to database column
      const fieldMap: Record<string, string> = {
        name: 'name',
        headline: 'headline',
        location: 'location',
        about: 'about',
        avatar: 'avatar_path',
      };

      const dbField = fieldMap[field];
      if (dbField) {
        // Parse JSON value
        let parsedValue = value;
        try {
          parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          // Use as-is if not valid JSON
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('master_profiles')
          .update({ [dbField]: parsedValue })
          .eq('id', id);
      }
    }

    return NextResponse.json({
      success: true,
      contribution: contribution ? {
        id: contribution.id,
        status: contribution.status,
        resolvedBy: contribution.resolved_by,
        resolvedAt: contribution.resolved_at,
      } : null,
    });
  } catch (error) {
    console.error('Admin contribution resolve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
