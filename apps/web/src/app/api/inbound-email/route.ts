/**
 * Inbound Email Webhook Handler
 * POST /api/inbound-email
 *
 * Receives incoming emails from Resend for delete-my-data.socialrecall.now subdomain.
 * Any email sent to *@delete-my-data.socialrecall.now triggers a data deletion flow.
 *
 * Setup:
 * 1. Add MX records for delete-my-data.socialrecall.now pointing to Resend
 * 2. Configure webhook URL in Resend Dashboard: https://www.socialrecall.now/api/inbound-email
 * 3. Select event type: email.received
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/lib/database.types';
import { sendDeletionConfirmationEmail } from '@/lib/email';

const DELETE_DOMAIN = 'delete-my-data.socialrecall.now';

interface InboundEmailPayload {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message_id?: string;
    attachments?: Array<{
      id: string;
      filename: string;
      content_type: string;
    }>;
  };
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(field: string): string {
  const match = field.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : field.toLowerCase();
}

/**
 * Check if any recipient is on the delete subdomain
 */
function isDeleteDomainEmail(recipients: string[]): boolean {
  return recipients.some(to => {
    const email = extractEmail(to);
    return email.endsWith(`@${DELETE_DOMAIN}`);
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload: InboundEmailPayload = await request.json();

    // Verify this is an email.received event
    if (payload.type !== 'email.received') {
      return NextResponse.json({ received: true });
    }

    const { email_id, from, to, subject } = payload.data;
    const senderEmail = extractEmail(from);

    console.log(`Inbound email received: ${email_id} from ${senderEmail} to ${to.join(', ')} - "${subject}"`);

    // Only process emails sent to delete.socialrecall.now
    if (!isDeleteDomainEmail(to)) {
      console.log(`Ignoring email not sent to ${DELETE_DOMAIN}`);
      return NextResponse.json({
        processed: false,
        reason: 'not_delete_domain',
      });
    }

    // Any email to delete.socialrecall.now triggers deletion flow
    console.log(`Processing deletion request from ${senderEmail}`);

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Check if user exists with this email
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', senderEmail)
      .limit(1);

    if (!users || users.length === 0) {
      // No user found - still respond success to prevent email enumeration
      console.log(`No user found for ${senderEmail}`);
      return NextResponse.json({
        processed: true,
        action: 'no_user_found',
      });
    }

    const user = users[0] as { id: string };

    // Generate deletion token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store deletion request
    await supabase
      .from('deletion_requests')
      .insert({
        user_id: user.id,
        email: senderEmail,
        token,
        expires_at: expiresAt.toISOString(),
      } as never);

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialrecall.now';
    await sendDeletionConfirmationEmail(senderEmail, token, baseUrl);

    console.log(`Deletion confirmation sent to ${senderEmail}`);

    return NextResponse.json({
      processed: true,
      action: 'deletion_confirmation_sent',
      email: senderEmail,
    });
  } catch (error) {
    console.error('Inbound email error:', error);
    return NextResponse.json(
      { error: 'Failed to process inbound email' },
      { status: 500 }
    );
  }
}
