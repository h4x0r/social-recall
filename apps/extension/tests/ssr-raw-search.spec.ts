/**
 * SSR Raw Search Test
 *
 * Search the raw HTML/JSON for experience data patterns.
 */

import { test, expect } from './fixtures';

test('search raw SSR for experience patterns', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  console.log('\n=== RAW SSR SEARCH ===\n');

  // Get all code tag content
  const codeContent = await page.evaluate(() => {
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');
    let combined = '';
    for (const code of codeTags) {
      combined += code.textContent || '';
    }
    return combined;
  });

  console.log(`Total SSR content length: ${codeContent.length} characters`);

  // Search for specific patterns
  const patterns = [
    { name: 'companyName', pattern: /"companyName"/ },
    { name: 'title (field)', pattern: /"title":/ },
    { name: 'schoolName', pattern: /"schoolName"/ },
    { name: 'Position type', pattern: /Position/ },
    { name: 'Experience type', pattern: /Experience/ },
    { name: 'Education type', pattern: /Education/ },
    { name: 'positionView', pattern: /positionView/ },
    { name: 'educationView', pattern: /educationView/ },
    { name: 'skillsView', pattern: /skillsView/ },
    { name: 'Microsoft', pattern: /Microsoft/g },
    { name: 'CEO', pattern: /CEO/g },
    { name: 'Chairman', pattern: /Chairman/g },
    { name: 'Wharton', pattern: /Wharton/g },
    { name: 'University', pattern: /University/g },
  ];

  console.log('\nPattern search results:');
  for (const { name, pattern } of patterns) {
    const matches = codeContent.match(pattern);
    console.log(`  ${name}: ${matches?.length || 0} matches`);
  }

  // Find the Profile object and show its structure
  console.log('\n--- Profile object structure ---');
  const profileData = await page.evaluate(() => {
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

    for (const code of codeTags) {
      try {
        const parsed = JSON.parse(code.textContent || '');

        let included: unknown[] | null = null;
        if (Array.isArray(parsed.included)) included = parsed.included;
        else if (parsed.data?.included) included = parsed.data.included;

        if (!included) continue;

        for (const item of included) {
          if (typeof item !== 'object' || !item) continue;
          const typedItem = item as Record<string, unknown>;

          if (typedItem.$type?.toString().includes('Profile') && typedItem.firstName) {
            return {
              $type: typedItem.$type,
              keys: Object.keys(typedItem),
              firstName: typedItem.firstName,
              lastName: typedItem.lastName,
              headline: typedItem.headline,
              // Check for nested experience/education
              profilePositionGroups: typedItem.profilePositionGroups,
              profileEducations: typedItem.profileEducations,
              '*profilePositionGroups': typedItem['*profilePositionGroups'],
              '*profileEducations': typedItem['*profileEducations'],
              profileTopPosition: typedItem.profileTopPosition,
              profileTopEducation: typedItem.profileTopEducation,
            };
          }
        }
      } catch {}
    }
    return null;
  });

  if (profileData) {
    console.log('Profile keys:', profileData.keys.slice(0, 20));
    console.log(`Name: ${profileData.firstName} ${profileData.lastName}`);
    console.log(`Headline: ${profileData.headline}`);
    console.log(`profilePositionGroups: ${JSON.stringify(profileData.profilePositionGroups)}`);
    console.log(`profileEducations: ${JSON.stringify(profileData.profileEducations)}`);
    console.log(`*profilePositionGroups: ${JSON.stringify(profileData['*profilePositionGroups'])}`);
    console.log(`*profileEducations: ${JSON.stringify(profileData['*profileEducations'])}`);
    console.log(`profileTopPosition: ${JSON.stringify(profileData.profileTopPosition)}`);
    console.log(`profileTopEducation: ${JSON.stringify(profileData.profileTopEducation)}`);
  } else {
    console.log('No Profile with firstName found');
  }

  expect(codeContent.length).toBeGreaterThan(0);
});

test('examine DOM for experience section data', async ({ context }) => {
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  // Scroll to load experience
  for (const pos of [500, 1000, 1500, 2000]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000);

  console.log('\n=== EXPERIENCE SECTION DOM ===\n');

  const experienceData = await page.evaluate(() => {
    const expSection = document.querySelector('#experience');
    if (!expSection) return { found: false };

    const section = expSection.closest('section');
    if (!section) return { found: false, note: 'No parent section' };

    const items = section.querySelectorAll('li.artdeco-list__item');
    const experiences: { title: string; company: string; duration: string }[] = [];

    for (const item of items) {
      // Try to find title and company
      const spans = item.querySelectorAll('span[aria-hidden="true"]');
      const texts = Array.from(spans).map(s => s.textContent?.trim()).filter(Boolean);

      if (texts.length >= 2) {
        experiences.push({
          title: texts[0] || '',
          company: texts[1] || '',
          duration: texts[2] || '',
        });
      }
    }

    return {
      found: true,
      itemCount: items.length,
      experiences,
    };
  });

  console.log('Experience section found:', experienceData.found);
  if (experienceData.found) {
    console.log(`Item count: ${experienceData.itemCount}`);
    console.log('\nExperiences:');
    experienceData.experiences?.forEach((exp, i) => {
      console.log(`  ${i + 1}. ${exp.title} at ${exp.company} (${exp.duration})`);
    });
  }

  expect(experienceData.found).toBe(true);
});
