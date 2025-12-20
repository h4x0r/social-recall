import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inferSkillsFromProfile,
  buildSkillExtractionPrompt,
  parseSkillsResponse,
  validateInferredSkill,
  getCachedSkills,
  cacheSkills,
  type ProfileData,
  type InferredSkill,
  type SkillExtractionResult,
} from './ai-skills';

describe('buildSkillExtractionPrompt', () => {
  it('builds prompt with name and headline', () => {
    const profile: ProfileData = {
      name: 'Sarah Chen',
      headline: 'Partner @ Sequoia Capital',
    };
    const prompt = buildSkillExtractionPrompt(profile);
    expect(prompt).toContain('Sarah Chen');
    expect(prompt).toContain('Partner @ Sequoia Capital');
  });

  it('includes employer history when available', () => {
    const profile: ProfileData = {
      name: 'John Doe',
      headline: 'CTO',
      employers: [
        { company: 'Google', logo: '' },
        { company: 'Meta', logo: '' },
      ],
    };
    const prompt = buildSkillExtractionPrompt(profile);
    expect(prompt).toContain('Google');
    expect(prompt).toContain('Meta');
  });

  it('includes notes when available', () => {
    const profile: ProfileData = {
      name: 'Jane Smith',
      headline: 'Security Expert',
      notes: 'Met at RSA conference, specializes in zero trust',
    };
    const prompt = buildSkillExtractionPrompt(profile);
    expect(prompt).toContain('zero trust');
  });

  it('requests JSON output format', () => {
    const profile: ProfileData = {
      name: 'Test User',
      headline: 'Engineer',
    };
    const prompt = buildSkillExtractionPrompt(profile);
    expect(prompt).toContain('JSON');
  });

  it('includes skill taxonomy categories', () => {
    const profile: ProfileData = {
      name: 'Test User',
      headline: 'Engineer',
    };
    const prompt = buildSkillExtractionPrompt(profile);
    expect(prompt).toContain('Security');
    expect(prompt).toContain('Engineering');
    expect(prompt).toContain('Investing');
  });
});

describe('parseSkillsResponse', () => {
  it('parses valid JSON response with skills array', () => {
    const response = JSON.stringify({
      skills: [
        { name: 'Venture Capital', category: 'Investing', confidence: 0.95 },
        { name: 'Due Diligence', category: 'Investing', confidence: 0.85 },
      ],
    });
    const result = parseSkillsResponse(response);
    expect(result.success).toBe(true);
    expect(result.skills).toHaveLength(2);
    expect(result.skills![0].name).toBe('Venture Capital');
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const response = '```json\n{"skills": [{"name": "Python", "category": "Engineering", "confidence": 0.9}]}\n```';
    const result = parseSkillsResponse(response);
    expect(result.success).toBe(true);
    expect(result.skills).toHaveLength(1);
  });

  it('returns error for invalid JSON', () => {
    const response = 'This is not JSON';
    const result = parseSkillsResponse(response);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for missing skills array', () => {
    const response = JSON.stringify({ data: 'no skills here' });
    const result = parseSkillsResponse(response);
    expect(result.success).toBe(false);
    expect(result.error).toContain('skills');
  });

  it('filters out invalid skill objects', () => {
    const response = JSON.stringify({
      skills: [
        { name: 'Valid Skill', category: 'Engineering', confidence: 0.9 },
        { name: '', category: 'Engineering', confidence: 0.9 }, // invalid: empty name
        { name: 'No Category', confidence: 0.9 }, // invalid: missing category
        { name: 'No Confidence', category: 'Engineering' }, // invalid: missing confidence
      ],
    });
    const result = parseSkillsResponse(response);
    expect(result.success).toBe(true);
    expect(result.skills).toHaveLength(1);
  });
});

describe('validateInferredSkill', () => {
  it('validates skill with all required fields', () => {
    const skill: InferredSkill = {
      name: 'TypeScript',
      category: 'Engineering',
      confidence: 0.85,
    };
    expect(validateInferredSkill(skill)).toBe(true);
  });

  it('rejects skill with empty name', () => {
    const skill: InferredSkill = {
      name: '',
      category: 'Engineering',
      confidence: 0.85,
    };
    expect(validateInferredSkill(skill)).toBe(false);
  });

  it('rejects skill with confidence below 0', () => {
    const skill: InferredSkill = {
      name: 'Python',
      category: 'Engineering',
      confidence: -0.1,
    };
    expect(validateInferredSkill(skill)).toBe(false);
  });

  it('rejects skill with confidence above 1', () => {
    const skill: InferredSkill = {
      name: 'Python',
      category: 'Engineering',
      confidence: 1.5,
    };
    expect(validateInferredSkill(skill)).toBe(false);
  });

  it('rejects skill with empty category', () => {
    const skill: InferredSkill = {
      name: 'Python',
      category: '',
      confidence: 0.9,
    };
    expect(validateInferredSkill(skill)).toBe(false);
  });

  it('accepts skill with confidence at boundaries (0 and 1)', () => {
    expect(validateInferredSkill({ name: 'A', category: 'B', confidence: 0 })).toBe(true);
    expect(validateInferredSkill({ name: 'A', category: 'B', confidence: 1 })).toBe(true);
  });
});

describe('inferSkillsFromProfile', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
  });

  it('calls API with correct prompt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '{"skills": []}' }],
      }),
    });

    const profile: ProfileData = {
      name: 'Test User',
      headline: 'Engineer',
    };

    await inferSkillsFromProfile(profile, { apiKey: 'test-key' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('anthropic');
    expect(options.headers['x-api-key']).toBe('test-key');
  });

  it('returns parsed skills on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            skills: [
              { name: 'React', category: 'Engineering', confidence: 0.9 },
            ],
          }),
        }],
      }),
    });

    const profile: ProfileData = {
      name: 'Frontend Dev',
      headline: 'React Developer',
    };

    const result = await inferSkillsFromProfile(profile, { apiKey: 'test-key' });

    expect(result.success).toBe(true);
    expect(result.skills).toHaveLength(1);
    expect(result.skills![0].name).toBe('React');
  });

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const profile: ProfileData = {
      name: 'Test User',
      headline: 'Engineer',
    };

    const result = await inferSkillsFromProfile(profile, { apiKey: 'test-key' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const profile: ProfileData = {
      name: 'Test User',
      headline: 'Engineer',
    };

    const result = await inferSkillsFromProfile(profile, { apiKey: 'test-key' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network');
  });
});

describe('skill caching', () => {
  beforeEach(() => {
    // Clear any cached data
    vi.resetAllMocks();
  });

  it('cacheSkills stores skills with profile ID', () => {
    const skills: InferredSkill[] = [
      { name: 'Python', category: 'Engineering', confidence: 0.9 },
    ];

    const cached = cacheSkills('profile-123', skills);

    expect(cached.profileId).toBe('profile-123');
    expect(cached.skills).toEqual(skills);
    expect(cached.cachedAt).toBeDefined();
  });

  it('getCachedSkills returns null for uncached profile', () => {
    const result = getCachedSkills('unknown-profile');
    expect(result).toBeNull();
  });

  it('getCachedSkills returns cached skills for known profile', () => {
    const skills: InferredSkill[] = [
      { name: 'Go', category: 'Engineering', confidence: 0.85 },
    ];

    cacheSkills('profile-456', skills);
    const cached = getCachedSkills('profile-456');

    expect(cached).not.toBeNull();
    expect(cached!.skills).toEqual(skills);
  });

  it('getCachedSkills returns null for expired cache', () => {
    const skills: InferredSkill[] = [
      { name: 'Rust', category: 'Engineering', confidence: 0.8 },
    ];

    // Cache with a past expiry
    cacheSkills('profile-789', skills, { ttlMs: -1000 });
    const cached = getCachedSkills('profile-789');

    expect(cached).toBeNull();
  });
});
