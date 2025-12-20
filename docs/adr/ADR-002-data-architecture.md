# ADR-002: Data Architecture

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-12-20 |
| **Deciders** | Product Team |
| **Related PRD** | PRD-001 |
| **Related ADR** | ADR-001 |

---

## Context

We need to design a data model that supports:

1. Contacts with rich metadata (LinkedIn, employment history, notes)
2. Hierarchical skills taxonomy
3. AI-inferred skills with confidence scores
4. Opportunity detection based on career changes
5. Bi-directional sync with Google Contacts and iCloud
6. Single-user MVP with path to multi-user

---

## Decision

### Database: PostgreSQL via Supabase

We will use PostgreSQL with the following schema design principles:

- **Normalized structure** for data integrity
- **Soft deletes** for data recovery
- **Audit timestamps** on all tables
- **UUID primary keys** for distributed-friendly IDs
- **Row-Level Security (RLS)** for future multi-tenancy

### Core Schema

```sql
-- Users (managed by Supabase Auth)
-- auth.users is the source of truth

-- Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    photo_url TEXT,
    headline TEXT,
    notes TEXT,

    -- LinkedIn data
    linkedin_profile_id TEXT,
    linkedin_url TEXT,

    -- Sync flags
    sync_to_google BOOLEAN DEFAULT FALSE,
    sync_to_icloud BOOLEAN DEFAULT FALSE,
    google_contact_id TEXT,
    icloud_contact_id TEXT,

    -- Metadata
    source TEXT DEFAULT 'manual', -- 'linkedin', 'google', 'icloud', 'manual'
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, linkedin_profile_id)
);

-- Employment history
CREATE TABLE contact_employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    company_name TEXT NOT NULL,
    company_logo_url TEXT,
    title TEXT,
    is_current BOOLEAN DEFAULT FALSE,

    started_at DATE,
    ended_at DATE,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills taxonomy (hierarchical)
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES skills(id),
    level INT NOT NULL DEFAULT 0, -- 0=category, 1=subcategory, 2=skill
    sort_order INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact-skill associations
CREATE TABLE contact_skills (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

    confidence FLOAT DEFAULT 1.0, -- 0.0 to 1.0
    confirmed BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'manual', -- 'ai_inferred', 'manual', 'linkedin'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (contact_id, skill_id)
);

-- Opportunities (detected career changes)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    type TEXT NOT NULL, -- 'left_company', 'started_company', 'became_investor', etc.
    title TEXT NOT NULL,
    description TEXT,

    old_employer TEXT,
    new_employer TEXT,

    detected_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    actioned_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync credentials (encrypted)
CREATE TABLE sync_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google', 'icloud'

    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMPTZ,

    last_sync_at TIMESTAMPTZ,
    sync_cursor TEXT, -- for incremental sync

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, provider)
);

-- Sync mappings (contact <-> external ID)
CREATE TABLE sync_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,

    sync_direction TEXT DEFAULT 'import_only', -- 'import_only', 'bidirectional'
    last_synced_at TIMESTAMPTZ,
    last_synced_hash TEXT, -- for conflict detection

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(contact_id, provider),
    UNIQUE(provider, external_id)
);

-- Indexes
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_linkedin ON contacts(linkedin_profile_id);
CREATE INDEX idx_contacts_name ON contacts(user_id, name);
CREATE INDEX idx_contact_employers_contact ON contact_employers(contact_id);
CREATE INDEX idx_contact_employers_current ON contact_employers(contact_id, is_current);
CREATE INDEX idx_skills_parent ON skills(parent_id);
CREATE INDEX idx_skills_level ON skills(level);
CREATE INDEX idx_contact_skills_contact ON contact_skills(contact_id);
CREATE INDEX idx_contact_skills_skill ON contact_skills(skill_id);
CREATE INDEX idx_opportunities_user ON opportunities(user_id);
CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_pending ON opportunities(user_id, dismissed_at) WHERE dismissed_at IS NULL;

-- Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only access their own data)
CREATE POLICY contacts_user_policy ON contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY employers_user_policy ON contact_employers
    FOR ALL USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

CREATE POLICY contact_skills_user_policy ON contact_skills
    FOR ALL USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

CREATE POLICY opportunities_user_policy ON opportunities
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY sync_credentials_user_policy ON sync_credentials
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY sync_mappings_user_policy ON sync_mappings
    FOR ALL USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

-- Skills table is public read (shared taxonomy)
CREATE POLICY skills_read_policy ON skills FOR SELECT USING (true);
```

### Key Design Decisions

#### 1. Source of Truth

The CRM is the source of truth. External systems (Google, iCloud) are secondary:
- Conflicts resolved in favor of CRM data
- External deletions result in archive, not hard delete

#### 2. Skill Confidence Model

- `confidence`: Float 0-1 representing AI certainty
- `confirmed`: Boolean for human verification
- `source`: Tracks origin (AI, manual, LinkedIn)

This enables:
- Showing "~" for unconfirmed skills
- Filtering by confirmed-only
- Tracking AI accuracy over time

#### 3. Opportunity Lifecycle

States: `detected` → `dismissed` | `snoozed` | `actioned`

- `dismissed_at`: User explicitly dismissed
- `snoozed_until`: Temporarily hidden
- `actioned_at`: User took action (reached out, etc.)

#### 4. Sync State Management

- `sync_cursor`: Enables incremental sync (don't re-fetch everything)
- `last_synced_hash`: Detect if external record changed
- `sync_direction`: Controls write-back behavior

---

## Alternatives Considered

### NoSQL (MongoDB/Firebase)

**Pros:** Flexible schema, easy nesting
**Cons:** No joins, harder to enforce relationships, less portable
**Decision:** Rejected — relational model fits our hierarchical skills and linked entities

### Denormalized Schema

**Pros:** Faster reads, simpler queries
**Cons:** Update anomalies, data duplication
**Decision:** Rejected — normalized with strategic indexes performs well enough

### Event Sourcing

**Pros:** Full audit trail, time travel
**Cons:** Complexity, storage costs, query difficulty
**Decision:** Rejected — overkill for MVP, can add later if needed

---

## Consequences

### Positive

- Strong data integrity via foreign keys
- Flexible querying with SQL
- RLS provides security foundation for multi-tenancy
- Portable (standard Postgres)

### Negative

- Schema migrations required for changes
- Joins can be expensive (mitigated by indexes)
- Need to manage connection pooling at scale

### Migration Path

1. MVP: Supabase hosted Postgres
2. Scale: Supabase Pro or self-hosted Postgres
3. Growth: Read replicas, connection pooling (PgBouncer)

---

## References

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Hierarchical Data in SQL](https://www.postgresql.org/docs/current/queries-with.html)
