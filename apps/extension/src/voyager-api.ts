/**
 * Voyager API Interception and Parsing
 * Intercepts LinkedIn's internal Voyager API responses for structured profile data
 */

import type { ProfileData, Employer, Education } from './ai-client';

// Extended ProfileData with additional fields for internal use
export interface ExtendedProfileData extends ProfileData {
  linkedinId?: string;
  location?: string;
  avatarUrl?: string;
}

// Voyager API response types (partial - LinkedIn's actual schema is larger)
export interface VoyagerProfileResponse {
  data?: {
    firstName?: string;
    lastName?: string;
    headline?: string;
    summary?: string;
    locationName?: string;
    publicIdentifier?: string;
    profilePicture?: {
      displayImageReference?: {
        vectorImage?: {
          rootUrl?: string;
          artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }>;
        };
      };
    };
  };
  included?: Array<VoyagerIncludedEntity>;
}

export interface VoyagerIncludedEntity {
  $type?: string;
  // Position fields
  companyName?: string;
  companyLogoUrl?: string;
  title?: string;
  // Education fields
  schoolName?: string;
  degreeName?: string;
  fieldOfStudy?: string;
  dateRange?: {
    start?: { year?: number; month?: number };
    end?: { year?: number; month?: number };
  };
}

/**
 * Check if a URL is a Voyager profile endpoint we should intercept
 */
export function isVoyagerProfileUrl(url: string): boolean {
  if (!url.includes('/voyager/api/')) {
    return false;
  }

  // Profile-related endpoints
  const profilePatterns = [
    '/identity/profiles/',
    '/identity/dash/profiles',
    '/graphql',
  ];

  return profilePatterns.some((pattern) => url.includes(pattern));
}

/**
 * Parse a Voyager API response into our ProfileData format
 */
export function parseVoyagerProfile(
  response: VoyagerProfileResponse
): ExtendedProfileData | null {
  if (!response?.data?.firstName) {
    return null;
  }

  const data = response.data;
  const included = response.included || [];

  // Extract name
  const name = [data.firstName, data.lastName].filter(Boolean).join(' ');

  // Extract headline
  const headline = data.headline || '';

  // Extract about/summary
  const about = data.summary || undefined;

  // Extract location
  const location = data.locationName || undefined;

  // Extract LinkedIn ID
  const linkedinId = data.publicIdentifier || undefined;

  // Extract avatar URL (prefer larger size)
  let avatarUrl: string | undefined;
  const profilePic = data.profilePicture?.displayImageReference?.vectorImage;
  if (profilePic?.rootUrl && profilePic.artifacts?.length) {
    // Get the largest artifact (usually last)
    const artifact = profilePic.artifacts[profilePic.artifacts.length - 1];
    if (artifact?.fileIdentifyingUrlPathSegment) {
      avatarUrl = profilePic.rootUrl + artifact.fileIdentifyingUrlPathSegment;
    }
  }

  // Extract employers from Position entities
  const employers: Employer[] = included
    .filter((entity) => entity.$type?.includes('Position'))
    .map((position) => ({
      company: position.companyName || '',
      logo: position.companyLogoUrl || '',
    }))
    .filter((e) => e.company);

  // Extract education from Education entities
  const education: Education[] = included
    .filter((entity) => entity.$type?.includes('Education'))
    .map((edu) => {
      const dates = formatDateRange(edu.dateRange);
      return {
        school: edu.schoolName || '',
        degree: edu.degreeName || undefined,
        field: edu.fieldOfStudy || undefined,
        dates: dates || undefined,
      };
    })
    .filter((e) => e.school);

  return {
    name,
    headline,
    about,
    location,
    linkedinId,
    avatarUrl,
    employers,
    education,
  };
}

/**
 * Format a date range object into a string
 */
function formatDateRange(
  dateRange?: VoyagerIncludedEntity['dateRange']
): string | undefined {
  if (!dateRange) return undefined;

  const start = dateRange.start?.year;
  const end = dateRange.end?.year;

  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return `${start} - Present`;
  }

  return undefined;
}

/**
 * Create the JavaScript code that intercepts fetch/XHR calls to Voyager API.
 * This code is injected into the page context (not content script context)
 * to intercept requests before LinkedIn's own code processes them.
 */
export function createInterceptorScript(): string {
  return `
(function() {
  // Avoid double-injection
  if (window.__voyagerInterceptorInstalled) return;
  window.__voyagerInterceptorInstalled = true;

  const PROFILE_URL_PATTERNS = [
    '/voyager/api/identity/profiles/',
    '/voyager/api/identity/dash/profiles',
    '/voyager/api/graphql'
  ];

  function isProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return PROFILE_URL_PATTERNS.some(pattern => url.includes(pattern));
  }

  function postProfileData(url, data) {
    try {
      window.postMessage({
        type: 'VOYAGER_PROFILE_DATA',
        url: url,
        data: data
      }, '*');
    } catch (e) {
      console.error('[Social Recall] Failed to post profile data:', e);
    }
  }

  // Patch fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      if (isProfileUrl(url)) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && (data.data || data.included)) {
            postProfileData(url, data);
          }
        }).catch(() => {});
      }
    } catch (e) {}

    return response;
  };

  // Patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._voyagerUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (isProfileUrl(this._voyagerUrl)) {
      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          if (data && (data.data || data.included)) {
            postProfileData(this._voyagerUrl, data);
          }
        } catch (e) {}
      });
    }
    return originalSend.apply(this, args);
  };

  console.log('[Social Recall] Voyager API interceptor installed');
})();
`;
}

/**
 * Check if a URL is a LinkedIn profile page
 */
export function isLinkedInProfilePage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isLinkedIn = parsed.hostname.includes('linkedin.com');
    const isProfilePath = parsed.pathname.startsWith('/in/');
    return isLinkedIn && isProfilePath;
  } catch {
    return false;
  }
}

/**
 * Determine if we should refresh the page to intercept Voyager API calls.
 * This handles the edge case where the extension loads after the page is already on a profile.
 */
export interface RefreshDecisionInput {
  isProfilePage: boolean;
  hasInterceptedData: boolean;
  hasRefreshedBefore: boolean;
}

export function shouldRefreshForInterception(input: RefreshDecisionInput): boolean {
  // Only refresh if we're on a profile page, have no data, and haven't refreshed before
  return input.isProfilePage && !input.hasInterceptedData && !input.hasRefreshedBefore;
}
