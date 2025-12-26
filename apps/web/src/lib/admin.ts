/**
 * Admin authentication helper
 * Checks if a user email matches the configured admin email
 */

/**
 * Check if email belongs to an admin
 */
export function isAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) {
    return false;
  }
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Require admin access - throws if not admin
 */
export function requireAdmin(email: string | null | undefined): true {
  if (!isAdmin(email)) {
    throw new Error('Forbidden');
  }
  return true;
}
