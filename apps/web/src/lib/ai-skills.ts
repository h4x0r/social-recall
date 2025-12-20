/**
 * AI Skill Inference for Social Recall
 * Uses Claude API to extract skills from LinkedIn profile data
 */

export interface Employer {
  company: string;
  logo: string;
}

export interface ProfileData {
  name: string;
  headline: string;
  employers?: Employer[];
  notes?: string;
}

export interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

export interface SkillExtractionResult {
  success: boolean;
  skills?: InferredSkill[];
  error?: string;
}

export interface CachedSkills {
  profileId: string;
  skills: InferredSkill[];
  cachedAt: string;
  expiresAt: string;
}

export interface InferenceOptions {
  apiKey: string;
  model?: string;
}

export interface CacheOptions {
  ttlMs?: number;
}

// Skill taxonomy categories from ADR-003
const SKILL_CATEGORIES = [
  'Security',
  'Compliance & Risk',
  'Legal',
  'Consulting & Advisory',
  'Enterprise Tech',
  'Engineering',
  'Design',
  'Product',
  'Business',
  'Investing',
];

// In-memory cache for skill inference results
const skillCache = new Map<string, CachedSkills>();

// Default cache TTL: 24 hours
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Builds the prompt for skill extraction from a LinkedIn profile
 */
export function buildSkillExtractionPrompt(profile: ProfileData): string {
  const parts: string[] = [];

  parts.push('Extract professional skills from this LinkedIn profile.');
  parts.push('');
  parts.push(`Name: ${profile.name}`);
  parts.push(`Headline: ${profile.headline}`);

  if (profile.employers && profile.employers.length > 0) {
    const companies = profile.employers.map((e) => e.company).join(', ');
    parts.push(`Companies: ${companies}`);
  }

  if (profile.notes) {
    parts.push(`Notes: ${profile.notes}`);
  }

  parts.push('');
  parts.push('Categorize each skill into one of these categories:');
  parts.push(SKILL_CATEGORIES.join(', '));
  parts.push('');
  parts.push('Return a JSON object with this structure:');
  parts.push('{');
  parts.push('  "skills": [');
  parts.push('    { "name": "Skill Name", "category": "Category", "confidence": 0.0-1.0 }');
  parts.push('  ]');
  parts.push('}');
  parts.push('');
  parts.push('Rules:');
  parts.push('- Only include skills you can confidently infer from the profile');
  parts.push('- Confidence should reflect how certain you are (0.0-1.0)');
  parts.push('- Include 3-10 skills maximum');
  parts.push('- Be specific (e.g., "Kubernetes Security" not just "Security")');

  return parts.join('\n');
}

/**
 * Parses the AI response to extract skills
 */
export function parseSkillsResponse(response: string): SkillExtractionResult {
  try {
    // Handle markdown code blocks
    let jsonStr = response;
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      return {
        success: false,
        error: 'Response missing skills array',
      };
    }

    // Filter and validate skills
    const validSkills = parsed.skills.filter(validateInferredSkill);

    return {
      success: true,
      skills: validSkills,
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse response: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates an inferred skill object
 */
export function validateInferredSkill(skill: unknown): skill is InferredSkill {
  if (!skill || typeof skill !== 'object') {
    return false;
  }

  const s = skill as Record<string, unknown>;

  // Check required fields
  if (typeof s.name !== 'string' || s.name.trim() === '') {
    return false;
  }

  if (typeof s.category !== 'string' || s.category.trim() === '') {
    return false;
  }

  if (typeof s.confidence !== 'number') {
    return false;
  }

  // Confidence must be between 0 and 1
  if (s.confidence < 0 || s.confidence > 1) {
    return false;
  }

  return true;
}

/**
 * Calls Claude API to infer skills from a profile
 */
export async function inferSkillsFromProfile(
  profile: ProfileData,
  options: InferenceOptions
): Promise<SkillExtractionResult> {
  const { apiKey, model = 'claude-3-5-sonnet-20241022' } = options;

  const prompt = buildSkillExtractionPrompt(profile);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return {
        success: false,
        error: 'Empty response from API',
      };
    }

    return parseSkillsResponse(text);
  } catch (e) {
    return {
      success: false,
      error: `Network error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * Caches inferred skills for a profile
 */
export function cacheSkills(
  profileId: string,
  skills: InferredSkill[],
  options: CacheOptions = {}
): CachedSkills {
  const { ttlMs = DEFAULT_CACHE_TTL_MS } = options;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const cached: CachedSkills = {
    profileId,
    skills,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  skillCache.set(profileId, cached);

  return cached;
}

/**
 * Retrieves cached skills for a profile
 * Returns null if not cached or expired
 */
export function getCachedSkills(profileId: string): CachedSkills | null {
  const cached = skillCache.get(profileId);

  if (!cached) {
    return null;
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(cached.expiresAt);

  if (now > expiresAt) {
    skillCache.delete(profileId);
    return null;
  }

  return cached;
}

/**
 * Infers skills with caching - checks cache first, then calls API if needed
 */
export async function inferSkillsWithCache(
  profileId: string,
  profile: ProfileData,
  options: InferenceOptions
): Promise<SkillExtractionResult> {
  // Check cache first
  const cached = getCachedSkills(profileId);
  if (cached) {
    return {
      success: true,
      skills: cached.skills,
    };
  }

  // Call API
  const result = await inferSkillsFromProfile(profile, options);

  // Cache successful results
  if (result.success && result.skills) {
    cacheSkills(profileId, result.skills);
  }

  return result;
}
