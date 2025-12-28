/**
 * Tests for centralized configuration module
 */

import { describe, it, expect } from 'vitest';
import { config } from './config';

describe('config', () => {
  describe('ai', () => {
    it('has skillsVersion as a number', () => {
      expect(typeof config.ai.skillsVersion).toBe('number');
      expect(config.ai.skillsVersion).toBeGreaterThan(0);
    });

    it('has valid apiUrl', () => {
      expect(config.ai.apiUrl).toMatch(/^https?:\/\//);
    });

    it('has warmupTimeout as a positive number', () => {
      expect(config.ai.warmupTimeout).toBeGreaterThan(0);
    });
  });

  describe('extraction', () => {
    it('has ssrTimeout for SSR code tag waiting', () => {
      expect(config.extraction.ssrTimeout).toBeGreaterThanOrEqual(3000);
    });

    it('has lazyLoadWait for LinkedIn section loading', () => {
      expect(config.extraction.lazyLoadWait).toBe(3000); // Our tested optimal value
    });

    it('has profileLoadTimeout for overall profile loading', () => {
      expect(config.extraction.profileLoadTimeout).toBeGreaterThan(config.extraction.lazyLoadWait);
    });
  });

  describe('storage', () => {
    it('has positionKey for panel position storage', () => {
      expect(config.storage.positionKey).toBeTruthy();
    });

    it('has profilesKey for profile data storage', () => {
      expect(config.storage.profilesKey).toBeTruthy();
    });
  });

  describe('debug', () => {
    it('has disableApiWrites flag', () => {
      expect(typeof config.debug.disableApiWrites).toBe('boolean');
    });

    it('has verboseLogging flag', () => {
      expect(typeof config.debug.verboseLogging).toBe('boolean');
    });
  });

  describe('immutability', () => {
    it('config object is frozen (cannot be modified)', () => {
      expect(Object.isFrozen(config)).toBe(true);
    });
  });
});
