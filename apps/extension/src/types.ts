/**
 * Shared type definitions for Social Recall extension
 * Single source of truth for all data structures
 */

export interface Employer {
  company: string;
  logo: string;
  title?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  dates?: string;  // Human-readable date range
  startDate?: string;
  endDate?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Volunteering {
  organization: string;
  role?: string;
  cause?: string;
}

export interface Activity {
  type: 'post' | 'comment' | 'reaction';
  text: string;
  date?: string;
}

export interface Project {
  name: string;
  description?: string;
  url?: string;
}

export interface Publication {
  title: string;
  publisher?: string;
  url?: string;
  date?: string;
}

export interface Service {
  name: string;
  description?: string;
}

export interface Website {
  label?: string;
  url: string;
}

/**
 * Profile data structure for AI inference
 */
export interface ProfileData {
  name: string;
  headline: string;
  about?: string;
  employers?: Employer[];
  education?: Education[];
  honorsAwards?: string[];
  courses?: string[];
  languages?: string[];
  volunteering?: Volunteering[];
  certifications?: Certification[];
  activities?: Activity[];
  notes?: string;
}

/**
 * Extended profile data with additional fields for internal use
 */
export interface ExtendedProfileData extends ProfileData {
  linkedinId?: string;
  location?: string;
  avatarUrl?: string;
}

/**
 * Check if Chrome extension context is still valid
 * Context can become invalid after extension update/reload
 */
export function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined;
  } catch {
    return false;
  }
}

/**
 * Simple promise-based delay
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
