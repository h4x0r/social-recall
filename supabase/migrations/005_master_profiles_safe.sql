-- Master Profiles Architecture (Safe migration with IF NOT EXISTS)
-- This handles cases where some tables may already exist

-- Ensure tags table exists (from migration 003)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

-- =============================================================================
-- MASTER PROFILES (Canonical LinkedIn Data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS master_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  headline TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  location TEXT,
  first_contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  contributor_count INTEGER DEFAULT 1,
  update_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_profile_employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT,
  logo_url TEXT,
  is_current BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, company, title)
);

CREATE TABLE IF NOT EXISTS master_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  headline TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  location TEXT,
  contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_profile_employer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES master_profile_employers(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  title TEXT,
  logo_url TEXT,
  is_current BOOLEAN,
  start_date DATE,
  end_date DATE,
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'updated', 'removed')),
  contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  relationship_type TEXT CHECK (relationship_type IN (
    'intro', 'conference', 'worked_together', 'co_investor',
    'portfolio', 'advisor', 'cold_outreach', 'friend', 'family', 'other'
  )),
  relationship_context TEXT,
  relationship_strength INTEGER DEFAULT 3 CHECK (relationship_strength >= 1 AND relationship_strength <= 5),
  introduced_by_master_profile_id UUID REFERENCES master_profiles(id) ON DELETE SET NULL,
  is_new BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, master_profile_id)
);

CREATE TABLE IF NOT EXISTS user_profile_tags (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, master_profile_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_profile_data_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  notes TEXT,
  relationship_type TEXT,
  relationship_context TEXT,
  relationship_strength INTEGER,
  tags_snapshot JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, master_profile_id, version)
);

-- =============================================================================
-- INDEXES (only create if not exists)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_master_profiles_linkedin_id ON master_profiles(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_master_profiles_name ON master_profiles(name);
CREATE INDEX IF NOT EXISTS idx_master_profile_employers_profile_id ON master_profile_employers(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_master_profile_history_profile_id ON master_profile_history(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_user_id ON user_profile_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_master_profile_id ON user_profile_data(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_is_new ON user_profile_data(is_new);
CREATE INDEX IF NOT EXISTS idx_user_profile_tags_user_id ON user_profile_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_history_user_profile ON user_profile_data_history(user_id, master_profile_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_employer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_data_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS tags_policy ON tags;
DROP POLICY IF EXISTS contact_tags_policy ON contact_tags;
DROP POLICY IF EXISTS master_profiles_select ON master_profiles;
DROP POLICY IF EXISTS master_profiles_insert ON master_profiles;
DROP POLICY IF EXISTS master_profiles_update ON master_profiles;
DROP POLICY IF EXISTS master_profile_employers_select ON master_profile_employers;
DROP POLICY IF EXISTS master_profile_employers_insert ON master_profile_employers;
DROP POLICY IF EXISTS master_profile_employers_update ON master_profile_employers;
DROP POLICY IF EXISTS master_profile_history_select ON master_profile_history;
DROP POLICY IF EXISTS master_profile_employer_history_select ON master_profile_employer_history;
DROP POLICY IF EXISTS user_profile_data_policy ON user_profile_data;
DROP POLICY IF EXISTS user_profile_tags_policy ON user_profile_tags;
DROP POLICY IF EXISTS user_profile_data_history_policy ON user_profile_data_history;

CREATE POLICY tags_policy ON tags FOR ALL USING (user_id = auth.uid());
CREATE POLICY contact_tags_policy ON contact_tags FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
);

CREATE POLICY master_profiles_select ON master_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY master_profiles_insert ON master_profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY master_profiles_update ON master_profiles FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY master_profile_employers_select ON master_profile_employers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY master_profile_employers_insert ON master_profile_employers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY master_profile_employers_update ON master_profile_employers FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY master_profile_history_select ON master_profile_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY master_profile_employer_history_select ON master_profile_employer_history FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY user_profile_data_policy ON user_profile_data FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_profile_tags_policy ON user_profile_tags FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_profile_data_history_policy ON user_profile_data_history FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- TRIGGERS (create or replace)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profile_data_updated_at ON user_profile_data;
CREATE TRIGGER user_profile_data_updated_at
  BEFORE UPDATE ON user_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_master_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  NEW.update_count = COALESCE(OLD.update_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS master_profiles_updated_at ON master_profiles;
CREATE TRIGGER master_profiles_updated_at
  BEFORE UPDATE ON master_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_master_profile_timestamp();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

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
  SELECT id, contributor_count INTO existing_profile
  FROM master_profiles
  WHERE linkedin_id = p_linkedin_id;

  IF existing_profile.id IS NOT NULL THEN
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
    INSERT INTO master_profiles (
      linkedin_id, name, headline, avatar_url, profile_url, location,
      first_contributed_by, contributor_count
    ) VALUES (
      p_linkedin_id, p_name, p_headline, p_avatar_url, p_profile_url, p_location,
      p_contributed_by, 1
    )
    RETURNING id INTO profile_id;

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

CREATE OR REPLACE FUNCTION increment_profile_contributors(p_master_profile_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
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
-- VIEW
-- =============================================================================

CREATE OR REPLACE VIEW user_contacts AS
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
