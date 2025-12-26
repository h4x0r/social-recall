/**
 * API endpoint for syncing profile history from Chrome extension
 * POST /api/contacts/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, DbContactHistory } from '@/lib/database.types';
import { syncHistorySchema, validateInput } from '@/lib/api-validation';
import { getCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limiter';

// Handle CORS preflight
export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Sync history entries from extension
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  // Check rate limit first
  const rateLimitResponse = checkRateLimit(request, 'sync');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateInput(syncHistorySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use validated data
    const historyItems = [{ profileId: validation.data.profileId, entries: validation.data.entries }];

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of historyItems) {
      try {
        // Look up contact by linkedin_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: contact, error: contactError } = await (supabase as any)
          .from('contacts')
          .select('id')
          .eq('user_id', user.id)
          .eq('linkedin_id', item.profileId)
          .single() as { data: { id: string } | null; error: Error | null };

        if (contactError || !contact) {
          errors.push(`Contact not found: ${item.profileId}`);
          failed++;
          continue;
        }

        // Insert history entries (skip duplicates based on field + detected_at)
        for (const entry of item.entries) {
          // Check for existing entry with same field and timestamp
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existing } = await (supabase as any)
            .from('contact_history')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('field', entry.field)
            .eq('detected_at', entry.detectedAt)
            .single() as { data: { id: string } | null };

          if (existing) {
            // Skip duplicate
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await (supabase as any)
            .from('contact_history')
            .insert({
              contact_id: contact.id,
              field: entry.field,
              old_value: entry.oldValue as Record<string, unknown> | null,
              new_value: entry.newValue as Record<string, unknown>,
              detected_at: entry.detectedAt,
            }) as { error: Error | null };

          if (insertError) {
            errors.push(`Failed to insert history for ${item.profileId}: ${insertError.message}`);
            failed++;
          } else {
            synced++;
          }
        }
      } catch (e) {
        errors.push(`Error processing ${item.profileId}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        result: {
          synced,
          failed,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('History sync error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Get history for a contact by profile ID
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get profile ID from query param
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId query parameter required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Look up contact by linkedin_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contact, error: contactError } = await (supabase as any)
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('linkedin_id', profileId)
      .single() as { data: { id: string } | null; error: Error | null };

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch history entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: history, error: historyError } = await (supabase as any)
      .from('contact_history')
      .select('*')
      .eq('contact_id', contact.id)
      .order('detected_at', { ascending: false }) as { data: DbContactHistory[] | null; error: Error | null };

    if (historyError) {
      return NextResponse.json(
        { error: historyError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform to camelCase
    const entries = (history || []).map((h) => ({
      id: h.id,
      field: h.field,
      oldValue: h.old_value,
      newValue: h.new_value,
      detectedAt: h.detected_at,
      createdAt: h.created_at,
    }));

    return NextResponse.json(
      { entries },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('History fetch error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
