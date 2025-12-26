/**
 * Storage Quota Limits
 * Prevents database bloat by limiting contacts and notes per user
 */

// Storage quota limits
export const STORAGE_QUOTAS = {
  // Maximum contacts a user can have
  MAX_CONTACTS_PER_USER: 2000,

  // Maximum notes per contact
  MAX_NOTES_PER_CONTACT: 100,

  // Maximum total notes across all contacts
  MAX_TOTAL_NOTES_PER_USER: 10000,

  // Maximum employers per contact (already in api-validation)
  MAX_EMPLOYERS_PER_CONTACT: 50,

  // Maximum history entries per contact
  MAX_HISTORY_PER_CONTACT: 500,
} as const;

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  message?: string;
}

export interface NoteQuotaCheckResult {
  allowed: boolean;
  currentPerContact: number;
  currentTotal: number;
  limitPerContact: number;
  limitTotal: number;
  remainingPerContact: number;
  remainingTotal: number;
  message?: string;
}

/**
 * Check if user can add more contacts
 * @param getContactCount - Function that returns current contact count for user
 */
export async function checkContactQuota(
  getContactCount: () => Promise<number>
): Promise<QuotaCheckResult> {
  const current = await getContactCount();
  const limit = STORAGE_QUOTAS.MAX_CONTACTS_PER_USER;
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    remaining,
    message: allowed ? undefined : `You've reached your contact limit of ${limit}. Please delete some contacts to add new ones.`,
  };
}

/**
 * Check if user can add a note to a contact
 * @param getContactNoteCount - Function that returns note count for specific contact
 * @param getTotalNoteCount - Function that returns total note count for user
 */
export async function checkNoteQuota(
  getContactNoteCount: () => Promise<number>,
  getTotalNoteCount: () => Promise<number>
): Promise<NoteQuotaCheckResult> {
  const [currentPerContact, currentTotal] = await Promise.all([
    getContactNoteCount(),
    getTotalNoteCount(),
  ]);

  const limitPerContact = STORAGE_QUOTAS.MAX_NOTES_PER_CONTACT;
  const limitTotal = STORAGE_QUOTAS.MAX_TOTAL_NOTES_PER_USER;

  const remainingPerContact = Math.max(0, limitPerContact - currentPerContact);
  const remainingTotal = Math.max(0, limitTotal - currentTotal);

  // Check per-contact limit first
  if (currentPerContact >= limitPerContact) {
    return {
      allowed: false,
      currentPerContact,
      currentTotal,
      limitPerContact,
      limitTotal,
      remainingPerContact: 0,
      remainingTotal,
      message: `This contact has reached the maximum of ${limitPerContact} notes per contact.`,
    };
  }

  // Check total limit
  if (currentTotal >= limitTotal) {
    return {
      allowed: false,
      currentPerContact,
      currentTotal,
      limitPerContact,
      limitTotal,
      remainingPerContact,
      remainingTotal: 0,
      message: `You've reached your total notes limit of ${limitTotal}. Please delete some notes to add new ones.`,
    };
  }

  return {
    allowed: true,
    currentPerContact,
    currentTotal,
    limitPerContact,
    limitTotal,
    remainingPerContact,
    remainingTotal,
  };
}

/**
 * Format quota error for API response
 */
export function formatQuotaError(result: QuotaCheckResult | NoteQuotaCheckResult): {
  error: string;
  code: string;
  current: number;
  limit: number;
} {
  if ('currentPerContact' in result) {
    // Note quota result
    return {
      error: result.message || 'Note quota exceeded',
      code: 'QUOTA_EXCEEDED',
      current: result.remainingPerContact === 0 ? result.currentPerContact : result.currentTotal,
      limit: result.remainingPerContact === 0 ? result.limitPerContact : result.limitTotal,
    };
  }

  // Contact quota result
  return {
    error: result.message || 'Contact quota exceeded',
    code: 'QUOTA_EXCEEDED',
    current: result.current,
    limit: result.limit,
  };
}
