/**
 * Deep Extraction Debug Test
 *
 * Detailed debugging of specific extraction issues.
 */

import { test, expect } from './fixtures';

test.describe('Deep Extraction Debug', () => {
  test('debug experience section extraction', async ({ context }) => {
    const page = await context.newPage();

    // Go to a known profile with experience
    await page.goto('https://www.linkedin.com/in/williamhgates', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Debug the experience section structure
    const experienceDebug = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      // Find all sections and look for Experience
      const sections = document.querySelectorAll('main section');
      result.totalSections = sections.length;

      // Find Experience section by various methods
      const sectionDetails: Array<Record<string, unknown>> = [];

      sections.forEach((section, i) => {
        const h2 = section.querySelector('h2');
        const h2Text = h2?.textContent?.trim() || '';
        const anchor = section.querySelector('.pv-profile-card__anchor');
        const anchorId = anchor?.id || '';
        const imgs = section.querySelectorAll('img[src*="company"], img[src*="shrink_100"]');
        const allSpans = section.querySelectorAll('span[aria-hidden="true"]');
        const firstFewSpans = Array.from(allSpans).slice(0, 10).map(s => s.textContent?.trim()?.slice(0, 50));

        sectionDetails.push({
          index: i,
          h2Text: h2Text.slice(0, 50),
          anchorId,
          imgCount: imgs.length,
          spanSamples: firstFewSpans,
        });

        // If this looks like Experience section, dig deeper
        if (h2Text.toLowerCase().includes('experience') || anchorId.toLowerCase().includes('experience')) {
          result.experienceSection = {
            index: i,
            innerHTML: section.innerHTML.slice(0, 2000), // First 2000 chars
          };

          // Find all divs with company images
          const divsWithImg: Array<Record<string, unknown>> = [];
          const allDivs = section.querySelectorAll('div');

          allDivs.forEach((div, j) => {
            const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]') as HTMLImageElement;
            if (!img) return;

            // Check nesting
            const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
            if (nestedImgs.length > 1) return;

            // Get all span texts in this div
            const spans = div.querySelectorAll('span[aria-hidden="true"]');
            const spanTexts = Array.from(spans).map(s => s.textContent?.trim()).filter(Boolean);

            divsWithImg.push({
              divIndex: j,
              imgSrc: img.src?.slice(0, 100),
              spanTexts: spanTexts.slice(0, 15),
              divClass: div.className?.slice(0, 100),
            });
          });

          result.divsWithCompanyImg = divsWithImg;
        }
      });

      result.sectionDetails = sectionDetails;

      return result;
    });

    console.log('\n=== EXPERIENCE SECTION DEBUG ===\n');
    console.log('Total sections:', experienceDebug.totalSections);

    console.log('\n--- All Sections ---');
    const details = experienceDebug.sectionDetails as Array<Record<string, unknown>>;
    details.forEach((s) => {
      console.log(`\nSection ${s.index}:`);
      console.log(`  h2: "${s.h2Text}"`);
      console.log(`  anchorId: "${s.anchorId}"`);
      console.log(`  imgs: ${s.imgCount}`);
      console.log(`  spans: ${(s.spanSamples as string[]).join(' | ')}`);
    });

    if (experienceDebug.divsWithCompanyImg) {
      console.log('\n--- Divs with Company Images ---');
      const divs = experienceDebug.divsWithCompanyImg as Array<Record<string, unknown>>;
      divs.forEach((d, i) => {
        console.log(`\nDiv ${i}:`);
        console.log(`  img: ${d.imgSrc}`);
        console.log(`  class: ${d.divClass}`);
        console.log(`  spans:`);
        (d.spanTexts as string[]).forEach(t => console.log(`    - "${t}"`));
      });
    }

    // Now test the actual extraction logic
    const extractionTest = await page.evaluate(() => {
      // Replicate the extraction logic with logging
      const findSectionByHeader = (headerText: string): Element | null => {
        const searchText = headerText.toLowerCase();

        // Strategy 1: pv-profile-card__anchor with id
        const anchor = document.querySelector(`div.pv-profile-card__anchor[id*="${searchText}" i]`);
        if (anchor) {
          const section = anchor.closest('section');
          if (section) return section;
        }

        // Strategy 2: h2 text
        const allSections = document.querySelectorAll('main section');
        for (const section of allSections) {
          const h2 = section.querySelector('h2');
          if (h2?.textContent?.trim().toLowerCase().includes(searchText)) {
            return section;
          }
        }

        return null;
      };

      const expSection = findSectionByHeader('Experience');
      if (!expSection) return { found: false, reason: 'Section not found' };

      // Count images
      const imgs = expSection.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');

      // Try to extract
      const employers: Array<{ company: string; debug: string[] }> = [];
      const allDivs = expSection.querySelectorAll('div');

      for (const div of allDivs) {
        const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]') as HTMLImageElement;
        if (!img) continue;

        const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
        if (nestedImgs.length > 1) continue;

        const spans = div.querySelectorAll('span[aria-hidden="true"]');
        const debugSpans: string[] = [];

        for (const span of spans) {
          const text = span.textContent?.trim();
          if (!text || text.length < 2) continue;
          debugSpans.push(text.slice(0, 60));

          // Look for company pattern with " · "
          if (text.includes(' · ')) {
            const company = text.split(' · ')[0].trim();
            if (company.length > 2 && company.length < 80) {
              employers.push({ company, debug: debugSpans.slice() });
              break;
            }
          }
        }
      }

      return {
        found: true,
        imgCount: imgs.length,
        employersFound: employers.length,
        employers,
      };
    });

    console.log('\n--- Extraction Test Result ---');
    console.log(JSON.stringify(extractionTest, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'experience-debug.png', fullPage: true });
    console.log('\nScreenshot saved to experience-debug.png');
  });

  test('debug skills section', async ({ context }) => {
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/in/jeffweiner08', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const skillsDebug = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      // Find Skills section
      const sections = document.querySelectorAll('main section');
      let skillsSection: Element | null = null;

      sections.forEach(section => {
        const h2 = section.querySelector('h2');
        if (h2?.textContent?.toLowerCase().includes('skill')) {
          skillsSection = section;
        }
      });

      if (!skillsSection) {
        result.found = false;
        result.allH2s = Array.from(sections).map(s => s.querySelector('h2')?.textContent?.trim()).filter(Boolean);
        return result;
      }

      result.found = true;

      // Get all spans
      const allSpans = skillsSection.querySelectorAll('span[aria-hidden="true"]');
      result.allSpanTexts = Array.from(allSpans).slice(0, 30).map(s => s.textContent?.trim());

      // Get bold spans
      const boldSpans = skillsSection.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
      result.boldSpanTexts = Array.from(boldSpans).map(s => s.textContent?.trim());

      return result;
    });

    console.log('\n=== SKILLS SECTION DEBUG ===\n');
    console.log(JSON.stringify(skillsDebug, null, 2));
  });
});
