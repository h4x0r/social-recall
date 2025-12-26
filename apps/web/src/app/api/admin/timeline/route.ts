/**
 * Admin timeline API - returns paginated history entries
 * GET /api/admin/timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin';

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  // Get auth token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  // Verify token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Check admin access
  if (!isAdmin(user.email)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const field = searchParams.get('field');
  const search = searchParams.get('search');

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('contact_history')
    .select(`
      id,
      field,
      old_value,
      new_value,
      detected_at,
      contacts!inner(id, name, linkedin_id)
    `, { count: 'exact' })
    .order('detected_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  // Apply filters
  if (field) {
    query = query.eq('field', field);
  }

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Transform to response format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data || []).map((h: any) => ({
    id: h.id,
    field: h.field,
    oldValue: h.old_value,
    newValue: h.new_value,
    detectedAt: h.detected_at,
    contactId: h.contacts?.id,
    contactName: h.contacts?.name,
    linkedinId: h.contacts?.linkedin_id,
  }));

  return NextResponse.json({
    entries,
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
