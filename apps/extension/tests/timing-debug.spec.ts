/**
 * Timing Debug Test
 *
 * Verifies when our interceptor runs vs when LinkedIn's API calls fire.
 */

import { test, expect } from './fixtures';

test('check interceptor timing', async ({ context }) => {
  const page = await context.newPage();

  // Collect ALL console messages with timestamps
  const logs: Array<{ time: number; text: string }> = [];
  const startTime = Date.now();

  page.on('console', msg => {
    logs.push({ time: Date.now() - startTime, text: msg.text() });
  });

  // Track network requests with timestamps
  const requests: Array<{ time: number; url: string }> = [];

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/voyager/api/')) {
      requests.push({ time: Date.now() - startTime, url: url.slice(0, 100) });
    }
  });

  console.log('Navigating to LinkedIn profile...');
  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Find when our interceptor installed
  const interceptorLog = logs.find(l => l.text.includes('Voyager API interceptor installed'));
  const interceptorTime = interceptorLog?.time || -1;

  // Find first Voyager API call
  const firstApiCall = requests[0];
  const firstApiTime = firstApiCall?.time || -1;

  // Find first "Intercepted fetch" log
  const firstInterceptLog = logs.find(l => l.text.includes('Intercepted fetch'));
  const firstInterceptTime = firstInterceptLog?.time || -1;

  console.log('\n=== TIMING ANALYSIS ===\n');
  console.log(`Interceptor installed at: ${interceptorTime}ms`);
  console.log(`First Voyager API call at: ${firstApiTime}ms`);
  console.log(`First intercepted fetch log at: ${firstInterceptTime}ms`);

  if (interceptorTime > 0 && firstApiTime > 0) {
    const delta = interceptorTime - firstApiTime;
    if (delta > 0) {
      console.log(`\n⚠️ RACE CONDITION: API calls started ${delta}ms BEFORE interceptor installed!`);
    } else {
      console.log(`\n✓ Interceptor installed ${-delta}ms BEFORE first API call`);
    }
  }

  // Count how many API calls happened before interceptor
  const callsBeforeInterceptor = requests.filter(r => r.time < interceptorTime).length;
  const callsAfterInterceptor = requests.filter(r => r.time >= interceptorTime).length;

  console.log(`\nAPI calls before interceptor: ${callsBeforeInterceptor}`);
  console.log(`API calls after interceptor: ${callsAfterInterceptor}`);

  // Show first 10 API calls with timing
  console.log('\n--- First 10 Voyager API calls ---');
  requests.slice(0, 10).forEach((r, i) => {
    const beforeAfter = r.time < interceptorTime ? 'BEFORE' : 'AFTER';
    console.log(`${i + 1}. [${r.time}ms] [${beforeAfter}] ${r.url}`);
  });

  // Show relevant console logs in order
  console.log('\n--- Console logs timeline ---');
  logs
    .filter(l => l.text.includes('[Social Recall]'))
    .slice(0, 15)
    .forEach(l => {
      console.log(`[${l.time}ms] ${l.text.slice(0, 100)}`);
    });

  // Count intercepted calls
  const interceptedCount = logs.filter(l => l.text.includes('Intercepted fetch')).length;
  const profileDetectedCount = logs.filter(l => l.text.includes('Profile URL detected')).length;

  console.log('\n=== INTERCEPTION STATS ===');
  console.log(`Total Voyager API calls: ${requests.length}`);
  console.log(`Intercepted fetch logs: ${interceptedCount}`);
  console.log(`Profile URL detected logs: ${profileDetectedCount}`);
  console.log(`Missed calls: ${requests.length - interceptedCount}`);

  expect(interceptorTime).toBeGreaterThan(0);
});
