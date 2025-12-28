/**
 * Tests for profile merge utility functions
 * These functions handle archetype validation and fallback intelligence inference
 */

import { describe, it, expect } from 'vitest';
import { Archetype } from './panel';
import {
  VALID_ARCHETYPES,
  isValidArchetype,
  inferArchetype,
  inferCouldBe,
  inferGoodFor,
} from './profile-merge';

describe('profile-merge', () => {
  describe('exports', () => {
    it('exports VALID_ARCHETYPES set', () => {
      expect(VALID_ARCHETYPES).toBeDefined();
      expect(VALID_ARCHETYPES instanceof Set).toBe(true);
    });

    it('exports isValidArchetype function', () => {
      expect(typeof isValidArchetype).toBe('function');
    });

    it('exports inferArchetype function', () => {
      expect(typeof inferArchetype).toBe('function');
    });

    it('exports inferCouldBe function', () => {
      expect(typeof inferCouldBe).toBe('function');
    });

    it('exports inferGoodFor function', () => {
      expect(typeof inferGoodFor).toBe('function');
    });
  });

  describe('VALID_ARCHETYPES', () => {
    it('contains all 11 core archetypes plus unknown', () => {
      expect(VALID_ARCHETYPES.has(Archetype.Builder)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Advisor)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Creator)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Executive)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Connector)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Operator)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Seller)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Researcher)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Integrator)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Evangelist)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Investor)).toBe(true);
      expect(VALID_ARCHETYPES.has(Archetype.Unknown)).toBe(true);
    });

    it('has exactly 12 archetypes', () => {
      expect(VALID_ARCHETYPES.size).toBe(12);
    });
  });

  describe('isValidArchetype', () => {
    it('returns true for valid archetypes', () => {
      expect(isValidArchetype(Archetype.Builder)).toBe(true);
      expect(isValidArchetype(Archetype.Advisor)).toBe(true);
      expect(isValidArchetype(Archetype.Unknown)).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(isValidArchetype(undefined)).toBe(false);
    });

    it('returns false for invalid string archetypes', () => {
      // Type coercion test - in real code this would be caught by TypeScript
      expect(isValidArchetype('invalid' as unknown as Archetype)).toBe(false);
    });
  });

  describe('inferArchetype', () => {
    it('returns Unknown as fallback', () => {
      expect(inferArchetype({})).toBe(Archetype.Unknown);
    });

    it('returns Unknown regardless of profile data', () => {
      const profile = {
        name: 'John Doe',
        headline: 'Software Engineer',
        about: 'Building great products',
      };
      expect(inferArchetype(profile)).toBe(Archetype.Unknown);
    });
  });

  describe('inferCouldBe', () => {
    it('returns empty array as fallback', () => {
      expect(inferCouldBe({})).toEqual([]);
    });

    it('returns empty array regardless of profile data', () => {
      const profile = {
        name: 'John Doe',
        headline: 'CEO',
      };
      expect(inferCouldBe(profile)).toEqual([]);
    });
  });

  describe('inferGoodFor', () => {
    it('returns empty array as fallback', () => {
      expect(inferGoodFor({})).toEqual([]);
    });

    it('returns empty array regardless of profile data', () => {
      const profile = {
        name: 'John Doe',
        about: 'Expert in fintech',
      };
      expect(inferGoodFor(profile)).toEqual([]);
    });
  });
});
