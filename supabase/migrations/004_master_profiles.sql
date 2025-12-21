-- Master Profiles Architecture
-- Two-tier data model: crowdsourced LinkedIn profiles + user-specific private data
--
-- Design principles:
-- 1. Master profiles are NEVER deleted, only updated
-- 2. Every profile update is appended to history
-- 3. User-specific data (notes, tags, relationships) is stored separately
-- 4. Every user data change is appended to history (user sees latest, we keep all)

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- MASTER PROFILES (Canonical LinkedIn Data)
-- =============================================================================

-- Master profiles table - the crowdsourced canonical profile data
CREATE TABLE master_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_id TEXT NOT NULL UNIQUE, -- LinkedIn profile slug (e.g., "johndoe")

  -- Profile data (updated by any user who visits this profile)
  name TEXT NOT NULL,
  headline TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  location TEXT,

  -- Crowdsourcing metadata
  first_contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  contributor_count INTEGER DEFAULT 1,
  update_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master profile employers (canonical employment history)
CREATE TABLE master_profile_employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT,
  logo_url TEXT,
  is_current BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,

  -- Track who last updated this employer record
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(master_profile_id, company, title)
);

-- =============================================================================
-- MASTER PROFILE HISTORY (Append-only profile changes)
-- =============================================================================

-- Every update to a master profile is recorded here
CREATE TABLE master_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,

  -- Snapshot of profile data at this point
  name TEXT NOT NULL,
  headline TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  location TEXT,

  -- Who contributed this update
  contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- When this version was created
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employer history (changes to employment records)
CREATE TABLE master_profile_employer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES master_profile_employers(id) ON DELETE SET NULL,

  -- Snapshot of employer data
  company TEXT NOT NULL,
  title TEXT,
  logo_url TEXT,
  is_current BOOLEAN,
  start_date DATE,
  end_date DATE,

  -- What happened: 'added', 'updated', 'removed'
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'updated', 'removed')),
  contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER PROFILE DATA (Private notes/tags per user per profile)
-- =============================================================================

-- User's private data for each profile they've interacted with
CREATE TABLE user_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,

  -- User's private notes (latest version)
  notes TEXT,

  -- Relationship metadata
  relationship_type TEXT CHECK (relationship_type IN (
    'intro', 'conference', 'worked_together', 'co_investor',
    'portfolio', 'advisor', 'cold_outreach', 'friend', 'family', 'other'
  )),
  relationship_context TEXT,
  relationship_strength INTEGER DEFAULT 3 CHECK (relationship_strength >= 1 AND relationship_strength <= 5),
  introduced_by_master_profile_id UUID REFERENCES master_profiles(id) ON DELETE SET NULL,

  -- User's interaction tracking
  is_new BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Version tracking for history
  current_version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, master_profile_id)
);

-- User's tags for profiles (junction table)
CREATE TABLE user_profile_tags (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, master_profile_id, tag_id)
);

-- =============================================================================
-- USER PROFILE DATA HISTORY (Append-only user changes)
-- =============================================================================

-- Every change to user's profile data is recorded here
-- User sees latest, but we keep complete history
CREATE TABLE user_profile_data_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,

  -- Version number (monotonically increasing per user+profile)
  version INTEGER NOT NULL,

  -- Snapshot of user data at this version
  notes TEXT,
  relationship_type TEXT,
  relationship_context TEXT,
  relationship_strength INTEGER,

  -- Tags at this version (stored as JSON array of tag names for history)
  tags_snapshot JSONB DEFAULT '[]'::jsonb,

  -- When this version was created
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, master_profile_id, version)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Master profiles
CREATE INDEX idx_master_profiles_linkedin_id ON master_profiles(linkedin_id);
CREATE INDEX idx_master_profiles_name ON master_profiles(name);
CREATE INDEX idx_master_profiles_first_contributed_by ON master_profiles(first_contributed_by);
CREATE INDEX idx_master_profile_employers_profile_id ON master_profile_employers(master_profile_id);
CREATE INDEX idx_master_profile_employers_company ON master_profile_employers(company);

-- History tables
CREATE INDEX idx_master_profile_history_profile_id ON master_profile_history(master_profile_id);
CREATE INDEX idx_master_profile_history_created_at ON master_profile_history(created_at);
CREATE INDEX idx_master_profile_employer_history_profile_id ON master_profile_employer_history(master_profile_id);

-- User profile data
CREATE INDEX idx_user_profile_data_user_id ON user_profile_data(user_id);
CREATE INDEX idx_user_profile_data_master_profile_id ON user_profile_data(master_profile_id);
CREATE INDEX idx_user_profile_data_is_new ON user_profile_data(is_new);
CREATE INDEX idx_user_profile_data_last_seen ON user_profile_data(last_seen_at);
CREATE INDEX idx_user_profile_tags_user_id ON user_profile_tags(user_id);
CREATE INDEX idx_user_profile_tags_master_profile_id ON user_profile_tags(master_profile_id);

-- User profile data history
CREATE INDEX idx_user_profile_data_history_user_profile ON user_profile_data_history(user_id, master_profile_id);
CREATE INDEX idx_user_profile_data_history_created_at ON user_profile_data_history(created_at);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on user_profile_data
CREATE TRIGGER user_profile_data_updated_at
  BEFORE UPDATE ON user_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update last_updated_at on master_profiles
CREATE OR REPLACE FUNCTION update_master_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  NEW.update_count = COALESCE(OLD.update_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER master_profiles_updated_at
  BEFORE UPDATE ON master_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_master_profile_timestamp();

-- =============================================================================
-- HISTORY TRIGGERS (Append to history on every update)
-- =============================================================================

-- Append to master_profile_history on every update
CREATE OR REPLACE FUNCTION append_master_profile_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't record if only metadata changed (contributor_count, update_count)
  IF (OLD.name IS DISTINCT FROM NEW.name OR
      OLD.headline IS DISTINCT FROM NEW.headline OR
      OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
      OLD.profile_url IS DISTINCT FROM NEW.profile_url OR
      OLD.location IS DISTINCT FROM NEW.location) THEN
    INSERT INTO master_profile_history (
      master_profile_id, name, headline, avatar_url, profile_url, location
    ) VALUES (
      NEW.id, NEW.name, NEW.headline, NEW.avatar_url, NEW.profile_url, NEW.location
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER master_profile_history_trigger
  AFTER UPDATE ON master_profiles
  FOR EACH ROW
  EXECUTE FUNCTION append_master_profile_history();

-- Append to user_profile_data_history on every update
CREATE OR REPLACE FUNCTION append_user_profile_data_history()
RETURNS TRIGGER AS $$
DECLARE
  new_version INTEGER;
  tags_json JSONB;
BEGIN
  -- Get next version number
  new_version := COALESCE(OLD.current_version, 0) + 1;
  NEW.current_version := new_version;

  -- Get current tags as JSON
  SELECT COALESCE(jsonb_agg(t.name), '[]'::jsonb)
  INTO tags_json
  FROM user_profile_tags upt
  JOIN tags t ON t.id = upt.tag_id
  WHERE upt.user_id = NEW.user_id AND upt.master_profile_id = NEW.master_profile_id;

  -- Append to history
  INSERT INTO user_profile_data_history (
    user_id, master_profile_id, version,
    notes, relationship_type, relationship_context, relationship_strength,
    tags_snapshot
  ) VALUES (
    NEW.user_id, NEW.master_profile_id, new_version,
    NEW.notes, NEW.relationship_type, NEW.relationship_context, NEW.relationship_strength,
    tags_json
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profile_data_history_trigger
  BEFORE UPDATE ON user_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION append_user_profile_data_history();

-- Also record initial version on INSERT
CREATE OR REPLACE FUNCTION record_initial_user_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profile_data_history (
    user_id, master_profile_id, version,
    notes, relationship_type, relationship_context, relationship_strength,
    tags_snapshot
  ) VALUES (
    NEW.user_id, NEW.master_profile_id, 1,
    NEW.notes, NEW.relationship_type, NEW.relationship_context, NEW.relationship_strength,
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profile_data_initial_history
  AFTER INSERT ON user_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION record_initial_user_profile_data();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Master profiles are readable by all authenticated users (crowdsourced data)
ALTER TABLE master_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_employer_history ENABLE ROW LEVEL SECURITY;

-- User-specific data is private
ALTER TABLE user_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_data_history ENABLE ROW LEVEL SECURITY;

-- Master profiles: Any authenticated user can read, anyone can insert/update
CREATE POLICY master_profiles_select ON master_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY master_profiles_insert ON master_profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY master_profiles_update ON master_profiles
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Master profile employers: Same as master profiles
CREATE POLICY master_profile_employers_select ON master_profile_employers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY master_profile_employers_insert ON master_profile_employers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY master_profile_employers_update ON master_profile_employers
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- History is read-only for audit purposes
CREATE POLICY master_profile_history_select ON master_profile_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY master_profile_employer_history_select ON master_profile_employer_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- User profile data: Only the owning user can access
CREATE POLICY user_profile_data_policy ON user_profile_data
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_profile_tags_policy ON user_profile_tags
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_profile_data_history_policy ON user_profile_data_history
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Upsert a master profile (creates or updates, always appends to history)
CREATE OR REPLACE FUNCTION upsert_master_profile(
  p_linkedin_id TEXT,
  p_name TEXT,
  p_headline TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_profile_url TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_contributed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
  existing_profile RECORD;
BEGIN
  -- Check if profile exists
  SELECT id, contributor_count INTO existing_profile
  FROM master_profiles
  WHERE linkedin_id = p_linkedin_id;

  IF existing_profile.id IS NOT NULL THEN
    -- Update existing profile
    UPDATE master_profiles
    SET
      name = COALESCE(p_name, name),
      headline = COALESCE(p_headline, headline),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      profile_url = COALESCE(p_profile_url, profile_url),
      location = COALESCE(p_location, location)
    WHERE id = existing_profile.id;

    profile_id := existing_profile.id;
  ELSE
    -- Insert new profile
    INSERT INTO master_profiles (
      linkedin_id, name, headline, avatar_url, profile_url, location,
      first_contributed_by, contributor_count
    ) VALUES (
      p_linkedin_id, p_name, p_headline, p_avatar_url, p_profile_url, p_location,
      p_contributed_by, 1
    )
    RETURNING id INTO profile_id;

    -- Record initial history
    INSERT INTO master_profile_history (
      master_profile_id, name, headline, avatar_url, profile_url, location,
      contributed_by
    ) VALUES (
      profile_id, p_name, p_headline, p_avatar_url, p_profile_url, p_location,
      p_contributed_by
    );
  END IF;

  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment contributor count when a new user interacts with a profile
CREATE OR REPLACE FUNCTION increment_profile_contributors(p_master_profile_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Only increment if this user hasn't interacted before
  IF NOT EXISTS (
    SELECT 1 FROM user_profile_data
    WHERE master_profile_id = p_master_profile_id AND user_id = p_user_id
  ) THEN
    UPDATE master_profiles
    SET contributor_count = contributor_count + 1
    WHERE id = p_master_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VIEW: User's contacts (combines master profile + user data)
-- =============================================================================

CREATE VIEW user_contacts AS
SELECT
  mp.id AS master_profile_id,
  mp.linkedin_id,
  mp.name,
  mp.headline,
  mp.avatar_url,
  mp.profile_url,
  mp.location,
  upd.user_id,
  upd.notes,
  upd.relationship_type,
  upd.relationship_context,
  upd.relationship_strength,
  upd.is_new,
  upd.first_seen_at,
  upd.last_seen_at,
  upd.current_version,
  upd.created_at AS user_data_created_at,
  upd.updated_at AS user_data_updated_at
FROM master_profiles mp
JOIN user_profile_data upd ON upd.master_profile_id = mp.id
WHERE upd.user_id = auth.uid();

-- =============================================================================
-- MIGRATION: Migrate existing contacts to new architecture
-- =============================================================================

-- This migrates existing data from the old contacts table
-- Run this AFTER the tables are created

DO $$
DECLARE
  contact_record RECORD;
  new_master_profile_id UUID;
BEGIN
  -- For each existing contact
  FOR contact_record IN SELECT * FROM contacts LOOP
    -- Create or get master profile
    SELECT upsert_master_profile(
      contact_record.linkedin_id,
      contact_record.name,
      contact_record.headline,
      contact_record.avatar_url,
      contact_record.profile_url,
      NULL, -- location not in old schema
      contact_record.user_id
    ) INTO new_master_profile_id;

    -- Create user profile data
    INSERT INTO user_profile_data (
      user_id,
      master_profile_id,
      is_new,
      first_seen_at,
      last_seen_at,
      created_at
    ) VALUES (
      contact_record.user_id,
      new_master_profile_id,
      contact_record.is_new,
      contact_record.created_at,
      COALESCE(contact_record.last_synced_at, contact_record.updated_at),
      contact_record.created_at
    )
    ON CONFLICT (user_id, master_profile_id) DO UPDATE SET
      is_new = EXCLUDED.is_new,
      last_seen_at = GREATEST(user_profile_data.last_seen_at, EXCLUDED.last_seen_at);

    -- Migrate employers
    INSERT INTO master_profile_employers (
      master_profile_id,
      company,
      title,
      logo_url,
      is_current,
      start_date,
      end_date,
      sort_order,
      last_updated_by
    )
    SELECT
      new_master_profile_id,
      ce.company,
      ce.title,
      ce.logo_url,
      ce.is_current,
      ce.start_date,
      ce.end_date,
      ce.sort_order,
      contact_record.user_id
    FROM contact_employers ce
    WHERE ce.contact_id = contact_record.id
    ON CONFLICT (master_profile_id, company, title) DO NOTHING;

  END LOOP;
END $$;

-- Migrate contact notes to user_profile_data
UPDATE user_profile_data upd
SET notes = (
  SELECT cn.content
  FROM contact_notes cn
  JOIN contacts c ON cn.contact_id = c.id
  JOIN master_profiles mp ON mp.linkedin_id = c.linkedin_id
  WHERE mp.id = upd.master_profile_id AND c.user_id = upd.user_id
  ORDER BY cn.updated_at DESC
  LIMIT 1
);

-- Migrate relationships
UPDATE user_profile_data upd
SET
  relationship_type = cr.type,
  relationship_context = cr.context,
  relationship_strength = cr.strength
FROM contact_relationships cr
JOIN contacts c ON cr.contact_id = c.id
JOIN master_profiles mp ON mp.linkedin_id = c.linkedin_id
WHERE mp.id = upd.master_profile_id AND c.user_id = upd.user_id;

-- Migrate tags
INSERT INTO user_profile_tags (user_id, master_profile_id, tag_id)
SELECT c.user_id, mp.id, ct.tag_id
FROM contact_tags ct
JOIN contacts c ON ct.contact_id = c.id
JOIN master_profiles mp ON mp.linkedin_id = c.linkedin_id
ON CONFLICT DO NOTHING;
