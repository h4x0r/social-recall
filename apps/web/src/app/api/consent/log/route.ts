/**
 * API endpoint for logging consent
 * POST /api/consent/log
 *
 * Called by extension after OAuth sign-in to log consent.
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, DbConsentLogInsert } from '@/lib/database.types';
import { getCorsHeaders } from '@/lib/cors';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const { extensionVersion, consentTextVersion, userAgent } = await request.json();

    if (!extensionVersion || !consentTextVersion || !userAgent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

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

    // Use admin client to insert consent
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

    const insertData: DbConsentLogInsert = {
      user_id: user.id,
      extension_version: extensionVersion,
      consent_text_version: consentTextVersion,
      user_agent: userAgent,
      given: true,
    };

    const { data, error } = await adminClient
      .from('consent_logs')
      .insert(insertData as never)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log consent:', error);
      return NextResponse.json(
        { error: 'Failed to log consent' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, consentId: (data as { id: string }).id },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Consent log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
