-- Master Profiles Extended Schema
-- Adds contribution tracking, extended profile fields, and schema updates

-- =============================================================================
-- SCHEMA UPDATES TO EXISTING TABLES
-- =============================================================================

-- Add 'about' and 'avatar_path' to master_profiles
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- Split relationship_context into occasion + occasion_date in user_profile_data
ALTER TABLE user_profile_data ADD COLUMN IF NOT EXISTS occasion TEXT;
ALTER TABLE user_profile_data ADD COLUMN IF NOT EXISTS occasion_date TEXT;

-- Migrate existing data if relationship_context exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_data' AND column_name = 'relationship_context'
  ) THEN
    UPDATE user_profile_data
    SET occasion = relationship_context
    WHERE relationship_context IS NOT NULL AND occasion IS NULL;
  END IF;
END $$;

-- =============================================================================
-- CONTRIBUTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS master_profile_contributions (
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

CREATE INDEX IF NOT EXISTS idx_contributions_master_profile ON master_profile_contributions(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON master_profile_contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON master_profile_contributions(created_at DESC);

-- =============================================================================
-- EXTENDED PROFILE TABLES
-- =============================================================================

-- Certifications & Licenses
CREATE TABLE IF NOT EXISTS master_profile_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, name, issuer)
);

-- Skills
CREATE TABLE IF NOT EXISTS master_profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, name)
);

-- Languages
CREATE TABLE IF NOT EXISTS master_profile_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  proficiency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, language)
);

-- Projects
CREATE TABLE IF NOT EXISTS master_profile_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, name)
);

-- Publications
CREATE TABLE IF NOT EXISTS master_profile_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publisher TEXT,
  url TEXT,
  pub_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, title)
);

-- Services
CREATE TABLE IF NOT EXISTS master_profile_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, name)
);

-- Websites
CREATE TABLE IF NOT EXISTS master_profile_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  label TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, url)
);

-- Education (if not exists)
CREATE TABLE IF NOT EXISTS master_profile_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_profile_id, school, degree)
);

-- =============================================================================
-- INDEXES FOR EXTENDED TABLES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_certifications_profile ON master_profile_certifications(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile ON master_profile_skills(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_languages_profile ON master_profile_languages(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON master_profile_projects(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_publications_profile ON master_profile_publications(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_services_profile ON master_profile_services(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_websites_profile ON master_profile_websites(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_education_profile ON master_profile_education(master_profile_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE master_profile_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_profile_education ENABLE ROW LEVEL SECURITY;

-- Contributions: users can see all, but only their own contributor identity
CREATE POLICY contributions_select ON master_profile_contributions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY contributions_insert ON master_profile_contributions
  FOR INSERT WITH CHECK (auth.uid() = contributed_by);

CREATE POLICY contributions_update ON master_profile_contributions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Extended profile tables: authenticated users can read and write
CREATE POLICY certifications_select ON master_profile_certifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY certifications_insert ON master_profile_certifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY certifications_update ON master_profile_certifications FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY skills_select ON master_profile_skills FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY skills_insert ON master_profile_skills FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY skills_update ON master_profile_skills FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY languages_select ON master_profile_languages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY languages_insert ON master_profile_languages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY languages_update ON master_profile_languages FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY projects_select ON master_profile_projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY projects_insert ON master_profile_projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY projects_update ON master_profile_projects FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY publications_select ON master_profile_publications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY publications_insert ON master_profile_publications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY publications_update ON master_profile_publications FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY services_select ON master_profile_services FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY services_insert ON master_profile_services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY services_update ON master_profile_services FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY websites_select ON master_profile_websites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY websites_insert ON master_profile_websites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY websites_update ON master_profile_websites FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY education_select ON master_profile_education FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY education_insert ON master_profile_education FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY education_update ON master_profile_education FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- INDEX FOR OCCASION GROUPING
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profile_data_occasion ON user_profile_data(occasion);
