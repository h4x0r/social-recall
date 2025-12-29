/**
 * Consent server actions
 * Handles logging, revoking, and checking consent status
 */

'use server';

import { createAdminClient } from '@/lib/supabase';

interface LogConsentParams {
  userId: string;
  extensionVersion: string;
  consentTextVersion: string;
  userAgent: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Log consent for a user after OAuth sign-in
 */
export async function logConsent(params: LogConsentParams): Promise<ActionResult> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('consent_logs').insert({
    user_id: params.userId,
    extension_version: params.extensionVersion,
    consent_text_version: params.consentTextVersion,
    user_agent: params.userAgent,
    given: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Revoke consent for a user
 */
export async function revokeConsent(userId: string): Promise<ActionResult> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('consent_logs')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if user has active (non-revoked) consent
 */
export async function hasConsent(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('consent_logs')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Delete user from auth.users (consent_logs cascade deletes via FK)
 * Used when user declines consent after OAuth
 */
export async function deleteUserAndRevokeConsent(userId: string): Promise<ActionResult> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
