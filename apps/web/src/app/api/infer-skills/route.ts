import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';

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
    const { profile } = await request.json();

    if (!profile || !profile.name || !profile.headline) {
      return NextResponse.json(
        { error: 'Missing required profile data (name, headline)' },
        { status: 400 }
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
        { status: 502 }
      );
    }

    const skills = parseResponse(text);

    return NextResponse.json({
      success: true,
      skills,
      usage: {
        input_tokens: usage?.inputTokens,
        output_tokens: usage?.outputTokens,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
