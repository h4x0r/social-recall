/**
 * Contact consolidation logic
 * Handles matching LinkedIn contacts with Google contacts and merging them
 */

import {
  calculateMatchScore,
  type LinkedInContact as BaseLinkedInContact,
  type GoogleContact as BaseGoogleContact,
  type MatchResult,
} from './contact-matcher';

// Re-export types from contact-matcher
export type LinkedInContact = BaseLinkedInContact;
export type GoogleContact = BaseGoogleContact;

export interface PendingMatch {
  id: string;
  userId: string;
  linkedinContactId: string;
  googleContactId: string;
  score: number;
  signals: {
    linkedinUrl: boolean;
    nameScore: number;
    employerMatch: boolean;
    locationMatch: boolean;
  };
  status: 'pending' | 'confirmed' | 'rejected';
  reviewedAt?: string;
}

export interface ContactSource {
  type: 'linkedin' | 'google' | 'icloud';
  sourceId: string;
}

export interface MergedContact {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  headline?: string | null;
  location?: string | null;
  linkedinId: string;
  googleId?: string;
  sources: ContactSource[];
  employers?: Array<{ company: string; title?: string }>;
}

export interface FieldSelection {
  field: string;
  source: 'linkedin' | 'google' | 'custom' | 'auto';
  linkedinValue: string | null | undefined;
  googleValue: string | null | undefined;
  customValue?: string;
}

export interface CategorizedMatches {
  autoMerge: MatchResult[];
  pendingReview: MatchResult[];
  noMatch: MatchResult[];
}

/**
 * Find all potential matches between LinkedIn and Google contacts
 * Returns all match results sorted by score descending
 */
export function findMatches(
  linkedinContacts: LinkedInContact[],
  googleContacts: GoogleContact[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const linkedin of linkedinContacts) {
    for (const google of googleContacts) {
      const result = calculateMatchScore(linkedin, google);
      matches.push(result);
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Categorize matches into auto-merge, pending review, and no match
 *
 * - autoMerge: LinkedIn URL match (score 100) - no review needed
 * - pendingReview: Score 50-79 - needs user confirmation
 * - noMatch: Score < 50 - not suggested as match
 *
 * Also ensures each LinkedIn contact appears at most once in autoMerge
 * (taking the best match if multiple Google contacts match)
 */
export function categorizeMatches(matches: MatchResult[]): CategorizedMatches {
  const autoMerge: MatchResult[] = [];
  const pendingReview: MatchResult[] = [];
  const noMatch: MatchResult[] = [];

  // Track which LinkedIn contacts have already been auto-merged
  const autoMergedLinkedinIds = new Set<string>();

  // First pass: find all auto-merge candidates (LinkedIn URL matches)
  for (const match of matches) {
    if (match.signals.linkedinUrl && match.score === 100) {
      // Only add if this LinkedIn contact hasn't been auto-merged yet
      if (!autoMergedLinkedinIds.has(match.linkedInContact.id)) {
        autoMerge.push(match);
        autoMergedLinkedinIds.add(match.linkedInContact.id);
      }
    }
  }

  // Second pass: categorize remaining matches
  for (const match of matches) {
    // Skip if already auto-merged
    if (autoMergedLinkedinIds.has(match.linkedInContact.id) &&
        match.signals.linkedinUrl) {
      continue;
    }

    if (match.score >= 80) {
      // High confidence but not URL match - still suggest for review
      pendingReview.push(match);
    } else if (match.score >= 50) {
      pendingReview.push(match);
    } else {
      noMatch.push(match);
    }
  }

  return { autoMerge, pendingReview, noMatch };
}

/**
 * Select the field value based on source selection
 *
 * - 'linkedin': Use LinkedIn value
 * - 'google': Use Google value
 * - 'custom': Use custom value
 * - 'auto': Auto-select based on which has data (prefer LinkedIn if both have data)
 */
export function selectFieldValue(selection: FieldSelection): string | null | undefined {
  switch (selection.source) {
    case 'linkedin':
      return selection.linkedinValue;

    case 'google':
      return selection.googleValue;

    case 'custom':
      return selection.customValue;

    case 'auto':
      // If one has data and other doesn't, use the one with data
      if (selection.linkedinValue && !selection.googleValue) {
        return selection.linkedinValue;
      }
      if (selection.googleValue && !selection.linkedinValue) {
        return selection.googleValue;
      }
      // If both have data, prefer LinkedIn
      if (selection.linkedinValue && selection.googleValue) {
        return selection.linkedinValue;
      }
      // Neither has data
      return null;

    default:
      return null;
  }
}

/**
 * Merge a LinkedIn contact with a Google contact using field selections
 */
export function mergeContacts(
  linkedin: LinkedInContact,
  google: GoogleContact,
  fieldSelections: FieldSelection[]
): MergedContact {
  // Create a map of field selections for easy lookup
  const selectionMap = new Map<string, FieldSelection>();
  for (const selection of fieldSelections) {
    selectionMap.set(selection.field, selection);
  }

  // Helper to get value for a field
  const getValue = (
    field: string,
    linkedinValue: string | null | undefined,
    googleValue: string | null | undefined
  ): string | null | undefined => {
    const selection = selectionMap.get(field);
    if (selection) {
      return selectFieldValue(selection);
    }
    // Default to auto-select if no explicit selection
    return selectFieldValue({
      field,
      source: 'auto',
      linkedinValue,
      googleValue,
    });
  };

  const merged: MergedContact = {
    name: getValue('name', linkedin.name, google.name) as string || linkedin.name,
    email: getValue('email', null, google.email) as string | null,
    phone: getValue('phone', null, google.phone) as string | null,
    headline: getValue('headline', linkedin.headline, null) as string | null,
    location: getValue('location', linkedin.location, google.location) as string | null,
    linkedinId: linkedin.linkedinId,
    googleId: google.resourceName,
    sources: [
      { type: 'linkedin', sourceId: linkedin.linkedinId },
      { type: 'google', sourceId: google.resourceName },
    ],
    employers: linkedin.employers,
  };

  return merged;
}
