/**
 * API endpoint for exporting user data
 * GET /api/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all contacts with relations
    const { data: contacts, error: queryError } = await supabase
      .from('contacts')
      .select(`
        *,
        employers:contact_employers(*),
        skills:contact_skills(*),
        notes:contact_notes(*),
        tags:contact_tags(tag_id, tags(*))
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (queryError) {
      console.error('Export query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      );
    }

    // Transform contacts for export
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportedContacts = (contacts || []).map((contact: any) => ({
      id: contact.id,
      name: contact.name,
      headline: contact.headline,
      linkedinId: contact.linkedin_id,
      profileUrl: contact.profile_url,
      avatarUrl: contact.avatar_url,
      isNew: contact.is_new,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      lastSyncedAt: contact.last_synced_at,
      employers: (contact.employers || []).map((emp: any) => ({
        id: emp.id,
        company: emp.company,
        title: emp.title,
        logoUrl: emp.logo_url,
        isCurrent: emp.is_current,
        startDate: emp.start_date,
        endDate: emp.end_date,
      })),
      skills: (contact.skills || []).map((skill: any) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        status: skill.status,
        confidence: skill.confidence,
      })),
      notes: (contact.notes || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
      })),
      tags: (contact.tags || []).map((tag: any) => ({
        id: tag.tags.id,
        name: tag.tags.name,
        color: tag.tags.color,
      })),
    }));

    return NextResponse.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      contacts: exportedContacts,
    });
  } catch (e) {
    console.error('Export error:', e);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
