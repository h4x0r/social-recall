/**
 * Contact search API - full-text search for contacts
 * GET /api/contacts/search?q=query - search contacts by name, headline, skills
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

async function getAuthenticatedClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;

  // Get query from search params
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : DEFAULT_LIMIT;

  if (!query) {
    return NextResponse.json(
      { error: 'Missing required parameter: q' },
      { status: 400 }
    );
  }

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  // Search contacts using case-insensitive matching on name and headline
  const searchPattern = `%${query}%`;
  const { data: contacts, error: searchError } = await supabase
    .from('contacts')
    .select('id, name, headline, avatar_url, linkedin_id, skills, archetype')
    .eq('user_id', user.id)
    .or(`name.ilike.${searchPattern},headline.ilike.${searchPattern}`)
    .order('name', { ascending: true })
    .limit(limit);

  if (searchError) {
    return NextResponse.json(
      { error: searchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    contacts: contacts || [],
    query,
    limit,
  });
}
