/**
 * Admin export API - export all data as JSON
 * GET /api/admin/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin';

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

  // Fetch all data
  const [contactsResult, historyResult] = await Promise.all([
    supabase.from('contacts').select('*'),
    supabase.from('contact_history').select('*'),
  ]);

  if (contactsResult.error) {
    return NextResponse.json(
      { error: contactsResult.error.message },
      { status: 500 }
    );
  }

  if (historyResult.error) {
    return NextResponse.json(
      { error: historyResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    contacts: contactsResult.data || [],
    history: historyResult.data || [],
  });
}
