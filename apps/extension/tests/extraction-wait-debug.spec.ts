/**
 * Extraction with Wait Debug
 *
 * Test different waiting strategies for LinkedIn content loading.
 */

import { test, expect } from './fixtures';

test.describe('Extraction Wait Debug', () => {
  test('wait for experience section to load', async ({ context }) => {
    const page = await context.newPage();

    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/williamhgates', { waitUntil: 'domcontentloaded' });

    // Wait for profile header
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('H1 found');

    // Wait for main content area
    await page.waitForSelector('main', { timeout: 10000 });
    console.log('Main found');

    // Scroll down to trigger lazy loading
    console.log('Scrolling to load content...');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(2000);

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Now check what we have
    const domState = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      // Check for sections with content
      const sections = document.querySelectorAll('main section');
      const sectionInfo: Array<Record<string, unknown>> = [];

      sections.forEach((section, i) => {
        const h2 = section.querySelector('h2');
        const imgs = section.querySelectorAll('img');
        const visibleText = section.textContent?.slice(0, 200)?.replace(/\s+/g, ' ').trim();

        sectionInfo.push({
          index: i,
          h2: h2?.textContent?.trim()?.slice(0, 50) || '(none)',
          imgCount: imgs.length,
          textPreview: visibleText?.slice(0, 100),
        });
      });

      result.sections = sectionInfo;

      // Look for Experience specifically
      const expText = document.body.textContent || '';
      result.hasExperienceText = expText.includes('Experience');

      // Find elements containing "Experience"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const expElements: string[] = [];
      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.trim() === 'Experience') {
          const parent = walker.currentNode.parentElement;
          const grandparent = parent?.parentElement;
          expElements.push(`${parent?.tagName}.${parent?.className?.slice(0, 30)} > ${grandparent?.tagName}.${grandparent?.className?.slice(0, 30)}`);
        }
      }
      result.experienceTextElements = expElements;

      // Check for company logos
      const companyImgs = document.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
      result.companyImgCount = companyImgs.length;
      result.companyImgSrcs = Array.from(companyImgs).slice(0, 5).map(img => (img as HTMLImageElement).src?.slice(0, 80));

      return result;
    });

    console.log('\n=== DOM STATE AFTER SCROLLING ===\n');
    console.log(JSON.stringify(domState, null, 2));

    // Try waiting for specific elements
    console.log('\n--- Waiting for specific elements ---');

    try {
      await page.waitForSelector('section:has-text("Experience")', { timeout: 5000 });
      console.log('Found section with "Experience" text');
    } catch {
      console.log('No section with "Experience" text found');
    }

    try {
      await page.waitForSelector('img[src*="company-logo"]', { timeout: 5000 });
      console.log('Found company logo images');
    } catch {
      console.log('No company logo images found');
    }

    // Final state after all waits
    const finalState = await page.evaluate(() => {
      const sections = document.querySelectorAll('main section');
      return Array.from(sections).map((s, i) => {
        const h2 = s.querySelector('h2');
        const imgs = s.querySelectorAll('img[src*="company"], img[src*="shrink"]');
        return { i, h2: h2?.textContent?.trim()?.slice(0, 30), imgs: imgs.length };
      });
    });

    console.log('\n--- Final Section State ---');
    finalState.forEach(s => {
      console.log(`Section ${s.i}: h2="${s.h2 || '(none)'}" imgs=${s.imgs}`);
    });

    // Take screenshot
    await page.screenshot({ path: 'wait-debug.png', fullPage: true });
    console.log('\nScreenshot saved to wait-debug.png');
  });

  test('test extraction after proper loading', async ({ context }) => {
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/in/jeffweiner08', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 });

    // Scroll and wait for lazy load
    for (let i = 0; i < 5; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * 500);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    // Extract with detailed logging
    const extraction = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      // Find Experience section by looking for h2 with "Experience" text
      const sections = document.querySelectorAll('main section');
      let expSection: Element | null = null;

      for (const section of sections) {
        const h2 = section.querySelector('h2');
        const text = h2?.textContent?.toLowerCase() || '';
        if (text.includes('experience')) {
          expSection = section;
          break;
        }
      }

      if (!expSection) {
        result.expFound = false;
        result.allH2s = Array.from(sections).map(s => s.querySelector('h2')?.textContent?.trim()).filter(Boolean);
        return result;
      }

      result.expFound = true;

      // Get all company images in this section
      const companyImgs = expSection.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
      result.companyImgCount = companyImgs.length;

      // Get all spans in the section
      const allSpans = expSection.querySelectorAll('span[aria-hidden="true"]');
      const spanTexts = Array.from(allSpans).map(s => s.textContent?.trim()).filter(t => t && t.length > 2);
      result.spanTexts = spanTexts.slice(0, 30);

      // Look for company name patterns
      const companyPatterns = spanTexts.filter(t => t?.includes(' · '));
      result.companyPatternSpans = companyPatterns;

      // Try to match companies
      const employers: string[] = [];
      for (const text of companyPatterns) {
        const company = text?.split(' · ')[0].trim();
        if (company && company.length > 2 && company.length < 80) {
          // Filter out job titles
          if (!/^(founder|ceo|cto|director|manager|engineer|developer)/i.test(company)) {
            employers.push(company);
          }
        }
      }
      result.extractedEmployers = employers;

      return result;
    });

    console.log('\n=== EXTRACTION AFTER LOADING ===\n');
    console.log(JSON.stringify(extraction, null, 2));
  });
});
