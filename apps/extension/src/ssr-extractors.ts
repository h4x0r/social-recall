/**
 * SSR (Server-Side Rendered) extraction functions for LinkedIn profile data
 * Extracts profile information from LinkedIn's embedded JSON data in code tags
 */

import type { Employer, Education, ExtendedProfileData } from './types';
import { logger } from './logger';

/**
 * Wait for SSR code tags to appear in the DOM
 * LinkedIn injects these ~500-1000ms on fast networks, longer on slow networks
 */
export async function waitForSSRCodeTags(timeout: number = 8000): Promise<NodeListOf<Element>> {
  const startTime = Date.now();
  const selector = 'code[id^="bpr-guid-"]';

  while (Date.now() - startTime < timeout) {
    const codeTags = document.querySelectorAll(selector);
    if (codeTags.length > 0) {
      logger.debug('SSR code tags found after', Date.now() - startTime, 'ms');
      return codeTags;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logger.debug('SSR code tags not found within', timeout, 'ms');
  return document.querySelectorAll(selector);
}

/**
 * Extract profile data embedded in LinkedIn's HTML (SSR data)
 * LinkedIn embeds profile data in various ways:
 * 1. <code> tags with HTML comments containing JSON
 * 2. Script tags with inline JSON
 * 3. application/ld+json structured data
 */
export async function getEmbeddedProfileData(): Promise<ExtendedProfileData | null> {
  try {
    // Get the profile ID from the current URL to match against
    const urlProfileId = window.location.pathname.match(/\/in\/([^/?]+)/)?.[1]?.toLowerCase();
    logger.debug('Looking for SSR data matching profile:', urlProfileId);

    // SSR code tags already waited for in parallel (handleProfilePage)
    // Just query them directly - they should be present
    // LinkedIn's primary pattern: <code id="bpr-guid-XXXX"><!--{JSON}--></code>
    const codeTags = document.querySelectorAll('code[id^="bpr-guid-"], code[id^="datalet-"], code[style*="display:none"], code[style*="display: none"]');
    logger.debug('Found', codeTags.length, 'hidden code tags to check');

    // Collect all potential profiles, then pick the right one
    const foundProfiles: Array<{ profile: ExtendedProfileData; codeId: string }> = [];

    for (const code of codeTags) {
      const content = (code.textContent || code.innerHTML || '').trim();
      if (!content) continue;

      // Skip datalet entries (these are request metadata, not data)
      if (code.id.startsWith('datalet-')) continue;

      // Try to parse as JSON directly (LinkedIn often stores raw JSON)
      let jsonStr = content;

      // Also check for HTML comment wrapper: <!--{...}-->
      const commentMatch = content.match(/<!--(.+?)-->/s);
      if (commentMatch) {
        jsonStr = commentMatch[1].trim();
      }

      if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
        try {
          const data = JSON.parse(jsonStr);

          // Look for profile data in the parsed structure - get ALL profiles
          const allProfileData = findAllProfilesInData(data);
          for (const profileData of allProfileData) {
            foundProfiles.push({ profile: profileData, codeId: code.id });
          }
        } catch {
          // Not valid JSON, continue
        }
      }
    }

    logger.debug('Found', foundProfiles.length, 'profiles in SSR data');

    // Try to find the profile that matches the URL
    if (urlProfileId && foundProfiles.length > 0) {
      // Strategy 1: Exact URL ID match
      for (const { profile, codeId } of foundProfiles) {
        const profileId = profile.linkedinId?.toLowerCase();
        if (profileId === urlProfileId) {
          logger.debug('Found matching profile in code tag:', codeId, 'linkedinId:', profileId);
          return profile;
        }
      }

      // Strategy 2: Vanity URL fallback - match by displayed h1 name
      // LinkedIn allows custom vanity URLs different from internal profile IDs
      const h1 = document.querySelector('h1');
      const displayedName = h1?.textContent?.trim().toLowerCase();
      if (displayedName) {
        for (const { profile, codeId } of foundProfiles) {
          const profileName = profile.name?.toLowerCase();
          if (profileName && profileName === displayedName) {
            logger.debug('Found matching profile by name (vanity URL):', codeId, 'name:', profile.name);
            return profile;
          }
        }
      }

      // If no exact match, log what we found for debugging
      logger.debug('No exact match. Found profiles:', foundProfiles.map(p => ({
        id: p.profile.linkedinId,
        name: p.profile.name,
        codeId: p.codeId
      })));
    }

    // If we have profiles but couldn't match, don't return the wrong one
    if (foundProfiles.length > 0) {
      logger.debug('Found profiles but none matched URL or name, skipping SSR');
    }

    // Also check regular script tags
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';

      if (content.includes('firstName') && content.includes('lastName') && content.includes('headline')) {
        const jsonMatches = content.match(/\{[^{}]*"firstName"\s*:\s*"[^"]+"\s*,[^{}]*"lastName"\s*:\s*"[^"]+"\s*[^{}]*\}/g);

        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              const data = JSON.parse(match);
              if (data.firstName && data.lastName) {
                logger.debug('Found embedded profile data in script tag');
                return {
                  name: `${data.firstName} ${data.lastName}`.trim(),
                  headline: data.headline || data.occupation || '',
                  location: data.locationName || data.location || undefined,
                  avatarUrl: data.profilePicture || data.photoUrl || undefined,
                  about: data.summary || undefined,
                  linkedinId: data.publicIdentifier || data.vanityName || undefined,
                  employers: [],
                  education: [],
                };
              }
            } catch {
              // Not valid JSON, continue
            }
          }
        }
      }
    }

    // Look for application/ld+json structured data
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldJsonScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'Person' && data.name) {
          logger.debug('Found ld+json profile data');
          return {
            name: data.name,
            headline: data.jobTitle || '',
            location: data.address?.addressLocality || undefined,
            avatarUrl: data.image || undefined,
            about: data.description || undefined,
            employers: [],
            education: [],
          };
        }
      } catch {
        // Not valid JSON, continue
      }
    }

    logger.debug('No embedded profile data found');
    return null;
  } catch (e) {
    logger.error('Error extracting embedded profile data:', e);
    return null;
  }
}

/**
 * Find ALL profile data in a nested object structure
 * Returns an array of all profiles found (for SSR data that contains multiple profiles)
 * rootData is the top-level SSR object (contains 'included' array with experience/education)
 */
export function findAllProfilesInData(data: unknown, depth = 0, rootData?: unknown): ExtendedProfileData[] {
  const profiles: ExtendedProfileData[] = [];

  if (depth > 8 || !data || typeof data !== 'object') return profiles;

  const obj = data as Record<string, unknown>;

  // On first call, save rootData for looking up experience/education
  const root = rootData || data;

  // Check if this object looks like profile data (firstName + lastName)
  if (obj.firstName && obj.lastName) {
    // Extract linkedinId from various possible field names
    let linkedinId: string | undefined = (obj.publicIdentifier || obj.vanityName || obj.username) as string | undefined;

    // Try to extract from entityUrn (format: urn:li:fsd_profile:ACoAABxxxxxx)
    if (!linkedinId && typeof obj.entityUrn === 'string') {
      const urnMatch = obj.entityUrn.match(/urn:li:(?:fsd_profile|member):([^,]+)/);
      if (urnMatch) {
        linkedinId = urnMatch[1];
      }
    }

    logger.debug('findAllProfiles: Found profile with linkedinId:', linkedinId, 'name:', `${obj.firstName} ${obj.lastName}`);

    // Extract employers/education from root 'included' array (LinkedIn stores them separately)
    const employers = extractEmployersFromSSR(obj, root as Record<string, unknown>);
    const education = extractEducationFromSSR(obj, root as Record<string, unknown>);

    profiles.push({
      name: `${obj.firstName} ${obj.lastName}`.trim(),
      headline: (obj.headline || obj.occupation || '') as string,
      location: (obj.locationName || obj.geoLocationName || obj.location) as string | undefined,
      avatarUrl: extractAvatarUrlFromSSR(obj),
      about: (obj.summary || obj.about) as string | undefined,
      linkedinId,
      employers,
      education,
    });
  }

  // Check 'data' property (common wrapper)
  if (obj.data && typeof obj.data === 'object') {
    profiles.push(...findAllProfilesInData(obj.data, depth + 1, root));
  }

  // Check 'included' array (Voyager pattern) - this is where multiple profiles live
  if (Array.isArray(obj.included)) {
    for (const item of obj.included) {
      profiles.push(...findAllProfilesInData(item, depth + 1, root));
    }
  }

  // Check 'elements' array
  if (Array.isArray(obj.elements)) {
    for (const item of obj.elements) {
      profiles.push(...findAllProfilesInData(item, depth + 1, root));
    }
  }

  // Check specific LinkedIn patterns
  const keysToCheck = [
    'profile', 'profileView', 'profileData', 'member', 'miniProfile',
    'publicProfileTopCardV2', 'profileTopCard', 'identityDashProfilesByMemberIdentity',
    'identityDashProfiles', '*profile', '*miniProfile'
  ];

  for (const key of keysToCheck) {
    if (obj[key] && typeof obj[key] === 'object') {
      profiles.push(...findAllProfilesInData(obj[key], depth + 1, root));
    }
  }

  return profiles;
}

/**
 * Recursively search for profile data in a nested object structure
 * Returns the first profile found
 * rootData is the top-level SSR object (contains 'included' array with experience/education)
 */
export function findProfileInData(data: unknown, depth = 0, rootData?: unknown): ExtendedProfileData | null {
  if (depth > 8 || !data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  // On first call, save rootData for looking up experience/education
  const root = rootData || data;

  // Check if this object looks like profile data (firstName + lastName)
  if (obj.firstName && obj.lastName) {
    // Extract linkedinId from various possible field names
    let linkedinId: string | undefined = (obj.publicIdentifier || obj.vanityName || obj.username) as string | undefined;

    // Try to extract from entityUrn (format: urn:li:fsd_profile:ACoAABxxxxxx)
    if (!linkedinId && typeof obj.entityUrn === 'string') {
      const urnMatch = obj.entityUrn.match(/urn:li:(?:fsd_profile|member):([^,]+)/);
      if (urnMatch) {
        // This is a member ID, not a vanity URL - but we still need to track it
        linkedinId = urnMatch[1];
      }
    }

    // Try to extract from *profile key (LinkedIn dash pattern)
    if (!linkedinId && obj['*profile'] && typeof obj['*profile'] === 'string') {
      const profileMatch = obj['*profile'].match(/\/in\/([^/?]+)/);
      if (profileMatch) {
        linkedinId = profileMatch[1];
      }
    }

    logger.debug('Extracted profile with linkedinId:', linkedinId, 'name:', `${obj.firstName} ${obj.lastName}`);

    // Extract employers/education from root 'included' array (LinkedIn stores them separately)
    const employers = extractEmployersFromSSR(obj, root as Record<string, unknown>);
    const education = extractEducationFromSSR(obj, root as Record<string, unknown>);

    return {
      name: `${obj.firstName} ${obj.lastName}`.trim(),
      headline: (obj.headline || obj.occupation || '') as string,
      location: (obj.locationName || obj.geoLocationName || obj.location) as string | undefined,
      avatarUrl: extractAvatarUrlFromSSR(obj),
      about: (obj.summary || obj.about) as string | undefined,
      linkedinId,
      employers,
      education,
    };
  }

  // Check 'data' property (common wrapper)
  if (obj.data && typeof obj.data === 'object') {
    const result = findProfileInData(obj.data, depth + 1, root);
    if (result) return result;
  }

  // Check 'included' array (Voyager pattern)
  if (Array.isArray(obj.included)) {
    for (const item of obj.included) {
      const result = findProfileInData(item, depth + 1, root);
      if (result) return result;
    }
  }

  // Check 'elements' array
  if (Array.isArray(obj.elements)) {
    for (const item of obj.elements) {
      const result = findProfileInData(item, depth + 1, root);
      if (result) return result;
    }
  }

  // Check specific LinkedIn patterns
  const keysToCheck = [
    'profile', 'profileView', 'profileData', 'member', 'miniProfile',
    'publicProfileTopCardV2', 'profileTopCard', 'identityDashProfilesByMemberIdentity',
    'identityDashProfiles', '*profile', '*miniProfile'
  ];

  for (const key of keysToCheck) {
    if (obj[key] && typeof obj[key] === 'object') {
      const result = findProfileInData(obj[key], depth + 1, root);
      if (result) return result;
    }
  }

  // Check all object values if they might contain profile data
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      // Only recurse into objects that might have profile data
      const v = value as Record<string, unknown>;
      if (v.firstName || v.data || v.included || v.elements || v.profile || v.member) {
        const result = findProfileInData(value, depth + 1, root);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * Extract avatar URL from SSR profile object
 */
export function extractAvatarUrlFromSSR(obj: Record<string, unknown>): string | undefined {
  if (typeof obj.profilePicture === 'string') return obj.profilePicture;
  if (typeof obj.photoUrl === 'string') return obj.photoUrl;

  const pic = obj.profilePicture as Record<string, unknown> | undefined;
  if (pic?.displayImageReference) {
    const ref = pic.displayImageReference as Record<string, unknown>;
    const vector = ref.vectorImage as Record<string, unknown>;
    if (vector?.rootUrl && Array.isArray(vector.artifacts) && vector.artifacts.length > 0) {
      const artifact = vector.artifacts[vector.artifacts.length - 1] as Record<string, unknown>;
      if (artifact.fileIdentifyingUrlPathSegment) {
        return `${vector.rootUrl}${artifact.fileIdentifyingUrlPathSegment}`;
      }
    }
  }
  return undefined;
}

/**
 * Extract employers from SSR profile data
 */
export function extractEmployersFromSSR(profileObj: Record<string, unknown>, rootData: Record<string, unknown>): Employer[] {
  const employers: Employer[] = [];
  const seen = new Set<string>();

  // Strategy 1: Check for positions directly on profile object
  const positions = (profileObj.positions || profileObj.positionGroups || []) as unknown[];
  if (Array.isArray(positions) && positions.length > 0) {
    for (const pos of positions) {
      const p = pos as Record<string, unknown>;
      const companyName = (p.companyName || p.company) as string;
      if (companyName && !seen.has(companyName.toLowerCase())) {
        seen.add(companyName.toLowerCase());
        employers.push({
          company: companyName,
          logo: (p.companyLogoUrl || p.logo || p.companyLogo) as string || '',
        });
      }
    }
  }

  // Strategy 2: Search 'included' array for Position entities
  const included = rootData.included as unknown[];
  if (Array.isArray(included)) {
    for (const item of included) {
      const i = item as Record<string, unknown>;
      const $type = i.$type as string || i['$type'] as string || '';

      // LinkedIn Position types
      if ($type.includes('Position') || $type.includes('position')) {
        const companyName = (i.companyName || i.company) as string;
        if (companyName && !seen.has(companyName.toLowerCase())) {
          seen.add(companyName.toLowerCase());

          // Try to get logo from nested company object or direct property
          let logo = (i.companyLogoUrl || i.logo) as string || '';
          if (!logo && i.company && typeof i.company === 'object') {
            const company = i.company as Record<string, unknown>;
            logo = (company.logo || company.logoUrl) as string || '';
          }

          employers.push({ company: companyName, logo });
        }
      }

      // Also check for positionGroup pattern
      if ($type.includes('PositionGroup') || i.positions) {
        const groupPositions = i.positions as unknown[];
        if (Array.isArray(groupPositions)) {
          for (const pos of groupPositions) {
            const p = pos as Record<string, unknown>;
            const companyName = (p.companyName || p.company) as string;
            if (companyName && !seen.has(companyName.toLowerCase())) {
              seen.add(companyName.toLowerCase());
              employers.push({
                company: companyName,
                logo: (p.companyLogoUrl || p.logo) as string || '',
              });
            }
          }
        }
      }
    }
  }

  logger.debug('extractEmployersFromSSR: Found', employers.length, 'employers');
  return employers;
}

/**
 * Extract education from SSR profile data
 */
export function extractEducationFromSSR(profileObj: Record<string, unknown>, rootData: Record<string, unknown>): Education[] {
  const education: Education[] = [];
  const seen = new Set<string>();

  // Strategy 1: Check for education directly on profile object
  const eduList = (profileObj.education || profileObj.educations || []) as unknown[];
  if (Array.isArray(eduList) && eduList.length > 0) {
    for (const edu of eduList) {
      const e = edu as Record<string, unknown>;
      const schoolName = (e.schoolName || e.school) as string;
      if (schoolName && !seen.has(schoolName.toLowerCase())) {
        seen.add(schoolName.toLowerCase());
        education.push({
          school: schoolName,
          degree: (e.degreeName || e.degree) as string | undefined,
          field: (e.fieldOfStudy || e.field) as string | undefined,
        });
      }
    }
  }

  // Strategy 2: Search 'included' array for Education entities
  const included = rootData.included as unknown[];
  if (Array.isArray(included)) {
    for (const item of included) {
      const i = item as Record<string, unknown>;
      const $type = i.$type as string || i['$type'] as string || '';

      // LinkedIn Education types
      if ($type.includes('Education') || $type.includes('education')) {
        const schoolName = (i.schoolName || i.school) as string;
        if (schoolName && !seen.has(schoolName.toLowerCase())) {
          seen.add(schoolName.toLowerCase());
          education.push({
            school: schoolName,
            degree: (i.degreeName || i.degree) as string | undefined,
            field: (i.fieldOfStudy || i.field) as string | undefined,
          });
        }
      }
    }
  }

  logger.debug('extractEducationFromSSR: Found', education.length, 'education entries');
  return education;
}
