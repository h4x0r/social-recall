/**
 * XHR Debug Test
 *
 * Check if LinkedIn uses XHR instead of fetch for most API calls.
 */

import { test, expect } from './fixtures';

test('debug XHR vs fetch usage', async ({ context }) => {
  const page = await context.newPage();

  // Intercept at network level (CDP) to see ALL requests
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');

  const allRequests: Array<{
    url: string;
    method: string;
    type: string;
    timestamp: number;
  }> = [];

  client.on('Network.requestWillBeSent', (params: any) => {
    if (params.request.url.includes('/voyager/')) {
      allRequests.push({
        url: params.request.url.slice(0, 120),
        method: params.request.method,
        type: params.type || 'unknown',
        timestamp: params.timestamp,
      });
    }
  });

  // Also inject interceptors for both fetch and XHR
  await page.addInitScript(() => {
    // Track fetch calls
    const _fetch = window.fetch;
    let fetchCount = 0;
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      if (url.includes('/voyager/')) {
        fetchCount++;
        console.log(`[FETCH #${fetchCount}] ${url.slice(0, 80)}`);
      }
      return _fetch.apply(this, args);
    };

    // Track XHR calls
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    let xhrCount = 0;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
      (this as any)._url = url.toString();
      return _open.apply(this, [method, url, ...rest] as any);
    };

    XMLHttpRequest.prototype.send = function(body?: any) {
      const url = (this as any)._url || '';
      if (url.includes('/voyager/')) {
        xhrCount++;
        console.log(`[XHR #${xhrCount}] ${url.slice(0, 80)}`);
      }
      return _send.call(this, body);
    };

    console.log('[DEBUG] Fetch and XHR interceptors installed');
  });

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Analyze results
  const fetchLogs = logs.filter(l => l.includes('[FETCH #'));
  const xhrLogs = logs.filter(l => l.includes('[XHR #'));

  console.log('\n=== REQUEST METHOD ANALYSIS ===\n');
  console.log(`Total network-level Voyager requests: ${allRequests.length}`);
  console.log(`Caught via window.fetch: ${fetchLogs.length}`);
  console.log(`Caught via XMLHttpRequest: ${xhrLogs.length}`);
  console.log(`Unaccounted: ${allRequests.length - fetchLogs.length - xhrLogs.length}`);

  // Group network requests by type
  const typeGroups: Record<string, number> = {};
  for (const req of allRequests) {
    typeGroups[req.type] = (typeGroups[req.type] || 0) + 1;
  }
  console.log('\nNetwork request types:', typeGroups);

  // Show first 15 network requests
  console.log('\n--- First 15 Network-Level Voyager Requests ---');
  allRequests.slice(0, 15).forEach((r, i) => {
    console.log(`${i + 1}. [${r.type}] ${r.method} ${r.url}`);
  });

  // Show XHR logs
  if (xhrLogs.length > 0) {
    console.log('\n--- XHR Logs ---');
    xhrLogs.slice(0, 10).forEach(l => console.log(l));
  }

  // Show fetch logs
  if (fetchLogs.length > 0) {
    console.log('\n--- Fetch Logs ---');
    fetchLogs.slice(0, 10).forEach(l => console.log(l));
  }

  // Check if messaging API uses different method than profile API
  const messagingReqs = allRequests.filter(r => r.url.includes('Messaging') || r.url.includes('messenger'));
  const profileReqs = allRequests.filter(r => r.url.includes('identity') || r.url.includes('profile'));

  console.log('\n--- By API Category ---');
  console.log(`Messaging API requests: ${messagingReqs.length}`);
  console.log(`Profile/Identity API requests: ${profileReqs.length}`);

  if (messagingReqs.length > 0) {
    console.log(`Messaging uses: ${[...new Set(messagingReqs.map(r => r.type))].join(', ')}`);
  }
  if (profileReqs.length > 0) {
    console.log(`Profile uses: ${[...new Set(profileReqs.map(r => r.type))].join(', ')}`);
  }

  expect(allRequests.length).toBeGreaterThan(0);
});
