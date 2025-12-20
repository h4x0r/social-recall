/**
 * Tests for relationship context functionality
 * TDD: RED phase
 */

import { describe, it, expect } from 'vitest';
import {
  Relationship,
  RelationshipInput,
  formatRelationshipLabel,
  getRelationshipIcon,
  RELATIONSHIP_TYPES,
} from './relationship';

describe('Relationship types', () => {
  it('has all expected relationship types', () => {
    expect(RELATIONSHIP_TYPES).toContain('intro');
    expect(RELATIONSHIP_TYPES).toContain('conference');
    expect(RELATIONSHIP_TYPES).toContain('worked_together');
    expect(RELATIONSHIP_TYPES).toContain('co_investor');
    expect(RELATIONSHIP_TYPES).toContain('portfolio');
    expect(RELATIONSHIP_TYPES).toContain('advisor');
    expect(RELATIONSHIP_TYPES).toContain('cold_outreach');
    expect(RELATIONSHIP_TYPES).toContain('other');
  });
});

describe('formatRelationshipLabel', () => {
  it('formats intro relationship with introducer', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'intro',
      context: null,
      introducedById: 'c2',
      introducedByName: 'Sarah Chen',
      sharedCompany: null,
      relationshipDate: '2024-01-15',
      strength: 3,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Intro via Sarah Chen');
  });

  it('formats conference relationship with context', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'conference',
      context: 'TechCrunch Disrupt 2024',
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: '2024-09-15',
      strength: 2,
      createdAt: '2024-09-15',
      updatedAt: '2024-09-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Met at TechCrunch Disrupt 2024');
  });

  it('formats worked_together with shared company', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'worked_together',
      context: null,
      introducedById: null,
      introducedByName: null,
      sharedCompany: 'Google',
      relationshipDate: null,
      strength: 4,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Worked together at Google');
  });

  it('formats co_investor with shared company', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'co_investor',
      context: 'Series A',
      introducedById: null,
      introducedByName: null,
      sharedCompany: 'Acme Corp',
      relationshipDate: '2023-06-01',
      strength: 4,
      createdAt: '2023-06-01',
      updatedAt: '2023-06-01',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Co-invested in Acme Corp');
  });

  it('formats portfolio relationship', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'portfolio',
      context: 'Seed round',
      introducedById: null,
      introducedByName: null,
      sharedCompany: 'Startup Inc',
      relationshipDate: '2022-03-01',
      strength: 5,
      createdAt: '2022-03-01',
      updatedAt: '2022-03-01',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Portfolio: Startup Inc');
  });

  it('formats advisor relationship', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'advisor',
      context: null,
      introducedById: null,
      introducedByName: null,
      sharedCompany: 'TechCo',
      relationshipDate: null,
      strength: 4,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Advisor at TechCo');
  });

  it('formats cold_outreach', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'cold_outreach',
      context: 'LinkedIn',
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: '2024-02-01',
      strength: 1,
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Cold outreach via LinkedIn');
  });

  it('formats other with context', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'other',
      context: 'Met through kids school',
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: null,
      strength: 2,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Met through kids school');
  });

  it('falls back to type name when no context', () => {
    const relationship: Relationship = {
      id: '1',
      contactId: 'c1',
      type: 'conference',
      context: null,
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: null,
      strength: 2,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    expect(formatRelationshipLabel(relationship)).toBe('Met at event');
  });
});

describe('getRelationshipIcon', () => {
  it('returns correct icon names for each type', () => {
    expect(getRelationshipIcon('intro')).toBe('UserPlus');
    expect(getRelationshipIcon('conference')).toBe('Calendar');
    expect(getRelationshipIcon('worked_together')).toBe('Building2');
    expect(getRelationshipIcon('co_investor')).toBe('Handshake');
    expect(getRelationshipIcon('portfolio')).toBe('Briefcase');
    expect(getRelationshipIcon('advisor')).toBe('GraduationCap');
    expect(getRelationshipIcon('cold_outreach')).toBe('Mail');
    expect(getRelationshipIcon('other')).toBe('Link');
  });
});

describe('RelationshipInput validation', () => {
  it('requires type field', () => {
    const input: RelationshipInput = {
      type: 'intro',
    };
    expect(input.type).toBe('intro');
  });

  it('accepts optional fields', () => {
    const input: RelationshipInput = {
      type: 'conference',
      context: 'SaaStr Annual',
      relationshipDate: '2024-09-15',
      strength: 3,
    };
    expect(input.context).toBe('SaaStr Annual');
    expect(input.strength).toBe(3);
  });
});
