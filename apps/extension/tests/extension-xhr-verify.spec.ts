/**
 * Extension XHR Verification Test
 *
 * Verifies that our extension's XHR interception is working
 * by checking console logs WITHOUT adding our own interceptors.
 */

import { test, expect } from './fixtures';

test('verify extension XHR interception', async ({ context }) => {
  const page = await context.newPage();

  // Collect ALL console messages from the extension
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  // Navigate to profile page
  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);

  console.log('\n=== EXTENSION XHR INTERCEPTION CHECK ===\n');

  // Check if our extension's interceptor installed
  const interceptorInstalled = logs.some(l =>
    l.includes('Voyager API interceptor installed (MAIN world)')
  );
  console.log(`Extension interceptor installed: ${interceptorInstalled}`);

  // Check for intercepted fetch logs from extension
  const fetchLogs = logs.filter(l => l.includes('[Social Recall] Intercepted fetch'));
  console.log(`Extension caught fetch calls: ${fetchLogs.length}`);

  // Check for profile URL detected logs
  const profileUrlLogs = logs.filter(l => l.includes('[Social Recall] Profile URL detected'));
  console.log(`Extension profile URL detections: ${profileUrlLogs.length}`);

  // Check for data posting logs
  const postingLogs = logs.filter(l => l.includes('[Social Recall] Posting profile data'));
  console.log(`Extension posted profile data: ${postingLogs.length}`);

  // Check message listener logs
  const receivedLogs = logs.filter(l => l.includes('[Social Recall] Received Voyager data'));
  console.log(`Message listener received data: ${receivedLogs.length}`);

  // Show relevant logs
  console.log('\n--- Extension Logs (first 30) ---');
  const socialRecallLogs = logs.filter(l => l.includes('[Social Recall]'));
  socialRecallLogs.slice(0, 30).forEach(l => console.log(l.slice(0, 150)));

  console.log('\n--- Looking for XHR-related logs ---');
  // Our XHR patch doesn't log "Intercepted XHR" - it only logs for profile URLs
  // Let's check what we ARE seeing
  const xhrRelated = logs.filter(l =>
    l.toLowerCase().includes('xhr') ||
    l.includes('XMLHttpRequest')
  );
  console.log(`XHR-related logs found: ${xhrRelated.length}`);
  xhrRelated.forEach(l => console.log(l));

  // Analyze why we might be missing XHR calls
  console.log('\n=== ANALYSIS ===');
  console.log(`Total [Social Recall] logs: ${socialRecallLogs.length}`);

  if (fetchLogs.length === 2 && profileUrlLogs.length === 2) {
    console.log('⚠️  Only seeing fetch calls, not XHR calls!');
    console.log('Extension XHR patch may not be working correctly.');
    console.log('');
    console.log('Possible issues:');
    console.log('1. XHR patch runs AFTER LinkedIn caches original XHR');
    console.log('2. XHR.open/send prototype chain issue');
    console.log('3. LinkedIn uses a different XHR wrapper');
  }

  // Check if sessionStorage has intercepted data
  const storageData = await page.evaluate(() => {
    return sessionStorage.getItem('sr_voyager_data');
  });

  if (storageData) {
    const parsed = JSON.parse(storageData);
    console.log(`\nSessionStorage has ${parsed.length} intercepted entries`);
    parsed.slice(0, 5).forEach((entry: { url: string; data?: unknown }) => {
      console.log(`  - ${entry.url.slice(0, 100)}`);
      // Show sample data keys
      if (entry.data && typeof entry.data === 'object') {
        const keys = Object.keys(entry.data);
        console.log(`    Keys: ${keys.slice(0, 5).join(', ')}`);
      }
    });
  } else {
    console.log('\nSessionStorage: No intercepted data stored');
  }

  // Wait a bit more and check again
  await page.waitForTimeout(2000);
  const storageDataAfterWait = await page.evaluate(() => {
    return sessionStorage.getItem('sr_voyager_data');
  });
  console.log(`\nAfter 2s wait, sessionStorage has: ${storageDataAfterWait ? JSON.parse(storageDataAfterWait).length : 0} entries`);

  expect(interceptorInstalled).toBe(true);
});

test('test XHR prototype patching order', async ({ context }) => {
  const page = await context.newPage();

  // Check the state of XHR prototype BEFORE and AFTER our script
  await page.addInitScript(() => {
    // Check if XHR is already patched when our script runs
    const originalOpen = XMLHttpRequest.prototype.open.toString();
    console.log(`[TEST] Initial XHR.open length: ${originalOpen.length}`);
    console.log(`[TEST] Initial XHR.open is native: ${originalOpen.includes('[native code]')}`);
  });

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('https://www.linkedin.com/in/satyanadella', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Check current state of XHR
  const xhrState = await page.evaluate(() => {
    const openStr = XMLHttpRequest.prototype.open.toString();
    const sendStr = XMLHttpRequest.prototype.send.toString();
    return {
      openIsNative: openStr.includes('[native code]'),
      sendIsNative: sendStr.includes('[native code]'),
      openLength: openStr.length,
      sendLength: sendStr.length,
      openPreview: openStr.slice(0, 200),
      sendPreview: sendStr.slice(0, 200),
    };
  });

  console.log('\n=== XHR PROTOTYPE STATE ===\n');
  console.log(`XHR.open is native: ${xhrState.openIsNative}`);
  console.log(`XHR.send is native: ${xhrState.sendIsNative}`);
  console.log(`XHR.open length: ${xhrState.openLength} chars`);
  console.log(`XHR.send length: ${xhrState.sendLength} chars`);
  console.log(`\nXHR.open preview:\n${xhrState.openPreview}`);
  console.log(`\nXHR.send preview:\n${xhrState.sendPreview}`);

  // Check if our patch signature is present
  const ourPatchPresent = xhrState.openPreview.includes('_voyagerUrl') ||
                          xhrState.sendPreview.includes('_voyagerUrl');
  console.log(`\nOur XHR patch signature (_voyagerUrl) present: ${ourPatchPresent}`);

  if (!ourPatchPresent) {
    console.log('⚠️  Our XHR patch is NOT in the prototype chain!');
    console.log('LinkedIn may have wrapped XHR before our script ran.');
  }

  const testLogs = logs.filter(l => l.includes('[TEST]'));
  console.log('\n--- Test-injected logs ---');
  testLogs.forEach(l => console.log(l));

  expect(xhrState.openIsNative).toBe(false); // Should be patched
});
