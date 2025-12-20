/**
 * Shared types for Social Recall
 */

export interface Employer {
  company: string;
  logo: string;
}

export interface Contact {
  id: string;
  name: string;
  linkedinUrl?: string;
  profileId?: string;
  notes?: string;
  employers?: Employer[];
  skills?: Skill[];
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  confidence: number;
  confirmed?: boolean;
}

export interface Opportunity {
  id: string;
  contactId: string;
  type: 'new_company' | 'role_change' | 'left_job';
  description: string;
  detectedAt: string;
  dismissed?: boolean;
  snoozedUntil?: string;
}
