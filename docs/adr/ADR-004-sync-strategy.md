# ADR-004: Contact Sync Strategy

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-12-20 |
| **Deciders** | Product Team |
| **Related PRD** | PRD-001 |
| **Related ADR** | ADR-002 |

---

## Context

The CRM must integrate with three contact sources:

1. **LinkedIn** — Primary source for professional contacts
2. **Google Contacts** — Syncs to Android phones, widely used
3. **iCloud Contacts** — Syncs to iPhones, Apple ecosystem

Each platform has different API capabilities and limitations:

| Platform | API Access | Auth | Limitations |
|----------|------------|------|-------------|
| LinkedIn | None (official) | N/A | Scraping via extension only |
| Google | People API | OAuth 2.0 | 60 req/min, full CRUD |
| iCloud | CardDAV / CloudKit | App-specific password | Complex auth, Apple dev account |

---

## Decision

### Source of Truth: CRM is the Hub

```
LinkedIn ──────► CRM (Hub) ◄────── Google Contacts
    (read)          │      (read/write)
                    │
                    └──────► iCloud Contacts
                            (read/write, Phase 2)
```

- CRM is the canonical source for all contact data
- External platforms are secondary
- Conflicts resolved in favor of CRM

### Sync Modes (Per Contact)

| Mode | Description | Use Case |
|------|-------------|----------|
| `crm_only` | Not synced externally | LinkedIn-sourced contacts you don't need on phone |
| `import_only` | Pulled from external, never pushed | Google contacts you want to enrich but not modify |
| `bidirectional` | Two-way sync | Key contacts you want on your phone with caller ID |

### LinkedIn Integration

**Method:** Chrome extension scraping (client-side)

**Flow:**
```
User visits LinkedIn profile
    │
    ▼
Extension extracts: name, headline, employers, profile ID
    │
    ▼
Extension sends to Supabase API
    │
    ▼
Backend upserts contact, triggers AI skill inference
    │
    ▼
Extension receives: contact ID, skills, opportunities
```

**Data Captured:**
- `linkedin_profile_id` (unique identifier)
- `linkedin_url`
- `name`
- `headline`
- `employers[]` (company, title, logo, is_current)
- `scraped_at` timestamp

**Job Change Detection:**
```
Previous employers: [IBM, Deloitte]
Current employers: [StealthStartup (Founder)]
    │
    ▼
Detected: "left_company" (IBM, Deloitte)
Detected: "started_company" (StealthStartup + Founder title)
    │
    ▼
Create opportunity record
```

### Google Contacts Integration

**API:** Google People API v1

**Auth Flow:**
1. User clicks "Connect Google" in Settings
2. OAuth 2.0 flow with scopes: `contacts.readonly`, `contacts`
3. Store access/refresh tokens (encrypted) in `sync_credentials`

**Inbound Sync (Google → CRM):**
```
Schedule: Every 24 hours OR on-demand

1. Fetch contacts modified since last sync (use syncToken)
2. For each contact:
   a. Match to existing CRM contact (email > phone > name)
   b. If match: merge data (CRM fields take precedence)
   c. If no match: create new contact with source='google'
3. Update sync cursor
```

**Outbound Sync (CRM → Google):**
```
Trigger: Contact updated with sync_to_google=true

1. Check if google_contact_id exists
   a. If yes: update existing Google contact
   b. If no: create new Google contact, store ID
2. Map fields (see field mapping below)
3. Handle errors (rate limits, auth failures)
```

**Field Mapping:**

| CRM Field | Google Field | Direction |
|-----------|--------------|-----------|
| `name` | `names[0].displayName` | ↔ Bidirectional |
| `email` | `emailAddresses[0].value` | ↔ Bidirectional |
| `phone` | `phoneNumbers[0].value` | ↔ Bidirectional |
| `photo_url` | `photos[0].url` | → CRM to Google (don't overwrite) |
| `headline` | `organizations[0].title` | → CRM to Google only |
| `notes` | `biographies[0].value` | ↔ Bidirectional |
| `skills` | N/A | Not synced |
| `linkedin_url` | `urls[0].value` | → CRM to Google only |

### iCloud Integration (Phase 2)

**Method:** CardDAV protocol OR CloudKit JS

**Challenges:**
- Requires Apple Developer account
- App-specific passwords for CardDAV
- CloudKit requires signed requests

**Proposed Approach (Phase 2):**
1. Use CardDAV with app-specific password
2. Library: `tsdav` (TypeScript DAV client)
3. Same sync logic as Google, different protocol

### Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| Both modified, same field | CRM wins, log conflict for review |
| External deleted | Mark `archived_at` in CRM, don't hard delete |
| CRM deleted | Delete from external if bidirectional |
| External added | Import to CRM with `source='google'` |
| Network failure | Retry with exponential backoff, max 3 attempts |

### Deduplication Logic

**Match Priority:**
1. `email` (exact match, case-insensitive)
2. `phone` (normalized, strip formatting)
3. `linkedin_profile_id` (exact match)
4. `name` (fuzzy match, Levenshtein distance < 3)

**Merge Strategy:**
- Keep CRM data for conflicting fields
- Merge arrays (employers, skills)
- Prefer non-null values

---

## Sync State Management

### Database Tables

```sql
-- Credentials (encrypted)
sync_credentials (
    user_id,
    provider,         -- 'google' | 'icloud'
    access_token,     -- AES-256 encrypted
    refresh_token,    -- AES-256 encrypted
    token_expires_at,
    last_sync_at,
    sync_cursor       -- Google: syncToken, iCloud: ctag
)

-- Per-contact mapping
sync_mappings (
    contact_id,
    provider,
    external_id,      -- Google/iCloud contact ID
    sync_direction,   -- 'import_only' | 'bidirectional'
    last_synced_at,
    last_synced_hash  -- MD5 of synced fields for conflict detection
)
```

### Incremental Sync

**Google:**
- Use `syncToken` from People API
- Returns only contacts modified since last sync
- Full sync if token expired (>7 days)

**iCloud:**
- Use `ctag` (collection tag) from CardDAV
- Returns changed vcards since last sync

---

## Error Handling

| Error | Handling |
|-------|----------|
| OAuth token expired | Refresh using refresh_token, retry |
| Refresh token revoked | Mark credentials invalid, prompt re-auth |
| Rate limit (429) | Exponential backoff, max 5 minutes |
| Network timeout | Retry 3x with backoff |
| Invalid contact data | Skip contact, log error, continue sync |
| Partial sync failure | Commit successful changes, retry failed |

---

## Alternatives Considered

### One-Way Import Only

**Pros:** Simpler, no conflict resolution
**Cons:** Contacts don't appear on phone, limited utility
**Decision:** Rejected — caller ID is a key value prop

### Full Two-Way Sync (All Contacts)

**Pros:** Complete sync
**Cons:** LinkedIn scrapes pollute Google Contacts
**Decision:** Rejected — selective sync gives user control

### Real-Time Sync

**Pros:** Instant updates
**Cons:** Complex webhook setup, API limits
**Decision:** Rejected for MVP — 24h sync is sufficient

### Third-Party Sync Service

**Pros:** Less code to write
**Cons:** Cost, data privacy, another dependency
**Decision:** Rejected — build in-house for control

---

## Consequences

### Positive

- User controls which contacts sync to phone
- Caller ID works for important contacts
- Clean separation of concerns
- Portable implementation (standard OAuth, CardDAV)

### Negative

- Two-way sync adds complexity
- Conflict resolution edge cases
- Need to handle API rate limits
- iCloud integration is non-trivial

### Security Considerations

- OAuth tokens encrypted at rest (AES-256)
- Refresh tokens stored server-side only
- User can revoke access anytime
- No LinkedIn credentials stored (extension-based)

---

## Implementation Phases

### Phase 1 (MVP)
- LinkedIn → CRM (extension)
- Google → CRM (import)
- CRM → Google (selective export)

### Phase 2
- iCloud → CRM (import)
- CRM → iCloud (selective export)
- Improved deduplication

### Phase 3
- Webhook-based real-time sync
- Bulk import tools
- Sync conflict dashboard

---

## References

- [Google People API](https://developers.google.com/people)
- [CardDAV RFC 6352](https://datatracker.ietf.org/doc/html/rfc6352)
- [Apple CloudKit JS](https://developer.apple.com/documentation/cloudkitjs)
- [tsdav Library](https://github.com/natelindev/tsdav)
