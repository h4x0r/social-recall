/**
 * API endpoint for requesting data deletion
 * POST /api/privacy/delete-request
 *
 * Sends confirmation email before processing deletion.
 * Token expires in 24 hours.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/lib/database.types';
import { sendDeletionConfirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Check if user exists with this email (in Supabase auth schema)
    const { data: authData, error: userError } = await supabase.auth.admin.listUsers();
    const users = authData?.users?.filter(u => u.email?.toLowerCase() === email.toLowerCase()) || [];

    if (userError) {
      console.error('Error checking user:', userError);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Even if user doesn't exist, return success to prevent email enumeration
    if (!users || users.length === 0) {
      return NextResponse.json({
        message: 'If an account exists with this email, a confirmation link has been sent.',
      });
    }

    const user = users[0] as { id: string; email: string };

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store deletion request in database
    const { error: insertError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      } as never);

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create deletion request' },
        { status: 500 }
      );
    }

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialrecall.now';
    await sendDeletionConfirmationEmail(email, token, baseUrl);

    return NextResponse.json({
      message: 'If an account exists with this email, a confirmation link has been sent.',
    });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
