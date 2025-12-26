/**
 * Google Contacts import API - fetch contacts, run matching, store pending matches
 * POST /api/contacts/import-google
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGoogleContactsService, type GoogleContact } from '@/lib/google-contacts';
import { calculateMatchScore, type MatchSignals } from '@/lib/contact-matcher';

// Minimum score to consider a match
const MIN_MATCH_SCORE = 50;

interface LinkedInContact {
  id: string;
  linkedin_id: string;
  name: string;
  headline?: string;
  location?: string;
  google_id?: string;
  employers?: Array<{ company: string; title?: string }>;
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

  // Get Google provider token from session
  const { data: { session } } = await supabase.auth.getSession();
  const googleToken = session?.provider_token;

  if (!googleToken) {
    return NextResponse.json(
      { error: 'No Google access token. Please re-authenticate with Google Contacts permission.' },
      { status: 401 }
    );
  }

  // Fetch Google contacts
  const googleService = createGoogleContactsService();
  let googleContacts: GoogleContact[];
  let totalGoogleCount: number;

  try {
    const result = await googleService.fetchContacts(googleToken, {
      pageSize: 100,
      rateLimit: 100, // 100ms between requests
    });
    googleContacts = result.contacts;
    totalGoogleCount = result.totalCount;
  } catch (e) {
    console.error('Failed to fetch Google contacts:', e);
    return NextResponse.json(
      { error: `Failed to fetch Google contacts: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  // Fetch LinkedIn contacts for this user
  const { data: linkedInContacts, error: fetchError } = await supabase
    .from('contacts')
    .select('id, linkedin_id, name, headline, location, google_id')
    .eq('user_id', user.id);

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  const contacts = (linkedInContacts || []) as LinkedInContact[];

  // Track stats
  let alreadyMergedCount = 0;
  let pendingMatchesCount = 0;

  // Filter out already merged contacts
  const unmergedContacts = contacts.filter(c => !c.google_id);
  alreadyMergedCount = contacts.length - unmergedContacts.length;

  // Run matching for each Google contact against unmerged LinkedIn contacts
  const pendingMatches: Array<{
    user_id: string;
    linkedin_contact_id: string;
    google_resource_name: string;
    google_contact_data: Record<string, unknown>;
    score: number;
    signals: MatchSignals;
    status: string;
  }> = [];

  for (const googleContact of googleContacts) {
    // Find best match among unmerged LinkedIn contacts
    let bestMatch: { linkedInContact: LinkedInContact; score: number; signals: MatchSignals } | null = null;

    for (const linkedInContact of unmergedContacts) {
      // Build LinkedIn contact format for scoring
      const linkedInForScoring = {
        id: linkedInContact.id,
        linkedinId: linkedInContact.linkedin_id,
        name: linkedInContact.name,
        headline: linkedInContact.headline,
        location: linkedInContact.location,
        employers: linkedInContact.employers || [],
      };

      // Build Google contact format for scoring
      const googleForScoring = {
        resourceName: googleContact.googleId,
        name: googleContact.name,
        email: googleContact.email,
        linkedinUrl: googleContact.linkedinUrl,
        organization: googleContact.employers?.[0]?.company,
        location: undefined, // Google contacts don't have location in our format
      };

      const { score, signals } = calculateMatchScore(linkedInForScoring, googleForScoring);

      if (score >= MIN_MATCH_SCORE && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { linkedInContact, score, signals };
      }
    }

    // If we found a good match, add to pending matches
    if (bestMatch) {
      pendingMatches.push({
        user_id: user.id,
        linkedin_contact_id: bestMatch.linkedInContact.id,
        google_resource_name: googleContact.googleId,
        google_contact_data: {
          name: googleContact.name,
          email: googleContact.email,
          linkedinUrl: googleContact.linkedinUrl,
          avatarUrl: googleContact.avatarUrl,
          employers: googleContact.employers,
        },
        score: bestMatch.score,
        signals: bestMatch.signals,
        status: 'pending',
      });
    }
  }

  // Store pending matches (upsert to avoid duplicates)
  if (pendingMatches.length > 0) {
    const { error: upsertError } = await supabase
      .from('pending_matches')
      .upsert(pendingMatches, {
        onConflict: 'linkedin_contact_id,google_resource_name',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Failed to store pending matches:', upsertError);
      // Continue anyway - we'll return partial results
    }

    pendingMatchesCount = pendingMatches.length;
  }

  return NextResponse.json({
    success: true,
    googleContactsCount: totalGoogleCount,
    linkedInContactsCount: contacts.length,
    alreadyMergedCount,
    pendingMatchesCount,
  });
}
