/**
 * Scraper utilities for Social Recall
 * - Activity post extraction
 * - Sequential scraping with delays
 * - Caching to avoid re-scraping
 */

const MAX_ACTIVITY_POSTS = 20;
const MIN_POST_LENGTH = 10;
const MAX_POST_LENGTH = 500;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

/**
 * Extract posts with user commentary from LinkedIn activity page
 * Filters out simple reposts without added text
 */
export function extractActivityPosts(document: Document): string[] {
  const posts: string[] = [];
  const seen = new Set<string>();

  // Find all activity/feed items
  const feedItems = document.querySelectorAll([
    '.feed-shared-update-v2',
    '.occludable-update',
    '[data-urn*="activity"]',
  ].join(', '));

  for (const item of feedItems) {
    if (posts.length >= MAX_ACTIVITY_POSTS) break;

    // Check if this is a repost
    const isRepost = item.querySelector([
      '.feed-shared-actor__sub-description',
      '[data-urn*="reshare"]',
      '.feed-shared-reshared-text',
    ].join(', ')) !== null ||
    item.innerHTML?.includes('reposted');

    let commentary: string | null = null;

    if (isRepost) {
      // For reposts, only extract if user added their own commentary
      const commentaryEl = item.querySelector([
        '.feed-shared-update-v2__commentary span[dir="ltr"]',
        '.feed-shared-update-v2__commentary span[aria-hidden="true"]',
        '.feed-shared-update-v2__commentary',
      ].join(', '));

      if (commentaryEl) {
        commentary = extractTextContent(commentaryEl);
      }
      // Skip reposts without commentary
      if (!commentary) continue;
    } else {
      // Original post - extract the post text
      const textEl = item.querySelector([
        '.update-components-text span[dir="ltr"]',
        '.update-components-text span[aria-hidden="true"]',
        '.feed-shared-text span[dir="ltr"]',
        '.feed-shared-text span[aria-hidden="true"]',
        '.break-words span[aria-hidden="true"]',
      ].join(', '));

      if (textEl) {
        commentary = extractTextContent(textEl);
      }
    }

    // Validate and add the commentary
    if (commentary && isValidPost(commentary) && !seen.has(commentary.toLowerCase())) {
      seen.add(commentary.toLowerCase());
      posts.push(truncatePost(commentary));
    }
  }

  return posts;
}

/**
 * Extract text content, preferring aria-hidden spans
 */
function extractTextContent(el: Element): string | null {
  // First try aria-hidden span (LinkedIn's pattern for visible text)
  const ariaHidden = el.querySelector('span[aria-hidden="true"]');
  if (ariaHidden?.textContent?.trim()) {
    return ariaHidden.textContent.trim();
  }
  return el.textContent?.trim() || null;
}

/**
 * Check if post is valid (not too short, not empty)
 */
function isValidPost(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= MIN_POST_LENGTH;
}

/**
 * Truncate post to max length
 */
function truncatePost(text: string): string {
  if (text.length <= MAX_POST_LENGTH) return text;
  return text.slice(0, MAX_POST_LENGTH);
}

/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

/**
 * Wait for a specified duration
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape sections sequentially with random delays between each
 * This prevents triggering LinkedIn's rate limiting
 */
export async function scrapeSequentially(
  sections: string[],
  scraper: (section: string) => Promise<string[]>,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  const total = sections.length;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Add delay before scraping (except for first section)
    if (i > 0) {
      await wait(randomDelay());
    }

    // Scrape the section
    const data = await scraper(section);
    results[section] = data;

    // Report progress
    onProgress?.(i + 1, total, section);
  }

  return results;
}

/**
 * Cache entry for scraped data
 */
interface CacheEntry {
  data: string[];
  scrapedAt: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Scrape sections with caching - skips already-scraped sections from today
 */
export async function scrapeWithCache(
  profileId: string,
  sections: string[],
  scraper: (section: string) => Promise<string[]>,
  storage: Record<string, unknown>
): Promise<Record<string, string[]>> {
  const cacheKey = `scrape_cache_${profileId}`;
  const today = getTodayDate();
  const results: Record<string, string[]> = {};

  // Load existing cache
  const cache = (storage[cacheKey] as Record<string, CacheEntry>) || {};

  for (const section of sections) {
    const cached = cache[section];

    // Use cached data if it's from today
    if (cached && cached.scrapedAt === today && cached.data.length > 0) {
      results[section] = cached.data;
      continue;
    }

    // Otherwise, scrape the section
    const data = await scraper(section);
    results[section] = data;

    // Cache non-empty results
    if (data.length > 0) {
      if (!storage[cacheKey]) {
        storage[cacheKey] = {};
      }
      (storage[cacheKey] as Record<string, CacheEntry>)[section] = {
        data,
        scrapedAt: today,
      };
    }
  }

  return results;
}

/**
 * Clear the scrape cache for a specific profile
 */
export function clearScrapeCache(
  profileId: string,
  storage: Record<string, unknown>
): void {
  const cacheKey = `scrape_cache_${profileId}`;
  delete storage[cacheKey];
}

/**
 * Section priority order (most valuable first)
 * This is used for sequential scraping to get important data first
 */
export const SECTION_PRIORITY_ORDER = [
  'activity',      // User's own thoughts - highest signal
  'services',      // What they offer
  'recommendations', // Social proof
  'honors',        // Achievements
  'publications',  // Thought leadership
  'experience',    // Work history
  'courses',       // Learning interests
  'education',     // Background
  'certifications', // Professional credentials
  'testscores',    // Assessments
  'skills',        // Technical abilities
  'languages',     // Communication
  'volunteering',  // Values/causes
  'organizations', // Affiliations
  'interests',     // Lowest priority
] as const;

export type SectionType = typeof SECTION_PRIORITY_ORDER[number];
