/**
 * Extraction Debug Test
 *
 * Navigates to multiple LinkedIn profiles and logs extracted data.
 * Used to debug extraction failures without calling AI.
 *
 * Usage: npx playwright test extraction-debug.spec.ts
 */

import { test, expect } from './fixtures';

// Test profiles to visit - using known valid profiles
const TEST_PROFILES = [
  'williamhgates', // Bill Gates
  'jeffweiner08',  // Jeff Weiner
  'satlouis',      // Satya Nadella (wrong ID - should be satyanadella)
];

// Extraction functions to inject into the page
const extractionScript = `
  window.socialRecallExtract = {
    extractName() {
      const selectors = [
        'h1.text-heading-xlarge',
        'h1.inline.t-24.v-align-middle.break-words',
        '.pv-top-card--list li:first-child',
        '.text-heading-xlarge',
        'h1[data-generated-suggestion-target]',
        '.pv-text-details__left-panel h1',
        '.ph5 h1',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          return el.textContent.trim().replace(/^\\(\\d+\\+?\\)\\s*/, '');
        }
      }
      return document.title.split(/\\s[|–-]\\s/)[0]?.trim() || 'Unknown';
    },

    extractHeadline() {
      const headlineEl = document.querySelector('.text-body-medium.break-words');
      return headlineEl?.textContent?.trim() || null;
    },

    extractLocation() {
      const selectors = [
        '.pv-text-details__left-panel span.text-body-small',
        '.text-body-small.inline.t-black--light.break-words',
        'span[class*="text-body-small"][class*="t-black--light"]',
      ];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 100) {
            if (/^\\d+[\\d,]*\\s*(connections?|followers?)$/i.test(text)) continue;
            if (/^\\([^)]+\\)$/.test(text)) continue;
            if (text.includes('linkedin.com')) continue;
            return text;
          }
        }
      }
      return null;
    },

    extractAbout() {
      const aboutSection = this.findSectionByHeader('About');
      if (!aboutSection) return null;
      const textEl = aboutSection.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
        aboutSection.querySelector('[class*="inline-show-more-text"] span[aria-hidden="true"]') ||
        aboutSection.querySelector('span[aria-hidden="true"]');
      return textEl?.textContent?.trim() || null;
    },

    findSectionByHeader(headerText) {
      const searchText = headerText.toLowerCase();

      // Strategy 1: pv-profile-card__anchor with id
      const anchor = document.querySelector(\`div.pv-profile-card__anchor[id*="\${searchText}" i]\`);
      if (anchor) {
        const section = anchor.closest('section');
        if (section) return section;
      }

      // Strategy 2: element with id containing section name
      const byId = document.querySelector(\`section[id*="\${searchText}" i], div[id*="\${searchText}" i]\`);
      if (byId) {
        const section = byId.tagName === 'SECTION' ? byId : byId.closest('section');
        if (section) return section;
      }

      // Strategy 3: profile-card sections
      const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
      for (const card of profileCards) {
        const spans = card.querySelectorAll('span[aria-hidden="true"]');
        for (let i = 0; i < Math.min(5, spans.length); i++) {
          const text = spans[i].textContent?.trim().toLowerCase();
          if (text === searchText || text?.startsWith(searchText)) return card;
        }
      }

      // Strategy 4: artdeco-card sections
      const artdecoSections = document.querySelectorAll('main section.artdeco-card');
      for (const section of artdecoSections) {
        const srOnly = section.querySelector('.visually-hidden, .sr-only');
        if (srOnly?.textContent?.toLowerCase().includes(searchText)) return section;
        const spans = section.querySelectorAll('span[aria-hidden="true"], span.t-bold');
        for (let i = 0; i < Math.min(10, spans.length); i++) {
          const text = spans[i].textContent?.trim().toLowerCase();
          if (text === searchText || text?.startsWith(searchText)) return section;
        }
      }

      // Strategy 5: any section with h2
      const allSections = document.querySelectorAll('section');
      for (const section of allSections) {
        const h2 = section.querySelector('h2');
        if (h2?.textContent?.trim().toLowerCase().includes(searchText)) return section;
      }

      return null;
    },

    extractEmployers() {
      const employers = [];
      const seen = new Set();
      const experienceSection = this.findSectionByHeader('Experience');
      const searchContainer = experienceSection || document.querySelector('main') || document;

      // Patterns to skip
      const datePattern = /^\\w{3} \\d{4}|^\\d{4}|Present|\\d+\\s*(yr|yrs|mo|mos|year|month)/i;
      const locationPattern = /^(Remote|Hybrid|On-site)$|,\\s*(Remote|Hybrid|On-site)$/i;
      const jobTitlePattern = /^(founder|co-founder|ceo|cto|cfo|coo|president|director|manager|lead|senior|junior|engineer|developer|analyst|consultant|specialist|coordinator|associate|intern|head of|vp|vice|chairman|co-chair|partner|advisor|member|board|investor|founding|executive|chief|general|principal|owner|creator|author|host|producer|coach|mentor|speaker|ambassador|evangelist|advocate)/i;

      const allDivs = searchContainer.querySelectorAll('div');
      for (const div of allDivs) {
        const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]');
        if (!img) continue;
        const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
        if (nestedImgs.length > 1) continue;

        const spans = div.querySelectorAll('span[aria-hidden="true"]');
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (!text || text.length < 2 || text.length > 100) continue;

          // Skip dates, tenure durations
          if (datePattern.test(text)) continue;
          if (text.includes(' · ') && /\\d+\\s*(yr|mo)/i.test(text)) continue;

          // Skip location and job titles
          if (locationPattern.test(text)) continue;
          if (jobTitlePattern.test(text)) continue;

          // Skip generic text
          if (text === 'Experience' || text === 'Skills' || text.includes('endorsement')) continue;
          if (text.length > 80) continue;

          // Company with employment type
          if (text.includes(' · ')) {
            const parts = text.split(' · ');
            const employmentTypes = ['full-time', 'part-time', 'contract', 'freelance', 'self-employed', 'internship'];
            const secondPart = parts[1]?.toLowerCase() || '';
            if (employmentTypes.some(type => secondPart.includes(type))) {
              const company = parts[0].trim();
              if (company.length > 2 && !seen.has(company.toLowerCase())) {
                seen.add(company.toLowerCase());
                employers.push({ company, logo: img.src || '' });
                break;
              }
            }
          }

          // Standalone company name
          const words = text.split(/\\s+/);
          if (words.length >= 1 && words.length <= 8 && !seen.has(text.toLowerCase())) {
            seen.add(text.toLowerCase());
            employers.push({ company: text, logo: img.src || '' });
            break;
          }
        }
      }
      return employers;
    },

    extractEducation() {
      const education = [];
      const section = this.findSectionByHeader('Education');
      if (!section) return education;

      const seen = new Set();
      const allDivs = section.querySelectorAll('div');
      for (const div of allDivs) {
        const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]');
        if (!img) continue;
        const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
        if (nestedImgs.length > 1) continue;

        const spans = div.querySelectorAll('span[aria-hidden="true"]');
        let school = '', degree = '', field = '', dates = '';
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (!text) continue;
          if (/^\\d{4}\\s*-\\s*(\\d{4}|Present)$/.test(text)) { dates = text; continue; }
          if (!school && text.length > 2 && !text.includes(',')) {
            const parentClasses = span.parentElement?.className || '';
            if (parentClasses.includes('bold')) { school = text; continue; }
          }
          if (!degree && text.includes(',')) {
            const parts = text.split(',').map(s => s.trim());
            degree = parts[0];
            field = parts.slice(1).join(', ');
            continue;
          }
          if (!school && text.length > 2 && text.length < 100) school = text;
        }
        if (school && !seen.has(school.toLowerCase())) {
          seen.add(school.toLowerCase());
          education.push({ school, degree, field, dates });
        }
      }
      return education;
    },

    extractSkills() {
      const skills = [];
      const section = this.findSectionByHeader('Skills');
      if (!section) return skills;

      const seen = new Set();
      const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
      for (const span of boldSpans) {
        const text = span.textContent?.trim();
        if (!text || text.length < 2) continue;
        if (text.includes('Show all') || text.includes('endorsement')) continue;
        if (/^\\d+$/.test(text)) continue;
        if (text.length < 60 && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          skills.push(text);
        }
      }
      return skills;
    },

    extractCertifications() {
      const certs = [];
      const section = this.findSectionByHeader('Licenses') || this.findSectionByHeader('Certifications');
      if (!section) return certs;

      const seen = new Set();
      const allDivs = section.querySelectorAll('div');
      for (const div of allDivs) {
        const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]');
        if (!img) continue;
        const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
        if (nestedImgs.length > 1) continue;

        const spans = div.querySelectorAll('span[aria-hidden="true"]');
        let name = '', issuer = '', issueDate;
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (!text) continue;
          if (text.startsWith('Issued ')) { issueDate = text.replace('Issued ', ''); continue; }
          if (/^[A-Z][a-z]{2} \\d{4}$/.test(text)) { issueDate = text; continue; }
          if (!name && text.length > 2) {
            const parentClasses = span.parentElement?.className || '';
            if (parentClasses.includes('bold')) { name = text; continue; }
          }
          if (name && !issuer && text.length > 2) { issuer = text; continue; }
          if (!name && text.length > 2 && text.length < 100) name = text;
        }
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          certs.push({ name, issuer, issueDate });
        }
      }
      return certs;
    },

    extractVolunteering() {
      const volunteering = [];
      const section = this.findSectionByHeader('Volunteer');
      if (!section) return volunteering;

      const seen = new Set();
      const allDivs = section.querySelectorAll('div');
      for (const div of allDivs) {
        const spans = div.querySelectorAll('span[aria-hidden="true"]');
        if (spans.length < 2) continue;

        let role = '', organization = '';
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (!text || text.length < 2) continue;
          if (/^\\w{3} \\d{4}\\s*-/.test(text) || /^\\d+\\s*(yr|mo)/.test(text)) continue;
          if (!role) {
            const parentClasses = span.parentElement?.className || '';
            if (parentClasses.includes('bold')) { role = text; continue; }
          }
          if (role && !organization && text.length > 2) { organization = text; continue; }
          if (!role && text.length > 2 && text.length < 80) role = text;
        }
        const key = \`\${role}-\${organization}\`.toLowerCase();
        if ((role || organization) && !seen.has(key)) {
          seen.add(key);
          volunteering.push({ organization, role });
        }
      }
      return volunteering;
    },

    extractLanguages() {
      const languages = [];
      const section = this.findSectionByHeader('Languages');
      if (!section) return languages;

      const seen = new Set();
      const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
      for (const span of boldSpans) {
        const text = span.textContent?.trim();
        if (text && text.length > 1 && text.length < 50 && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          languages.push(text);
        }
      }
      return languages;
    },

    extractActivities() {
      const activities = [];
      const section = this.findSectionByHeader('Activity');
      if (!section) return activities;

      const seen = new Set();
      const postTexts = section.querySelectorAll('span[aria-hidden="true"], .update-components-text');
      for (const span of postTexts) {
        if (activities.length >= 10) break;
        const text = span.textContent?.trim();
        if (!text || text.length < 20) continue;
        if (text.includes('Show all') || text.includes('follower')) continue;
        const textLower = text.toLowerCase();
        if (seen.has(textLower)) continue;
        seen.add(textLower);
        activities.push({ type: 'post', text: text.slice(0, 500) });
      }
      return activities;
    },

    extractAll() {
      return {
        name: this.extractName(),
        headline: this.extractHeadline(),
        location: this.extractLocation(),
        about: this.extractAbout(),
        employers: this.extractEmployers(),
        education: this.extractEducation(),
        skills: this.extractSkills(),
        certifications: this.extractCertifications(),
        volunteering: this.extractVolunteering(),
        languages: this.extractLanguages(),
        activities: this.extractActivities(),
      };
    }
  };
`;

test.describe('Extraction Debug', () => {
  test('extract data from multiple profiles', async ({ context }) => {
    const page = await context.newPage();

    // Inject extraction script
    await page.addInitScript(extractionScript);

    const results: Array<{
      profileId: string;
      url: string;
      data: Record<string, unknown>;
      emptyFields: string[];
      errors: string[];
    }> = [];

    for (const profileId of TEST_PROFILES) {
      const url = `https://www.linkedin.com/in/${profileId}`;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`PROFILE: ${profileId}`);
      console.log(`URL: ${url}`);
      console.log('='.repeat(60));

      try {
        // Navigate to profile
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for profile to load
        await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

        // Progressive scroll to trigger lazy loading (mimics user behavior)
        const scrollPositions = [500, 1000, 1500, 2000, 2500, 3000];
        for (const pos of scrollPositions) {
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
          await page.waitForTimeout(400);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(500);

        // Wait for Experience section to have content
        await page.waitForFunction(() => {
          const sections = document.querySelectorAll('main section');
          for (const section of sections) {
            const h2 = section.querySelector('h2');
            if (h2?.textContent?.toLowerCase().includes('experience')) {
              const logos = section.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
              return logos.length >= 1;
            }
          }
          return false;
        }, { timeout: 10000 }).catch(() => console.log('Experience section wait timeout'));

        // Wait for page to stabilize
        await page.waitForTimeout(1000);

        // Re-inject script (in case page navigation cleared it)
        await page.evaluate(extractionScript);

        // Extract data
        const data = await page.evaluate(() => {
          return (window as any).socialRecallExtract.extractAll();
        });

        // Analyze empty fields
        const emptyFields: string[] = [];
        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === undefined) {
            emptyFields.push(key);
          } else if (Array.isArray(value) && value.length === 0) {
            emptyFields.push(`${key} (empty array)`);
          } else if (typeof value === 'string' && value.trim() === '') {
            emptyFields.push(`${key} (empty string)`);
          }
        }

        // Log results
        console.log('\n--- EXTRACTED DATA ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('\n--- EMPTY FIELDS ---');
        if (emptyFields.length > 0) {
          console.log(emptyFields.join('\n'));
        } else {
          console.log('None - all fields populated!');
        }

        results.push({
          profileId,
          url,
          data,
          emptyFields,
          errors: [],
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`\n--- ERROR ---`);
        console.log(errorMsg);
        results.push({
          profileId,
          url,
          data: {},
          emptyFields: [],
          errors: [errorMsg],
        });
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    for (const result of results) {
      console.log(`\n${result.profileId}:`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      } else {
        console.log(`  Empty fields: ${result.emptyFields.length > 0 ? result.emptyFields.join(', ') : 'None'}`);
        console.log(`  Employers: ${(result.data.employers as any[])?.length || 0}`);
        console.log(`  Education: ${(result.data.education as any[])?.length || 0}`);
        console.log(`  Skills: ${(result.data.skills as any[])?.length || 0}`);
      }
    }

    // Find common empty fields
    const emptyFieldCounts: Record<string, number> = {};
    for (const result of results) {
      for (const field of result.emptyFields) {
        emptyFieldCounts[field] = (emptyFieldCounts[field] || 0) + 1;
      }
    }

    console.log('\n--- COMMON EMPTY FIELDS ---');
    const sortedFields = Object.entries(emptyFieldCounts)
      .sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sortedFields) {
      console.log(`  ${field}: ${count}/${results.length} profiles`);
    }

    // Debug: dump page HTML structure for first profile with issues
    const profileWithIssues = results.find(r => r.emptyFields.includes('employers (empty array)'));
    if (profileWithIssues) {
      console.log(`\n--- DEBUG HTML for ${profileWithIssues.profileId} ---`);
      await page.goto(profileWithIssues.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const debugInfo = await page.evaluate(() => {
        const main = document.querySelector('main');
        const sections = main?.querySelectorAll('section') || [];
        const sectionInfo: string[] = [];

        sections.forEach((section, i) => {
          const h2 = section.querySelector('h2');
          const firstSpan = section.querySelector('span[aria-hidden="true"]');
          const imgs = section.querySelectorAll('img[src*="company"], img[src*="shrink"]');
          sectionInfo.push(`Section[${i}]: h2="${h2?.textContent?.trim()?.slice(0, 30) || 'none'}" span="${firstSpan?.textContent?.trim()?.slice(0, 30) || 'none'}" imgs=${imgs.length}`);
        });

        return {
          sectionCount: sections.length,
          sections: sectionInfo,
        };
      });

      console.log(JSON.stringify(debugInfo, null, 2));
    }
  });

  test('debug single profile extraction', async ({ context }) => {
    // Use this test to debug a specific profile
    const PROFILE_TO_DEBUG = 'williamhgates';

    const page = await context.newPage();
    await page.addInitScript(extractionScript);

    const url = `https://www.linkedin.com/in/${PROFILE_TO_DEBUG}`;
    console.log(`Debugging: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Re-inject and extract
    await page.evaluate(extractionScript);

    // Get detailed DOM info
    const domDebug = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      // Check for Experience section specifically
      const expAnchors = document.querySelectorAll('[id*="experience" i]');
      result.experienceAnchors = Array.from(expAnchors).map(el => ({
        tag: el.tagName,
        id: el.id,
        class: el.className?.toString()?.slice(0, 50),
      }));

      // Find all sections in main
      const main = document.querySelector('main');
      const sections = main?.querySelectorAll('section') || [];
      result.mainSections = Array.from(sections).slice(0, 10).map((section, i) => {
        const h2 = section.querySelector('h2');
        const anchor = section.querySelector('.pv-profile-card__anchor');
        const imgs = section.querySelectorAll('img[src*="company"], img[src*="shrink_100"]');
        const firstBoldSpan = section.querySelector('.t-bold span[aria-hidden="true"]');
        return {
          index: i,
          anchorId: anchor?.id || 'none',
          h2: h2?.textContent?.trim()?.slice(0, 40) || 'none',
          imgCount: imgs.length,
          firstBold: firstBoldSpan?.textContent?.trim()?.slice(0, 40) || 'none',
        };
      });

      // Extract with logging
      const extract = (window as any).socialRecallExtract;
      result.extraction = extract.extractAll();

      return result;
    });

    console.log('\n--- DOM DEBUG ---');
    console.log(JSON.stringify(domDebug, null, 2));

    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'debug-profile.png', fullPage: true });
    console.log('\nScreenshot saved to debug-profile.png');
  });
});
