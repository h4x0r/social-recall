/**
 * Tests for skill management (confirm/reject/add)
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContactSkills,
  confirmSkill,
  rejectSkill,
  addManualSkill,
  getContactSkills,
  saveSkillsToStorage,
  loadSkillsFromStorage,
  clearSkillsCache,
  SkillStatus,
} from './skill-management';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('skill-management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearSkillsCache();
  });

  describe('getContactSkills', () => {
    it('returns empty skills for new contact', () => {
      const skills = getContactSkills('contact-123');

      expect(skills.contactId).toBe('contact-123');
      expect(skills.confirmed).toEqual([]);
      expect(skills.rejected).toEqual([]);
      expect(skills.pending).toEqual([]);
      expect(skills.manual).toEqual([]);
    });

    it('initializes with inferred skills as pending', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
        { name: 'AWS', category: 'Enterprise Tech', confidence: 0.8 },
      ];

      const skills = getContactSkills('contact-123', inferredSkills);

      expect(skills.pending).toHaveLength(2);
      expect(skills.pending[0].name).toBe('Python');
      expect(skills.pending[0].status).toBe('pending');
    });
  });

  describe('confirmSkill', () => {
    it('moves skill from pending to confirmed', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);

      const result = confirmSkill('contact-123', 'Python');

      expect(result.confirmed).toHaveLength(1);
      expect(result.confirmed[0].name).toBe('Python');
      expect(result.confirmed[0].status).toBe('confirmed');
      expect(result.pending).toHaveLength(0);
    });

    it('throws error for non-existent skill', () => {
      getContactSkills('contact-123');

      expect(() => confirmSkill('contact-123', 'NonExistent')).toThrow(
        'Skill not found'
      );
    });

    it('handles already confirmed skill gracefully', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);
      confirmSkill('contact-123', 'Python');

      // Confirming again should not throw
      const result = confirmSkill('contact-123', 'Python');
      expect(result.confirmed).toHaveLength(1);
    });
  });

  describe('rejectSkill', () => {
    it('moves skill from pending to rejected', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);

      const result = rejectSkill('contact-123', 'Python');

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].name).toBe('Python');
      expect(result.rejected[0].status).toBe('rejected');
      expect(result.pending).toHaveLength(0);
    });

    it('can reject a previously confirmed skill', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);
      confirmSkill('contact-123', 'Python');

      const result = rejectSkill('contact-123', 'Python');

      expect(result.rejected).toHaveLength(1);
      expect(result.confirmed).toHaveLength(0);
    });
  });

  describe('addManualSkill', () => {
    it('adds a manually specified skill', () => {
      getContactSkills('contact-123');

      const result = addManualSkill('contact-123', {
        name: 'Kubernetes',
        category: 'Enterprise Tech',
      });

      expect(result.manual).toHaveLength(1);
      expect(result.manual[0].name).toBe('Kubernetes');
      expect(result.manual[0].status).toBe('manual');
      expect(result.manual[0].confidence).toBe(1.0);
    });

    it('prevents duplicate manual skills', () => {
      getContactSkills('contact-123');
      addManualSkill('contact-123', { name: 'Kubernetes', category: 'Enterprise Tech' });

      expect(() =>
        addManualSkill('contact-123', { name: 'Kubernetes', category: 'Enterprise Tech' })
      ).toThrow('Skill already exists');
    });

    it('prevents adding skill that already exists in other categories', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);

      expect(() =>
        addManualSkill('contact-123', { name: 'Python', category: 'Engineering' })
      ).toThrow('Skill already exists');
    });
  });

  describe('getAllSkills helper', () => {
    it('returns all confirmed and manual skills combined', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
        { name: 'AWS', category: 'Enterprise Tech', confidence: 0.8 },
      ];
      getContactSkills('contact-123', inferredSkills);
      confirmSkill('contact-123', 'Python');
      addManualSkill('contact-123', { name: 'Docker', category: 'Enterprise Tech' });

      const skills = getContactSkills('contact-123');
      const allActive = [...skills.confirmed, ...skills.manual];

      expect(allActive).toHaveLength(2);
      expect(allActive.map((s) => s.name)).toContain('Python');
      expect(allActive.map((s) => s.name)).toContain('Docker');
    });
  });

  describe('persistence', () => {
    it('saves skills to localStorage', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);
      confirmSkill('contact-123', 'Python');

      saveSkillsToStorage();

      const stored = localStorageMock.getItem('social-recall:contact-skills');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed['contact-123']).toBeDefined();
      expect(parsed['contact-123'].confirmed).toHaveLength(1);
    });

    it('loads skills from localStorage', () => {
      const data = {
        'contact-123': {
          contactId: 'contact-123',
          confirmed: [
            { name: 'Python', category: 'Engineering', confidence: 0.9, status: 'confirmed' },
          ],
          rejected: [],
          pending: [],
          manual: [],
        },
      };
      localStorageMock.setItem('social-recall:contact-skills', JSON.stringify(data));

      loadSkillsFromStorage();

      const skills = getContactSkills('contact-123');
      expect(skills.confirmed).toHaveLength(1);
      expect(skills.confirmed[0].name).toBe('Python');
    });

    it('auto-saves after modifications', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
      ];
      getContactSkills('contact-123', inferredSkills);
      confirmSkill('contact-123', 'Python');

      // Clear cache and reload
      clearSkillsCache();
      loadSkillsFromStorage();

      const skills = getContactSkills('contact-123');
      expect(skills.confirmed).toHaveLength(1);
    });
  });

  describe('bulk operations', () => {
    it('confirms all pending skills', () => {
      const inferredSkills = [
        { name: 'Python', category: 'Engineering', confidence: 0.9 },
        { name: 'AWS', category: 'Enterprise Tech', confidence: 0.8 },
        { name: 'Docker', category: 'Enterprise Tech', confidence: 0.7 },
      ];
      getContactSkills('contact-123', inferredSkills);

      // Confirm all one by one
      confirmSkill('contact-123', 'Python');
      confirmSkill('contact-123', 'AWS');
      confirmSkill('contact-123', 'Docker');

      const skills = getContactSkills('contact-123');
      expect(skills.confirmed).toHaveLength(3);
      expect(skills.pending).toHaveLength(0);
    });
  });
});
