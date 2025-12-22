import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getGlobalRateLimiter } from '@/lib/rate-limiter';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Skill taxonomy categories
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

// 11 Core Archetypes + Unknown (matching Tarot cards in extension)
const ARCHETYPES = [
  'builder',     // The Magician - Technical founders, engineers
  'advisor',     // The High Priestess - Board members, coaches
  'creator',     // The Empress - Designers, brand builders
  'executive',   // The Emperor - CEOs, managing directors
  'connector',   // The Lovers - Network weavers, intro makers
  'operator',    // The Chariot - COOs, Chiefs of Staff
  'seller',      // Strength - Sales, BD, revenue generators
  'researcher',  // The Hermit - Scientists, analysts, experts
  'integrator',  // Temperance - Product managers, generalists
  'evangelist',  // The Star - Developer advocates, thought leaders
  'investor',    // Judgement - Angels, VCs, LPs
  'unknown',     // ? - Doesn't fit core archetypes
] as const;

type Archetype = (typeof ARCHETYPES)[number];

interface Employer {
  company: string;
  logo: string;
}

interface Education {
  school: string;
  degree?: string;
  field?: string;
  dates?: string;
}

interface Volunteering {
  organization: string;
  role?: string;
  cause?: string;
}

interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
}

interface Activity {
  type: 'post' | 'comment' | 'reaction';
  text: string;
  date?: string;
}

interface ProfileData {
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

interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

interface IntelligenceResponse {
  skills: InferredSkill[];
  archetype: string | null;
  couldBe: string[];
  goodFor: string[];
}

function buildPrompt(profile: ProfileData): string {
  const parts: string[] = [];

  parts.push('Analyze this LinkedIn profile and provide intelligence for a professional network CRM.');
  parts.push('');
  parts.push(`Name: ${profile.name}`);
  parts.push(`Headline: ${profile.headline}`);

  if (profile.about) {
    parts.push(`About: ${profile.about.slice(0, 500)}`);
  }

  if (profile.employers && profile.employers.length > 0) {
    const companies = profile.employers.map((e) => e.company).join(', ');
    parts.push(`Companies: ${companies}`);
  }

  if (profile.education && profile.education.length > 0) {
    const schools = profile.education.map((e) =>
      `${e.school}${e.degree ? ` (${e.degree})` : ''}`
    ).join(', ');
    parts.push(`Education: ${schools}`);
  }

  if (profile.certifications && profile.certifications.length > 0) {
    const certs = profile.certifications.map((c) => c.name).join(', ');
    parts.push(`Certifications: ${certs}`);
  }

  if (profile.volunteering && profile.volunteering.length > 0) {
    const vol = profile.volunteering.map((v) =>
      `${v.role || 'Volunteer'} at ${v.organization}`
    ).join(', ');
    parts.push(`Volunteering: ${vol}`);
  }

  if (profile.languages && profile.languages.length > 0) {
    parts.push(`Languages: ${profile.languages.join(', ')}`);
  }

  if (profile.activities && profile.activities.length > 0) {
    const recentPosts = profile.activities
      .filter(a => a.type === 'post')
      .slice(0, 5)
      .map(a => a.text.slice(0, 200))
      .join(' | ');
    if (recentPosts) {
      parts.push(`Recent posts: ${recentPosts}`);
    }
  }

  if (profile.notes) {
    parts.push(`Notes: ${profile.notes}`);
  }

  parts.push('');
  parts.push('Return a JSON object with this structure:');
  parts.push('{');
  parts.push('  "skills": [');
  parts.push('    { "name": "Skill Name", "category": "Category", "confidence": 0.0-1.0 }');
  parts.push('  ],');
  parts.push('  "archetype": "one of the archetypes below",');
  parts.push('  "couldBe": ["relationship potential 1", "relationship potential 2"],');
  parts.push('  "goodFor": ["project type 1", "project type 2"]');
  parts.push('}');
  parts.push('');
  parts.push('SKILL CATEGORIES (choose from):');
  parts.push(SKILL_CATEGORIES.join(', '));
  parts.push('');
  parts.push('ARCHETYPES (choose exactly one based on their primary professional identity):');
  parts.push('- builder: Technical founders, engineers who ship production systems');
  parts.push('- advisor: Board members, executive coaches, seasoned advisors');
  parts.push('- creator: Designers, brand builders, product visionaries');
  parts.push('- executive: CEOs, presidents, managing directors who lead');
  parts.push('- connector: Network weavers who make valuable introductions');
  parts.push('- operator: COOs, Chiefs of Staff, program managers who execute');
  parts.push('- seller: Sales, BD, revenue generators who close deals');
  parts.push('- researcher: Scientists, analysts, domain experts who investigate');
  parts.push('- integrator: Product managers, generalists, bridge-builders');
  parts.push('- evangelist: Developer advocates, thought leaders, community builders');
  parts.push('- investor: Angels, VCs, LPs who fund ventures');
  parts.push('- unknown: Doesn\'t clearly fit the above archetypes');
  parts.push('');
  parts.push('COULD BE (relationship potential - choose 1-3):');
  parts.push('Co-founder, Tech Advisor, Board Member, Mentor, Contractor, Design Lead, Sales Lead, Investor, Partner');
  parts.push('');
  parts.push('GOOD FOR (project/domain fit - choose 1-3):');
  parts.push('Dev tools, Fintech, B2B SaaS, Consumer Apps, Enterprise, Healthcare, AI/ML, Crypto, E-commerce, Marketplaces');
  parts.push('');
  parts.push('Rules:');
  parts.push('- Include 3-10 skills with confidence 0.0-1.0');
  parts.push('- Be specific with skills (e.g., "Kubernetes Security" not just "Security")');
  parts.push('- Choose archetype based on primary professional identity');
  parts.push('- couldBe should reflect realistic relationship opportunities');
  parts.push('- goodFor should match their domain expertise and company history');

  return parts.join('\n');
}

function parseResponse(text: string): IntelligenceResponse {
  const result: IntelligenceResponse = {
    skills: [],
    archetype: null,
    couldBe: [],
    goodFor: [],
  };

  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    // Parse skills
    if (parsed.skills && Array.isArray(parsed.skills)) {
      result.skills = parsed.skills.filter((skill: unknown) => {
        if (!skill || typeof skill !== 'object') return false;
        const s = skill as Record<string, unknown>;
        return (
          typeof s.name === 'string' &&
          s.name.trim() !== '' &&
          typeof s.category === 'string' &&
          s.category.trim() !== '' &&
          typeof s.confidence === 'number' &&
          s.confidence >= 0 &&
          s.confidence <= 1
        );
      });
    }

    // Parse archetype (validate against known archetypes)
    if (typeof parsed.archetype === 'string') {
      const normalized = parsed.archetype.toLowerCase().trim();
      if (ARCHETYPES.includes(normalized as Archetype)) {
        result.archetype = normalized;
      }
    }

    // Parse couldBe
    if (Array.isArray(parsed.couldBe)) {
      result.couldBe = parsed.couldBe.filter(
        (item: unknown) => typeof item === 'string' && item.trim() !== ''
      );
    }

    // Parse goodFor
    if (Array.isArray(parsed.goodFor)) {
      result.goodFor = parsed.goodFor.filter(
        (item: unknown) => typeof item === 'string' && item.trim() !== ''
      );
    }
  } catch {
    // Return empty result on parse error
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle warmup requests (from extension to avoid cold start)
    if (body.warmup === true) {
      return NextResponse.json(
        { success: true, warmup: true },
        { headers: corsHeaders }
      );
    }

    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    // Check rate limit
    const rateLimiter = getGlobalRateLimiter();
    if (!rateLimiter.isAllowed(clientIp)) {
      const resetTime = rateLimiter.getResetTime(clientIp);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'X-RateLimit-Remaining': '0',
            ...(resetTime && { 'X-RateLimit-Reset': String(resetTime) }),
          },
        }
      );
    }

    const { profile } = body;

    if (!profile || !profile.name || !profile.headline) {
      return NextResponse.json(
        { error: 'Missing required profile data (name, headline)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const prompt = buildPrompt(profile);

    // Use Vercel AI Gateway with Claude 3.5 Haiku
    // Billing handled by Vercel ($5 free credits/month)
    const { text, usage } = await generateText({
      model: 'anthropic/claude-3-5-haiku' as Parameters<typeof generateText>[0]['model'],
      prompt,
      maxOutputTokens: 1024,
    });

    if (!text) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 502, headers: corsHeaders }
      );
    }

    const intelligence = parseResponse(text);

    const remaining = rateLimiter.getRemainingRequests(clientIp);
    return NextResponse.json(
      {
        success: true,
        skills: intelligence.skills,
        archetype: intelligence.archetype,
        couldBe: intelligence.couldBe,
        goodFor: intelligence.goodFor,
        usage: {
          input_tokens: usage?.inputTokens,
          output_tokens: usage?.outputTokens,
        },
      },
      {
        headers: {
          ...corsHeaders,
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
