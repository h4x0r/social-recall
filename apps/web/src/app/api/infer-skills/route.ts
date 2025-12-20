import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

interface Employer {
  company: string;
  logo: string;
}

interface ProfileData {
  name: string;
  headline: string;
  employers?: Employer[];
  notes?: string;
}

interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

function buildPrompt(profile: ProfileData): string {
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

function parseResponse(text: string): InferredSkill[] {
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      return [];
    }

    return parsed.skills.filter((skill: unknown) => {
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
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { profile } = await request.json();

    if (!profile || !profile.name || !profile.headline) {
      return NextResponse.json(
        { error: 'Missing required profile data (name, headline)' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(profile);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
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
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return NextResponse.json(
        { error: `Claude API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'Empty response from Claude' },
        { status: 502 }
      );
    }

    const skills = parseResponse(text);

    return NextResponse.json({
      success: true,
      skills,
      usage: {
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
