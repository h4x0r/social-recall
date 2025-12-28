/**
 * Tests for DOM extraction functions
 * These functions extract profile data from LinkedIn's DOM
 */

import { describe, it, expect } from 'vitest';
import {
  extractName,
  extractHeadline,
  extractLocation,
  extractAvatarUrl,
  extractAbout,
  extractEmployers,
  extractEducation,
  extractSkills,
  extractCertifications,
  extractVolunteering,
  extractActivities,
  extractRecommendations,
  extractPublications,
  extractOrganizations,
  extractInterests,
  extractHonorsAwards,
  extractCourses,
  extractLanguages,
  extractTestScores,
  extractServices,
  findSectionByHeader,
  stripNotificationBadge,
} from './dom-extractors';

describe('dom-extractors', () => {
  describe('exports', () => {
    it('exports extractName function', () => {
      expect(typeof extractName).toBe('function');
    });

    it('exports extractHeadline function', () => {
      expect(typeof extractHeadline).toBe('function');
    });

    it('exports extractLocation function', () => {
      expect(typeof extractLocation).toBe('function');
    });

    it('exports extractAvatarUrl function', () => {
      expect(typeof extractAvatarUrl).toBe('function');
    });

    it('exports extractAbout function', () => {
      expect(typeof extractAbout).toBe('function');
    });

    it('exports extractEmployers function', () => {
      expect(typeof extractEmployers).toBe('function');
    });

    it('exports extractEducation function', () => {
      expect(typeof extractEducation).toBe('function');
    });

    it('exports extractSkills function', () => {
      expect(typeof extractSkills).toBe('function');
    });

    it('exports extractCertifications function', () => {
      expect(typeof extractCertifications).toBe('function');
    });

    it('exports extractVolunteering function', () => {
      expect(typeof extractVolunteering).toBe('function');
    });

    it('exports extractActivities function', () => {
      expect(typeof extractActivities).toBe('function');
    });

    it('exports extractRecommendations function', () => {
      expect(typeof extractRecommendations).toBe('function');
    });

    it('exports extractPublications function', () => {
      expect(typeof extractPublications).toBe('function');
    });

    it('exports extractOrganizations function', () => {
      expect(typeof extractOrganizations).toBe('function');
    });

    it('exports extractInterests function', () => {
      expect(typeof extractInterests).toBe('function');
    });

    it('exports extractHonorsAwards function', () => {
      expect(typeof extractHonorsAwards).toBe('function');
    });

    it('exports extractCourses function', () => {
      expect(typeof extractCourses).toBe('function');
    });

    it('exports extractLanguages function', () => {
      expect(typeof extractLanguages).toBe('function');
    });

    it('exports extractTestScores function', () => {
      expect(typeof extractTestScores).toBe('function');
    });

    it('exports extractServices function', () => {
      expect(typeof extractServices).toBe('function');
    });

    it('exports findSectionByHeader function', () => {
      expect(typeof findSectionByHeader).toBe('function');
    });

    it('exports stripNotificationBadge function', () => {
      expect(typeof stripNotificationBadge).toBe('function');
    });
  });

  describe('stripNotificationBadge', () => {
    it('removes notification badge prefix from name', () => {
      expect(stripNotificationBadge('(5) John Doe')).toBe('John Doe');
      expect(stripNotificationBadge('(123) Jane Smith')).toBe('Jane Smith');
      expect(stripNotificationBadge('(99+) Test User')).toBe('Test User');
    });

    it('preserves name without badge', () => {
      expect(stripNotificationBadge('John Doe')).toBe('John Doe');
    });

    it('handles empty string', () => {
      expect(stripNotificationBadge('')).toBe('');
    });
  });
});
