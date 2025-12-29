/**
 * API endpoint for logging consent from Chrome extension
 * POST /api/consent-log
 *
 * Records consent grant with IP address for GDPR compliance.
 * Returns IP and log ID for storage in extension.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, DbConsentLogInsert } from '@/lib/database.types';
import { getCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limiter';

// Handle CORS preflight
export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Get client IP address from request headers
 * Handles various proxy scenarios
 */
function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (set by proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (client)
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header (set by some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address (may not be available in serverless)
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

// Log consent grant
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  // Check rate limit - be generous for consent logging
  const rateLimitResponse = checkRateLimit(request, 'consent');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Parse request body
    const body = await request.json();
    const { extensionVersion, consentTextVersion, userAgent } = body;

    // Validate required fields
    if (!extensionVersion || !consentTextVersion || !userAgent) {
      return NextResponse.json(
        { error: 'Missing required fields: extensionVersion, consentTextVersion, userAgent' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get client IP
    const ipAddress = getClientIp(request);

    // Create Supabase admin client for inserting consent log
    // Note: This doesn't require user auth - consent is logged before account creation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Insert consent log
    const insertData: DbConsentLogInsert = {
      extension_version: extensionVersion,
      consent_text_version: consentTextVersion,
      user_agent: userAgent,
      ip_address: ipAddress,
      given: true,
    };

    // Type assertion needed due to Supabase type inference limitation
    const { data, error } = await supabase
      .from('consent_logs')
      .insert(insertData as never)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to insert consent log:', error);
      return NextResponse.json(
        { error: 'Failed to log consent' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Return IP and log ID for storage in extension
    return NextResponse.json(
      {
        ip: ipAddress,
        logId: (data as { id: string }).id,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('Consent log error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
