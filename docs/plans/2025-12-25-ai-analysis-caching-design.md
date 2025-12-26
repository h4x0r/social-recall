# AI Analysis Caching System Design

## Overview

Store AI analysis results in the master database so analyzed profiles don't need re-analysis when another user views them. Results are retrieved instantly from DB. Re-analysis triggers when profile information changes.

## Goals

1. **Instant results** - Return cached AI analysis immediately when available
2. **Shared cache** - All users benefit from previously analyzed profiles
3. **Freshness** - Re-analyze when profile data changes
4. **Data integrity** - Verify crowdsourced data via LinkedIn scraper
5. **Anonymous trial** - Allow ~10 profile views before requiring login

## Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   Extension     │────▶│  /api/profile-intelligence│────▶│   Supabase      │
│                 │     │                          │     │                 │
│  - linkedin_id  │     │  1. Upsert profile data  │     │ master_profiles │
│  - profile data │     │  2. Verify via scraper   │     │ + ai_analysis   │
└─────────────────┘     │  3. Check AI staleness   │     └─────────────────┘
                        │  4. Return/trigger AI    │
                        └──────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────┐
                        │  RapidAPI LinkedIn API   │
                        │  (verification)          │
                        └──────────────────────────┘
```

## Data Flow

1. Extension sends `linkedin_id` + extracted profile data to `/api/profile-intelligence`
2. API upserts profile data to `master_profiles`
3. For new/changed profiles: verify via RapidAPI LinkedIn scraper
4. Mark profile as `verified = true/false`
5. Check if AI analysis is stale (`ai_analyzed_at < last_updated_at`)
6. If stale: trigger new analysis via existing `/api/infer-skills`
7. Store analysis in `master_profile_ai_analysis` table
8. Return cached or fresh AI analysis to extension

## Database Schema

### New Table: `master_profile_ai_analysis`

```sql
CREATE TABLE master_profile_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,

  -- AI analysis results
  archetype TEXT,
  skills JSONB DEFAULT '[]',
  could_be JSONB DEFAULT '[]',
  good_for JSONB DEFAULT '[]',

  -- Metadata
  ai_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Audit
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by_ip TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_analysis_profile_latest
  ON master_profile_ai_analysis(master_profile_id, analyzed_at DESC);
```

### Additions to `master_profiles`

```sql
ALTER TABLE master_profiles ADD COLUMN
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  ai_analyzed_at TIMESTAMPTZ;
```

### New Table: `content_moderation_log`

```sql
CREATE TABLE content_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID REFERENCES master_profiles(id),
  field TEXT,
  flagged_content TEXT,
  reason TEXT,
  action_taken TEXT,
  contributor_ip TEXT,
  contributor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Existing: `/api/infer-skills` (unchanged)
- Direct AI inference
- Used internally by `/api/profile-intelligence`

### New: `/api/profile-intelligence`

```typescript
// Request
POST /api/profile-intelligence
{
  linkedin_id: string;
  profile_data: {
    name: string;
    headline: string;
    current_company?: string;
    // ... other fields
  };
  fingerprint?: string;  // Browser fingerprint for anomaly detection
}

// Response
{
  archetype: string;
  skills: string[];
  could_be: string[];
  good_for: string[];
  verified: boolean;      // Whether profile data was verified
  cached: boolean;        // Whether this was from cache
  analyzed_at: string;    // When analysis was performed
}
```

## Verification Strategy

### When to Verify

1. **First contribution** - New profile never seen before
2. **Anomaly triggered** - Suspicious changes detected (large changes, known bad fingerprint)

### Verification Process

1. Call RapidAPI LinkedIn Data API with `linkedin_id`
2. Compare returned data with contributed data
3. If match: `verified = true`
4. If mismatch: reject contribution, log to moderation
5. If scraper returns nothing: `verified = false`, trust but flag

### RapidAPI Integration

```typescript
const response = await fetch(
  `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=https://linkedin.com/in/${linkedin_id}`,
  {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com'
    }
  }
);
```

## Staleness Detection

Compare timestamps to determine if re-analysis needed:

```typescript
const isStale = profile.last_updated_at > profile.ai_analyzed_at;
```

If stale:
1. Trigger new AI analysis
2. Append to `master_profile_ai_analysis` (history preserved)
3. Update `master_profiles.ai_analyzed_at`

## Rate Limiting

| User Type     | Profile Views | Contributions | AI Triggers |
|---------------|---------------|---------------|-------------|
| Anonymous     | 10/day        | 5/day         | 5/day       |
| Authenticated | Unlimited     | 100/day       | 50/day      |

Rate limit by:
- IP address for anonymous
- User ID for authenticated
- Browser fingerprint for anomaly detection

## Content Moderation

### Profanity Filter

Apply to all contributed text fields:
- `name`
- `headline`
- `about`
- Company names
- Position titles

### Actions on Flag

1. Reject contribution
2. Log to `content_moderation_log`
3. Consider fingerprint for future anomaly detection

## UI: Unverified Indicator

For profiles where `verified = false`:

```
┌─────────────────────────────────────┐
│  JOHN SMITH  ?                      │  ← muted gray question mark
│  Senior Engineer at Tech Corp       │
│─────────────────────────────────────│
│  Archetype: Builder                 │
```

- Small `?` icon next to name in muted gray
- Tooltip on hover: "Profile data from community - not yet verified"
- No indicator for verified profiles (clean default)

## Security Considerations

1. **Data Poisoning** - Mitigated via scraper verification + history/rollback
2. **Rate Limiting** - Prevents abuse from single IP/fingerprint
3. **Content Moderation** - Filters inappropriate content
4. **Audit Trail** - Full history of contributions and analyses

## Implementation Plan

1. Create database migration for new tables/columns
2. Implement `/api/profile-intelligence` endpoint
3. Integrate RapidAPI LinkedIn scraper
4. Add profanity filter
5. Update extension `ai-client.ts` to use new endpoint
6. Add unverified indicator to panel UI
7. Add rate limiting middleware

## Environment Variables

```
RAPIDAPI_KEY=<your-rapidapi-key>
```

Already configured in:
- `.env.local` (local development)
- Vercel (production, preview, development)
