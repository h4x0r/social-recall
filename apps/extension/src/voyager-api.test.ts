/**
 * Tests for Voyager API interception and parsing
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseVoyagerProfile,
  isVoyagerProfileUrl,
  createInterceptorScript,
  isLinkedInProfilePage,
  shouldRefreshForInterception,
  type VoyagerProfileResponse,
} from './voyager-api';

describe('voyager-api', () => {
  describe('isVoyagerProfileUrl', () => {
    it('returns true for profile identity endpoint', () => {
      expect(isVoyagerProfileUrl('/voyager/api/identity/profiles/john-doe')).toBe(true);
    });

    it('returns true for dash profiles endpoint', () => {
      expect(isVoyagerProfileUrl('/voyager/api/identity/dash/profiles')).toBe(true);
    });

    it('returns true for graphql profile queries', () => {
      expect(isVoyagerProfileUrl('/voyager/api/graphql?includeWebMetadata=true')).toBe(true);
    });

    it('returns false for non-profile endpoints', () => {
      expect(isVoyagerProfileUrl('/voyager/api/messaging/conversations')).toBe(false);
      expect(isVoyagerProfileUrl('/voyager/api/feed/updates')).toBe(false);
      expect(isVoyagerProfileUrl('/api/something-else')).toBe(false);
    });

    it('returns false for non-voyager URLs', () => {
      expect(isVoyagerProfileUrl('https://linkedin.com/in/john-doe')).toBe(false);
      expect(isVoyagerProfileUrl('/in/john-doe')).toBe(false);
    });
  });

  describe('parseVoyagerProfile', () => {
    it('extracts name from profile response', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.name).toBe('John Doe');
    });

    it('extracts headline from profile response', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Senior Software Engineer at Google',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.headline).toBe('Senior Software Engineer at Google');
    });

    it('extracts about/summary from profile response', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
          summary: 'Passionate about building great products.',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.about).toBe('Passionate about building great products.');
    });

    it('extracts employers from positions', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
        },
        included: [
          {
            $type: 'com.linkedin.voyager.dash.identity.profile.Position',
            companyName: 'Google',
            companyLogoUrl: 'https://media.licdn.com/dms/image/google-logo.jpg',
            title: 'Senior Engineer',
          },
          {
            $type: 'com.linkedin.voyager.dash.identity.profile.Position',
            companyName: 'Meta',
            companyLogoUrl: 'https://media.licdn.com/dms/image/meta-logo.jpg',
            title: 'Software Engineer',
          },
        ],
      };

      const result = parseVoyagerProfile(response);

      expect(result.employers).toHaveLength(2);
      expect(result.employers![0]).toEqual({
        company: 'Google',
        logo: 'https://media.licdn.com/dms/image/google-logo.jpg',
      });
      expect(result.employers![1]).toEqual({
        company: 'Meta',
        logo: 'https://media.licdn.com/dms/image/meta-logo.jpg',
      });
    });

    it('extracts education from included entities', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
        },
        included: [
          {
            $type: 'com.linkedin.voyager.dash.identity.profile.Education',
            schoolName: 'Stanford University',
            degreeName: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
            dateRange: { start: { year: 2010 }, end: { year: 2014 } },
          },
        ],
      };

      const result = parseVoyagerProfile(response);

      expect(result.education).toHaveLength(1);
      expect(result.education![0]).toEqual({
        school: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        dates: '2010 - 2014',
      });
    });

    it('extracts location from profile response', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
          locationName: 'San Francisco Bay Area',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.location).toBe('San Francisco Bay Area');
    });

    it('extracts linkedin ID from public identifier', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
          publicIdentifier: 'jane-smith-123',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.linkedinId).toBe('jane-smith-123');
    });

    it('extracts avatar URL from profile picture', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          headline: 'Engineer',
          profilePicture: {
            displayImageReference: {
              vectorImage: {
                rootUrl: 'https://media.licdn.com/dms/image/',
                artifacts: [
                  { fileIdentifyingUrlPathSegment: '200_200/profile.jpg' },
                  { fileIdentifyingUrlPathSegment: '400_400/profile.jpg' },
                ],
              },
            },
          },
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.avatarUrl).toBe('https://media.licdn.com/dms/image/400_400/profile.jpg');
    });

    it('returns null for empty or invalid response', () => {
      expect(parseVoyagerProfile(null as unknown as VoyagerProfileResponse)).toBeNull();
      expect(parseVoyagerProfile({} as VoyagerProfileResponse)).toBeNull();
      expect(parseVoyagerProfile({ data: {} } as VoyagerProfileResponse)).toBeNull();
    });

    it('handles missing optional fields gracefully', () => {
      const response: VoyagerProfileResponse = {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          headline: 'Developer',
        },
      };

      const result = parseVoyagerProfile(response);

      expect(result.name).toBe('John Doe');
      expect(result.headline).toBe('Developer');
      expect(result.about).toBeUndefined();
      expect(result.employers).toEqual([]);
      expect(result.education).toEqual([]);
    });
  });

  describe('createInterceptorScript', () => {
    it('returns a string of JavaScript code', () => {
      const script = createInterceptorScript();

      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(100);
    });

    it('contains fetch patching code', () => {
      const script = createInterceptorScript();

      expect(script).toContain('window.fetch');
      expect(script).toContain('originalFetch');
    });

    it('contains XMLHttpRequest patching code', () => {
      const script = createInterceptorScript();

      expect(script).toContain('XMLHttpRequest');
      expect(script).toContain('originalOpen');
    });

    it('filters for voyager profile URLs', () => {
      const script = createInterceptorScript();

      expect(script).toContain('/voyager/api/');
      expect(script).toContain('identity');
    });

    it('posts messages with intercepted data', () => {
      const script = createInterceptorScript();

      expect(script).toContain('postMessage');
      expect(script).toContain('VOYAGER_PROFILE_DATA');
    });

    it('is valid JavaScript that can be evaluated', () => {
      const script = createInterceptorScript();

      // Should not throw when parsed
      expect(() => {
        new Function(script);
      }).not.toThrow();
    });
  });

  describe('interceptor integration', () => {
    let originalFetch: typeof globalThis.fetch;
    let originalXHR: typeof XMLHttpRequest;
    let postedMessages: Array<{ type: string; data: unknown }>;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      originalXHR = globalThis.XMLHttpRequest;
      postedMessages = [];

      // Mock postMessage
      vi.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
        if (typeof message === 'object' && message !== null) {
          postedMessages.push(message as { type: string; data: unknown });
        }
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      globalThis.XMLHttpRequest = originalXHR;
      vi.restoreAllMocks();
    });

    it('interceptor script patches fetch and intercepts voyager responses', async () => {
      // Create mock response
      const mockProfileData = {
        data: { firstName: 'Test', lastName: 'User', headline: 'Engineer' },
      };

      // Mock fetch to return profile data
      const mockFetch = vi.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve(mockProfileData),
        }),
        ok: true,
      });
      globalThis.fetch = mockFetch;

      // Execute the interceptor script
      const script = createInterceptorScript();
      eval(script);

      // Make a voyager API call
      await (globalThis.fetch as typeof fetch)(
        'https://www.linkedin.com/voyager/api/identity/profiles/test-user'
      );

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 10));

      // Should have posted the intercepted data
      expect(postedMessages.length).toBeGreaterThan(0);
      const voyagerMessage = postedMessages.find(
        (m) => m.type === 'VOYAGER_PROFILE_DATA'
      );
      expect(voyagerMessage).toBeDefined();
    });
  });

  describe('isLinkedInProfilePage', () => {
    it('returns true for /in/ profile URLs', () => {
      expect(isLinkedInProfilePage('https://www.linkedin.com/in/john-doe')).toBe(true);
      expect(isLinkedInProfilePage('https://linkedin.com/in/jane-smith/')).toBe(true);
      expect(isLinkedInProfilePage('https://www.linkedin.com/in/user-123/details/experience')).toBe(true);
    });

    it('returns false for non-profile LinkedIn URLs', () => {
      expect(isLinkedInProfilePage('https://www.linkedin.com/feed')).toBe(false);
      expect(isLinkedInProfilePage('https://www.linkedin.com/company/google')).toBe(false);
      expect(isLinkedInProfilePage('https://www.linkedin.com/jobs')).toBe(false);
      expect(isLinkedInProfilePage('https://www.linkedin.com/messaging')).toBe(false);
    });

    it('returns false for non-LinkedIn URLs', () => {
      expect(isLinkedInProfilePage('https://google.com/in/something')).toBe(false);
      expect(isLinkedInProfilePage('https://example.com')).toBe(false);
    });
  });

  describe('shouldRefreshForInterception', () => {
    it('returns true when on profile page with no intercepted data', () => {
      const result = shouldRefreshForInterception({
        isProfilePage: true,
        hasInterceptedData: false,
        hasRefreshedBefore: false,
      });

      expect(result).toBe(true);
    });

    it('returns false when we already have intercepted data', () => {
      const result = shouldRefreshForInterception({
        isProfilePage: true,
        hasInterceptedData: true,
        hasRefreshedBefore: false,
      });

      expect(result).toBe(false);
    });

    it('returns false when we have already refreshed once', () => {
      const result = shouldRefreshForInterception({
        isProfilePage: true,
        hasInterceptedData: false,
        hasRefreshedBefore: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when not on a profile page', () => {
      const result = shouldRefreshForInterception({
        isProfilePage: false,
        hasInterceptedData: false,
        hasRefreshedBefore: false,
      });

      expect(result).toBe(false);
    });
  });
});
