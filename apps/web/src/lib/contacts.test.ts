import { describe, it, expect } from 'vitest';
import {
  validateContact,
  normalizeContactName,
  getContactInitials,
  formatContactForDisplay,
  searchContacts,
  filterContactsBySkill,
  type Contact,
  type ContactValidationResult,
} from './contacts';

describe('validateContact', () => {
  it('returns valid for a complete contact', () => {
    const contact: Partial<Contact> = {
      name: 'John Doe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when name is missing', () => {
    const contact: Partial<Contact> = {
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  it('returns invalid when name is empty string', () => {
    const contact: Partial<Contact> = {
      name: '',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  it('returns invalid when name is whitespace only', () => {
    const contact: Partial<Contact> = {
      name: '   ',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  it('returns invalid for malformed LinkedIn URL', () => {
    const contact: Partial<Contact> = {
      name: 'John Doe',
      linkedinUrl: 'not-a-url',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid LinkedIn URL');
  });

  it('allows contact without LinkedIn URL', () => {
    const contact: Partial<Contact> = {
      name: 'John Doe',
    };
    const result = validateContact(contact);
    expect(result.valid).toBe(true);
  });
});

describe('normalizeContactName', () => {
  it('trims whitespace', () => {
    expect(normalizeContactName('  John Doe  ')).toBe('John Doe');
  });

  it('removes extra internal spaces', () => {
    expect(normalizeContactName('John    Doe')).toBe('John Doe');
  });

  it('capitalizes first letter of each word', () => {
    expect(normalizeContactName('john doe')).toBe('John Doe');
  });

  it('handles single names', () => {
    expect(normalizeContactName('madonna')).toBe('Madonna');
  });

  it('preserves case for mixed-case names like McDonald', () => {
    expect(normalizeContactName('mcdonald')).toBe('Mcdonald');
  });

  it('handles empty string', () => {
    expect(normalizeContactName('')).toBe('');
  });
});

describe('getContactInitials', () => {
  it('returns first letter of first and last name', () => {
    expect(getContactInitials('John Doe')).toBe('JD');
  });

  it('returns single letter for single name', () => {
    expect(getContactInitials('Madonna')).toBe('M');
  });

  it('returns uppercase letters', () => {
    expect(getContactInitials('john doe')).toBe('JD');
  });

  it('handles middle names by taking first and last', () => {
    expect(getContactInitials('John Michael Doe')).toBe('JD');
  });

  it('returns empty string for empty input', () => {
    expect(getContactInitials('')).toBe('');
  });

  it('limits to 2 characters', () => {
    expect(getContactInitials('A B C D E')).toBe('AE');
  });
});

describe('formatContactForDisplay', () => {
  it('formats contact with all fields', () => {
    const contact: Contact = {
      id: '1',
      name: 'John Doe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      profileId: 'johndoe',
      notes: 'Met at conference',
      employers: [{ company: 'Google', logo: '' }],
      skills: [{ id: '1', name: 'TypeScript', category: 'Engineering', confidence: 0.9 }],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    const display = formatContactForDisplay(contact);
    expect(display.initials).toBe('JD');
    expect(display.primaryEmployer).toBe('Google');
    expect(display.skillCount).toBe(1);
  });

  it('handles contact with no employers', () => {
    const contact: Contact = {
      id: '1',
      name: 'John Doe',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    const display = formatContactForDisplay(contact);
    expect(display.primaryEmployer).toBeUndefined();
  });

  it('handles contact with no skills', () => {
    const contact: Contact = {
      id: '1',
      name: 'John Doe',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    const display = formatContactForDisplay(contact);
    expect(display.skillCount).toBe(0);
  });
});

describe('searchContacts', () => {
  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      notes: 'Met at Sequoia event',
      employers: [{ company: 'Sequoia Capital', logo: '' }],
      skills: [{ id: '1', name: 'Venture Capital', category: 'Investing', confidence: 0.95 }],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      notes: 'AI expert from Meta',
      employers: [{ company: 'Meta', logo: '' }],
      skills: [{ id: '2', name: 'Machine Learning', category: 'Engineering', confidence: 0.9 }],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  it('searches by name (case-insensitive)', () => {
    const results = searchContacts(contacts, 'sarah');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sarah Chen');
  });

  it('searches by company', () => {
    const results = searchContacts(contacts, 'sequoia');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sarah Chen');
  });

  it('searches by skill', () => {
    const results = searchContacts(contacts, 'machine learning');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Marcus Johnson');
  });

  it('searches by notes', () => {
    const results = searchContacts(contacts, 'AI expert');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Marcus Johnson');
  });

  it('returns all contacts for empty query', () => {
    const results = searchContacts(contacts, '');
    expect(results).toHaveLength(2);
  });

  it('returns empty array when no matches', () => {
    const results = searchContacts(contacts, 'xyz123');
    expect(results).toHaveLength(0);
  });
});

describe('filterContactsBySkill', () => {
  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Alice',
      skills: [
        { id: '1', name: 'TypeScript', category: 'Engineering', confidence: 0.9 },
        { id: '2', name: 'React', category: 'Engineering', confidence: 0.85 },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '2',
      name: 'Bob',
      skills: [
        { id: '3', name: 'Python', category: 'Engineering', confidence: 0.95 },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      name: 'Carol',
      skills: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  it('filters by exact skill name', () => {
    const results = filterContactsBySkill(contacts, 'TypeScript');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alice');
  });

  it('filters by skill category', () => {
    const results = filterContactsBySkill(contacts, 'Engineering', { byCategory: true });
    expect(results).toHaveLength(2);
  });

  it('filters with minimum confidence', () => {
    const results = filterContactsBySkill(contacts, 'Engineering', {
      byCategory: true,
      minConfidence: 0.9,
    });
    expect(results).toHaveLength(2); // Alice (TypeScript 0.9) and Bob (Python 0.95)
  });

  it('returns empty for non-existent skill', () => {
    const results = filterContactsBySkill(contacts, 'Go');
    expect(results).toHaveLength(0);
  });
});
