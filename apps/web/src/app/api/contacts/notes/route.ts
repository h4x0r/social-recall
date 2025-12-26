/**
 * Contact notes API - manage notes for contacts
 * GET /api/contacts/notes?contactId=xxx - fetch notes for a contact
 * POST /api/contacts/notes - create a new note
 * PUT /api/contacts/notes - update an existing note
 * DELETE /api/contacts/notes - delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  validateInput,
} from '@/lib/api-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { checkNoteQuota, formatQuotaError } from '@/lib/storage-quotas';

/**
 * Resolve a LinkedIn profile ID to a contact UUID
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveContactId(
  supabase: any,
  userId: string,
  linkedinId: string
): Promise<string | null> {
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('linkedin_id', linkedinId)
    .single();

  if (error || !contact) {
    return null;
  }

  return contact.id;
}

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

  // Get contactId or linkedinId from query params
  const { searchParams } = new URL(request.url);
  let contactId = searchParams.get('contactId');
  const linkedinId = searchParams.get('linkedinId');

  // Resolve linkedinId to contactId if needed
  if (!contactId && linkedinId) {
    contactId = await resolveContactId(supabase, user.id, linkedinId);
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact not found for LinkedIn ID' },
        { status: 404 }
      );
    }
  }

  if (!contactId) {
    return NextResponse.json(
      { error: 'Missing required parameter: contactId or linkedinId' },
      { status: 400 }
    );
  }

  // Fetch notes for this contact (RLS ensures user owns the contact)
  const { data: notes, error: fetchError } = await supabase
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notes: notes || [],
  });
}

export async function POST(request: NextRequest) {
  // Check rate limit first (before expensive auth)
  const rateLimitResponse = checkRateLimit(request, 'notes');
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await getAuthenticatedClient(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;

  // Parse and validate request body
  const body = await request.json();
  const validation = validateInput(createNoteSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { contactId: inputContactId, linkedinId, content } = validation.data;

  // Resolve contactId from linkedinId if needed
  let contactId: string | null | undefined = inputContactId;
  if (!contactId && linkedinId) {
    contactId = await resolveContactId(supabase, user.id, linkedinId);
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact not found for LinkedIn ID' },
        { status: 404 }
      );
    }
  }

  // Check storage quota before creating note
  const quotaResult = await checkNoteQuota(
    async () => {
      const { count } = await supabase
        .from('contact_notes')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId);
      return count || 0;
    },
    async () => {
      // Get total notes across all user's contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id);

      if (!contacts || contacts.length === 0) return 0;

      const contactIds = contacts.map((c) => c.id);
      const { count } = await supabase
        .from('contact_notes')
        .select('*', { count: 'exact', head: true })
        .in('contact_id', contactIds);
      return count || 0;
    }
  );

  if (!quotaResult.allowed) {
    return NextResponse.json(formatQuotaError(quotaResult), { status: 403 });
  }

  // Create the note (RLS ensures user owns the contact)
  const { data: note, error: insertError } = await supabase
    .from('contact_notes')
    .insert({
      contact_id: contactId,
      content,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ note }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = checkRateLimit(request, 'notes');
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await getAuthenticatedClient(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  // Parse and validate request body
  const body = await request.json();
  const validation = validateInput(updateNoteSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { noteId, content } = validation.data;

  // Update the note (RLS ensures user owns the contact)
  const { data: note, error: updateError } = await supabase
    .from('contact_notes')
    .update({ content })
    .eq('id', noteId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ note });
}

export async function DELETE(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = checkRateLimit(request, 'notes');
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await getAuthenticatedClient(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  // Parse and validate request body
  const body = await request.json();
  const validation = validateInput(deleteNoteSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { noteId } = validation.data;

  // Delete the note (RLS ensures user owns the contact)
  const { error: deleteError } = await supabase
    .from('contact_notes')
    .delete()
    .eq('id', noteId);

  if (deleteError) {
    if (deleteError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
