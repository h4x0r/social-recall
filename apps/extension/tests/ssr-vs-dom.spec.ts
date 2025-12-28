/**
 * SSR vs DOM Extraction Comparison Test
 *
 * Actually runs both extraction methods and compares what each captures.
 */

import { test, expect } from './fixtures';

const TEST_PROFILES = [
  { id: 'satyanadella', name: 'Satya Nadella' },
  { id: 'jeffweiner08', name: 'Jeff Weiner' },
  { id: 'sundarpichai', name: 'Sundar Pichai' },
  { id: 'williamhgates', name: 'Bill Gates' },
  { id: 'reidhoffman', name: 'Reid Hoffman' },
  { id: 'garyvaynerchuk', name: 'Gary Vaynerchuk' },
  { id: 'melrobbins', name: 'Mel Robbins' },
  { id: 'adammgrant', name: 'Adam Grant' },
  { id: 'sheryl-sandberg-5126652', name: 'Sheryl Sandberg' },
  { id: 'dhh', name: 'David Heinemeier Hansson' },
];

interface ExtractionResult {
  employers: string[];
  education: string[];
  skills: string[];
  activities: string[];
}

interface ProfileComparison {
  id: string;
  name: string;
  ssr: ExtractionResult;
  dom: ExtractionResult;
  ssrOnly: { employers: string[]; education: string[] };
  domOnly: { employers: string[]; education: string[]; skills: string[]; activities: string[] };
  both: { employers: string[]; education: string[] };
}

test('compare SSR vs DOM extraction', async ({ context }) => {
  test.setTimeout(600000);
  const results: ProfileComparison[] = [];

  console.log('\n' + '='.repeat(60));
  console.log('SSR vs DOM EXTRACTION COMPARISON');
  console.log('='.repeat(60) + '\n');

  for (let i = 0; i < TEST_PROFILES.length; i++) {
    const profile = TEST_PROFILES[i];
    const page = await context.newPage();
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log(`\n[${i + 1}/${TEST_PROFILES.length}] ${profile.name}`);

    try {
      await page.goto(`https://www.linkedin.com/in/${profile.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

      // Scroll to trigger lazy loading
      for (const pos of [500, 1000, 1500, 2000, 2500, 3000]) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
        await page.waitForTimeout(200);
      }
      await page.evaluate(() => window.scrollTo({ top: 0 }));

      // Wait for extraction
      const maxWaitTime = 20000;
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitTime) {
        const hasComplete = consoleMessages.some(m =>
          m.includes('Intelligence built:') ||
          m.includes('Extracted profile data:') ||
          m.includes('Using stored data with valid archetype')
        );
        if (hasComplete) {
          await page.waitForTimeout(500);
          break;
        }
        await page.waitForTimeout(300);
      }

      // Parse SSR extraction from console logs
      const ssrResult: ExtractionResult = {
        employers: [],
        education: [],
        skills: [],
        activities: [],
      };

      // Look for SSR employer logs
      for (const msg of consoleMessages) {
        if (msg.includes('SSR extracted employers:') || msg.includes('Voyager data:')) {
          const match = msg.match(/employers?:\s*(\d+)/i);
          if (match) {
            // Can't get names from count, need to parse differently
          }
        }
        // Parse "Found employer:" logs from DOM extraction
        if (msg.includes('[Social Recall] Found employer:')) {
          const name = msg.replace('[Social Recall] Found employer:', '').trim();
          if (name && !ssrResult.employers.includes(name)) {
            // This is actually DOM extraction logging
          }
        }
      }

      // Now run actual DOM extraction in page context
      const domResult = await page.evaluate(() => {
        const result: ExtractionResult = {
          employers: [],
          education: [],
          skills: [],
          activities: [],
        };

        // Helper to find section by header
        function findSectionByHeader(headerText: string): Element | null {
          const searchText = headerText.toLowerCase();
          const sections = document.querySelectorAll('section');
          for (const section of sections) {
            const h2 = section.querySelector('h2');
            const h2Text = h2?.textContent?.trim().toLowerCase();
            if (h2Text?.includes(searchText)) {
              return section;
            }
            // Also check spans
            const spans = section.querySelectorAll('span[aria-hidden="true"]');
            for (let i = 0; i < Math.min(5, spans.length); i++) {
              const text = spans[i].textContent?.trim().toLowerCase();
              if (text === searchText || text?.startsWith(searchText)) {
                return section;
              }
            }
          }
          return null;
        }

        // Extract employers from Experience section
        const expSection = findSectionByHeader('Experience');
        if (expSection) {
          const seen = new Set<string>();
          const allDivs = expSection.querySelectorAll('div');

          for (const div of allDivs) {
            const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]');
            if (!img) continue;

            const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
            if (nestedImgs.length > 1) continue;

            const spans = div.querySelectorAll('span[aria-hidden="true"]');
            const texts: string[] = [];

            for (const span of spans) {
              const text = span.textContent?.trim();
              if (!text || text.length < 2) continue;
              if (/^\w{3} \d{4}/.test(text) || /Present/.test(text)) continue;
              if (/^\d+\s*(yr|mo)/.test(text)) continue;
              texts.push(text);
            }

            // Company is usually second text (after job title)
            if (texts.length >= 2) {
              const company = texts[1].split(' · ')[0].trim();
              if (company.length > 1 && company.length < 100 && !seen.has(company.toLowerCase())) {
                seen.add(company.toLowerCase());
                result.employers.push(company);
              }
            }
          }
        }

        // Extract education
        const eduSection = findSectionByHeader('Education');
        if (eduSection) {
          const seen = new Set<string>();
          const allDivs = eduSection.querySelectorAll('div');

          for (const div of allDivs) {
            const img = div.querySelector('img[src*="shrink_100"]');
            if (!img) continue;

            const nestedImgs = div.querySelectorAll('img[src*="shrink_100"]');
            if (nestedImgs.length > 1) continue;

            const spans = div.querySelectorAll('span[aria-hidden="true"]');
            for (const span of spans) {
              const text = span.textContent?.trim();
              if (!text || text.length < 3) continue;
              if (/^\d{4}/.test(text) || /^\w{3} \d{4}/.test(text)) continue;

              // School names are typically first and bold
              const parentClasses = span.parentElement?.className || '';
              if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
                if (!seen.has(text.toLowerCase()) && text.length < 100) {
                  seen.add(text.toLowerCase());
                  result.education.push(text);
                  break;
                }
              }
            }
          }
        }

        // Extract skills
        const skillsSection = findSectionByHeader('Skills');
        if (skillsSection) {
          const seen = new Set<string>();
          const boldSpans = skillsSection.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

          for (const span of boldSpans) {
            const text = span.textContent?.trim();
            if (!text || text.length < 2 || text.length > 60) continue;
            if (text.includes('Show all') || text.includes('endorsement')) continue;
            if (/^\d+$/.test(text)) continue;

            if (!seen.has(text.toLowerCase())) {
              seen.add(text.toLowerCase());
              result.skills.push(text);
            }
          }
        }

        // Extract activities
        const activitySection = findSectionByHeader('Activity');
        if (activitySection) {
          const seen = new Set<string>();
          const postTexts = activitySection.querySelectorAll('span[aria-hidden="true"]');

          for (const span of postTexts) {
            if (result.activities.length >= 10) break;
            const text = span.textContent?.trim();
            if (!text || text.length < 20) continue;
            if (text.includes('Show all') || text.includes('follower')) continue;
            if (/^\d+\s*(reactions?|comments?|reposts?)$/.test(text)) continue;

            const textLower = text.toLowerCase();
            if (!seen.has(textLower)) {
              seen.add(textLower);
              result.activities.push(text.slice(0, 200));
            }
          }
        }

        return result;
      });

      // Parse SSR data from console logs - look for the actual extracted data
      for (const msg of consoleMessages) {
        // SSR employer extraction logs
        if (msg.includes('SSR profile matches') || msg.includes('Using embedded profile data')) {
          // SSR was used
        }
        if (msg.includes('Extracted employers:')) {
          const countMatch = msg.match(/Extracted employers: (\d+)/);
          // We have count but need names - parse from other logs
        }
      }

      // Parse "Extracted profile data:" JSON for SSR data
      const extractedDataLog = consoleMessages.find(m => m.includes('Extracted profile data:'));
      if (extractedDataLog) {
        const jsonMatch = extractedDataLog.match(/Extracted profile data: ({[\s\S]*})/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            if (Array.isArray(data.employers)) {
              ssrResult.employers = data.employers.map((e: { company: string }) => e.company);
            }
            if (Array.isArray(data.education)) {
              ssrResult.education = data.education.map((e: { school: string }) => e.school);
            }
            if (Array.isArray(data.activities)) {
              ssrResult.activities = data.activities.map((a: { text: string }) => a.text?.slice(0, 100));
            }
          } catch { /* ignore */ }
        }
      }

      // Compare results
      const ssrEmployerSet = new Set(ssrResult.employers.map(e => e.toLowerCase()));
      const domEmployerSet = new Set(domResult.employers.map(e => e.toLowerCase()));

      const ssrEduSet = new Set(ssrResult.education.map(e => e.toLowerCase()));
      const domEduSet = new Set(domResult.education.map(e => e.toLowerCase()));

      const comparison: ProfileComparison = {
        id: profile.id,
        name: profile.name,
        ssr: ssrResult,
        dom: domResult,
        ssrOnly: {
          employers: ssrResult.employers.filter(e => !domEmployerSet.has(e.toLowerCase())),
          education: ssrResult.education.filter(e => !domEduSet.has(e.toLowerCase())),
        },
        domOnly: {
          employers: domResult.employers.filter(e => !ssrEmployerSet.has(e.toLowerCase())),
          education: domResult.education.filter(e => !ssrEduSet.has(e.toLowerCase())),
          skills: domResult.skills,
          activities: domResult.activities,
        },
        both: {
          employers: ssrResult.employers.filter(e => domEmployerSet.has(e.toLowerCase())),
          education: ssrResult.education.filter(e => domEduSet.has(e.toLowerCase())),
        },
      };

      results.push(comparison);

      console.log(`  SSR: ${ssrResult.employers.length} employers, ${ssrResult.education.length} education`);
      console.log(`  DOM: ${domResult.employers.length} employers, ${domResult.education.length} education, ${domResult.skills.length} skills, ${domResult.activities.length} activities`);

    } catch (err) {
      console.log(`  ERROR: ${err}`);
    }

    await page.close();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  let totalSsrEmployers = 0;
  let totalDomEmployers = 0;
  let totalSsrEducation = 0;
  let totalDomEducation = 0;
  let totalDomSkills = 0;
  let totalDomActivities = 0;
  let ssrOnlyEmployers = 0;
  let domOnlyEmployers = 0;

  for (const r of results) {
    totalSsrEmployers += r.ssr.employers.length;
    totalDomEmployers += r.dom.employers.length;
    totalSsrEducation += r.ssr.education.length;
    totalDomEducation += r.dom.education.length;
    totalDomSkills += r.dom.skills.length;
    totalDomActivities += r.dom.activities.length;
    ssrOnlyEmployers += r.ssrOnly.employers.length;
    domOnlyEmployers += r.domOnly.employers.length;
  }

  console.log('\n--- TOTALS ---');
  console.log(`SSR employers: ${totalSsrEmployers}`);
  console.log(`DOM employers: ${totalDomEmployers}`);
  console.log(`SSR education: ${totalSsrEducation}`);
  console.log(`DOM education: ${totalDomEducation}`);
  console.log(`DOM skills: ${totalDomSkills}`);
  console.log(`DOM activities: ${totalDomActivities}`);

  console.log('\n--- UNIQUE TO EACH METHOD ---');
  console.log(`Employers only in SSR: ${ssrOnlyEmployers}`);
  console.log(`Employers only in DOM: ${domOnlyEmployers}`);

  console.log('\n--- DETAILED COMPARISON ---');
  for (const r of results) {
    console.log(`\n${r.name}:`);
    console.log(`  SSR employers: [${r.ssr.employers.join(', ')}]`);
    console.log(`  DOM employers: [${r.dom.employers.join(', ')}]`);
    if (r.ssrOnly.employers.length > 0) {
      console.log(`  SSR-only: [${r.ssrOnly.employers.join(', ')}]`);
    }
    if (r.domOnly.employers.length > 0) {
      console.log(`  DOM-only: [${r.domOnly.employers.join(', ')}]`);
    }
    console.log(`  DOM skills: [${r.dom.skills.slice(0, 5).join(', ')}${r.dom.skills.length > 5 ? '...' : ''}]`);
    console.log(`  DOM activities: ${r.dom.activities.length} posts`);
  }

  // Assertions
  expect(totalDomEmployers).toBeGreaterThan(0);
  expect(totalDomSkills).toBeGreaterThan(0);
});
