/**
 * Quick Extraction Test
 *
 * Tests data extraction on 5 profiles to verify SSR extraction is working.
 */

import { test, expect } from './fixtures';

const TEST_PROFILES = [
  // Tech executives
  { id: 'satyanadella', name: 'Satya Nadella' },
  { id: 'jeffweiner08', name: 'Jeff Weiner' },
  { id: 'sundarpichai', name: 'Sundar Pichai' },
  { id: 'jenhsunhuang', name: 'Jensen Huang' },
  { id: 'williamhgates', name: 'Bill Gates' },
  // Entrepreneurs/VCs
  { id: 'guykawasaki', name: 'Guy Kawasaki' },
  { id: 'garyvaynerchuk', name: 'Gary Vaynerchuk' },
  { id: 'reidhoffman', name: 'Reid Hoffman' },
  { id: 'marismith', name: 'Mari Smith' },
  { id: 'neilkpatel', name: 'Neil Patel' },
  // Media/Influencers
  { id: 'ariannahuffington', name: 'Arianna Huffington' },
  { id: 'rbranson', name: 'Richard Branson' },
  { id: 'melrobbins', name: 'Mel Robbins' },
  { id: 'simonsinek', name: 'Simon Sinek' },
  { id: 'adammgrant', name: 'Adam Grant' },
  // Diverse industries
  { id: 'brenebrown', name: 'Brene Brown' },
  { id: 'officialtonyrobbins', name: 'Tony Robbins' },
  { id: 'sheryl-sandberg-5126652', name: 'Sheryl Sandberg' },
  { id: 'dhh', name: 'David Heinemeier Hansson' },
  { id: 'mark-zuckerberg-618bba58', name: 'Mark Zuckerberg' },
];

interface ProfileResult {
  id: string;
  name: string;
  ssrExtracted: boolean;
  experienceExtracted: boolean;
  educationExtracted: boolean;
  fieldsExtracted: string[];
  errors: string[];
}

test('quick extraction test on 20 profiles', async ({ context }) => {
  test.setTimeout(600000); // 10 minutes for 20 profiles
  const results: ProfileResult[] = [];

  for (const profile of TEST_PROFILES) {
    const page = await context.newPage();
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log(`\n--- Testing ${profile.name} (${profile.id}) ---`);

    try {
      await page.goto(`https://www.linkedin.com/in/${profile.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

      // Scroll to trigger lazy loading
      for (const pos of [500, 1000, 1500, 2000, 2500]) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
        await page.waitForTimeout(300);
      }
      await page.evaluate(() => window.scrollTo({ top: 0 }));

      // Wait for extraction completion by polling console messages
      // This replaces hard waits with condition-based waiting
      const maxWaitTime = 20000;
      const pollInterval = 300;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        // Check for extraction completion markers in console logs
        const hasExtractionComplete = consoleMessages.some(m =>
          m.includes('Intelligence built:') ||
          m.includes('Extracted profile data:') ||
          m.includes('Using stored data with valid archetype')
        );

        if (hasExtractionComplete) {
          // Give a small buffer for final log messages
          await page.waitForTimeout(300);
          break;
        }

        await page.waitForTimeout(pollInterval);
      }

      const ssrExtracted = consoleMessages.some(m =>
        m.includes('Found matching profile in code tag') ||
        m.includes('Using embedded profile data (SSR)')
      );

      // Parse extracted profile data from logs - check multiple log patterns
      let experienceExtracted = false;
      let educationExtracted = false;

      // Pattern 1: "Extracted profile data:" log (new profiles)
      const extractedLog = consoleMessages.find(m => m.includes('Extracted profile data:'));
      if (extractedLog) {
        const jsonMatch = extractedLog.match(/Extracted profile data: ({[\s\S]*})/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            experienceExtracted = Array.isArray(data.employers) && data.employers.length > 0;
            educationExtracted = Array.isArray(data.education) && data.education.length > 0;
          } catch { /* ignore parse errors */ }
        }
      }

      // Pattern 2: "Extracted employers:" log (all profiles)
      if (!experienceExtracted) {
        const employersLog = consoleMessages.find(m => m.includes('Extracted employers:'));
        if (employersLog) {
          const match = employersLog.match(/Extracted employers: (\d+)/);
          if (match && parseInt(match[1]) > 0) {
            experienceExtracted = true;
          }
        }
      }

      // Pattern 3: "Extracted education:" log (all profiles)
      if (!educationExtracted) {
        const educationLog = consoleMessages.find(m => m.includes('Extracted education:'));
        if (educationLog) {
          const match = educationLog.match(/Extracted education: (\d+)/);
          if (match && parseInt(match[1]) > 0) {
            educationExtracted = true;
          }
        }
      }

      const extractedData = await page.evaluate(() => {
        const name = document.querySelector('h1.text-heading-xlarge')?.textContent?.trim();
        const headline = document.querySelector('.text-body-medium.break-words')?.textContent?.trim();
        const hasAbout = !!document.querySelector('#about');
        const hasExp = !!document.querySelector('#experience');
        const hasEdu = !!document.querySelector('#education');
        const hasSkills = !!document.querySelector('#skills');

        return { name, headline, hasAbout, hasExp, hasEdu, hasSkills };
      });

      const fieldsExtracted: string[] = [];
      if (extractedData.name) fieldsExtracted.push('name');
      if (extractedData.headline) fieldsExtracted.push('headline');
      if (extractedData.hasAbout) fieldsExtracted.push('about');
      if (extractedData.hasExp) fieldsExtracted.push('experience');
      if (extractedData.hasEdu) fieldsExtracted.push('education');
      if (extractedData.hasSkills) fieldsExtracted.push('skills');

      const expStatus = experienceExtracted ? 'experience' : '';
      const eduStatus = educationExtracted ? 'education' : '';
      console.log(`SSR: ${ssrExtracted}, Extracted: [${[expStatus, eduStatus].filter(Boolean).join(', ')}], Fields: ${fieldsExtracted.join(', ')}`);

      results.push({
        id: profile.id,
        name: extractedData.name || 'NOT FOUND',
        ssrExtracted,
        experienceExtracted,
        educationExtracted,
        fieldsExtracted,
        errors: []
      });

    } catch (err) {
      console.log(`Error: ${err}`);
      results.push({
        id: profile.id,
        name: 'ERROR',
        ssrExtracted: false,
        experienceExtracted: false,
        educationExtracted: false,
        fieldsExtracted: [],
        errors: [String(err)]
      });
    } finally {
      await page.close();
      // Add delay between profiles to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== SUMMARY ===');
  const ssrCount = results.filter(r => r.ssrExtracted).length;
  const experienceCount = results.filter(r => r.experienceExtracted).length;
  const educationCount = results.filter(r => r.educationExtracted).length;

  console.log(`SSR detection: ${ssrCount}/${results.length}`);
  console.log(`Experience extracted: ${experienceCount}/${results.length}`);
  console.log(`Education extracted: ${educationCount}/${results.length}`);

  for (const r of results) {
    const expStatus = r.experienceExtracted ? 'experience' : '';
    const eduStatus = r.educationExtracted ? 'education' : '';
    const extracted = [expStatus, eduStatus].filter(Boolean).join(', ') || 'none';
    console.log(`- ${r.id}: ${extracted} (${r.fieldsExtracted.length} fields)`);
  }

  // At least 80% should have experience extraction (the key metric)
  expect(experienceCount).toBeGreaterThanOrEqual(Math.floor(results.length * 0.8));
});
