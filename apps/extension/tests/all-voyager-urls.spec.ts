/**
 * All Voyager URLs Test
 *
 * Captures ALL Voyager API URLs at network level to understand
 * which endpoints provide Experience, Education, Skills data.
 */

import { test, expect } from './fixtures';

test('capture all Voyager URLs and analyze', async ({ context }) => {
  const page = await context.newPage();

  // Capture at network level using CDP
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');

  const allUrls: Array<{ url: string; queryName: string }> = [];

  client.on('Network.requestWillBeSent', (params: { request: { url: string } }) => {
    const url = params.request.url;
    if (url.includes('/voyager/api/')) {
      const queryMatch = url.match(/queryId=([^&.]+)/);
      const queryName = queryMatch ? queryMatch[1] : 'no-query-id';
      allUrls.push({ url: url.slice(0, 150), queryName });
    }
  });

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});

  // Scroll extensively to trigger all lazy loading
  for (const pos of [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(3000);

  console.log('\n=== ALL VOYAGER API CALLS ===\n');
  console.log(`Total Voyager calls: ${allUrls.length}\n`);

  // Group by query name
  const byQuery: Record<string, string[]> = {};
  for (const { url, queryName } of allUrls) {
    if (!byQuery[queryName]) {
      byQuery[queryName] = [];
    }
    byQuery[queryName].push(url);
  }

  // Show unique query names
  console.log('Query Names Found:');
  for (const [queryName, urls] of Object.entries(byQuery)) {
    console.log(`  ${queryName}: ${urls.length} calls`);
  }

  // Look for experience/education/skills related
  console.log('\n--- Searching for Experience/Education/Skills queries ---');
  const relevantPatterns = ['experience', 'position', 'education', 'school', 'skill', 'certification'];

  for (const pattern of relevantPatterns) {
    const matching = allUrls.filter(({ url, queryName }) =>
      url.toLowerCase().includes(pattern) || queryName.toLowerCase().includes(pattern)
    );
    if (matching.length > 0) {
      console.log(`\n"${pattern}" found in ${matching.length} URLs:`);
      matching.slice(0, 3).forEach(({ url }) => console.log(`  ${url}`));
    } else {
      console.log(`"${pattern}": NOT FOUND in any URL`);
    }
  }

  // Show full list of unique query names
  console.log('\n--- Unique Query Names ---');
  const uniqueQueries = [...new Set(allUrls.map(u => u.queryName))].sort();
  uniqueQueries.forEach(q => console.log(q));

  expect(allUrls.length).toBeGreaterThan(0);
});
