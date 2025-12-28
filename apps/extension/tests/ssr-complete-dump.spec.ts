/**
 * SSR Complete Data Dump
 *
 * Analyzes ALL data in LinkedIn's SSR to determine what's available
 * vs what needs to be captured via Voyager API interception.
 */

import { test, expect } from './fixtures';

test('analyze complete SSR data vs lazy-loaded data', async ({ context }) => {
  const page = await context.newPage();

  // Track all Voyager API calls
  const voyagerCalls: Array<{ url: string; timestamp: number }> = [];

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/voyager/api/')) {
      voyagerCalls.push({ url, timestamp: Date.now() });
    }
  });

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for initial load
  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== PHASE 1: INITIAL LOAD (before scrolling) ===\n');

  // Dump SSR data BEFORE scrolling
  const ssrDataBeforeScroll = await page.evaluate(() => {
    const results: Record<string, unknown> = {};
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const code of codeTags) {
      const content = code.textContent || '';
      if (!content.includes('included')) continue;

      try {
        const parsed = JSON.parse(content);

        // Find included array
        const findIncluded = (obj: any): any[] | null => {
          if (Array.isArray(obj.included)) return obj.included;
          if (obj.data?.included) return obj.data.included;
          if (obj.data?.data?.included) return obj.data.data.included;
          return null;
        };

        const included = findIncluded(parsed);
        if (!included || included.length < 5) continue;

        // Categorize items by $type
        const typeGroups: Record<string, number> = {};
        const samplesByType: Record<string, any> = {};

        for (const item of included) {
          const type = item.$type || item['$recipeTypes']?.[0] || 'unknown';
          const shortType = type.split('.').pop() || type;

          typeGroups[shortType] = (typeGroups[shortType] || 0) + 1;

          // Keep one sample of each type
          if (!samplesByType[shortType]) {
            samplesByType[shortType] = {
              $type: item.$type,
              keys: Object.keys(item).slice(0, 15),
              // For profile-like items, extract key fields
              ...(item.firstName && { firstName: item.firstName, lastName: item.lastName }),
              ...(item.companyName && { companyName: item.companyName }),
              ...(item.schoolName && { schoolName: item.schoolName }),
              ...(item.title && { title: item.title }),
              ...(item.description && { descriptionPreview: item.description?.slice(0, 100) }),
            };
          }
        }

        if (Object.keys(typeGroups).length > 3) {
          results[code.id] = {
            totalItems: included.length,
            typeGroups,
            samples: samplesByType,
          };
        }
      } catch {}
    }

    return results;
  });

  console.log('SSR Data Types Found (before scroll):');
  for (const [codeId, data] of Object.entries(ssrDataBeforeScroll)) {
    const d = data as any;
    console.log(`\n${codeId}: ${d.totalItems} items`);
    console.log('Types:', JSON.stringify(d.typeGroups, null, 2));
  }

  // Check for specific data types
  const hasExperience = JSON.stringify(ssrDataBeforeScroll).includes('Position') ||
                        JSON.stringify(ssrDataBeforeScroll).includes('Experience');
  const hasEducation = JSON.stringify(ssrDataBeforeScroll).includes('Education') ||
                       JSON.stringify(ssrDataBeforeScroll).includes('School');
  const hasSkills = JSON.stringify(ssrDataBeforeScroll).includes('Skill');

  console.log('\n--- Initial SSR Contains ---');
  console.log(`Experience/Position data: ${hasExperience}`);
  console.log(`Education data: ${hasEducation}`);
  console.log(`Skills data: ${hasSkills}`);

  const voyagerCallsBeforeScroll = voyagerCalls.length;
  console.log(`\nVoyager API calls before scroll: ${voyagerCallsBeforeScroll}`);
  voyagerCalls.slice(0, 5).forEach(c => console.log(`  - ${c.url.slice(0, 100)}`));

  // Now scroll to trigger lazy loading
  console.log('\n=== PHASE 2: AFTER SCROLLING (lazy loading) ===\n');

  const scrollPositions = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  for (const pos of scrollPositions) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
    await page.waitForTimeout(500);
  }

  // Wait for lazy content to load
  await page.waitForTimeout(3000);

  const voyagerCallsAfterScroll = voyagerCalls.length;
  console.log(`Voyager API calls after scroll: ${voyagerCallsAfterScroll}`);
  console.log(`New calls triggered by scrolling: ${voyagerCallsAfterScroll - voyagerCallsBeforeScroll}`);

  // Show new API calls
  const newCalls = voyagerCalls.slice(voyagerCallsBeforeScroll);
  console.log('\nNew Voyager API calls:');
  newCalls.forEach(c => {
    const shortUrl = c.url.replace('https://www.linkedin.com', '').slice(0, 120);
    console.log(`  - ${shortUrl}`);
  });

  // Categorize the API calls
  const apiCategories: Record<string, string[]> = {
    profile: [],
    experience: [],
    education: [],
    skills: [],
    recommendations: [],
    activity: [],
    messaging: [],
    other: [],
  };

  for (const call of voyagerCalls) {
    const url = call.url.toLowerCase();
    if (url.includes('messaging') || url.includes('messenger')) {
      apiCategories.messaging.push(call.url);
    } else if (url.includes('skill')) {
      apiCategories.skills.push(call.url);
    } else if (url.includes('education')) {
      apiCategories.education.push(call.url);
    } else if (url.includes('position') || url.includes('experience')) {
      apiCategories.experience.push(call.url);
    } else if (url.includes('recommendation')) {
      apiCategories.recommendations.push(call.url);
    } else if (url.includes('activity') || url.includes('feed')) {
      apiCategories.activity.push(call.url);
    } else if (url.includes('profile') || url.includes('identity')) {
      apiCategories.profile.push(call.url);
    } else {
      apiCategories.other.push(call.url);
    }
  }

  console.log('\n--- API Calls by Category ---');
  for (const [category, urls] of Object.entries(apiCategories)) {
    if (urls.length > 0) {
      console.log(`${category}: ${urls.length} calls`);
    }
  }

  // Check what sections are visible in DOM after scroll
  const sectionsInDOM = await page.evaluate(() => {
    const sections: Record<string, boolean> = {};

    sections.experience = !!document.querySelector('#experience');
    sections.education = !!document.querySelector('#education');
    sections.skills = !!document.querySelector('#skills');
    sections.recommendations = !!document.querySelector('#recommendations');
    sections.activity = !!document.querySelector('#content_collections');
    sections.languages = !!document.querySelector('#languages');
    sections.certifications = !!document.querySelector('#licenses_and_certifications');
    sections.volunteering = !!document.querySelector('#volunteering_experience');
    sections.honors = !!document.querySelector('#honors_and_awards');

    // Count items in experience section
    const expSection = document.querySelector('#experience')?.closest('section');
    sections.experienceItemCount = expSection?.querySelectorAll('li.artdeco-list__item').length || 0;

    const eduSection = document.querySelector('#education')?.closest('section');
    sections.educationItemCount = eduSection?.querySelectorAll('li.artdeco-list__item').length || 0;

    return sections;
  });

  console.log('\n--- Sections Visible in DOM ---');
  console.log(JSON.stringify(sectionsInDOM, null, 2));

  // Final summary
  console.log('\n=== SUMMARY ===\n');
  console.log('SSR provides: Basic profile info (name, headline, about)');
  console.log(`Voyager API calls total: ${voyagerCalls.length}`);
  console.log(`  - Before scroll: ${voyagerCallsBeforeScroll}`);
  console.log(`  - After scroll: ${voyagerCallsAfterScroll - voyagerCallsBeforeScroll}`);

  if (apiCategories.experience.length > 0 || apiCategories.education.length > 0) {
    console.log('\n⚠️  EXPERIENCE/EDUCATION loaded via API - interception would help!');
  }

  if (apiCategories.skills.length > 0) {
    console.log('⚠️  SKILLS loaded via API - interception would help!');
  }

  expect(voyagerCalls.length).toBeGreaterThan(0);
});
