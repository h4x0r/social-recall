/**
 * SSR Debug Test
 *
 * Dumps all SSR data from a LinkedIn profile page to understand the data structure.
 */

import { test, expect } from './fixtures';

test.describe('SSR Debug', () => {
  test('dump SSR data from profile page', async ({ context }) => {
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/in/satyanadella', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Dump all code tags
    const ssrData = await page.evaluate(() => {
      const results: Array<{
        id: string;
        preview: string;
        hasFirstName: boolean;
        hasPublicIdentifier: boolean;
        keys: string[];
      }> = [];

      const codeTags = document.querySelectorAll('code[id^="bpr-guid-"], code[id^="datalet-"]');

      for (const code of codeTags) {
        const content = (code.textContent || '').trim();
        if (!content) continue;

        let parsed: Record<string, unknown> | null = null;
        try {
          if (content.startsWith('{') || content.startsWith('[')) {
            parsed = JSON.parse(content);
          }
        } catch {
          // Not JSON
        }

        if (parsed) {
          const findKeys = (obj: unknown, prefix = ''): string[] => {
            if (!obj || typeof obj !== 'object') return [];
            const keys: string[] = [];
            for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
              const fullKey = prefix ? `${prefix}.${key}` : key;
              keys.push(fullKey);
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...findKeys(value, fullKey));
              }
            }
            return keys;
          };

          const allKeys = findKeys(parsed);
          const hasFirstName = JSON.stringify(parsed).includes('"firstName"');
          const hasPublicIdentifier = JSON.stringify(parsed).includes('"publicIdentifier"');

          results.push({
            id: code.id,
            preview: content.slice(0, 200),
            hasFirstName,
            hasPublicIdentifier,
            keys: allKeys.slice(0, 30),
          });
        }
      }

      return results;
    });

    console.log('\n=== SSR DATA ANALYSIS ===\n');
    console.log(`Total code tags with JSON: ${ssrData.length}\n`);

    // Find tags with profile data
    const withProfile = ssrData.filter(d => d.hasFirstName || d.hasPublicIdentifier);
    console.log(`Tags with profile indicators: ${withProfile.length}\n`);

    for (const data of withProfile) {
      console.log(`\n--- ${data.id} ---`);
      console.log(`Has firstName: ${data.hasFirstName}`);
      console.log(`Has publicIdentifier: ${data.hasPublicIdentifier}`);
      console.log(`Preview: ${data.preview}...`);
      console.log(`Top keys: ${data.keys.join(', ')}`);
    }

    // Also look for profile patterns in the full JSON
    const profilePatterns = await page.evaluate(() => {
      const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');
      const patterns: string[] = [];

      for (const code of codeTags) {
        const content = code.textContent || '';

        // Look for Satya Nadella specifically
        if (content.includes('Satya') || content.includes('satyanadella')) {
          patterns.push(`${code.id}: Contains Satya/satyanadella`);
        }

        // Look for profile-related keys
        if (content.includes('"profile"') || content.includes('"identityDash"')) {
          patterns.push(`${code.id}: Has profile/identityDash key`);
        }
      }

      return patterns;
    });

    console.log('\n=== PROFILE PATTERNS ===\n');
    profilePatterns.forEach(p => console.log(p));

    // Check regular script tags too
    const scriptData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      const relevant: string[] = [];

      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('satyanadella') || (content.includes('Satya') && content.includes('Nadella'))) {
          relevant.push(`Script with Satya: ${content.slice(0, 300)}...`);
        }
      }

      return relevant;
    });

    console.log('\n=== SCRIPT TAGS WITH PROFILE ===\n');
    scriptData.forEach(s => console.log(s));

    // Dump the identityDashProfilesByMemberIdentity data
    const identityData = await page.evaluate(() => {
      const codeTags = document.querySelectorAll('code[id^="bpr-guid-"]');

      for (const code of codeTags) {
        const content = code.textContent || '';
        if (content.includes('identityDashProfilesByMemberIdentity')) {
          try {
            const parsed = JSON.parse(content);

            // Find the included array which contains the actual profile data
            const findIncluded = (obj: any): any[] | null => {
              if (Array.isArray(obj.included)) return obj.included;
              if (obj.data && Array.isArray(obj.data.included)) return obj.data.included;
              if (obj.data?.data && Array.isArray(obj.data.data.included)) return obj.data.data.included;
              return null;
            };

            const included = findIncluded(parsed);
            if (included) {
              // Find profile entries in included
              const profiles = included.filter((item: any) =>
                item.firstName || item.$type?.includes('Profile')
              );

              return {
                includedCount: included.length,
                profileCount: profiles.length,
                profiles: profiles.map((p: any) => ({
                  firstName: p.firstName,
                  lastName: p.lastName,
                  headline: p.headline?.slice(0, 50),
                  publicIdentifier: p.publicIdentifier,
                  entityUrn: p.entityUrn,
                  $type: p.$type,
                })),
              };
            }
          } catch {
            // Parse error
          }
        }
      }
      return null;
    });

    console.log('\n=== IDENTITY DASH DATA ===\n');
    console.log(JSON.stringify(identityData, null, 2));

    expect(ssrData.length).toBeGreaterThan(0);
  });
});
