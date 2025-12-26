/**
 * Tests for contact matching algorithm
 * Fuzzy matching between LinkedIn and Google contacts
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  normalizeNameForMatching,
  calculateNameScore,
  tokensMatch,
  NICKNAME_MAP,
  type LinkedInContact,
  type GoogleContact,
  type MatchResult,
} from './contact-matcher';

describe('contact-matcher', () => {
  describe('normalizeNameForMatching', () => {
    it('converts to lowercase', () => {
      expect(normalizeNameForMatching('John Smith')).toBe('john smith');
    });

    it('removes accents', () => {
      expect(normalizeNameForMatching('José García')).toBe('jose garcia');
    });

    it('trims whitespace', () => {
      expect(normalizeNameForMatching('  John Smith  ')).toBe('john smith');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeNameForMatching('John   Smith')).toBe('john smith');
    });

    it('handles empty string', () => {
      expect(normalizeNameForMatching('')).toBe('');
    });
  });

  describe('tokensMatch', () => {
    it('matches identical names', () => {
      expect(tokensMatch('john smith', 'john smith')).toBe(true);
    });

    it('matches flipped names', () => {
      expect(tokensMatch('john smith', 'smith john')).toBe(true);
    });

    it('matches with missing middle name', () => {
      expect(tokensMatch('john david smith', 'john smith')).toBe(true);
    });

    it('does not match completely different names', () => {
      expect(tokensMatch('john smith', 'jane doe')).toBe(false);
    });

    it('matches when one name is subset of other', () => {
      expect(tokensMatch('sarah chen', 'sarah j chen')).toBe(true);
    });
  });

  describe('calculateNameScore', () => {
    it('returns 35 for exact match', () => {
      expect(calculateNameScore('John Smith', 'John Smith')).toBe(35);
    });

    it('returns 35 for flipped name match', () => {
      expect(calculateNameScore('John Smith', 'Smith, John')).toBe(35);
    });

    it('returns high score for missing middle name', () => {
      const score = calculateNameScore('John David Smith', 'John Smith');
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('returns 0 for completely different names', () => {
      expect(calculateNameScore('John Smith', 'Jane Doe')).toBe(0);
    });

    it('handles nickname matching (Bob/Robert)', () => {
      const score = calculateNameScore('Bob Smith', 'Robert Smith');
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('handles nickname matching (Bill/William)', () => {
      const score = calculateNameScore('Bill Johnson', 'William Johnson');
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('handles case insensitivity', () => {
      expect(calculateNameScore('JOHN SMITH', 'john smith')).toBe(35);
    });
  });

  describe('NICKNAME_MAP', () => {
    it('maps Bob to Robert', () => {
      expect(NICKNAME_MAP['bob']).toBe('robert');
    });

    it('maps Bill to William', () => {
      expect(NICKNAME_MAP['bill']).toBe('william');
    });

    it('maps Mike to Michael', () => {
      expect(NICKNAME_MAP['mike']).toBe('michael');
    });
  });

  describe('calculateMatchScore', () => {
    const baseLinkedInContact: LinkedInContact = {
      id: 'li-1',
      linkedinId: 'johndoe',
      name: 'John Doe',
      headline: 'Engineer at Acme Corp',
      location: 'San Francisco',
      employers: [{ company: 'Acme Corp', title: 'Engineer' }],
    };

    const baseGoogleContact: GoogleContact = {
      resourceName: 'people/123',
      name: 'John Doe',
      email: 'john@example.com',
      linkedinUrl: null,
      organization: null,
    };

    it('returns 100 for exact LinkedIn URL match', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.score).toBe(100);
      expect(result.signals.linkedinUrl).toBe(true);
    });

    it('returns 50 points for LinkedIn URL match plus other signals', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        linkedinUrl: 'https://www.linkedin.com/in/johndoe/',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.signals.linkedinUrl).toBe(true);
    });

    it('extracts LinkedIn ID from various URL formats', () => {
      const urlFormats = [
        'https://linkedin.com/in/johndoe',
        'https://www.linkedin.com/in/johndoe',
        'https://www.linkedin.com/in/johndoe/',
        'http://linkedin.com/in/johndoe',
        'linkedin.com/in/johndoe',
      ];

      for (const url of urlFormats) {
        const google: GoogleContact = { ...baseGoogleContact, linkedinUrl: url };
        const result = calculateMatchScore(baseLinkedInContact, google);
        expect(result.signals.linkedinUrl).toBe(true);
      }
    });

    it('returns name score when names match', () => {
      const result = calculateMatchScore(baseLinkedInContact, baseGoogleContact);
      expect(result.signals.nameScore).toBe(35);
    });

    it('adds employer match points when companies match', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        organization: 'Acme Corp',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.signals.employerMatch).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60); // 35 name + 25 employer
    });

    it('adds location match points for same region', () => {
      const linkedin: LinkedInContact = {
        ...baseLinkedInContact,
        location: 'San Francisco, California',
      };
      const google: GoogleContact = {
        ...baseGoogleContact,
        location: 'Palo Alto, CA',
      };

      const result = calculateMatchScore(linkedin, google);
      expect(result.signals.locationMatch).toBe(true);
    });

    it('returns low score for different names and no other signals', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        name: 'Jane Smith',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.score).toBeLessThan(50);
    });

    it('categorizes high confidence matches (≥80)', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        organization: 'Acme Corp',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.confidence).toBe('high');
    });

    it('categorizes medium confidence matches (50-79)', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        organization: 'Acme Corp',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.confidence).toBe('medium');
    });

    it('categorizes low confidence matches (<50)', () => {
      const google: GoogleContact = {
        ...baseGoogleContact,
        name: 'Jane Smith',
      };

      const result = calculateMatchScore(baseLinkedInContact, google);
      expect(result.confidence).toBe('low');
    });
  });
});
