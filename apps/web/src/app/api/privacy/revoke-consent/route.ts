/**
 * API endpoint for revoking consent
 * POST /api/privacy/revoke-consent
 *
 * Marks consent as revoked. Called from extension settings.
 * This stops future data collection but preserves existing data.
 *
 * Security: Validates that request IP matches the IP that gave consent.
 * This prevents attackers from revoking others' consent even if they guess the ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

// Handle CORS preflight
export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const { consentLogId } = await request.json();

    if (!consentLogId) {
      return NextResponse.json(
        { error: 'consentLogId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // First, fetch the consent log to verify IP matches
    const { data: consentLog, error: fetchError } = await supabase
      .from('consent_logs')
      .select('ip_address, revoked_at')
      .eq('id', consentLogId)
      .single();

    if (fetchError || !consentLog) {
      return NextResponse.json(
        { error: 'Consent record not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const logData = consentLog as { ip_address: string; revoked_at: string | null };

    // Check if already revoked
    if (logData.revoked_at) {
      return NextResponse.json(
        { message: 'Consent already revoked' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Verify IP address matches (security: prevent others from revoking your consent)
    const requestIp = getClientIp(request);
    if (logData.ip_address !== requestIp && logData.ip_address !== 'unknown') {
      console.warn(`IP mismatch for consent revocation: stored=${logData.ip_address}, request=${requestIp}`);
      return NextResponse.json(
        { error: 'Unauthorized: IP address mismatch' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Update consent log to mark as revoked
    const { error } = await supabase
      .from('consent_logs')
      .update({
        revoked_at: new Date().toISOString(),
      } as never)
      .eq('id', consentLogId);

    if (error) {
      console.error('Failed to revoke consent:', error);
      return NextResponse.json(
        { error: 'Failed to revoke consent' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: 'Consent revoked successfully' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Revoke consent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
