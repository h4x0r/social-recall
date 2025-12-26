/**
 * Pending matches API - manage contact match review queue
 * GET /api/contacts/pending-matches - fetch pending matches
 * PUT /api/contacts/pending-matches - update match status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['pending', 'confirmed', 'rejected', 'skipped'] as const;
type MatchStatus = typeof VALID_STATUSES[number];

interface UpdateMatchRequest {
  matchId: string;
  status: MatchStatus;
}

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

  // Get status filter from query params
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'pending';

  // Fetch pending matches for this user
  const { data: matches, error: fetchError } = await supabase
    .from('pending_matches')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', statusFilter)
    .order('score', { ascending: false });

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    matches: matches || [],
  });
}

export async function PUT(request: NextRequest) {
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

  // Parse request body
  const body: UpdateMatchRequest = await request.json();

  // Validate required fields
  if (!body.matchId) {
    return NextResponse.json(
      { error: 'Missing required field: matchId' },
      { status: 400 }
    );
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Update the match status
  const { error: updateError } = await supabase
    .from('pending_matches')
    .update({
      status: body.status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', body.matchId)
    .eq('user_id', user.id);

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    matchId: body.matchId,
    status: body.status,
  });
}
