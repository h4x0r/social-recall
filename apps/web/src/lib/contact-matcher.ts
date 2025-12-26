/**
 * Contact matching algorithm for fuzzy matching between LinkedIn and Google contacts
 * Uses multi-signal scoring: LinkedIn URL, name, employer, location
 */

export interface LinkedInContact {
  id: string;
  linkedinId: string;
  name: string;
  headline?: string;
  location?: string;
  employers?: Array<{ company: string; title?: string }>;
}

export interface GoogleContact {
  resourceName: string;
  name: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string | null;
  organization?: string | null;
  location?: string;
}

export interface MatchSignals {
  linkedinUrl: boolean;
  nameScore: number;
  employerMatch: boolean;
  locationMatch: boolean;
}

export interface MatchResult {
  linkedInContact: LinkedInContact;
  googleContact: GoogleContact;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  signals: MatchSignals;
}

// Nickname mappings for common name variations
export const NICKNAME_MAP: Record<string, string> = {
  bob: 'robert',
  rob: 'robert',
  bobby: 'robert',
  bill: 'william',
  will: 'william',
  billy: 'william',
  mike: 'michael',
  mick: 'michael',
  mikey: 'michael',
  jim: 'james',
  jimmy: 'james',
  jamie: 'james',
  joe: 'joseph',
  joey: 'joseph',
  tom: 'thomas',
  tommy: 'thomas',
  dick: 'richard',
  rick: 'richard',
  rich: 'richard',
  ricky: 'richard',
  dave: 'david',
  dan: 'daniel',
  danny: 'daniel',
  matt: 'matthew',
  chris: 'christopher',
  tony: 'anthony',
  nick: 'nicholas',
  alex: 'alexander',
  sam: 'samuel',
  sammy: 'samuel',
  steve: 'steven',
  stevie: 'steven',
  ed: 'edward',
  eddie: 'edward',
  ted: 'theodore',
  teddy: 'theodore',
  jack: 'john',
  johnny: 'john',
  kate: 'katherine',
  katie: 'katherine',
  kathy: 'katherine',
  liz: 'elizabeth',
  lizzy: 'elizabeth',
  beth: 'elizabeth',
  betty: 'elizabeth',
  jen: 'jennifer',
  jenny: 'jennifer',
  sue: 'susan',
  susie: 'susan',
  pat: 'patricia',
  patty: 'patricia',
  meg: 'margaret',
  maggie: 'margaret',
  peggy: 'margaret',
};

// US West Coast regions
const US_WEST_COAST = [
  'california', 'ca', 'san francisco', 'sf', 'los angeles', 'la', 'san diego',
  'seattle', 'washington', 'wa', 'portland', 'oregon', 'or', 'silicon valley',
  'bay area', 'palo alto', 'mountain view', 'sunnyvale', 'cupertino', 'menlo park',
];

// US East Coast regions
const US_EAST_COAST = [
  'new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'boston', 'massachusetts', 'ma',
  'washington dc', 'dc', 'philadelphia', 'pa', 'miami', 'florida', 'fl', 'atlanta',
  'georgia', 'ga', 'new jersey', 'nj', 'connecticut', 'ct',
];

// Other regions
const REGIONS: Record<string, string[]> = {
  'us-west': US_WEST_COAST,
  'us-east': US_EAST_COAST,
  'uk': ['london', 'uk', 'united kingdom', 'england', 'manchester', 'birmingham', 'scotland', 'wales'],
  'hong-kong': ['hong kong', 'hk', 'kowloon', 'central'],
  'singapore': ['singapore', 'sg'],
  'western-europe': ['germany', 'france', 'paris', 'berlin', 'amsterdam', 'netherlands', 'spain', 'madrid', 'barcelona', 'italy', 'rome', 'milan'],
  'australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'],
};

/**
 * Normalize a name for matching:
 * - Convert to lowercase
 * - Remove accents
 * - Trim whitespace
 * - Collapse multiple spaces
 */
export function normalizeNameForMatching(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Expand nicknames to their canonical form
 */
function expandNicknames(tokens: string[]): string[] {
  return tokens.map(token => NICKNAME_MAP[token] || token);
}

/**
 * Check if two sets of name tokens match
 * Handles: flipped names, missing middle names, nicknames
 */
export function tokensMatch(name1: string, name2: string): boolean {
  const tokens1 = expandNicknames(name1.split(' ').filter(Boolean));
  const tokens2 = expandNicknames(name2.split(' ').filter(Boolean));

  if (tokens1.length === 0 || tokens2.length === 0) return false;

  // Get the smaller and larger sets
  const [smaller, larger] = tokens1.length <= tokens2.length
    ? [tokens1, tokens2]
    : [tokens2, tokens1];

  // Check if all tokens in the smaller set are present in the larger set
  // This handles: missing middle names, flipped order
  let matchCount = 0;
  for (const token of smaller) {
    if (larger.includes(token)) {
      matchCount++;
    }
  }

  // Require at least 2 matching tokens, or all tokens if only 1-2 tokens
  const minRequired = smaller.length <= 2 ? smaller.length : 2;
  return matchCount >= minRequired;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate name match score (0-35 points)
 */
export function calculateNameScore(name1: string, name2: string): number {
  const normalized1 = normalizeNameForMatching(name1);
  const normalized2 = normalizeNameForMatching(name2);

  // Remove commas (for "Smith, John" format)
  const clean1 = normalized1.replace(/,/g, '');
  const clean2 = normalized2.replace(/,/g, '');

  // Exact match after normalization
  if (clean1 === clean2) return 35;

  // Token-based matching (handles flipped names, missing middle names)
  if (tokensMatch(clean1, clean2)) return 35;

  // Fuzzy match using Levenshtein distance
  const maxLen = Math.max(clean1.length, clean2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(clean1, clean2);
  const similarity = 1 - distance / maxLen;

  // Only give points if similarity is reasonably high
  if (similarity >= 0.8) return Math.round(35 * similarity);
  if (similarity >= 0.6) return Math.round(25 * similarity);

  return 0;
}

/**
 * Extract LinkedIn ID from a URL
 */
function extractLinkedInId(url: string): string | null {
  if (!url) return null;

  // Handle various URL formats
  const patterns = [
    /linkedin\.com\/in\/([^\/\?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Check if employer matches
 */
function checkEmployerMatch(linkedin: LinkedInContact, google: GoogleContact): boolean {
  if (!google.organization || !linkedin.employers?.length) return false;

  const googleOrg = google.organization.toLowerCase();

  for (const emp of linkedin.employers) {
    if (!emp.company) continue;
    const linkedinOrg = emp.company.toLowerCase();

    // Check if one contains the other (e.g., "Stripe" vs "Stripe Inc.")
    if (googleOrg.includes(linkedinOrg) || linkedinOrg.includes(googleOrg)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect which region a location belongs to
 */
function detectRegion(location: string): string | null {
  if (!location) return null;

  const normalized = location.toLowerCase();

  for (const [region, keywords] of Object.entries(REGIONS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return region;
      }
    }
  }

  return null;
}

/**
 * Check if locations are in the same region
 */
function checkLocationMatch(linkedin: LinkedInContact, google: GoogleContact): boolean {
  if (!linkedin.location || !google.location) return false;

  const region1 = detectRegion(linkedin.location);
  const region2 = detectRegion(google.location);

  if (region1 && region2 && region1 === region2) {
    return true;
  }

  return false;
}

/**
 * Calculate overall match score between LinkedIn and Google contacts
 *
 * Scoring:
 * - LinkedIn URL match: 50 points (auto-confirms identity)
 * - Name match (fuzzy): 0-35 points
 * - Employer match: 25 points
 * - Location match: 5 points
 *
 * Maximum: 115 points (capped at 100)
 *
 * Thresholds:
 * - ≥80: High confidence
 * - 50-79: Medium confidence
 * - <50: Low confidence (don't suggest)
 */
export function calculateMatchScore(
  linkedin: LinkedInContact,
  google: GoogleContact
): MatchResult {
  const signals: MatchSignals = {
    linkedinUrl: false,
    nameScore: 0,
    employerMatch: false,
    locationMatch: false,
  };

  let score = 0;

  // LinkedIn URL match - highest confidence signal (auto 100)
  if (google.linkedinUrl) {
    const googleLinkedInId = extractLinkedInId(google.linkedinUrl);
    if (googleLinkedInId && googleLinkedInId === linkedin.linkedinId.toLowerCase()) {
      signals.linkedinUrl = true;
      // LinkedIn URL is definitive - automatically return 100
      return {
        linkedInContact: linkedin,
        googleContact: google,
        score: 100,
        confidence: 'high',
        signals: {
          ...signals,
          nameScore: calculateNameScore(linkedin.name, google.name),
          employerMatch: checkEmployerMatch(linkedin, google),
          locationMatch: checkLocationMatch(linkedin, google),
        },
      };
    }
  }

  // Name match (0-35 points)
  signals.nameScore = calculateNameScore(linkedin.name, google.name);
  score += signals.nameScore;

  // Employer match (25 points)
  if (checkEmployerMatch(linkedin, google)) {
    signals.employerMatch = true;
    score += 25;
  }

  // Location match (5 points)
  if (checkLocationMatch(linkedin, google)) {
    signals.locationMatch = true;
    score += 5;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (score >= 80) {
    confidence = 'high';
  } else if (score >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    linkedInContact: linkedin,
    googleContact: google,
    score,
    confidence,
    signals,
  };
}
