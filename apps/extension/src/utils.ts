/**
 * Pure utility functions for Social Recall extension
 * These are extracted from popup.ts to enable unit testing
 */

export interface Employer {
  company: string;
  logo: string;
}

/**
 * Extracts LinkedIn profile ID from a URL
 * @param url - The LinkedIn URL to parse
 * @returns The profile ID or null if not a valid LinkedIn profile URL
 */
export function extractProfileIdFromUrl(url: string): string | null {
  const urlRegex = /linkedin\.com\/in\/([^/?#]+)/;
  const match = urlRegex.exec(url);
  return match ? match[1] : null;
}

/**
 * Checks if a URL is a LinkedIn profile page
 * @param url - The URL to check
 * @returns true if the URL is a LinkedIn profile page
 */
export function isLinkedInProfileUrl(url: string): boolean {
  const profileRegex = /linkedin\.com\/in\/([^/]+)/;
  return profileRegex.test(url);
}

/**
 * Extracts person name from a LinkedIn page title
 * LinkedIn titles are typically formatted as "Name | LinkedIn" or "Name - Title | LinkedIn"
 * @param title - The page title to parse
 * @returns The extracted name or 'Unknown LinkedIn User' if not found
 */
export function extractProfileNameFromTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return 'Unknown LinkedIn User';
  }

  // Split on common LinkedIn title separators
  const titleParts = title.split(/\s[\|\-]\s|\s\||\s\-\s/);

  if (titleParts.length > 0 && titleParts[0].trim()) {
    return titleParts[0].trim();
  }

  return 'Unknown LinkedIn User';
}

/**
 * Extracts the first part of a string before the middle dot separator (·)
 * LinkedIn uses this format for "Company · Duration" in experience sections
 * @param str - The string to parse
 * @returns The first part before the middle dot, or the original string if no dot found
 */
export function extractFirstPartBeforeMiddleDot(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const middleDot = String.fromCharCode(0xB7); // ·
  const dotIndex = str.indexOf(' ' + middleDot + ' ');

  if (dotIndex !== -1) {
    return str.substring(0, dotIndex).trim();
  }

  return str.trim();
}

/**
 * Creates company initials from a company name (up to 2 letters)
 * @param companyName - The company name to create initials from
 * @returns Uppercase initials (1-2 characters)
 */
export function getCompanyInitials(companyName: string): string {
  if (!companyName || typeof companyName !== 'string') {
    return '';
  }

  return companyName
    .split(' ')
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Checks if a string looks like a duration (contains month references)
 * Used to filter out duration strings when parsing employer info
 * @param str - The string to check
 * @returns true if the string appears to be a duration
 */
export function isDurationString(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return /\d+\s*mo/.test(str);
}

/**
 * Determines if an employer is new (not in the saved list)
 * @param employer - The employer to check
 * @param savedEmployers - List of previously saved employers
 * @param isFirstVisit - Whether this is the first time viewing the profile
 * @returns true if the employer is new and should be highlighted
 */
export function isNewEmployer(
  employer: Employer,
  savedEmployers: Employer[],
  isFirstVisit: boolean
): boolean {
  if (isFirstVisit) {
    return false;
  }

  const savedCompanyNames = savedEmployers.map((e) => e.company.toLowerCase());
  return !savedCompanyNames.includes(employer.company.toLowerCase());
}
