/**
 * Admin Profiles API
 * Browse all shared master profiles with contribution history
 *
 * GET /api/admin/profiles - List all profiles
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (default 50, max 100)
 * - search: Search by name
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const adminStatus = await isAdmin(user.email || '');
    if (!adminStatus) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase.from('master_profiles').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: profilesData, error: queryError, count } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Type assertion for profiles
    const profiles = (profilesData || []) as Array<{
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
    }>;

    // Transform to API format
    const transformedProfiles = profiles.map((p) => ({
      id: p.id,
      linkedinId: p.linkedin_id,
      name: p.name,
      headline: p.headline,
      location: p.location,
      avatarPath: p.avatar_path,
      about: p.about,
      updateCount: p.update_count,
      firstSeenAt: p.first_seen_at,
      lastUpdatedAt: p.last_updated_at,
      createdAt: p.created_at,
    }));

    return NextResponse.json({
      profiles: transformedProfiles,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Admin profiles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
