/**
 * AI Client for Social Recall Extension
 * Calls web app API to infer intelligence from LinkedIn profiles
 */

export interface Employer {
  company: string;
  logo: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  dates?: string;
}

export interface Volunteering {
  organization: string;
  role?: string;
  cause?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Activity {
  type: 'post' | 'comment' | 'reaction';
  text: string;
  date?: string;
}

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

export interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

export interface IntelligenceResult {
  success: boolean;
  skills?: InferredSkill[];
  archetype?: string;
  couldBe?: string[];
  goodFor?: string[];
  error?: string;
}

export interface InferenceOptions {
  apiUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_API_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Infer intelligence from a LinkedIn profile using the web app API
 */
export async function inferIntelligence(
  profile: ProfileData,
  options: InferenceOptions = {}
): Promise<IntelligenceResult> {
  const { apiUrl = DEFAULT_API_URL, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiUrl}/api/infer-skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Unknown API error',
      };
    }

    return {
      success: true,
      skills: data.skills || [],
      archetype: data.archetype || null,
      couldBe: data.couldBe || [],
      goodFor: data.goodFor || [],
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Check for AbortError (timeout)
    if (
      error instanceof Error ||
      (error && typeof error === 'object' && 'name' in error)
    ) {
      const err = error as { name: string; message?: string };
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }
      return {
        success: false,
        error: `Network error: ${err.message || 'Unknown'}`,
      };
    }

    return {
      success: false,
      error: 'Unknown error',
    };
  }
}
