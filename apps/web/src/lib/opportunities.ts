/**
 * Opportunity detection logic for Social Recall
 * Detects career changes, new companies, and departures
 */

export interface Employer {
  company: string;
  logo: string;
}

export interface Contact {
  id: string;
  name: string;
  employers?: Employer[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactChange {
  contact: Contact;
  previousTitle?: string;
  currentTitle?: string;
}

export type OpportunityType = 'new_company' | 'role_change' | 'left_job';

export interface Opportunity {
  id: string;
  contactId: string;
  type: OpportunityType;
  description: string;
  detectedAt: string;
  dismissed?: boolean;
  snoozedUntil?: string;
}

// Keywords that indicate founding/executive roles
const FOUNDER_KEYWORDS = ['founder', 'ceo', 'co-founder', 'cto', 'coo', 'cfo', 'chief'];

// Keywords indicating significant role changes (promotions)
const SIGNIFICANT_ROLE_KEYWORDS = ['cto', 'ceo', 'coo', 'cfo', 'vp', 'vice president', 'director', 'head of', 'chief'];

/**
 * Detects if a contact has started a new company
 */
export function detectNewCompanyOpportunity(
  before: Contact,
  after: Contact
): Opportunity | null {
  if (!after.employers || after.employers.length === 0) {
    return null;
  }

  const beforeCompanies = new Set(
    before.employers?.map((e) => e.company.toLowerCase()) ?? []
  );

  // Find new companies that weren't in the previous list
  const newCompanies = after.employers.filter(
    (e) => !beforeCompanies.has(e.company.toLowerCase())
  );

  if (newCompanies.length === 0) {
    return null;
  }

  // The newest company is likely the most relevant
  const newCompany = newCompanies[0];

  return {
    id: `opp-${after.id}-${Date.now()}`,
    contactId: after.id,
    type: 'new_company',
    description: `Started new role at ${newCompany.company}`,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Detects significant role changes (C-level, VP, Director promotions)
 */
export function detectRoleChangeOpportunity(
  change: ContactChange
): Opportunity | null {
  const { contact, previousTitle, currentTitle } = change;

  if (!currentTitle || !previousTitle) {
    return null;
  }

  const normalizedCurrent = currentTitle.toLowerCase();
  const normalizedPrevious = previousTitle.toLowerCase();

  // Check if new title contains significant keywords that weren't in previous
  const isSignificantChange = SIGNIFICANT_ROLE_KEYWORDS.some(
    (keyword) =>
      normalizedCurrent.includes(keyword) && !normalizedPrevious.includes(keyword)
  );

  if (!isSignificantChange) {
    return null;
  }

  return {
    id: `opp-${contact.id}-${Date.now()}`,
    contactId: contact.id,
    type: 'role_change',
    description: `Now ${currentTitle}${contact.employers?.[0] ? ` at ${contact.employers[0].company}` : ''}`,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Detects when a contact leaves a company (has no current employers)
 */
export function detectDepartureOpportunity(
  before: Contact,
  after: Contact
): Opportunity | null {
  const hadEmployers = before.employers && before.employers.length > 0;
  const hasNoEmployers = !after.employers || after.employers.length === 0;

  if (!hadEmployers || !hasNoEmployers) {
    return null;
  }

  const previousCompany = before.employers![0].company;

  return {
    id: `opp-${after.id}-${Date.now()}`,
    contactId: after.id,
    type: 'left_job',
    description: `Left ${previousCompany}`,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Detects all opportunities from a contact change
 */
export function detectOpportunities(
  before: Contact,
  after: Contact,
  change?: ContactChange
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Check for new company
  const newCompanyOpp = detectNewCompanyOpportunity(before, after);
  if (newCompanyOpp) {
    opportunities.push(newCompanyOpp);
  }

  // Check for role change if title info is provided
  if (change) {
    const roleChangeOpp = detectRoleChangeOpportunity(change);
    if (roleChangeOpp) {
      opportunities.push(roleChangeOpp);
    }
  }

  // Check for departure
  const departureOpp = detectDepartureOpportunity(before, after);
  if (departureOpp) {
    opportunities.push(departureOpp);
  }

  return opportunities;
}

/**
 * Marks an opportunity as dismissed
 */
export function dismissOpportunity(opportunity: Opportunity): Opportunity {
  return {
    ...opportunity,
    dismissed: true,
  };
}

/**
 * Snoozes an opportunity for a specified number of days
 */
export function snoozeOpportunity(opportunity: Opportunity, days: number): Opportunity {
  const snoozeDate = new Date();
  snoozeDate.setDate(snoozeDate.getDate() + days);

  return {
    ...opportunity,
    snoozedUntil: snoozeDate.toISOString(),
  };
}

/**
 * Filters opportunities to only return active ones
 * (not dismissed and not currently snoozed)
 */
export function getActiveOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const now = new Date();

  return opportunities.filter((opp) => {
    // Filter out dismissed
    if (opp.dismissed) {
      return false;
    }

    // Filter out currently snoozed (snooze date in future)
    if (opp.snoozedUntil) {
      const snoozeDate = new Date(opp.snoozedUntil);
      if (snoozeDate > now) {
        return false;
      }
    }

    return true;
  });
}
