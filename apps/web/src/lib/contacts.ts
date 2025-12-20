/**
 * Contact domain logic for Social Recall
 * Contains types, validation, and utility functions for contacts
 */

export interface Employer {
  company: string;
  logo: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  confidence: number;
  confirmed?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  linkedinUrl?: string;
  profileId?: string;
  notes?: string;
  employers?: Employer[];
  skills?: Skill[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ContactDisplayInfo {
  initials: string;
  primaryEmployer?: string;
  skillCount: number;
}

export interface FilterOptions {
  byCategory?: boolean;
  minConfidence?: number;
}

/**
 * Validates a partial contact object
 * @param contact - The contact to validate
 * @returns Validation result with errors if any
 */
export function validateContact(contact: Partial<Contact>): ContactValidationResult {
  const errors: string[] = [];

  // Name is required
  if (!contact.name || contact.name.trim() === '') {
    errors.push('Name is required');
  }

  // LinkedIn URL must be valid if provided
  if (contact.linkedinUrl) {
    try {
      const url = new URL(contact.linkedinUrl);
      if (!url.hostname.includes('linkedin.com')) {
        errors.push('Invalid LinkedIn URL');
      }
    } catch {
      errors.push('Invalid LinkedIn URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes a contact name
 * - Trims whitespace
 * - Removes extra internal spaces
 * - Capitalizes first letter of each word
 */
export function normalizeContactName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gets initials from a contact name (max 2 characters)
 */
export function getContactInitials(name: string): string {
  if (!name || name.trim() === '') return '';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  // First and last name initials
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

/**
 * Formats a contact for display purposes
 */
export function formatContactForDisplay(contact: Contact): ContactDisplayInfo {
  return {
    initials: getContactInitials(contact.name),
    primaryEmployer: contact.employers?.[0]?.company,
    skillCount: contact.skills?.length ?? 0,
  };
}

/**
 * Searches contacts by query string
 * Searches across name, employers, skills, and notes
 */
export function searchContacts(contacts: Contact[], query: string): Contact[] {
  if (!query || query.trim() === '') {
    return contacts;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return contacts.filter((contact) => {
    // Search by name
    if (contact.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search by employer
    if (contact.employers?.some((e) => e.company.toLowerCase().includes(normalizedQuery))) {
      return true;
    }

    // Search by skill
    if (contact.skills?.some((s) => s.name.toLowerCase().includes(normalizedQuery))) {
      return true;
    }

    // Search by notes
    if (contact.notes?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return false;
  });
}

/**
 * Filters contacts by skill name or category
 */
export function filterContactsBySkill(
  contacts: Contact[],
  skillOrCategory: string,
  options: FilterOptions = {}
): Contact[] {
  const { byCategory = false, minConfidence = 0 } = options;
  const normalizedQuery = skillOrCategory.toLowerCase();

  return contacts.filter((contact) => {
    if (!contact.skills || contact.skills.length === 0) {
      return false;
    }

    return contact.skills.some((skill) => {
      // Check confidence threshold
      if (skill.confidence < minConfidence) {
        return false;
      }

      // Match by category or skill name
      if (byCategory) {
        return skill.category.toLowerCase() === normalizedQuery;
      }

      return skill.name.toLowerCase() === normalizedQuery;
    });
  });
}
