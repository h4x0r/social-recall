/**
 * Employer Extraction Debug Test
 *
 * Debug why employer extraction returns empty array.
 */

import { test, expect } from './fixtures';

test('debug employer extraction', async ({ context }) => {
  const page = await context.newPage();

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  // Scroll to load experience section
  for (const pos of [500, 1000, 1500]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000);

  console.log('\n=== EMPLOYER EXTRACTION DEBUG ===\n');

  // Check if Experience section exists
  const sectionInfo = await page.evaluate(() => {
    // Check for Experience anchor
    const expAnchor = document.querySelector('#experience');
    const section = expAnchor?.closest('section');

    if (!section) {
      return {
        found: false,
        expAnchorExists: !!expAnchor,
        note: 'No section found'
      };
    }

    // Count items
    const items = section.querySelectorAll('li.artdeco-list__item, li[class*="pvs-list__item"]');

    // Sample first item structure
    let firstItemStructure: { classes: string; childClasses: string[] } | null = null;
    if (items.length > 0) {
      const firstItem = items[0];
      firstItemStructure = {
        classes: firstItem.className,
        childClasses: Array.from(firstItem.querySelectorAll('[class]'))
          .slice(0, 10)
          .map(el => el.className)
      };
    }

    return {
      found: true,
      sectionClasses: section.className,
      itemCount: items.length,
      firstItemStructure,
    };
  });

  console.log('Section info:', JSON.stringify(sectionInfo, null, 2));

  // Try to extract text from experience items
  const extractionAttempt = await page.evaluate(() => {
    const section = document.querySelector('#experience')?.closest('section');
    if (!section) return { error: 'No section' };

    const items = section.querySelectorAll('li.artdeco-list__item, li[class*="pvs-list__item"]');
    const extracted: { index: number; texts: string[] }[] = [];

    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const item = items[i];
      const spans = item.querySelectorAll('span[aria-hidden="true"]');
      const texts = Array.from(spans)
        .map(s => s.textContent?.trim())
        .filter(Boolean)
        .slice(0, 5);

      extracted.push({ index: i, texts: texts as string[] });
    }

    return { extracted };
  });

  console.log('\nExtraction attempt:', JSON.stringify(extractionAttempt, null, 2));

  // Check what findSectionByHeader returns
  const findSectionResult = await page.evaluate(() => {
    const searchText = 'experience';

    // Strategy 1: pv-profile-card__anchor
    const anchor = document.querySelector(`div.pv-profile-card__anchor[id*="${searchText}" i], [id*="${searchText}" i].pv-profile-card__anchor`);
    let strategy1Section = null;
    if (anchor) {
      const section = anchor.closest('section');
      if (section) {
        strategy1Section = section.className;
      }
    }

    // Strategy 2: id attribute
    const byId = document.querySelector(`section[id*="${searchText}" i], div[id*="${searchText}" i]`);
    let strategy2Section = null;
    if (byId) {
      const section = byId.tagName === 'SECTION' ? byId : byId.closest('section');
      if (section) {
        strategy2Section = section.className;
      }
    }

    // Check #experience specifically
    const expDiv = document.querySelector('#experience');

    return {
      strategy1Section,
      strategy2Section,
      expDivExists: !!expDiv,
      expDivClass: expDiv?.className,
      expDivTagName: expDiv?.tagName,
      closestSectionClass: expDiv?.closest('section')?.className,
    };
  });

  console.log('\nfindSectionByHeader result:', JSON.stringify(findSectionResult, null, 2));

  // Check logs for extraction messages
  const extractionLogs = logs.filter(l =>
    l.includes('Experience') ||
    l.includes('employer') ||
    l.includes('company')
  );
  console.log('\nExtraction-related logs:');
  extractionLogs.forEach(l => console.log(`  ${l}`));

  expect(sectionInfo.found).toBe(true);
});
