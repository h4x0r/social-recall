/**
 * API endpoint for checking consent status
 * GET /api/consent/status
 *
 * Called by extension to check if user has active consent.
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getCorsHeaders } from '@/lib/cors';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders() });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check consent status using admin client
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

    const { data, error } = await adminClient
      .from('consent_logs')
      .select('id, created_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { hasConsent: false },
        { status: 200, headers: corsHeaders }
      );
    }

    const consentData = data as { id: string; created_at: string };
    return NextResponse.json(
      {
        hasConsent: true,
        consentId: consentData.id,
        consentedAt: consentData.created_at,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Consent status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
