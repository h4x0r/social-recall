/**
 * API endpoint for syncing contacts from Chrome extension
 * POST /api/contacts/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createContactRepository } from '@/lib/contact-repository';
import { createContactSyncService } from '@/lib/contact-sync';
import type { Database } from '@/lib/database.types';
import { syncBatchSchema, validateInput } from '@/lib/api-validation';
import { getCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limiter';

// Handle CORS preflight
export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Sync contacts from extension
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
    const validation = validateInput(syncBatchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract contacts from validated data
    const contacts = validation.data.contacts || (validation.data.contact ? [validation.data.contact] : []);

    // Create repository and sync service
    const repository = createContactRepository(supabase);
    const syncService = createContactSyncService(repository);

    // Sync contacts
    const result = await syncService.syncBatch(user.id, contacts);

    return NextResponse.json(
      {
        success: true,
        result: {
          total: result.total,
          synced: result.synced,
          failed: result.failed,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('Sync error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
