/**
 * Voyager API Interceptor - Early Injection Script
 * Runs at document_start to intercept API calls before LinkedIn's JS loads
 */

import { createInterceptorScript, isLinkedInProfilePage, shouldRefreshForInterception } from './voyager-api';

// Storage keys
const REFRESH_FLAG_KEY = 'sr_has_refreshed';
const INTERCEPTED_DATA_KEY = 'sr_voyager_data';

/**
 * Inject the interceptor script into the page context
 */
function injectInterceptor(): void {
  const script = document.createElement('script');
  script.textContent = createInterceptorScript();

  // Insert at the very beginning to catch all API calls
  (document.head || document.documentElement).prepend(script);

  // Remove the script element after injection (code is already running)
  script.remove();

  console.log('[Social Recall] Voyager interceptor injected at document_start');
}

/**
 * Listen for intercepted Voyager data from the page context
 */
function setupMessageListener(): void {
  window.addEventListener('message', (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    if (event.data?.type === 'VOYAGER_PROFILE_DATA') {
      console.log('[Social Recall] Received Voyager data:', event.data.url);

      // Store the data in sessionStorage for the main content script to read
      try {
        const existing = sessionStorage.getItem(INTERCEPTED_DATA_KEY);
        const dataArray = existing ? JSON.parse(existing) : [];

        dataArray.push({
          url: event.data.url,
          data: event.data.data,
          timestamp: Date.now(),
        });

        // Keep only last 10 entries to avoid storage bloat
        while (dataArray.length > 10) {
          dataArray.shift();
        }

        sessionStorage.setItem(INTERCEPTED_DATA_KEY, JSON.stringify(dataArray));

        // Also dispatch a custom event for immediate consumption
        window.dispatchEvent(new CustomEvent('voyager-data-intercepted', {
          detail: event.data.data
        }));
      } catch (e) {
        console.error('[Social Recall] Failed to store intercepted data:', e);
      }
    }
  });
}

/**
 * Check if we need to refresh to catch API calls we missed
 */
function checkNeedRefresh(): void {
  // Only check on profile pages
  if (!isLinkedInProfilePage(window.location.href)) {
    return;
  }

  // Check if we've already refreshed for this session
  const hasRefreshed = sessionStorage.getItem(REFRESH_FLAG_KEY) === 'true';

  // Give a short delay to see if we get any API data
  // If this is a fresh navigation, API calls will happen and we'll catch them
  // If extension was just installed/enabled, API calls already happened
  setTimeout(() => {
    const hasData = sessionStorage.getItem(INTERCEPTED_DATA_KEY);

    if (shouldRefreshForInterception({
      isProfilePage: true,
      hasInterceptedData: !!hasData,
      hasRefreshedBefore: hasRefreshed,
    })) {
      console.log('[Social Recall] No intercepted data - refreshing to catch API calls');
      sessionStorage.setItem(REFRESH_FLAG_KEY, 'true');
      location.reload();
    }
  }, 3000); // Wait 3 seconds to see if we get data
}

// Run immediately at document_start
injectInterceptor();
setupMessageListener();

// Check for refresh after a delay (need to wait for potential API calls)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkNeedRefresh);
} else {
  checkNeedRefresh();
}
