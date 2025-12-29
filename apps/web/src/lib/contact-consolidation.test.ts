/**
 * Tests for contact consolidation logic
 * Handles matching, pending matches, and merge operations
 */

import { describe, it, expect } from 'vitest';
import {
  findMatches,
  categorizeMatches,
  mergeContacts,
  selectFieldValue,
  type LinkedInContact,
  type GoogleContact,
  type PendingMatch,
  type MergedContact,
  type FieldSelection,
} from './contact-consolidation';

describe('contact-consolidation', () => {
  const linkedinContacts: LinkedInContact[] = [
    {
      id: 'li-1',
      linkedinId: 'johndoe',
      name: 'John Doe',
      headline: 'Engineer at Acme Corp',
      location: 'San Francisco',
      employers: [{ company: 'Acme Corp', title: 'Engineer' }],
    },
    {
      id: 'li-2',
      linkedinId: 'janesmith',
      name: 'Jane Smith',
      headline: 'Product Manager at StartupX',
      location: 'New York',
      employers: [{ company: 'StartupX', title: 'Product Manager' }],
    },
    {
      id: 'li-3',
      linkedinId: 'bobwilson',
      name: 'Bob Wilson',
      headline: 'Designer',
      location: 'London',
      employers: [],
    },
  ];

  const googleContacts: GoogleContact[] = [
    {
      resourceName: 'people/1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      organization: 'Acme Corp',
    },
    {
      resourceName: 'people/2',
      name: 'Jane S.',
      email: 'jane@company.com',
      linkedinUrl: null,
      organization: 'StartupX',
    },
    {
      resourceName: 'people/3',
      name: 'Robert Wilson',
      email: 'bob@email.com',
      linkedinUrl: null,
      organization: null,
    },
    {
      resourceName: 'people/4',
      name: 'Unknown Person',
      email: 'unknown@test.com',
      linkedinUrl: null,
      organization: null,
    },
  ];

  describe('findMatches', () => {
    it('finds all potential matches between LinkedIn and Google contacts', () => {
      const matches = findMatches(linkedinContacts, googleContacts);

      expect(matches.length).toBeGreaterThan(0);
    });

    it('returns match results with scores and signals', () => {
      const matches = findMatches(linkedinContacts, googleContacts);

      for (const match of matches) {
        expect(match).toHaveProperty('linkedInContact');
        expect(match).toHaveProperty('googleContact');
        expect(match).toHaveProperty('score');
        expect(match).toHaveProperty('confidence');
        expect(match).toHaveProperty('signals');
      }
    });

    it('finds exact LinkedIn URL match with score 100', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const johnMatch = matches.find(
        m => m.linkedInContact.linkedinId === 'johndoe' &&
             m.googleContact.resourceName === 'people/1'
      );

      expect(johnMatch).toBeDefined();
      expect(johnMatch!.score).toBe(100);
      expect(johnMatch!.signals.linkedinUrl).toBe(true);
    });

    it('finds fuzzy name match with employer', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const janeMatch = matches.find(
        m => m.linkedInContact.linkedinId === 'janesmith' &&
             m.googleContact.resourceName === 'people/2'
      );

      expect(janeMatch).toBeDefined();
      expect(janeMatch!.signals.employerMatch).toBe(true);
    });

    it('finds nickname match (Bob/Robert)', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const bobMatch = matches.find(
        m => m.linkedInContact.linkedinId === 'bobwilson' &&
             m.googleContact.resourceName === 'people/3'
      );

      expect(bobMatch).toBeDefined();
      expect(bobMatch!.signals.nameScore).toBeGreaterThan(0);
    });
  });

  describe('categorizeMatches', () => {
    it('categorizes auto-merge matches (LinkedIn URL match)', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const { autoMerge, pendingReview, noMatch } = categorizeMatches(matches);

      expect(autoMerge.length).toBeGreaterThan(0);
      expect(autoMerge[0].signals.linkedinUrl).toBe(true);
    });

    it('categorizes pending review matches (score 50-79)', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const { pendingReview } = categorizeMatches(matches);

      for (const match of pendingReview) {
        expect(match.score).toBeGreaterThanOrEqual(50);
        expect(match.score).toBeLessThan(80);
      }
    });

    it('excludes low score matches from suggestions', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const { noMatch } = categorizeMatches(matches);

      for (const match of noMatch) {
        expect(match.score).toBeLessThan(50);
      }
    });

    it('returns grouped results by LinkedIn contact', () => {
      const matches = findMatches(linkedinContacts, googleContacts);
      const { autoMerge, pendingReview } = categorizeMatches(matches);

      // Each LinkedIn contact should appear at most once in autoMerge
      const autoMergeLinkedinIds = autoMerge.map(m => m.linkedInContact.id);
      expect(new Set(autoMergeLinkedinIds).size).toBe(autoMergeLinkedinIds.length);
    });
  });

  describe('selectFieldValue', () => {
    it('returns linkedin value when selected', () => {
      const selection: FieldSelection = {
        field: 'name',
        source: 'linkedin',
        linkedinValue: 'John Doe',
        googleValue: 'J. Doe',
      };

      expect(selectFieldValue(selection)).toBe('John Doe');
    });

    it('returns google value when selected', () => {
      const selection: FieldSelection = {
        field: 'email',
        source: 'google',
        linkedinValue: null,
        googleValue: 'john@example.com',
      };

      expect(selectFieldValue(selection)).toBe('john@example.com');
    });

    it('returns custom value when provided', () => {
      const selection: FieldSelection = {
        field: 'name',
        source: 'custom',
        linkedinValue: 'John Doe',
        googleValue: 'J. Doe',
        customValue: 'Jonathan Doe',
      };

      expect(selectFieldValue(selection)).toBe('Jonathan Doe');
    });

    it('auto-selects google when linkedin is empty', () => {
      const selection: FieldSelection = {
        field: 'email',
        source: 'auto',
        linkedinValue: null,
        googleValue: 'john@example.com',
      };

      expect(selectFieldValue(selection)).toBe('john@example.com');
    });

    it('auto-selects linkedin when google is empty', () => {
      const selection: FieldSelection = {
        field: 'headline',
        source: 'auto',
        linkedinValue: 'Senior Engineer',
        googleValue: null,
      };

      expect(selectFieldValue(selection)).toBe('Senior Engineer');
    });

    it('prefers linkedin when both have values (auto mode)', () => {
      const selection: FieldSelection = {
        field: 'name',
        source: 'auto',
        linkedinValue: 'John Doe',
        googleValue: 'J. Doe',
      };

      expect(selectFieldValue(selection)).toBe('John Doe');
    });
  });

  describe('mergeContacts', () => {
    it('creates merged contact with fields from both sources', () => {
      const linkedin: LinkedInContact = {
        id: 'li-1',
        linkedinId: 'johndoe',
        name: 'John Doe',
        headline: 'Engineer at Acme',
        location: 'San Francisco',
        employers: [{ company: 'Acme', title: 'Engineer' }],
      };

      const google: GoogleContact = {
        resourceName: 'people/1',
        name: 'John D.',
        email: 'john@example.com',
        phone: '+1-555-1234',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        organization: 'Acme Corp',
      };

      const fieldSelections: FieldSelection[] = [
        { field: 'name', source: 'linkedin', linkedinValue: linkedin.name, googleValue: google.name },
        { field: 'email', source: 'google', linkedinValue: null, googleValue: google.email },
        { field: 'phone', source: 'google', linkedinValue: null, googleValue: google.phone },
        { field: 'headline', source: 'linkedin', linkedinValue: linkedin.headline, googleValue: null },
      ];

      const merged = mergeContacts(linkedin, google, fieldSelections);

      expect(merged.name).toBe('John Doe');
      expect(merged.email).toBe('john@example.com');
      expect(merged.phone).toBe('+1-555-1234');
      expect(merged.headline).toBe('Engineer at Acme');
      expect(merged.linkedinId).toBe('johndoe');
      expect(merged.googleId).toBe('people/1');
    });

    it('preserves source tracking', () => {
      const linkedin: LinkedInContact = {
        id: 'li-1',
        linkedinId: 'johndoe',
        name: 'John Doe',
        employers: [],
      };

      const google: GoogleContact = {
        resourceName: 'people/1',
        name: 'John Doe',
        email: 'john@example.com',
        linkedinUrl: null,
        organization: null,
      };

      const merged = mergeContacts(linkedin, google, []);

      expect(merged.sources).toContainEqual({ type: 'linkedin', sourceId: 'johndoe' });
      expect(merged.sources).toContainEqual({ type: 'google', sourceId: 'people/1' });
    });

    it('handles custom field values', () => {
      const linkedin: LinkedInContact = {
        id: 'li-1',
        linkedinId: 'johndoe',
        name: 'John Doe',
        employers: [],
      };

      const google: GoogleContact = {
        resourceName: 'people/1',
        name: 'J. Doe',
        email: undefined,
        linkedinUrl: null,
        organization: null,
      };

      const fieldSelections: FieldSelection[] = [
        {
          field: 'name',
          source: 'custom',
          linkedinValue: linkedin.name,
          googleValue: google.name,
          customValue: 'Jonathan Doe',
        },
      ];

      const merged = mergeContacts(linkedin, google, fieldSelections);

      expect(merged.name).toBe('Jonathan Doe');
    });
  });
});
