# Master Profiles & Admin Portal Design

## Overview

Migrate from per-user contact storage to a shared master profiles architecture with crowdsourced contributions, conflict resolution, and a network visualization admin portal.

## Goals

1. **Deduplicated profiles** — One canonical record per LinkedIn person, shared across all users
2. **Contribution tracking** — All observations recorded with contributor identity
3. **Conflict resolution** — Admin resolves conflicting contributions
4. **Network visualization** — Tarot card spread UI showing introduction chains and occasion groupings
5. **Avatar persistence** — Download and store avatars in Cloudflare R2

## Data Model

### Schema Updates to `user_profile_data`

Split `relationship_context` into:
- `occasion TEXT` — Event/place name (e.g., "DEF CON", "YC W24")
- `occasion_date TEXT` — Variable precision date (e.g., "2024", "2024-03", "2024-03-15", or `null`)

Drop `profile_url` column from `master_profiles` (derive from `linkedin_id`).

### New Table: `master_profile_contributions`

```sql
CREATE TABLE master_profile_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  contributed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN (
    'name', 'headline', 'location', 'avatar',
    'employers', 'education', 'certifications', 'skills',
    'about', 'projects', 'publications',
    'services', 'languages', 'websites'
  )),
  value JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Column on `master_profiles`

- `about TEXT` — Bio/summary
- `avatar_path TEXT` — R2 storage path (replaces `avatar_url`)

### New Supporting Tables

```sql
-- Certifications & Licenses
CREATE TABLE master_profile_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date TEXT,  -- Variable precision
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills
CREATE TABLE master_profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Languages
CREATE TABLE master_profile_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  proficiency TEXT,  -- e.g., "Native", "Professional", "Elementary"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE master_profile_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publications
CREATE TABLE master_profile_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publisher TEXT,
  url TEXT,
  date TEXT,  -- Variable precision
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE master_profile_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Websites
CREATE TABLE master_profile_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  label TEXT,  -- e.g., "Portfolio", "Blog"
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tracked Fields

**Core profile:** name, headline, location, avatar

**Career:** employers, education, certifications, skills, languages

**Content:** about/summary, projects, publications

**Offerings:** services, websites

## Sync Flow

### Current Flow (to be replaced)
```
Extension → POST /api/contacts/sync → ContactRepository.upsertFromLinkedIn()
         → writes to per-user `contacts` table
```

### New Flow
```
Extension → POST /api/contacts/sync → MasterProfileRepository.syncFromExtension()
         → upserts `master_profiles` (canonical)
         → creates `master_profile_contributions` if conflict detected
         → upserts `user_profile_data` (user's relationship info)
         → downloads avatar to Cloudflare R2 if changed
```

### Contribution Logic

1. User syncs a profile
2. Compare incoming data against current `master_profiles` record
3. For each field that differs:
   - **No canonical value exists** → auto-accept (first wins)
   - **Canonical value exists** → check for conflicts:
     - **Concurrent?** Another user submitted different value within 24 hours → create `pending`
     - **Rollback?** Value matches a previously rejected contribution → create `pending`
     - **Neither?** Auto-accept, update canonical value
4. All contributions recorded in history regardless of status

### Avatar Handling

1. Extension sends `avatarUrl` (LinkedIn CDN URL)
2. Server downloads image from CDN
3. Upload to Cloudflare R2: `avatars/{linkedin_id}.jpg`
4. Store path in `master_profiles.avatar_path`
5. Serve via public R2 URL: `https://pub-b1e6091a17de4ee787f837b66925c879.r2.dev/avatars/{linkedin_id}.jpg`

## Admin UI

### Profile Page (Primary View)

**Top section — LinkedIn-style card:**
- Avatar (from R2)
- Name, headline, location
- Occasion + date (how you met)
- Introduced by (link to their profile card)

**Body sections — expandable:**
- Employers (work history timeline)
- Education
- Certifications & Skills
- Languages
- About/Summary
- Projects & Publications
- Services & Websites

### Network Visualization

**Tarot card spread layout:**
- Each profile = card
- Lines connecting cards = introduction relationships
- Cloud borders grouping cards = shared occasion
- Toggle: group by occasion only vs. occasion + date

### Collapsible Timeline (GitHub-style)

- Chronological list of all contributions
- Each entry shows: field changed, old → new diff, timestamp
- Admin-only: contributor identity, resolve button for pending conflicts
- Status badges: accepted ✓, rejected ✗, pending ⏳

### Access Control

- **All authenticated users:** Browse profiles, view network visualization
- **Admins only:** See contributor identity, resolve conflicts

## API Endpoints

### Master Profile APIs
- `GET /api/admin/profiles` — List all master profiles (paginated, searchable)
- `GET /api/admin/profiles/[linkedinId]` — Get single profile with all data
- `GET /api/admin/profiles/[linkedinId]/contributions` — Contribution history
- `POST /api/admin/profiles/[linkedinId]/resolve` — Resolve pending contribution (admin-only)

### Network APIs
- `GET /api/admin/network` — Get profiles with introduction relationships
- `GET /api/admin/network/occasions` — List all occasions for grouping

### Avatar API
- `POST /api/admin/avatars/upload` — Download avatar from URL to R2

### Updated Sync API
- `POST /api/contacts/sync` — Modified to use `MasterProfileRepository`

## Extension Changes

### New Fields to Scrape
- Certifications (name, issuer, dates)
- Skills (list with categories if available)
- Languages (language + proficiency)
- About/Summary (bio text)
- Projects (name, description, URL)
- Publications (title, publisher, URL, date)
- Services (from "Providing services" section)
- Websites (from contact info)

### Updated Sync Payload
```typescript
interface ExtensionContactData {
  profileId: string;
  name: string;
  headline?: string;
  avatarUrl?: string;
  location?: string;
  employers?: Employer[];
  education?: Education[];
  certifications?: Certification[];
  skills?: string[];
  languages?: Language[];
  about?: string;
  projects?: Project[];
  publications?: Publication[];
  services?: string[];
  websites?: Website[];
}
```

## Infrastructure

### Cloudflare R2 Configuration
- **Bucket:** `social-recall-avatars`
- **Public URL:** `https://pub-b1e6091a17de4ee787f837b66925c879.r2.dev`
- **Account ID:** `3c4b34858832e55c79a33b9bc167e241`

### Environment Variables
```bash
CLOUDFLARE_ACCOUNT_ID=3c4b34858832e55c79a33b9bc167e241
CLOUDFLARE_R2_ACCESS_KEY_ID=<secret>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret>
CLOUDFLARE_R2_BUCKET=social-recall-avatars
CLOUDFLARE_R2_PUBLIC_URL=https://pub-b1e6091a17de4ee787f837b66925c879.r2.dev
```

## Testing Strategy

### Unit Tests
- `MasterProfileRepository` — upsert, contribution logic, conflict detection
- Contribution conflict detection — concurrent submissions, rollback detection
- Avatar download and R2 upload

### Integration Tests
- Sync API → MasterProfileRepository → contributions created correctly
- Conflict resolution flow — pending → accepted/rejected
- Access control — regular user vs admin permissions

### E2E Tests
- Extension scrapes profile → sync → master profile created
- Admin views profile → resolves conflict → canonical updated
- Network visualization renders with occasion groupings

## Migration Plan

1. Create new database tables (migration)
2. Add R2 upload utility
3. Update `MasterProfileRepository` with contribution logic
4. Update sync API to use new repository
5. Build admin profile browser UI
6. Build network visualization
7. Build contribution timeline with diff view
8. Update extension to scrape additional fields
9. Migrate existing `contacts` data to `master_profiles` (optional)
