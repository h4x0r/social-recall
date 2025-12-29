/**
 * API endpoint for confirming and executing data deletion
 * GET /api/privacy/confirm-deletion?token=xxx
 *
 * Validates token and permanently deletes user data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { sendDeletionCompleteEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/privacy?error=missing-token', request.url));
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Find and validate deletion request
    const { data: requests, error: findError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('token', token)
      .is('completed_at', null)
      .limit(1);

    if (findError || !requests || requests.length === 0) {
      return NextResponse.redirect(new URL('/privacy?error=invalid-token', request.url));
    }

    const deletionRequest = requests[0] as {
      id: string;
      user_id: string;
      email: string;
      expires_at: string;
    };

    // Check if token expired
    if (new Date(deletionRequest.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/privacy?error=expired-token', request.url));
    }

    const userId = deletionRequest.user_id;

    // Delete user data in order (respect foreign keys)
    // 1. Delete user's contacts and related data
    await supabase.from('contact_employers').delete().eq('user_id', userId);
    await supabase.from('contacts').delete().eq('user_id', userId);

    // 2. Delete user's tags
    await supabase.from('user_profile_tags').delete().eq('user_id', userId);
    await supabase.from('tags').delete().eq('user_id', userId);

    // 3. Anonymize consent logs (redact last two octets of IP)
    const { data: consentLogs } = await supabase
      .from('consent_logs')
      .select('id, ip_address')
      .eq('user_id', userId);

    if (consentLogs) {
      for (const log of consentLogs) {
        const logData = log as { id: string; ip_address: string };
        const anonymizedIp = anonymizeIp(logData.ip_address);
        await supabase
          .from('consent_logs')
          .update({
            ip_address: anonymizedIp,
            revoked_at: new Date().toISOString(),
          } as never)
          .eq('id', logData.id);
      }
    }

    // 4. Delete user account
    await supabase.from('users').delete().eq('id', userId);

    // 5. Mark deletion request as completed
    await supabase
      .from('deletion_requests')
      .update({ completed_at: new Date().toISOString() } as never)
      .eq('id', deletionRequest.id);

    // Send confirmation email
    await sendDeletionCompleteEmail(deletionRequest.email);

    // Redirect to success page
    return NextResponse.redirect(new URL('/privacy?deleted=true', request.url));
  } catch (error) {
    console.error('Confirm deletion error:', error);
    return NextResponse.redirect(new URL('/privacy?error=server-error', request.url));
  }
}

/**
 * Anonymize IP address by redacting last two octets
 * 192.168.1.100 -> 192.168.x.x
 */
function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';

  const parts = ip.split('.');
  if (parts.length !== 4) return ip; // Not a valid IPv4

  return `${parts[0]}.${parts[1]}.x.x`;
}
