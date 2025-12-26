/**
 * Profile Intelligence Service
 * Handles AI analysis caching, staleness detection, and verification
 */

interface ProfileTimestamps {
  last_updated_at: Date | string | null;
  ai_analyzed_at: Date | string | null;
}

/**
 * Check if AI analysis is stale (profile updated after last analysis)
 */
export function isAnalysisStale(profile: ProfileTimestamps): boolean {
  if (!profile.ai_analyzed_at) {
    return true; // Never analyzed
  }

  const lastUpdated = new Date(profile.last_updated_at as string | Date);
  const analyzedAt = new Date(profile.ai_analyzed_at as string | Date);

  return lastUpdated > analyzedAt;
}
