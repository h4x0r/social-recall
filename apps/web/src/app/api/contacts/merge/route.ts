/**
 * Contact merge API - merge a LinkedIn contact with a Google contact
 * POST /api/contacts/merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { selectFieldValue, type FieldSelection } from '@/lib/contact-consolidation';

interface GoogleContactData {
  resourceName: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
}

interface MergeRequest {
  linkedinContactId: string;
  googleContact: GoogleContactData;
  fieldSelections: FieldSelection[];
  matchScore: number;
  matchSignals: Record<string, unknown>;
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

  // Parse request
  const body: MergeRequest = await request.json();

  // Validate required fields
  if (!body.linkedinContactId) {
    return NextResponse.json(
      { error: 'Missing required field: linkedinContactId' },
      { status: 400 }
    );
  }

  if (!body.googleContact) {
    return NextResponse.json(
      { error: 'Missing required field: googleContact' },
      { status: 400 }
    );
  }

  // Fetch the existing contact to verify ownership
  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', body.linkedinContactId)
    .single();

  if (fetchError || !contact) {
    return NextResponse.json(
      { error: 'Contact not found' },
      { status: 404 }
    );
  }

  // Verify user owns this contact
  if (contact.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Build update object from field selections
  const fieldSelections = body.fieldSelections || [];
  const updateData: Record<string, string | null> = {};

  // Process field selections
  for (const selection of fieldSelections) {
    const value = selectFieldValue(selection);

    switch (selection.field) {
      case 'name':
        if (value) updateData.name = value as string;
        break;
      case 'email':
        updateData.email = value as string | null;
        break;
      case 'phone':
        updateData.phone = value as string | null;
        break;
      case 'headline':
        updateData.headline = value as string | null;
        break;
      case 'location':
        updateData.location = value as string | null;
        break;
    }
  }

  // Add Google ID
  updateData.google_id = body.googleContact.resourceName;

  // If no name in selections but we have a name, default to existing
  if (!updateData.name) {
    updateData.name = contact.name;
  }

  // Update the contact
  const { error: updateError } = await supabase
    .from('contacts')
    .update(updateData)
    .eq('id', body.linkedinContactId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  // Create contact_sources records
  // LinkedIn source
  const { error: linkedinSourceError } = await supabase
    .from('contact_sources')
    .insert({
      contact_id: body.linkedinContactId,
      source: 'linkedin',
      source_id: contact.linkedin_id || body.linkedinContactId,
      raw_data: { original_contact: contact },
    });

  if (linkedinSourceError && !linkedinSourceError.message.includes('duplicate')) {
    console.error('Failed to create LinkedIn source:', linkedinSourceError);
  }

  // Google source
  const { error: googleSourceError } = await supabase
    .from('contact_sources')
    .insert({
      contact_id: body.linkedinContactId,
      source: 'google',
      source_id: body.googleContact.resourceName,
      raw_data: body.googleContact,
    });

  if (googleSourceError && !googleSourceError.message.includes('duplicate')) {
    console.error('Failed to create Google source:', googleSourceError);
  }

  // Update pending_matches status to confirmed
  await supabase
    .from('pending_matches')
    .upsert({
      user_id: user.id,
      linkedin_contact_id: body.linkedinContactId,
      google_resource_name: body.googleContact.resourceName,
      google_contact_data: body.googleContact,
      score: body.matchScore || 0,
      signals: body.matchSignals || {},
      status: 'confirmed',
      reviewed_at: new Date().toISOString(),
    }, {
      onConflict: 'linkedin_contact_id,google_resource_name',
    });

  return NextResponse.json({
    success: true,
    contactId: body.linkedinContactId,
    merged: {
      googleId: body.googleContact.resourceName,
      updatedFields: Object.keys(updateData),
    },
  });
}
