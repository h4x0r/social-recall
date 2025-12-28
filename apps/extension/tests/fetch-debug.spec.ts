/**
 * Fetch Debug Test
 *
 * Investigates why fetch interception only catches some API calls.
 */

import { test, expect } from './fixtures';

test('debug fetch interception', async ({ context }) => {
  const page = await context.newPage();

  // Inject a more aggressive interceptor to see ALL requests
  await page.addInitScript(() => {
    // Store original fetch
    const _originalFetch = window.fetch;
    let callCount = 0;

    window.fetch = async function(...args: Parameters<typeof fetch>): Promise<Response> {
      callCount++;
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';

      if (url.includes('/voyager/')) {
        console.log(`[DEBUG-FETCH #${callCount}] ${url.slice(0, 120)}`);
      }

      return _originalFetch.apply(this, args);
    };

    console.log('[DEBUG-FETCH] Playwright fetch interceptor installed');
  });

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Check our Playwright interceptor
  const playwrightInterceptorInstalled = logs.some(l => l.includes('[DEBUG-FETCH] Playwright fetch interceptor installed'));
  const debugFetchLogs = logs.filter(l => l.includes('[DEBUG-FETCH #'));
  const socialRecallLogs = logs.filter(l => l.includes('[Social Recall] Intercepted fetch'));

  console.log('\n=== FETCH INTERCEPTION COMPARISON ===\n');
  console.log(`Playwright interceptor installed: ${playwrightInterceptorInstalled}`);
  console.log(`Playwright caught: ${debugFetchLogs.length} voyager fetch calls`);
  console.log(`Social Recall caught: ${socialRecallLogs.length} voyager fetch calls`);

  if (debugFetchLogs.length > 0 && socialRecallLogs.length === 0) {
    console.log('\n⚠️ Playwright catches calls that Social Recall misses!');
    console.log('This suggests Social Recall\'s fetch patch runs AFTER LinkedIn caches original fetch.');
  }

  console.log('\n--- Playwright Debug Logs (first 15) ---');
  debugFetchLogs.slice(0, 15).forEach(l => console.log(l.slice(0, 130)));

  console.log('\n--- Social Recall Logs ---');
  socialRecallLogs.forEach(l => console.log(l));

  // Check for Service Worker
  const hasServiceWorker = await page.evaluate(() => {
    return 'serviceWorker' in navigator;
  });
  console.log(`\nBrowser has ServiceWorker API: ${hasServiceWorker}`);

  // Check for LinkedIn's fetch wrapper
  const fetchInfo = await page.evaluate(() => {
    const fetchStr = window.fetch.toString();
    return {
      isNative: fetchStr.includes('[native code]'),
      length: fetchStr.length,
      preview: fetchStr.slice(0, 200),
    };
  });

  console.log('\n--- Current window.fetch status ---');
  console.log(`Is native: ${fetchInfo.isNative}`);
  console.log(`Function length: ${fetchInfo.length} chars`);
  console.log(`Preview: ${fetchInfo.preview}`);

  expect(playwrightInterceptorInstalled).toBe(true);
});
