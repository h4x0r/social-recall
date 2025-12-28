/**
 * SSR Deep Dive Test
 *
 * Thoroughly analyzes ALL data in LinkedIn's SSR <code> tags
 * to find Experience, Education, Skills data.
 */

import { test, expect } from './fixtures';

test('find experience/education/skills in SSR', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== SSR DEEP DIVE ===\n');

  // Get all code tags and analyze
  const analysis = await page.evaluate(() => {
    const results: {
      tagId: string;
      totalItems: number;
      types: Record<string, number>;
      hasExperience: boolean;
      hasEducation: boolean;
      hasSkills: boolean;
      sampleExperience?: unknown;
      sampleEducation?: unknown;
    }[] = [];

    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const code of codeTags) {
      const content = code.textContent || '';
      try {
        const parsed = JSON.parse(content);

        // Find included array at various levels
        let included: unknown[] | null = null;
        if (Array.isArray(parsed.included)) {
          included = parsed.included;
        } else if (parsed.data?.included) {
          included = parsed.data.included;
        } else if (parsed.data?.data?.included) {
          included = parsed.data.data.included;
        }

        if (!included || included.length < 3) continue;

        // Analyze types
        const types: Record<string, number> = {};
        let hasExperience = false;
        let hasEducation = false;
        let hasSkills = false;
        let sampleExperience: unknown;
        let sampleEducation: unknown;

        for (const item of included) {
          if (typeof item !== 'object' || !item) continue;
          const typedItem = item as Record<string, unknown>;

          const type = (typedItem.$type as string)?.split('.').pop() ||
                      (typedItem['$recipeTypes'] as string[])?.[0]?.split('.').pop() ||
                      'unknown';

          types[type] = (types[type] || 0) + 1;

          // Check for experience/position
          if (
            type.toLowerCase().includes('position') ||
            type.toLowerCase().includes('experience') ||
            typedItem.title && typedItem.companyName
          ) {
            hasExperience = true;
            if (!sampleExperience) {
              sampleExperience = {
                $type: typedItem.$type,
                title: typedItem.title,
                companyName: typedItem.companyName,
                company: typedItem.company,
                dateRange: typedItem.dateRange,
                timePeriod: typedItem.timePeriod,
              };
            }
          }

          // Check for education
          if (
            type.toLowerCase().includes('education') ||
            type.toLowerCase().includes('school') ||
            typedItem.schoolName || typedItem.degreeName
          ) {
            hasEducation = true;
            if (!sampleEducation) {
              sampleEducation = {
                $type: typedItem.$type,
                schoolName: typedItem.schoolName,
                school: typedItem.school,
                degreeName: typedItem.degreeName,
                fieldOfStudy: typedItem.fieldOfStudy,
              };
            }
          }

          // Check for skills
          if (type.toLowerCase().includes('skill') || typedItem.skill) {
            hasSkills = true;
          }
        }

        if (hasExperience || hasEducation || hasSkills || Object.keys(types).length > 5) {
          results.push({
            tagId: code.id,
            totalItems: included.length,
            types,
            hasExperience,
            hasEducation,
            hasSkills,
            sampleExperience,
            sampleEducation,
          });
        }
      } catch {
        // Skip non-JSON
      }
    }

    return results;
  });

  console.log(`Found ${analysis.length} relevant SSR code tags\n`);

  for (const result of analysis) {
    console.log(`--- ${result.tagId} (${result.totalItems} items) ---`);
    console.log(`Types: ${JSON.stringify(result.types)}`);
    console.log(`Has Experience: ${result.hasExperience}`);
    console.log(`Has Education: ${result.hasEducation}`);
    console.log(`Has Skills: ${result.hasSkills}`);

    if (result.sampleExperience) {
      console.log(`Sample Experience: ${JSON.stringify(result.sampleExperience)}`);
    }
    if (result.sampleEducation) {
      console.log(`Sample Education: ${JSON.stringify(result.sampleEducation)}`);
    }
    console.log('');
  }

  // Summary
  const anyExperience = analysis.some(a => a.hasExperience);
  const anyEducation = analysis.some(a => a.hasEducation);
  const anySkills = analysis.some(a => a.hasSkills);

  console.log('\n=== SUMMARY ===');
  console.log(`Experience in SSR: ${anyExperience}`);
  console.log(`Education in SSR: ${anyEducation}`);
  console.log(`Skills in SSR: ${anySkills}`);

  expect(analysis.length).toBeGreaterThan(0);
});

test('search SSR for position/company fields', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== SEARCH SSR FOR POSITION FIELDS ===\n');

  // Search all code tags for specific field names
  const found = await page.evaluate(() => {
    const searchFields = ['companyName', 'title', 'schoolName', 'degreeName', 'positions', 'educations', 'skills'];
    const results: { field: string; count: number; sample?: string }[] = [];

    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const field of searchFields) {
      let count = 0;
      let sample = '';

      for (const code of codeTags) {
        const content = code.textContent || '';
        const regex = new RegExp(`"${field}"\\s*:\\s*"?([^",}]{1,50})`, 'g');
        const matches = content.match(regex);
        if (matches) {
          count += matches.length;
          if (!sample && matches[0]) {
            sample = matches[0].slice(0, 80);
          }
        }
      }

      results.push({ field, count, sample: sample || undefined });
    }

    return results;
  });

  for (const { field, count, sample } of found) {
    console.log(`"${field}": ${count} occurrences${sample ? ` - e.g., ${sample}` : ''}`);
  }

  // Check for "Microsoft" which should appear in Satya's profile
  const microsoftCheck = await page.evaluate(() => {
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');
    let microsoftCount = 0;
    let contextSamples: string[] = [];

    for (const code of codeTags) {
      const content = code.textContent || '';
      const matches = content.match(/Microsoft/g);
      if (matches) {
        microsoftCount += matches.length;
        // Get context around first match
        const idx = content.indexOf('Microsoft');
        if (idx >= 0 && contextSamples.length < 3) {
          contextSamples.push(content.slice(Math.max(0, idx - 50), idx + 100));
        }
      }
    }

    return { count: microsoftCount, samples: contextSamples };
  });

  console.log(`\n"Microsoft" found ${microsoftCheck.count} times`);
  if (microsoftCheck.samples.length > 0) {
    console.log('\nContext samples:');
    microsoftCheck.samples.forEach((s, i) => console.log(`${i + 1}. ...${s.replace(/\n/g, ' ')}...`));
  }

  expect(found.length).toBeGreaterThan(0);
});
