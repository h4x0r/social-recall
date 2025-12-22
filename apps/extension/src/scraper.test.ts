import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  extractActivityPosts,
  scrapeSequentially,
  scrapeWithCache,
  clearScrapeCache,
} from './scraper';

/**
 * Tests for:
 * 1. Activity extractor - extracts posts with user commentary
 * 2. Sequential scraping with delays
 * 3. Caching to skip already-scraped sections
 */

// We'll test the pure extraction logic separately from Chrome APIs
// The extractDataFromPage function runs in page context, so we test it with JSDOM

describe('Activity Extractor', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://www.linkedin.com/in/test-user/recent-activity/all/',
    });
    document = dom.window.document;
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('extractActivityPosts', () => {
    it('extracts posts with user commentary', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span dir="ltr">This is my insightful commentary on the industry.</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toBe('This is my insightful commentary on the industry.');
    });

    it('skips reposts without commentary', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <span class="feed-shared-actor__sub-description">reposted this</span>
          <div class="feed-shared-text">
            <span dir="ltr">Original post content from someone else</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(0);
    });

    it('includes reposts WITH added commentary', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <span class="feed-shared-actor__sub-description">reposted this</span>
          <div class="feed-shared-update-v2__commentary">
            <span dir="ltr">My thoughts on this repost: very interesting!</span>
          </div>
          <div class="feed-shared-text">
            <span dir="ltr">Original post content from someone else</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toBe('My thoughts on this repost: very interesting!');
    });

    it('extracts up to 20 posts maximum', () => {
      // Create 25 posts
      const postsHtml = Array.from({ length: 25 }, (_, i) => `
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span dir="ltr">Post number ${i + 1} with some commentary</span>
          </div>
        </div>
      `).join('');

      document.body.innerHTML = postsHtml;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(20);
      expect(posts[0]).toContain('Post number 1');
      expect(posts[19]).toContain('Post number 20');
    });

    it('filters out short/empty commentary', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span dir="ltr">Ok</span>
          </div>
        </div>
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span dir="ltr">This is a substantial post with real content worth extracting.</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toContain('substantial post');
    });

    it('truncates very long posts to 500 characters', () => {
      const longText = 'A'.repeat(1000);
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span dir="ltr">${longText}</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(1);
      expect(posts[0].length).toBe(500);
    });

    it('handles LinkedIn aria-hidden pattern', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-text">
            <span aria-hidden="true">Visible text for extraction</span>
            <span class="visually-hidden">Screen reader text</span>
          </div>
        </div>
      `;

      const posts = extractActivityPosts(document);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toBe('Visible text for extraction');
    });
  });
});

describe('Sequential Scraping with Delays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrapes sections one at a time, not in parallel', async () => {
    const scrapeTimes: number[] = [];
    const mockScraper = vi.fn(async (section: string) => {
      scrapeTimes.push(Date.now());
      await new Promise(r => setTimeout(r, 100)); // Simulate scrape time
      return [`${section}-data`];
    });

    const sections = ['skills', 'experience', 'education'];
    const promise = scrapeSequentially(sections, mockScraper);

    // Advance through all timers
    await vi.runAllTimersAsync();
    await promise;

    expect(mockScraper).toHaveBeenCalledTimes(3);

    // Each scrape should start AFTER the previous one completes + delay
    // Not all at the same time (which would indicate parallel execution)
    for (let i = 1; i < scrapeTimes.length; i++) {
      const gap = scrapeTimes[i] - scrapeTimes[i - 1];
      expect(gap).toBeGreaterThanOrEqual(100); // At least previous scrape time
    }
  });

  it('adds random delay between 2-5 seconds between each scrape', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();

    const mockScraper = vi.fn(async () => {
      const now = Date.now();
      if (lastTime > 0) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      return [];
    });

    const sections = ['skills', 'experience', 'education'];
    const promise = scrapeSequentially(sections, mockScraper);

    await vi.runAllTimersAsync();
    await promise;

    // Should have delays between scrapes (not including first one)
    expect(delays.length).toBeGreaterThanOrEqual(2);

    // Each delay should be between 2000-5000ms
    for (const delay of delays.slice(1)) { // Skip first (no delay before first scrape)
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(5000);
    }
  });

  it('prioritizes sections in the specified order', async () => {
    const scrapeOrder: string[] = [];
    const mockScraper = vi.fn(async (section: string) => {
      scrapeOrder.push(section);
      return [];
    });

    // Priority order: services first, interests last
    const sections = ['services', 'recommendations', 'experience', 'skills', 'interests'];
    const promise = scrapeSequentially(sections, mockScraper);

    await vi.runAllTimersAsync();
    await promise;

    expect(scrapeOrder).toEqual(['services', 'recommendations', 'experience', 'skills', 'interests']);
  });

  it('reports progress after each section completes', async () => {
    const progressUpdates: { completed: number; total: number; current: string }[] = [];

    const mockScraper = vi.fn(async () => []);
    const onProgress = vi.fn((completed, total, current) => {
      progressUpdates.push({ completed, total, current });
    });

    const sections = ['skills', 'experience', 'education'];
    const promise = scrapeSequentially(sections, mockScraper, onProgress);

    await vi.runAllTimersAsync();
    await promise;

    expect(progressUpdates).toHaveLength(3);
    expect(progressUpdates[0]).toEqual({ completed: 1, total: 3, current: 'skills' });
    expect(progressUpdates[1]).toEqual({ completed: 2, total: 3, current: 'experience' });
    expect(progressUpdates[2]).toEqual({ completed: 3, total: 3, current: 'education' });
  });
});

describe('Caching Logic', () => {
  let mockStorage: Record<string, unknown>;

  beforeEach(() => {
    mockStorage = {};
  });

  it('skips scraping if section was already scraped today', async () => {
    const profileId = 'test-user';
    const today = new Date().toISOString().split('T')[0];

    // Pre-populate cache
    mockStorage[`scrape_cache_${profileId}`] = {
      skills: { data: ['JavaScript', 'TypeScript'], scrapedAt: today },
      experience: { data: ['Company A'], scrapedAt: today },
    };

    const mockScraper = vi.fn(async () => ['new-data']);

    const result = await scrapeWithCache(
      profileId,
      ['skills', 'experience', 'education'],
      mockScraper,
      mockStorage
    );

    // Should only scrape education (not cached)
    expect(mockScraper).toHaveBeenCalledTimes(1);
    expect(mockScraper).toHaveBeenCalledWith('education');

    // Should return cached data for skills and experience
    expect(result.skills).toEqual(['JavaScript', 'TypeScript']);
    expect(result.experience).toEqual(['Company A']);
    expect(result.education).toEqual(['new-data']);
  });

  it('re-scrapes if cache is from a different day', async () => {
    const profileId = 'test-user';
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    mockStorage[`scrape_cache_${profileId}`] = {
      skills: { data: ['Old Skill'], scrapedAt: yesterday },
    };

    const mockScraper = vi.fn(async () => ['New Skill']);

    await scrapeWithCache(profileId, ['skills'], mockScraper, mockStorage);

    // Should scrape because cache is stale
    expect(mockScraper).toHaveBeenCalledTimes(1);
    expect(mockScraper).toHaveBeenCalledWith('skills');
  });

  it('updates cache after successful scrape', async () => {
    const profileId = 'test-user';
    const today = new Date().toISOString().split('T')[0];

    const mockScraper = vi.fn(async () => ['React', 'Node.js']);

    await scrapeWithCache(profileId, ['skills'], mockScraper, mockStorage);

    const cache = mockStorage[`scrape_cache_${profileId}`] as Record<string, { data: string[]; scrapedAt: string }>;
    expect(cache.skills.data).toEqual(['React', 'Node.js']);
    expect(cache.skills.scrapedAt).toBe(today);
  });

  it('does not cache empty results', async () => {
    const profileId = 'test-user';

    const mockScraper = vi.fn(async () => []);

    await scrapeWithCache(profileId, ['skills'], mockScraper, mockStorage);

    const cache = mockStorage[`scrape_cache_${profileId}`];
    expect(cache).toBeUndefined();
  });

  it('clears cache for a specific profile when requested', async () => {
    const profileId = 'test-user';

    mockStorage[`scrape_cache_${profileId}`] = {
      skills: { data: ['JavaScript'], scrapedAt: '2025-01-01' },
    };

    clearScrapeCache(profileId, mockStorage);

    expect(mockStorage[`scrape_cache_${profileId}`]).toBeUndefined();
  });
});

