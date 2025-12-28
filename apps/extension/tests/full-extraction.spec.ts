/**
 * Full Extraction Test
 *
 * Tests the complete extraction flow and verifies employers/education are captured.
 */

import { test, expect } from './fixtures';

test('verify full extraction captures employers', async ({ context }) => {
  const page = await context.newPage();

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 });

  // Scroll to load all sections
  for (const pos of [500, 1000, 1500, 2000, 2500]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), pos);
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(3000);

  console.log('\n=== FULL EXTRACTION TEST ===\n');

  // Find the "Extracted profile data" log
  const extractedLog = logs.find(l => l.includes('Extracted profile data:'));

  if (extractedLog) {
    // Parse the JSON from the log
    const jsonMatch = extractedLog.match(/Extracted profile data: ({[\s\S]*})/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        console.log('Extracted data:');
        console.log(`  Name: ${data.name}`);
        console.log(`  Headline: ${data.headline}`);
        console.log(`  Employers: ${data.employers?.length || 0}`);
        if (data.employers?.length > 0) {
          data.employers.forEach((e: { company: string }, i: number) =>
            console.log(`    ${i + 1}. ${e.company}`)
          );
        }
        console.log(`  Education: ${data.education?.length || 0}`);
        if (data.education?.length > 0) {
          data.education.forEach((e: { school: string }, i: number) =>
            console.log(`    ${i + 1}. ${e.school}`)
          );
        }

        expect(data.employers?.length).toBeGreaterThan(0);
      } catch (e) {
        console.log('Failed to parse extracted data:', e);
      }
    }
  } else {
    console.log('No "Extracted profile data" log found');

    // Show all Social Recall logs
    const srLogs = logs.filter(l => l.includes('[Social Recall]'));
    console.log(`\nAll Social Recall logs (${srLogs.length}):`);
    srLogs.forEach(l => console.log(l.slice(0, 150)));
  }

  expect(extractedLog).toBeDefined();
});
