/**
 * Admin reset API - bulk delete operations
 * POST /api/admin/reset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin';

type ResetAction = 'clear_history' | 'clear_contacts' | 'clear_all';

interface ResetRequest {
  action: ResetAction;
  confirm: string;
}

export async function POST(request: NextRequest) {
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

  // Parse request
  const body: ResetRequest = await request.json();

  if (!body.action) {
    return NextResponse.json(
      { error: 'Missing action parameter' },
      { status: 400 }
    );
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Confirmation required: set confirm to "DELETE"' },
      { status: 400 }
    );
  }

  const validActions: ResetAction[] = ['clear_history', 'clear_contacts', 'clear_all'];
  if (!validActions.includes(body.action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
      { status: 400 }
    );
  }

  // Execute action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  let deleted = 0;

  try {
    switch (body.action) {
      case 'clear_history': {
        const { count, error } = await db
          .from('contact_history')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) throw error;
        deleted = count || 0;
        break;
      }

      case 'clear_contacts': {
        // This will cascade delete history due to FK
        const { count, error } = await db
          .from('contacts')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) throw error;
        deleted = count || 0;
        break;
      }

      case 'clear_all': {
        // Delete in order: history first, then contacts
        await db
          .from('contact_history')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        const { count, error } = await db
          .from('contacts')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        deleted = count || 0;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      deleted,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete operation failed' },
      { status: 500 }
    );
  }
}
