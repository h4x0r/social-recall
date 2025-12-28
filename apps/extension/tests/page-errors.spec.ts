/**
 * Page Errors Test
 *
 * Check for JavaScript errors on the page that might be breaking our script.
 */

import { test, expect } from './fixtures';

test('check for page errors', async ({ context }) => {
  const page = await context.newPage();

  const errors: string[] = [];
  const logs: string[] = [];

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Capture console messages
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(5000);

  console.log('\n=== PAGE ERRORS ===');
  if (errors.length > 0) {
    errors.forEach(e => console.log(`ERROR: ${e}`));
  } else {
    console.log('No page errors detected');
  }

  console.log('\n=== CONSOLE LOGS (errors/warnings) ===');
  const errorLogs = logs.filter(l => l.startsWith('[error]') || l.startsWith('[warning]'));
  errorLogs.slice(0, 20).forEach(l => console.log(l.slice(0, 200)));

  console.log('\n=== SOCIAL RECALL LOGS ===');
  const srLogs = logs.filter(l => l.includes('[Social Recall]'));
  srLogs.forEach(l => console.log(l));

  // Check if the MAIN world script console.log appears
  const mainWorldInstalled = srLogs.some(l =>
    l.includes('interceptor installed') && l.includes('MAIN world')
  );
  console.log(`\nMAIN world interceptor log found: ${mainWorldInstalled}`);

  // Check what XMLHttpRequest looks like from page context
  const xhrInfo = await page.evaluate(() => {
    return {
      xhrConstructor: window.XMLHttpRequest.toString().slice(0, 100),
      xhrName: window.XMLHttpRequest.name,
    };
  });
  console.log('\n=== XMLHttpRequest from page ===');
  console.log(`Constructor name: ${xhrInfo.xhrName}`);
  console.log(`Constructor preview: ${xhrInfo.xhrConstructor}`);

  expect(errors.length).toBeLessThan(5);
});
