/**
 * LinkedIn Profile Verifier
 * Uses RapidAPI LinkedIn Data API to verify crowdsourced profile data
 */

export interface ContributedProfileData {
  name: string;
  headline: string;
}

export interface LinkedInVerificationResult {
  verified: boolean;
  match?: boolean;
  notFound?: boolean;
  mismatchFields?: string[];
  rateLimited?: boolean;
  error?: string;
}

interface RapidAPIResponse {
  firstName?: string;
  lastName?: string;
  headline?: string;
}

/**
 * Verify a LinkedIn profile against RapidAPI data
 */
export async function verifyLinkedInProfile(
  linkedinId: string,
  contributed: ContributedProfileData
): Promise<LinkedInVerificationResult> {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return {
      verified: false,
      error: 'RAPIDAPI_KEY not configured',
    };
  }

  try {
    const url = `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=https://linkedin.com/in/${linkedinId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      return {
        verified: false,
        rateLimited: true,
      };
    }

    // Handle API errors
    if (!response.ok) {
      return {
        verified: false,
        error: `API returned status ${response.status}`,
      };
    }

    const data: RapidAPIResponse | null = await response.json();

    // Profile not found on LinkedIn
    if (!data) {
      return {
        verified: false,
        notFound: true,
      };
    }

    // Compare data
    const mismatchFields: string[] = [];

    // Compare name (combine first + last from API)
    const apiFullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    if (apiFullName && contributed.name !== apiFullName) {
      // Allow partial name matches (case insensitive)
      const contributedLower = contributed.name.toLowerCase();
      const apiLower = apiFullName.toLowerCase();
      if (!contributedLower.includes(apiLower) && !apiLower.includes(contributedLower)) {
        mismatchFields.push('name');
      }
    }

    // Compare headline
    if (data.headline && contributed.headline !== data.headline) {
      // Allow partial headline matches
      const contributedLower = contributed.headline.toLowerCase();
      const apiLower = data.headline.toLowerCase();
      if (!contributedLower.includes(apiLower) && !apiLower.includes(contributedLower)) {
        mismatchFields.push('headline');
      }
    }

    if (mismatchFields.length > 0) {
      return {
        verified: false,
        match: false,
        mismatchFields,
      };
    }

    return {
      verified: true,
      match: true,
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
