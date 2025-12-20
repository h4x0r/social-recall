import { describe, it, expect } from 'vitest';
import {
  detectNewCompanyOpportunity,
  detectRoleChangeOpportunity,
  detectDepartureOpportunity,
  detectOpportunities,
  dismissOpportunity,
  snoozeOpportunity,
  getActiveOpportunities,
  type Opportunity,
  type OpportunityType,
  type Contact,
  type ContactChange,
} from './opportunities';

describe('detectNewCompanyOpportunity', () => {
  it('detects when contact becomes founder/CEO of new company', () => {
    const before: Contact = {
      id: '1',
      name: 'Sarah Chen',
      employers: [{ company: 'Sequoia Capital', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after: Contact = {
      ...before,
      employers: [
        { company: 'NewStartup Inc', logo: '' },
        { company: 'Sequoia Capital', logo: '' },
      ],
      updatedAt: '2024-02-01',
    };

    const opportunity = detectNewCompanyOpportunity(before, after);
    expect(opportunity).not.toBeNull();
    expect(opportunity?.type).toBe('new_company');
    expect(opportunity?.description).toContain('NewStartup Inc');
  });

  it('returns null when no new company detected', () => {
    const before: Contact = {
      id: '1',
      name: 'John Doe',
      employers: [{ company: 'Google', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after = { ...before, updatedAt: '2024-02-01' };

    const opportunity = detectNewCompanyOpportunity(before, after);
    expect(opportunity).toBeNull();
  });

  it('returns null for contacts with no employers', () => {
    const before: Contact = {
      id: '1',
      name: 'John Doe',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after = { ...before };

    const opportunity = detectNewCompanyOpportunity(before, after);
    expect(opportunity).toBeNull();
  });
});

describe('detectRoleChangeOpportunity', () => {
  it('detects significant role change (same company)', () => {
    const change: ContactChange = {
      contact: {
        id: '1',
        name: 'Marcus Johnson',
        employers: [{ company: 'Meta', logo: '' }],
        createdAt: '2024-01-01',
        updatedAt: '2024-02-01',
      },
      previousTitle: 'Senior Engineer',
      currentTitle: 'CTO',
    };

    const opportunity = detectRoleChangeOpportunity(change);
    expect(opportunity).not.toBeNull();
    expect(opportunity?.type).toBe('role_change');
    expect(opportunity?.description).toContain('CTO');
  });

  it('returns null for lateral moves', () => {
    const change: ContactChange = {
      contact: {
        id: '1',
        name: 'John Doe',
        employers: [{ company: 'Google', logo: '' }],
        createdAt: '2024-01-01',
        updatedAt: '2024-02-01',
      },
      previousTitle: 'Software Engineer',
      currentTitle: 'Senior Software Engineer',
    };

    const opportunity = detectRoleChangeOpportunity(change);
    expect(opportunity).toBeNull();
  });
});

describe('detectDepartureOpportunity', () => {
  it('detects when contact leaves a major company', () => {
    const before: Contact = {
      id: '1',
      name: 'Elena Rodriguez',
      employers: [{ company: 'Cloudflare', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after: Contact = {
      ...before,
      employers: [],
      updatedAt: '2024-02-01',
    };

    const opportunity = detectDepartureOpportunity(before, after);
    expect(opportunity).not.toBeNull();
    expect(opportunity?.type).toBe('left_job');
    expect(opportunity?.description).toContain('Cloudflare');
  });

  it('returns null when contact still employed', () => {
    const before: Contact = {
      id: '1',
      name: 'John Doe',
      employers: [{ company: 'Google', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after: Contact = {
      ...before,
      employers: [{ company: 'Meta', logo: '' }],
      updatedAt: '2024-02-01',
    };

    const opportunity = detectDepartureOpportunity(before, after);
    expect(opportunity).toBeNull();
  });
});

describe('detectOpportunities', () => {
  it('returns all detected opportunities for a contact change', () => {
    const before: Contact = {
      id: '1',
      name: 'Sarah Chen',
      employers: [{ company: 'Sequoia Capital', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after: Contact = {
      ...before,
      employers: [{ company: 'NewStartup Inc', logo: '' }],
      updatedAt: '2024-02-01',
    };

    const opportunities = detectOpportunities(before, after);
    expect(opportunities.length).toBeGreaterThan(0);
  });

  it('returns empty array when no opportunities detected', () => {
    const before: Contact = {
      id: '1',
      name: 'John Doe',
      employers: [{ company: 'Google', logo: '' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const after = { ...before };

    const opportunities = detectOpportunities(before, after);
    expect(opportunities).toHaveLength(0);
  });
});

describe('dismissOpportunity', () => {
  it('marks opportunity as dismissed', () => {
    const opportunity: Opportunity = {
      id: '1',
      contactId: '1',
      type: 'new_company',
      description: 'Started new company',
      detectedAt: '2024-01-01',
    };

    const dismissed = dismissOpportunity(opportunity);
    expect(dismissed.dismissed).toBe(true);
  });
});

describe('snoozeOpportunity', () => {
  it('sets snooze until date', () => {
    const opportunity: Opportunity = {
      id: '1',
      contactId: '1',
      type: 'new_company',
      description: 'Started new company',
      detectedAt: '2024-01-01',
    };

    const snoozed = snoozeOpportunity(opportunity, 7);
    expect(snoozed.snoozedUntil).toBeDefined();
  });

  it('calculates correct snooze date', () => {
    const opportunity: Opportunity = {
      id: '1',
      contactId: '1',
      type: 'new_company',
      description: 'Started new company',
      detectedAt: '2024-01-01',
    };

    const now = new Date();
    const snoozed = snoozeOpportunity(opportunity, 7);
    const snoozeDate = new Date(snoozed.snoozedUntil!);
    const diffDays = Math.round(
      (snoozeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });
});

describe('getActiveOpportunities', () => {
  const opportunities: Opportunity[] = [
    {
      id: '1',
      contactId: '1',
      type: 'new_company',
      description: 'Active opportunity',
      detectedAt: '2024-01-01',
    },
    {
      id: '2',
      contactId: '2',
      type: 'role_change',
      description: 'Dismissed opportunity',
      detectedAt: '2024-01-01',
      dismissed: true,
    },
    {
      id: '3',
      contactId: '3',
      type: 'left_job',
      description: 'Snoozed opportunity',
      detectedAt: '2024-01-01',
      snoozedUntil: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    },
  ];

  it('filters out dismissed opportunities', () => {
    const active = getActiveOpportunities(opportunities);
    expect(active.some((o) => o.id === '2')).toBe(false);
  });

  it('filters out snoozed opportunities', () => {
    const active = getActiveOpportunities(opportunities);
    expect(active.some((o) => o.id === '3')).toBe(false);
  });

  it('returns active opportunities', () => {
    const active = getActiveOpportunities(opportunities);
    expect(active.some((o) => o.id === '1')).toBe(true);
  });

  it('includes opportunities with past snooze date', () => {
    const pastSnoozed: Opportunity[] = [
      {
        id: '4',
        contactId: '4',
        type: 'new_company',
        description: 'Past snoozed',
        detectedAt: '2024-01-01',
        snoozedUntil: new Date(Date.now() - 86400000).toISOString(), // yesterday
      },
    ];
    const active = getActiveOpportunities(pastSnoozed);
    expect(active).toHaveLength(1);
  });
});
