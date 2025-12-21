# Contact Consolidation Design

**Date:** 2025-12-21
**Status:** Ready for implementation

## Overview

Enable users to consolidate LinkedIn contacts with Google Contacts into a unified, deduplicated master contact list. Users review potential matches and choose which data to keep per field.

## Goals

- Unified contact list merging LinkedIn + Google sources
- Fuzzy matching for non-exact matches (name variations, missing middle names)
- User reviews and confirms matches via grouped cards UI
- Side-by-side field picker for merge decisions

## Matching Algorithm

### Multi-Signal Scoring (0-100)

| Signal | Weight | Logic |
|--------|--------|-------|
| LinkedIn URL in Google Contact | 50 pts | Exact match if Google has their LinkedIn URL |
| Name match (fuzzy) | 35 pts | Levenshtein + token matching |
| Employer match | 25 pts | Any shared company in history |
| Location match | 5 pts | Same region = slight boost |

### Name Matching Strategies

- Normalize: lowercase, remove accents, trim whitespace
- Token match: "John Smith" matches "Smith, John" (flipped)
- Partial match: "John David Smith" matches "John Smith" (missing middle)
- Nickname handling: "Bob" → "Robert", "Bill" → "William"

### Thresholds

- Score ≥ 80: High confidence (show first)
- Score 50-79: Medium confidence (potential match)
- Score < 50: Don't suggest as match

### Location Regions

```typescript
const REGIONS = [
  'Hong Kong',
  'US West Coast',
  'US East Coast',
  'UK',
  'Western Europe',
  'Southeast Asia',
];
```

## Data Model

### Contact Source Tracking

```typescript
interface ContactSource {
  id: string;
  contactId: string;        // Master contact ID
  source: 'linkedin' | 'google' | 'icloud';
  sourceId: string;         // LinkedIn ID, Google resourceName, etc.
  rawData: object;          // Original data from source
  importedAt: string;
}
```

### Pending Matches

```typescript
interface PendingMatch {
  id: string;
  userId: string;
  linkedinContactId: string;
  googleContactId: string;
  score: number;
  signals: {
    linkedinUrl: boolean;
    nameScore: number;
    employerMatch: boolean;
    locationMatch: boolean;
  };
  status: 'pending' | 'confirmed' | 'rejected';
  reviewedAt?: string;
}
```

### Master Contact (extended)

```typescript
interface Contact {
  // ... existing fields ...

  sources: Array<{
    type: 'linkedin' | 'google' | 'icloud';
    sourceId: string;
  }>;

  email?: string;      // From Google
  phone?: string;      // From Google
  googleId?: string;   // From Google
}
```

## OAuth Configuration

Request `contacts.readonly` scope at Google login:

```typescript
scopes: 'email profile https://www.googleapis.com/auth/contacts.readonly'
```

User sees: "Social Recall wants to: View your contacts" at Google login.

## Review UI (Grouped Cards)

Page: `/contacts/consolidate`

```
┌─────────────────────────────────────────────────────────┐
│  LinkedIn Contact                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Sarah Chen                                       │   │
│  │ VP Engineering @ Stripe                          │   │
│  │ San Francisco                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Potential Matches from Google (2 found)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 85% match                                        │   │
│  │ Sarah Chen • sarah.chen@gmail.com               │   │
│  │ Stripe (from employer field)                    │   │
│  │ [Select]                                        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 52% match                                        │   │
│  │ S. Chen • schen@company.com                     │   │
│  │ No employer info                                │   │
│  │ [Select]                                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [None of these match]           [Skip for now]        │
└─────────────────────────────────────────────────────────┘
```

Progress indicator: "12 of 47 contacts reviewed"

## Merge Dialog (Side-by-Side)

```
┌─────────────────────────────────────────────────────────┐
│  Merge Contact                                          │
├─────────────────────────────────────────────────────────┤
│  Name                                                   │
│  ○ Sarah Chen (LinkedIn)                               │
│  ○ Sarah J. Chen (Google)                              │
│  ○ Custom: [________________]                          │
├─────────────────────────────────────────────────────────┤
│  Email                                                  │
│  ○ (none) (LinkedIn)                                   │
│  ● sarah.chen@gmail.com (Google) ← auto-selected       │
│  ○ Custom: [________________]                          │
├─────────────────────────────────────────────────────────┤
│  Company                                                │
│  ● VP Engineering @ Stripe (LinkedIn) ← auto-selected  │
│  ○ Stripe Inc. (Google)                                │
│  ○ Custom: [________________]                          │
├─────────────────────────────────────────────────────────┤
│  Phone                                                  │
│  ○ (none) (LinkedIn)                                   │
│  ● +1 415-555-1234 (Google) ← auto-selected            │
│  ○ Custom: [________________]                          │
├─────────────────────────────────────────────────────────┤
│                    [Cancel]  [Merge Contact]            │
└─────────────────────────────────────────────────────────┘
```

Auto-selection logic:
- If one source has data and other doesn't → auto-select the one with data
- If both have data → prefer LinkedIn (user can change)
- Always show "Custom" option for manual override

## End-to-End Workflow

```
1. User logs in with Google (contacts.readonly scope granted)
                    ↓
2. User clicks "Import Google Contacts" button
                    ↓
3. System fetches all Google Contacts via People API
                    ↓
4. Matching engine runs:
   - For each Google Contact with LinkedIn URL → exact match
   - For others → fuzzy name + employer scoring
                    ↓
5. Results categorized:
   - Auto-merged: LinkedIn URL matches (no review needed)
   - Pending review: Score 50-99 (needs user confirmation)
   - No match: Score < 50 (create as new contact or skip)
                    ↓
6. User reviews pending matches on /contacts/consolidate
                    ↓
7. For each confirmed match → merge dialog → save
                    ↓
8. Unified contact list complete
```

## Registration Nudge Update

After 10 free profiles, show consolidation as key benefit:

```
┌─────────────────────────────────────────────────────────┐
│  You've saved 10 profiles                              │
│                                                         │
│  Create a free account to:                             │
│                                                         │
│  ✦ Unlimited LinkedIn contacts                         │
│  ✦ Import & merge Google Contacts                      │
│  ✦ Search "Who can help with X?"                       │
│  ✦ Never lose your network                             │
│                                                         │
│  [Continue with Google]                                │
│                                                         │
│  Your Google Contacts will be ready to consolidate     │
│  after sign-in.                                        │
└─────────────────────────────────────────────────────────┘
```

After signup, redirect to `/contacts/consolidate` with message:
"We found X Google Contacts to match with your LinkedIn network"

## Files to Create

| File | Purpose |
|------|---------|
| `lib/contact-matcher.ts` | Fuzzy matching algorithm |
| `lib/contact-matcher.test.ts` | TDD tests for matching |
| `lib/contact-consolidation.ts` | Merge logic, pending match management |
| `lib/contact-consolidation.test.ts` | TDD tests for consolidation |
| `app/contacts/consolidate/page.tsx` | Review UI (grouped cards) |
| `components/contacts/merge-dialog.tsx` | Side-by-side field picker |
| `components/contacts/match-card.tsx` | Single match card component |

## Database Migrations

- Add `contact_sources` table
- Add `pending_matches` table
- Add `google_id`, `email`, `phone` columns to contacts

## Test Cases

### Matcher Tests
- Exact LinkedIn URL match → 100%
- Same name + same employer → high score
- Flipped name "John Smith" / "Smith, John" → match
- Missing middle name → match
- Different names → no match
- Nickname matching (Bob/Robert) → match

### Consolidation Tests
- Auto-merge when LinkedIn URL matches
- Queue pending matches correctly
- Reject low-score matches
- Merge dialog field selection
- Custom value override

## Future Enhancements

- iCloud Contacts support
- Background sync (periodic re-fetch)
- Detect new contacts since last sync
- Bulk actions for review UI
