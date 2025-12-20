import { describe, it, expect } from 'vitest';
import {
  extractProfileIdFromUrl,
  isLinkedInProfileUrl,
  extractProfileNameFromTitle,
  extractFirstPartBeforeMiddleDot,
  getCompanyInitials,
  isDurationString,
  isNewEmployer,
  Employer,
} from './utils';

describe('extractProfileIdFromUrl', () => {
  it('extracts profile ID from standard LinkedIn URL', () => {
    const url = 'https://www.linkedin.com/in/johndoe/';
    expect(extractProfileIdFromUrl(url)).toBe('johndoe');
  });

  it('extracts profile ID from URL without trailing slash', () => {
    const url = 'https://www.linkedin.com/in/johndoe';
    expect(extractProfileIdFromUrl(url)).toBe('johndoe');
  });

  it('extracts profile ID from URL with query parameters', () => {
    const url = 'https://www.linkedin.com/in/johndoe?trk=profile';
    expect(extractProfileIdFromUrl(url)).toBe('johndoe');
  });

  it('extracts profile ID from URL with hash', () => {
    const url = 'https://www.linkedin.com/in/johndoe#experience';
    expect(extractProfileIdFromUrl(url)).toBe('johndoe');
  });

  it('handles profile ID with hyphens and numbers', () => {
    const url = 'https://www.linkedin.com/in/john-doe-123/';
    expect(extractProfileIdFromUrl(url)).toBe('john-doe-123');
  });

  it('returns null for non-profile LinkedIn URLs', () => {
    const url = 'https://www.linkedin.com/feed/';
    expect(extractProfileIdFromUrl(url)).toBeNull();
  });

  it('returns null for non-LinkedIn URLs', () => {
    const url = 'https://www.google.com/';
    expect(extractProfileIdFromUrl(url)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractProfileIdFromUrl('')).toBeNull();
  });
});

describe('isLinkedInProfileUrl', () => {
  it('returns true for valid LinkedIn profile URL', () => {
    expect(isLinkedInProfileUrl('https://www.linkedin.com/in/johndoe/')).toBe(true);
  });

  it('returns true for LinkedIn profile URL without www', () => {
    expect(isLinkedInProfileUrl('https://linkedin.com/in/johndoe/')).toBe(true);
  });

  it('returns false for LinkedIn feed URL', () => {
    expect(isLinkedInProfileUrl('https://www.linkedin.com/feed/')).toBe(false);
  });

  it('returns false for LinkedIn company URL', () => {
    expect(isLinkedInProfileUrl('https://www.linkedin.com/company/google/')).toBe(false);
  });

  it('returns false for non-LinkedIn URL', () => {
    expect(isLinkedInProfileUrl('https://www.google.com/')).toBe(false);
  });
});

describe('extractProfileNameFromTitle', () => {
  it('extracts name from standard LinkedIn title format', () => {
    const title = 'John Doe | LinkedIn';
    expect(extractProfileNameFromTitle(title)).toBe('John Doe');
  });

  it('extracts name from title with job description', () => {
    const title = 'John Doe - Software Engineer | LinkedIn';
    expect(extractProfileNameFromTitle(title)).toBe('John Doe');
  });

  it('extracts name from title with dash separator', () => {
    const title = 'John Doe - LinkedIn';
    expect(extractProfileNameFromTitle(title)).toBe('John Doe');
  });

  it('handles title with multiple separators', () => {
    const title = 'John Doe | CEO at Startup | LinkedIn';
    expect(extractProfileNameFromTitle(title)).toBe('John Doe');
  });

  it('returns Unknown LinkedIn User for empty title', () => {
    expect(extractProfileNameFromTitle('')).toBe('Unknown LinkedIn User');
  });

  it('returns Unknown LinkedIn User for null/undefined', () => {
    expect(extractProfileNameFromTitle(null as unknown as string)).toBe('Unknown LinkedIn User');
    expect(extractProfileNameFromTitle(undefined as unknown as string)).toBe('Unknown LinkedIn User');
  });

  it('handles title with only whitespace', () => {
    expect(extractProfileNameFromTitle('   ')).toBe('Unknown LinkedIn User');
  });
});

describe('extractFirstPartBeforeMiddleDot', () => {
  it('extracts company name before middle dot', () => {
    const str = 'Google · 2 yrs 3 mos';
    expect(extractFirstPartBeforeMiddleDot(str)).toBe('Google');
  });

  it('handles string without middle dot', () => {
    const str = 'Google';
    expect(extractFirstPartBeforeMiddleDot(str)).toBe('Google');
  });

  it('trims whitespace', () => {
    const str = '  Google  ';
    expect(extractFirstPartBeforeMiddleDot(str)).toBe('Google');
  });

  it('handles company with spaces before dot', () => {
    const str = 'Acme Corporation · Full-time';
    expect(extractFirstPartBeforeMiddleDot(str)).toBe('Acme Corporation');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractFirstPartBeforeMiddleDot(null as unknown as string)).toBe('');
    expect(extractFirstPartBeforeMiddleDot(undefined as unknown as string)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(extractFirstPartBeforeMiddleDot('')).toBe('');
  });
});

describe('getCompanyInitials', () => {
  it('creates initials from single word company', () => {
    expect(getCompanyInitials('Google')).toBe('G');
  });

  it('creates two-letter initials from multi-word company', () => {
    expect(getCompanyInitials('Acme Corporation')).toBe('AC');
  });

  it('limits initials to 2 characters for long names', () => {
    expect(getCompanyInitials('International Business Machines')).toBe('IB');
  });

  it('returns uppercase initials', () => {
    expect(getCompanyInitials('acme corp')).toBe('AC');
  });

  it('returns empty string for null/undefined', () => {
    expect(getCompanyInitials(null as unknown as string)).toBe('');
    expect(getCompanyInitials(undefined as unknown as string)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(getCompanyInitials('')).toBe('');
  });
});

describe('isDurationString', () => {
  it('detects duration with months', () => {
    expect(isDurationString('2 yrs 3 mo')).toBe(true);
  });

  it('detects duration with mo only', () => {
    expect(isDurationString('6 mo')).toBe(true);
  });

  it('detects duration without space before mo', () => {
    expect(isDurationString('3mo')).toBe(true);
  });

  it('returns false for company name', () => {
    expect(isDurationString('Google')).toBe(false);
  });

  it('returns false for job title', () => {
    expect(isDurationString('Software Engineer')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDurationString('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isDurationString(null as unknown as string)).toBe(false);
    expect(isDurationString(undefined as unknown as string)).toBe(false);
  });
});

describe('isNewEmployer', () => {
  const google: Employer = { company: 'Google', logo: 'https://google.com/logo.png' };
  const meta: Employer = { company: 'Meta', logo: 'https://meta.com/logo.png' };
  const apple: Employer = { company: 'Apple', logo: 'https://apple.com/logo.png' };

  it('returns false on first visit (no highlighting)', () => {
    const savedEmployers: Employer[] = [];
    expect(isNewEmployer(google, savedEmployers, true)).toBe(false);
  });

  it('returns true for employer not in saved list', () => {
    const savedEmployers: Employer[] = [google];
    expect(isNewEmployer(meta, savedEmployers, false)).toBe(true);
  });

  it('returns false for employer in saved list', () => {
    const savedEmployers: Employer[] = [google, meta];
    expect(isNewEmployer(google, savedEmployers, false)).toBe(false);
  });

  it('comparison is case-insensitive', () => {
    const savedEmployers: Employer[] = [{ company: 'GOOGLE', logo: '' }];
    expect(isNewEmployer({ company: 'google', logo: '' }, savedEmployers, false)).toBe(false);
  });

  it('handles empty saved employers on return visit', () => {
    const savedEmployers: Employer[] = [];
    expect(isNewEmployer(google, savedEmployers, false)).toBe(true);
  });
});
