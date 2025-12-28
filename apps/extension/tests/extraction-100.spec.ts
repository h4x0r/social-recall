/**
 * Comprehensive Extraction Test - 100 Profiles
 *
 * Tests data extraction on 100 profiles to analyze:
 * - SSR vs DOM extraction success rates
 * - What data each method captures
 * - Post/activity extraction (aiming for 20 posts with content)
 */

import { test, expect } from './fixtures';

// 100 diverse LinkedIn profiles - mix of industries, regions, profile sizes
const TEST_PROFILES = [
  // Tech Executives (20)
  { id: 'satyanadella', name: 'Satya Nadella' },
  { id: 'jeffweiner08', name: 'Jeff Weiner' },
  { id: 'sundarpichai', name: 'Sundar Pichai' },
  { id: 'jenhsunhuang', name: 'Jensen Huang' },
  { id: 'williamhgates', name: 'Bill Gates' },
  { id: 'timcook', name: 'Tim Cook' },
  { id: 'elikilic', name: 'Eli Kiliç' },
  { id: 'daborras', name: 'Daniel Aborras' },
  { id: 'jchernov', name: 'Joe Chernov' },
  { id: 'patrickjmckenna', name: 'Patrick McKenna' },
  { id: 'aaronlevie', name: 'Aaron Levie' },
  { id: 'brianacton', name: 'Brian Acton' },
  { id: 'drewhouston', name: 'Drew Houston' },
  { id: 'toloer', name: 'Tony Loehr' },
  { id: 'emmanuelmacron', name: 'Emmanuel Macron' },
  { id: 'caborelli', name: 'Christophe Aborelli' },
  { id: 'jasonlemkin', name: 'Jason Lemkin' },
  { id: 'mitchellharper', name: 'Mitchell Harper' },
  { id: 'gaborcselle', name: 'Gabor Cselle' },
  { id: 'lloyddean', name: 'Lloyd Dean' },

  // Entrepreneurs/VCs (20)
  { id: 'guykawasaki', name: 'Guy Kawasaki' },
  { id: 'garyvaynerchuk', name: 'Gary Vaynerchuk' },
  { id: 'reidhoffman', name: 'Reid Hoffman' },
  { id: 'marismith', name: 'Mari Smith' },
  { id: 'neilkpatel', name: 'Neil Patel' },
  { id: 'paulg', name: 'Paul Graham' },
  { id: 'marcbenioff', name: 'Marc Benioff' },
  { id: 'peterthiel', name: 'Peter Thiel' },
  { id: 'balajis', name: 'Balaji Srinivasan' },
  { id: 'chaikilin', name: 'Chai Kilin' },
  { id: 'ajaynandwani', name: 'Ajay Nandwani' },
  { id: 'nicolelapin', name: 'Nicole Lapin' },
  { id: 'dayaborrell', name: 'Daya Borrell' },
  { id: 'davepatel1', name: 'Dave Patel' },
  { id: 'michaelseibel', name: 'Michael Seibel' },
  { id: 'jeffbusgang', name: 'Jeff Bussgang' },
  { id: 'fredwilson', name: 'Fred Wilson' },
  { id: 'benedictevans', name: 'Benedict Evans' },
  { id: 'hunterwalk', name: 'Hunter Walk' },
  { id: 'andrewchen', name: 'Andrew Chen' },

  // Media/Influencers (20)
  { id: 'ariannahuffington', name: 'Arianna Huffington' },
  { id: 'rbranson', name: 'Richard Branson' },
  { id: 'melrobbins', name: 'Mel Robbins' },
  { id: 'simonsinek', name: 'Simon Sinek' },
  { id: 'adammgrant', name: 'Adam Grant' },
  { id: 'brenebrown', name: 'Brene Brown' },
  { id: 'officialtonyrobbins', name: 'Tony Robbins' },
  { id: 'jasoncalacanis', name: 'Jason Calacanis' },
  { id: 'sethdimitrov', name: 'Seth Dimitrov' },
  { id: 'ursulabrennan', name: 'Ursula Brennan' },
  { id: 'justinwelsh', name: 'Justin Welsh' },
  { id: 'lizherman', name: 'Liz Herman' },
  { id: 'samirubin', name: 'Sami Rubin' },
  { id: 'randalllane', name: 'Randall Lane' },
  { id: 'vivekwadhwa', name: 'Vivek Wadhwa' },
  { id: 'andrewwarner', name: 'Andrew Warner' },
  { id: 'noahkagan', name: 'Noah Kagan' },
  { id: 'ramitsethi', name: 'Ramit Sethi' },
  { id: 'jamesaltucher', name: 'James Altucher' },
  { id: 'neilpatel', name: 'Neil Patel' },

  // Tech Professionals (20)
  { id: 'sheryl-sandberg-5126652', name: 'Sheryl Sandberg' },
  { id: 'dhh', name: 'David Heinemeier Hansson' },
  { id: 'mark-zuckerberg-618bba58', name: 'Mark Zuckerberg' },
  { id: 'danluu', name: 'Dan Luu' },
  { id: 'kelseyhightower', name: 'Kelsey Hightower' },
  { id: 'mitchellhashimoto', name: 'Mitchell Hashimoto' },
  { id: 'cloydchurch', name: 'Cloyd Church' },
  { id: 'joepindar', name: 'Joe Pindar' },
  { id: 'lizthornton1', name: 'Liz Thornton' },
  { id: 'jdorfman', name: 'Justin Dorfman' },
  { id: 'randyshoup', name: 'Randy Shoup' },
  { id: 'philipfisher', name: 'Philip Fisher' },
  { id: 'kentbeck', name: 'Kent Beck' },
  { id: 'martinfowler', name: 'Martin Fowler' },
  { id: 'unclebobmartin', name: 'Uncle Bob Martin' },
  { id: 'jessfraz', name: 'Jess Frazelle' },
  { id: 'danielbryant', name: 'Daniel Bryant' },
  { id: 'rachelmyers', name: 'Rachel Myers' },
  { id: 'bryanlee', name: 'Bryan Lee' },
  { id: 'kyliebyrne', name: 'Kylie Byrne' },

  // Business Leaders (20)
  { id: 'indranooyi', name: 'Indra Nooyi' },
  { id: 'marybarra', name: 'Mary Barra' },
  { id: 'gaborge', name: 'Gabor Ge' },
  { id: 'aimeeweisberg', name: 'Aimee Weisberg' },
  { id: 'adamneumann', name: 'Adam Neumann' },
  { id: 'brianarmstrong', name: 'Brian Armstrong' },
  { id: 'vlad-tenev', name: 'Vlad Tenev' },
  { id: 'patrickbethel', name: 'Patrick Bethel' },
  { id: 'elonmusk', name: 'Elon Musk' },
  { id: 'karaswisher', name: 'Kara Swisher' },
  { id: 'waltmossberg', name: 'Walt Mossberg' },
  { id: 'kimsilverman', name: 'Kim Silverman' },
  { id: 'johnpyles', name: 'John Pyles' },
  { id: 'mikecannon', name: 'Mike Cannon' },
  { id: 'kevinryan', name: 'Kevin Ryan' },
  { id: 'davidkarp', name: 'David Karp' },
  { id: 'dickiecostolo', name: 'Dick Costolo' },
  { id: 'joeylongo', name: 'Joey Longo' },
  { id: 'stevenlimjr', name: 'Steven Lim Jr' },
  { id: 'tonyxu', name: 'Tony Xu' },
];

interface ExtractionDetails {
  // SSR (embedded JSON) extraction
  ssrSuccess: boolean;
  ssrFields: string[];

  // DOM extraction
  domFields: string[];

  // Specific field values
  name: string;
  headline: string;
  hasAbout: boolean;
  employerCount: number;
  educationCount: number;
  skillCount: number;
  activityCount: number;
  activityTexts: string[]; // First 3 activity text snippets

  // Errors
  errors: string[];
  pageTitle: string;
}

interface ProfileResult {
  id: string;
  expectedName: string;
  extraction: ExtractionDetails;
  loadTimeMs: number;
}

test('comprehensive extraction test on 100 profiles', async ({ context }) => {
  test.setTimeout(3600000); // 60 minutes for 100 profiles
  const results: ProfileResult[] = [];
  const startTime = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`STARTING COMPREHENSIVE EXTRACTION TEST - ${TEST_PROFILES.length} PROFILES`);
  console.log(`${'='.repeat(60)}\n`);

  for (let i = 0; i < TEST_PROFILES.length; i++) {
    const profile = TEST_PROFILES[i];
    const page = await context.newPage();
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log(`\n[${i + 1}/${TEST_PROFILES.length}] Testing ${profile.name} (${profile.id})`);
    const profileStartTime = Date.now();

    const extraction: ExtractionDetails = {
      ssrSuccess: false,
      ssrFields: [],
      domFields: [],
      name: '',
      headline: '',
      hasAbout: false,
      employerCount: 0,
      educationCount: 0,
      skillCount: 0,
      activityCount: 0,
      activityTexts: [],
      errors: [],
      pageTitle: '',
    };

    try {
      await page.goto(`https://www.linkedin.com/in/${profile.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

      // Scroll to trigger lazy loading
      for (const pos of [500, 1000, 1500, 2000, 2500, 3000]) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
        await page.waitForTimeout(250);
      }
      await page.evaluate(() => window.scrollTo({ top: 0 }));

      // Wait for extraction completion by polling console messages
      const maxWaitTime = 25000;
      const pollInterval = 300;
      const waitStart = Date.now();

      while (Date.now() - waitStart < maxWaitTime) {
        const hasExtractionComplete = consoleMessages.some(m =>
          m.includes('Intelligence built:') ||
          m.includes('Extracted profile data:') ||
          m.includes('Using stored data with valid archetype')
        );

        if (hasExtractionComplete) {
          await page.waitForTimeout(500);
          break;
        }

        await page.waitForTimeout(pollInterval);
      }

      // Get page title for debugging
      extraction.pageTitle = await page.title();

      // Analyze SSR extraction from console logs
      extraction.ssrSuccess = consoleMessages.some(m =>
        m.includes('Found matching profile in code tag') ||
        m.includes('Using embedded profile data (SSR)') ||
        m.includes('SSR profile matches URL')
      );

      // Parse what was extracted via SSR
      const ssrDataLog = consoleMessages.find(m => m.includes('SSR extracted:') || m.includes('Embedded profile data:'));
      if (ssrDataLog) {
        if (ssrDataLog.includes('name')) extraction.ssrFields.push('name');
        if (ssrDataLog.includes('headline')) extraction.ssrFields.push('headline');
        if (ssrDataLog.includes('about')) extraction.ssrFields.push('about');
        if (ssrDataLog.includes('employer')) extraction.ssrFields.push('employers');
        if (ssrDataLog.includes('education')) extraction.ssrFields.push('education');
      }

      // Parse extracted profile data from logs
      const extractedLog = consoleMessages.find(m => m.includes('Extracted profile data:'));
      if (extractedLog) {
        const jsonMatch = extractedLog.match(/Extracted profile data: ({[\s\S]*})/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            extraction.employerCount = Array.isArray(data.employers) ? data.employers.length : 0;
            extraction.educationCount = Array.isArray(data.education) ? data.education.length : 0;
            extraction.activityCount = Array.isArray(data.activities) ? data.activities.length : 0;
            if (data.activities?.length > 0) {
              extraction.activityTexts = data.activities.slice(0, 3).map((a: { text: string }) =>
                a.text?.slice(0, 100) + (a.text?.length > 100 ? '...' : '')
              );
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Fallback: check individual extraction logs
      if (extraction.employerCount === 0) {
        const employersLog = consoleMessages.find(m => m.includes('Extracted employers:'));
        if (employersLog) {
          const match = employersLog.match(/Extracted employers: (\d+)/);
          if (match) extraction.employerCount = parseInt(match[1]);
        }
      }

      if (extraction.educationCount === 0) {
        const educationLog = consoleMessages.find(m => m.includes('Extracted education:'));
        if (educationLog) {
          const match = educationLog.match(/Extracted education: (\d+)/);
          if (match) extraction.educationCount = parseInt(match[1]);
        }
      }

      if (extraction.activityCount === 0) {
        const activityLog = consoleMessages.find(m => m.includes('Extracted') && m.includes('posts'));
        if (activityLog) {
          const match = activityLog.match(/Extracted (\d+) posts/);
          if (match) extraction.activityCount = parseInt(match[1]);
        }
      }

      // Extract DOM fields directly
      const domData = await page.evaluate(() => {
        const name = document.querySelector('h1.text-heading-xlarge, h1')?.textContent?.trim() || '';
        const headline = document.querySelector('.text-body-medium.break-words, .text-body-medium')?.textContent?.trim() || '';
        const hasAbout = !!document.querySelector('#about');
        const hasExp = !!document.querySelector('#experience');
        const hasEdu = !!document.querySelector('#education');
        const hasSkills = !!document.querySelector('#skills');
        // Check for activity section - can't use :contains() in CSS
        const sections = document.querySelectorAll('section');
        let hasActivity = !!document.querySelector('#recent-activity-section-v2');
        if (!hasActivity) {
          for (const section of sections) {
            const h2 = section.querySelector('h2');
            if (h2?.textContent?.toLowerCase().includes('activity')) {
              hasActivity = true;
              break;
            }
          }
        }

        // Count skill items
        const skillSection = document.querySelector('#skills')?.closest('section');
        const skillCount = skillSection?.querySelectorAll('li').length || 0;

        return { name, headline, hasAbout, hasExp, hasEdu, hasSkills, hasActivity, skillCount };
      });

      extraction.name = domData.name;
      extraction.headline = domData.headline;
      extraction.hasAbout = domData.hasAbout;
      extraction.skillCount = domData.skillCount;

      if (domData.name) extraction.domFields.push('name');
      if (domData.headline) extraction.domFields.push('headline');
      if (domData.hasAbout) extraction.domFields.push('about');
      if (domData.hasExp) extraction.domFields.push('experience');
      if (domData.hasEdu) extraction.domFields.push('education');
      if (domData.hasSkills) extraction.domFields.push('skills');
      if (domData.hasActivity) extraction.domFields.push('activity');

      // Summary log
      const status = extraction.ssrSuccess ? 'SSR' : 'DOM-only';
      console.log(`  ${status} | Employers: ${extraction.employerCount} | Education: ${extraction.educationCount} | Activities: ${extraction.activityCount} | Skills: ${extraction.skillCount}`);

    } catch (err) {
      extraction.errors.push(String(err));
      console.log(`  ERROR: ${err}`);
    }

    const loadTimeMs = Date.now() - profileStartTime;

    results.push({
      id: profile.id,
      expectedName: profile.name,
      extraction,
      loadTimeMs,
    });

    await page.close();

    // Rate limiting delay
    if (i < TEST_PROFILES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Generate comprehensive report
  console.log(`\n${'='.repeat(60)}`);
  console.log('EXTRACTION REPORT');
  console.log(`${'='.repeat(60)}\n`);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`Total time: ${totalTime} minutes\n`);

  // SSR Statistics
  const ssrSuccessCount = results.filter(r => r.extraction.ssrSuccess).length;
  const ssrFailures = results.filter(r => !r.extraction.ssrSuccess);
  console.log('--- SSR EXTRACTION ---');
  console.log(`Success rate: ${ssrSuccessCount}/${results.length} (${((ssrSuccessCount / results.length) * 100).toFixed(1)}%)`);
  if (ssrFailures.length > 0 && ssrFailures.length <= 20) {
    console.log('SSR failures:', ssrFailures.map(r => r.id).join(', '));
  }

  // DOM Extraction Statistics
  const withName = results.filter(r => r.extraction.name).length;
  const withHeadline = results.filter(r => r.extraction.headline).length;
  const withAbout = results.filter(r => r.extraction.hasAbout).length;
  const withEmployers = results.filter(r => r.extraction.employerCount > 0).length;
  const withEducation = results.filter(r => r.extraction.educationCount > 0).length;
  const withActivities = results.filter(r => r.extraction.activityCount > 0).length;

  console.log('\n--- FIELD EXTRACTION RATES ---');
  console.log(`Name:       ${withName}/${results.length} (${((withName / results.length) * 100).toFixed(1)}%)`);
  console.log(`Headline:   ${withHeadline}/${results.length} (${((withHeadline / results.length) * 100).toFixed(1)}%)`);
  console.log(`About:      ${withAbout}/${results.length} (${((withAbout / results.length) * 100).toFixed(1)}%)`);
  console.log(`Employers:  ${withEmployers}/${results.length} (${((withEmployers / results.length) * 100).toFixed(1)}%)`);
  console.log(`Education:  ${withEducation}/${results.length} (${((withEducation / results.length) * 100).toFixed(1)}%)`);
  console.log(`Activities: ${withActivities}/${results.length} (${((withActivities / results.length) * 100).toFixed(1)}%)`);

  // Activity/Post Statistics
  const totalActivities = results.reduce((sum, r) => sum + r.extraction.activityCount, 0);
  const maxActivities = Math.max(...results.map(r => r.extraction.activityCount));
  const avgActivities = (totalActivities / results.length).toFixed(1);
  const profilesWith20Posts = results.filter(r => r.extraction.activityCount >= 20).length;

  console.log('\n--- POST/ACTIVITY EXTRACTION ---');
  console.log(`Total posts extracted: ${totalActivities}`);
  console.log(`Average per profile: ${avgActivities}`);
  console.log(`Max from single profile: ${maxActivities}`);
  console.log(`Profiles with 20+ posts: ${profilesWith20Posts}`);

  // Sample activity texts
  const sampleActivities = results
    .filter(r => r.extraction.activityTexts.length > 0)
    .slice(0, 5);
  if (sampleActivities.length > 0) {
    console.log('\n--- SAMPLE POST CONTENT ---');
    for (const r of sampleActivities) {
      console.log(`\n${r.id}:`);
      for (const text of r.extraction.activityTexts) {
        console.log(`  - "${text}"`);
      }
    }
  }

  // Employer/Education stats
  const totalEmployers = results.reduce((sum, r) => sum + r.extraction.employerCount, 0);
  const totalEducation = results.reduce((sum, r) => sum + r.extraction.educationCount, 0);
  console.log('\n--- EXPERIENCE & EDUCATION ---');
  console.log(`Total employers extracted: ${totalEmployers}`);
  console.log(`Average employers per profile: ${(totalEmployers / results.length).toFixed(1)}`);
  console.log(`Total education entries: ${totalEducation}`);
  console.log(`Average education per profile: ${(totalEducation / results.length).toFixed(1)}`);

  // Error analysis
  const errors = results.filter(r => r.extraction.errors.length > 0);
  if (errors.length > 0) {
    console.log('\n--- ERRORS ---');
    console.log(`Profiles with errors: ${errors.length}`);
    for (const r of errors.slice(0, 10)) {
      console.log(`  ${r.id}: ${r.extraction.errors[0].slice(0, 100)}`);
    }
  }

  // SSR vs DOM comparison - what does SSR capture that DOM doesn't?
  console.log('\n--- SSR vs DOM COMPARISON ---');
  const ssrOnlyFields: Record<string, number> = {};
  const domOnlyFields: Record<string, number> = {};
  const bothFields: Record<string, number> = {};

  for (const r of results) {
    const ssrSet = new Set(r.extraction.ssrFields);
    const domSet = new Set(r.extraction.domFields);

    for (const field of ssrSet) {
      if (!domSet.has(field)) {
        ssrOnlyFields[field] = (ssrOnlyFields[field] || 0) + 1;
      } else {
        bothFields[field] = (bothFields[field] || 0) + 1;
      }
    }
    for (const field of domSet) {
      if (!ssrSet.has(field)) {
        domOnlyFields[field] = (domOnlyFields[field] || 0) + 1;
      }
    }
  }

  console.log('Fields captured by both SSR and DOM:', Object.entries(bothFields).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
  console.log('Fields only in SSR:', Object.entries(ssrOnlyFields).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
  console.log('Fields only in DOM:', Object.entries(domOnlyFields).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');

  // Performance stats
  const avgLoadTime = (results.reduce((sum, r) => sum + r.loadTimeMs, 0) / results.length / 1000).toFixed(1);
  console.log(`\n--- PERFORMANCE ---`);
  console.log(`Average load time: ${avgLoadTime}s`);

  // Final detailed breakdown
  console.log('\n--- DETAILED PROFILE BREAKDOWN ---');
  for (const r of results) {
    const status = r.extraction.ssrSuccess ? 'SSR' : 'DOM';
    const emp = r.extraction.employerCount;
    const edu = r.extraction.educationCount;
    const act = r.extraction.activityCount;
    const err = r.extraction.errors.length > 0 ? ' ERROR' : '';
    console.log(`${r.id}: ${status} | emp:${emp} edu:${edu} act:${act}${err}`);
  }

  // Assertions
  expect(ssrSuccessCount).toBeGreaterThanOrEqual(Math.floor(results.length * 0.8)); // 80% SSR success
  expect(withEmployers).toBeGreaterThanOrEqual(Math.floor(results.length * 0.8)); // 80% have employers
});
