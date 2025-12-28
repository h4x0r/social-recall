/**
 * Tests for SSR (Server-Side Rendered) extraction functions
 * These functions extract profile data from LinkedIn's embedded JSON data
 */

import { describe, it, expect } from 'vitest';
import {
  waitForSSRCodeTags,
  getEmbeddedProfileData,
  findAllProfilesInData,
  findProfileInData,
  extractAvatarUrlFromSSR,
  extractEmployersFromSSR,
  extractEducationFromSSR,
} from './ssr-extractors';

describe('ssr-extractors', () => {
  describe('exports', () => {
    it('exports waitForSSRCodeTags function', () => {
      expect(typeof waitForSSRCodeTags).toBe('function');
    });

    it('exports getEmbeddedProfileData function', () => {
      expect(typeof getEmbeddedProfileData).toBe('function');
    });

    it('exports findAllProfilesInData function', () => {
      expect(typeof findAllProfilesInData).toBe('function');
    });

    it('exports findProfileInData function', () => {
      expect(typeof findProfileInData).toBe('function');
    });

    it('exports extractAvatarUrlFromSSR function', () => {
      expect(typeof extractAvatarUrlFromSSR).toBe('function');
    });

    it('exports extractEmployersFromSSR function', () => {
      expect(typeof extractEmployersFromSSR).toBe('function');
    });

    it('exports extractEducationFromSSR function', () => {
      expect(typeof extractEducationFromSSR).toBe('function');
    });
  });

  describe('extractAvatarUrlFromSSR', () => {
    it('returns string profilePicture directly', () => {
      const obj = { profilePicture: 'https://example.com/photo.jpg' };
      expect(extractAvatarUrlFromSSR(obj)).toBe('https://example.com/photo.jpg');
    });

    it('returns string photoUrl directly', () => {
      const obj = { photoUrl: 'https://example.com/photo.jpg' };
      expect(extractAvatarUrlFromSSR(obj)).toBe('https://example.com/photo.jpg');
    });

    it('extracts from vectorImage structure', () => {
      const obj = {
        profilePicture: {
          displayImageReference: {
            vectorImage: {
              rootUrl: 'https://media.licdn.com/',
              artifacts: [
                { fileIdentifyingUrlPathSegment: 'small.jpg' },
                { fileIdentifyingUrlPathSegment: 'large.jpg' },
              ],
            },
          },
        },
      };
      expect(extractAvatarUrlFromSSR(obj)).toBe('https://media.licdn.com/large.jpg');
    });

    it('returns undefined when no avatar data', () => {
      expect(extractAvatarUrlFromSSR({})).toBeUndefined();
    });
  });

  describe('extractEmployersFromSSR', () => {
    it('extracts from positions array on profile', () => {
      const profile = {
        positions: [
          { companyName: 'Acme Corp', companyLogoUrl: 'https://logo.com/acme.jpg' },
          { companyName: 'Tech Inc' },
        ],
      };
      const employers = extractEmployersFromSSR(profile, {});
      expect(employers).toHaveLength(2);
      expect(employers[0].company).toBe('Acme Corp');
      expect(employers[0].logo).toBe('https://logo.com/acme.jpg');
      expect(employers[1].company).toBe('Tech Inc');
    });

    it('extracts from included array with Position type', () => {
      const profile = {};
      const rootData = {
        included: [
          { $type: 'com.linkedin.voyager.dash.identity.profile.Position', companyName: 'Big Corp' },
          { $type: 'com.linkedin.voyager.identity.Position', companyName: 'Small Co' },
        ],
      };
      const employers = extractEmployersFromSSR(profile, rootData);
      expect(employers).toHaveLength(2);
      expect(employers.map(e => e.company)).toContain('Big Corp');
      expect(employers.map(e => e.company)).toContain('Small Co');
    });

    it('deduplicates by company name', () => {
      const profile = {
        positions: [
          { companyName: 'Acme Corp' },
          { companyName: 'acme corp' }, // Same company, different case
        ],
      };
      const employers = extractEmployersFromSSR(profile, {});
      expect(employers).toHaveLength(1);
    });

    it('returns empty array when no positions', () => {
      expect(extractEmployersFromSSR({}, {})).toHaveLength(0);
    });
  });

  describe('extractEducationFromSSR', () => {
    it('extracts from education array on profile', () => {
      const profile = {
        education: [
          { schoolName: 'MIT', degreeName: 'BS', fieldOfStudy: 'CS' },
          { schoolName: 'Stanford' },
        ],
      };
      const education = extractEducationFromSSR(profile, {});
      expect(education).toHaveLength(2);
      expect(education[0].school).toBe('MIT');
      expect(education[0].degree).toBe('BS');
      expect(education[0].field).toBe('CS');
      expect(education[1].school).toBe('Stanford');
    });

    it('extracts from included array with Education type', () => {
      const profile = {};
      const rootData = {
        included: [
          { $type: 'com.linkedin.voyager.dash.identity.profile.Education', schoolName: 'Harvard' },
        ],
      };
      const education = extractEducationFromSSR(profile, rootData);
      expect(education).toHaveLength(1);
      expect(education[0].school).toBe('Harvard');
    });

    it('deduplicates by school name', () => {
      const profile = {
        education: [
          { schoolName: 'MIT' },
          { schoolName: 'mit' }, // Same school, different case
        ],
      };
      const education = extractEducationFromSSR(profile, {});
      expect(education).toHaveLength(1);
    });

    it('returns empty array when no education', () => {
      expect(extractEducationFromSSR({}, {})).toHaveLength(0);
    });
  });

  describe('findAllProfilesInData', () => {
    it('finds profile with firstName and lastName', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Engineer',
      };
      const profiles = findAllProfilesInData(data);
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('John Doe');
      expect(profiles[0].headline).toBe('Engineer');
    });

    it('finds profiles in included array', () => {
      const data = {
        included: [
          { firstName: 'Alice', lastName: 'Smith' },
          { firstName: 'Bob', lastName: 'Jones' },
        ],
      };
      const profiles = findAllProfilesInData(data);
      expect(profiles).toHaveLength(2);
    });

    it('extracts linkedinId from publicIdentifier', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        publicIdentifier: 'johndoe123',
      };
      const profiles = findAllProfilesInData(data);
      expect(profiles[0].linkedinId).toBe('johndoe123');
    });

    it('extracts linkedinId from entityUrn', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        entityUrn: 'urn:li:fsd_profile:ACoAABtest123',
      };
      const profiles = findAllProfilesInData(data);
      expect(profiles[0].linkedinId).toBe('ACoAABtest123');
    });

    it('respects max depth to prevent infinite recursion', () => {
      // Create deeply nested structure
      let data: Record<string, unknown> = { firstName: 'Deep', lastName: 'User' };
      for (let i = 0; i < 15; i++) {
        data = { nested: data };
      }
      // Should not throw, just return empty array due to depth limit
      const profiles = findAllProfilesInData(data);
      expect(profiles).toHaveLength(0);
    });
  });

  describe('findProfileInData', () => {
    it('finds first profile with firstName and lastName', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Engineer',
      };
      const profile = findProfileInData(data);
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('John Doe');
    });

    it('returns null when no profile found', () => {
      const data = { notAProfile: true };
      expect(findProfileInData(data)).toBeNull();
    });

    it('finds profile nested in data property', () => {
      const data = {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };
      const profile = findProfileInData(data);
      expect(profile?.name).toBe('Jane Smith');
    });
  });
});
