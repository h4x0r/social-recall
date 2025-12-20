/**
 * Relationship context - how you know someone
 * Core feature for serial entrepreneurs and angel investors
 * who leverage weak ties through mutual connections
 */

import type { RelationshipType } from './database.types';

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'intro',
  'conference',
  'worked_together',
  'co_investor',
  'portfolio',
  'advisor',
  'cold_outreach',
  'other',
];

export interface Relationship {
  id: string;
  contactId: string;
  type: RelationshipType;
  context: string | null;
  introducedById: string | null;
  introducedByName: string | null; // Denormalized for display
  sharedCompany: string | null;
  relationshipDate: string | null;
  strength: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipInput {
  type: RelationshipType;
  context?: string | null;
  introducedById?: string | null;
  sharedCompany?: string | null;
  relationshipDate?: string | null;
  strength?: number;
}

/**
 * Human-readable label for a relationship
 */
export function formatRelationshipLabel(relationship: Relationship): string {
  const { type, context, introducedByName, sharedCompany } = relationship;

  switch (type) {
    case 'intro':
      if (introducedByName) {
        return `Intro via ${introducedByName}`;
      }
      return 'Introduced by mutual connection';

    case 'conference':
      if (context) {
        return `Met at ${context}`;
      }
      return 'Met at event';

    case 'worked_together':
      if (sharedCompany) {
        return `Worked together at ${sharedCompany}`;
      }
      return 'Former colleague';

    case 'co_investor':
      if (sharedCompany) {
        return `Co-invested in ${sharedCompany}`;
      }
      return 'Co-investor';

    case 'portfolio':
      if (sharedCompany) {
        return `Portfolio: ${sharedCompany}`;
      }
      return 'Portfolio founder';

    case 'advisor':
      if (sharedCompany) {
        return `Advisor at ${sharedCompany}`;
      }
      return 'Advisory relationship';

    case 'cold_outreach':
      if (context) {
        return `Cold outreach via ${context}`;
      }
      return 'Cold outreach';

    case 'other':
      if (context) {
        return context;
      }
      return 'Other connection';

    default:
      return 'Connected';
  }
}

/**
 * Icon name for each relationship type (Lucide icons)
 */
export function getRelationshipIcon(type: RelationshipType): string {
  switch (type) {
    case 'intro':
      return 'UserPlus';
    case 'conference':
      return 'Calendar';
    case 'worked_together':
      return 'Building2';
    case 'co_investor':
      return 'Handshake';
    case 'portfolio':
      return 'Briefcase';
    case 'advisor':
      return 'GraduationCap';
    case 'cold_outreach':
      return 'Mail';
    case 'other':
      return 'Link';
    default:
      return 'Link';
  }
}

/**
 * Display configuration for relationship types
 */
export const RELATIONSHIP_TYPE_CONFIG: Record<
  RelationshipType,
  { label: string; description: string; color: string }
> = {
  intro: {
    label: 'Introduction',
    description: 'Introduced by a mutual connection',
    color: 'text-blue-500',
  },
  conference: {
    label: 'Conference/Event',
    description: 'Met at an event, conference, or meetup',
    color: 'text-purple-500',
  },
  worked_together: {
    label: 'Former Colleague',
    description: 'Worked together at the same company',
    color: 'text-green-500',
  },
  co_investor: {
    label: 'Co-Investor',
    description: 'Invested in the same company',
    color: 'text-amber-500',
  },
  portfolio: {
    label: 'Portfolio Founder',
    description: 'Founder of a company you invested in',
    color: 'text-emerald-500',
  },
  advisor: {
    label: 'Advisor',
    description: 'Advisory or mentorship relationship',
    color: 'text-cyan-500',
  },
  cold_outreach: {
    label: 'Cold Outreach',
    description: 'Connected via cold email or LinkedIn',
    color: 'text-gray-500',
  },
  other: {
    label: 'Other',
    description: 'Other type of connection',
    color: 'text-gray-400',
  },
};

/**
 * Strength labels for relationship strength (1-5)
 */
export const STRENGTH_LABELS: Record<number, string> = {
  1: 'Acquaintance',
  2: 'Familiar',
  3: 'Connected',
  4: 'Close',
  5: 'Inner Circle',
};
