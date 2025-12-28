/**
 * SSR Structure Test
 *
 * Examines the actual structure of experience/education data in SSR.
 */

import { test, expect } from './fixtures';

test('examine companyName and title structure in SSR', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== SSR STRUCTURE ANALYSIS ===\n');

  // Get items that have companyName or title
  const items = await page.evaluate(() => {
    const results: unknown[] = [];
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const code of codeTags) {
      try {
        const parsed = JSON.parse(code.textContent || '');

        // Find included array
        let included: unknown[] | null = null;
        if (Array.isArray(parsed.included)) included = parsed.included;
        else if (parsed.data?.included) included = parsed.data.included;
        else if (parsed.data?.data?.included) included = parsed.data.data.included;

        if (!included) continue;

        for (const item of included) {
          if (typeof item !== 'object' || !item) continue;
          const typedItem = item as Record<string, unknown>;

          // Look for items with companyName or title fields
          if (typedItem.companyName || typedItem.title || typedItem.schoolName) {
            results.push({
              $type: typedItem.$type,
              entityUrn: typedItem.entityUrn,
              companyName: typedItem.companyName,
              title: typedItem.title,
              schoolName: typedItem.schoolName,
              company: typedItem.company,
              timePeriod: typedItem.timePeriod,
              dateRange: typedItem.dateRange,
              description: typeof typedItem.description === 'string'
                ? typedItem.description.slice(0, 50)
                : typedItem.description,
            });
          }
        }
      } catch {}
    }

    return results.slice(0, 20);
  });

  console.log(`Found ${items.length} items with companyName/title/schoolName\n`);

  for (let i = 0; i < Math.min(items.length, 10); i++) {
    console.log(`--- Item ${i + 1} ---`);
    console.log(JSON.stringify(items[i], null, 2));
    console.log('');
  }

  expect(items.length).toBeGreaterThan(0);
});

test('find all types in all code tags', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== ALL TYPES IN SSR ===\n');

  const allTypes = await page.evaluate(() => {
    const types = new Set<string>();
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const code of codeTags) {
      try {
        const parsed = JSON.parse(code.textContent || '');

        let included: unknown[] | null = null;
        if (Array.isArray(parsed.included)) included = parsed.included;
        else if (parsed.data?.included) included = parsed.data.included;
        else if (parsed.data?.data?.included) included = parsed.data.data.included;

        if (!included) continue;

        for (const item of included) {
          if (typeof item !== 'object' || !item) continue;
          const typedItem = item as { $type?: string };
          if (typedItem.$type) {
            types.add(typedItem.$type.split('.').pop() || typedItem.$type);
          }
        }
      } catch {}
    }

    return [...types].sort();
  });

  console.log(`Found ${allTypes.length} unique types:`);
  allTypes.forEach(t => console.log(`  - ${t}`));

  // Check for position/experience related types
  const relevant = allTypes.filter(t =>
    t.toLowerCase().includes('position') ||
    t.toLowerCase().includes('experience') ||
    t.toLowerCase().includes('education') ||
    t.toLowerCase().includes('school') ||
    t.toLowerCase().includes('company') ||
    t.toLowerCase().includes('skill')
  );

  console.log('\n--- Potentially relevant types ---');
  relevant.forEach(t => console.log(`  - ${t}`));

  expect(allTypes.length).toBeGreaterThan(0);
});
