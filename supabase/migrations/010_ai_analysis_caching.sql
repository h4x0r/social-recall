-- AI Analysis Caching System
-- Stores AI analysis results in master database for instant retrieval
-- Re-analysis triggered when profile data changes

-- =============================================================================
-- AI ANALYSIS HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS master_profile_ai_analysis (
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

  -- Audit trail
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by_ip TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching latest analysis efficiently
CREATE INDEX IF NOT EXISTS idx_ai_analysis_profile_latest
  ON master_profile_ai_analysis(master_profile_id, analyzed_at DESC);

-- =============================================================================
-- ADDITIONS TO MASTER_PROFILES
-- =============================================================================

-- Verification status and AI analysis timestamp
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- =============================================================================
-- CONTENT MODERATION LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS content_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id UUID REFERENCES master_profiles(id) ON DELETE SET NULL,
  field TEXT,
  flagged_content TEXT,
  reason TEXT,
  action_taken TEXT,
  contributor_ip TEXT,
  contributor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_profile
  ON content_moderation_log(master_profile_id);

CREATE INDEX IF NOT EXISTS idx_moderation_log_created
  ON content_moderation_log(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE master_profile_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_log ENABLE ROW LEVEL SECURITY;

-- AI analysis: readable by all authenticated users (shared cache)
CREATE POLICY ai_analysis_select ON master_profile_ai_analysis
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- AI analysis: insertable by authenticated users and service role
CREATE POLICY ai_analysis_insert ON master_profile_ai_analysis
  FOR INSERT WITH CHECK (true);

-- Moderation log: only readable by admins (via service role)
CREATE POLICY moderation_log_select ON content_moderation_log
  FOR SELECT USING (false);  -- Only service role can read

CREATE POLICY moderation_log_insert ON content_moderation_log
  FOR INSERT WITH CHECK (true);  -- Service role can insert

-- =============================================================================
-- HELPER FUNCTION: Get latest AI analysis for a profile
-- =============================================================================

CREATE OR REPLACE FUNCTION get_latest_ai_analysis(p_master_profile_id UUID)
RETURNS TABLE (
  id UUID,
  archetype TEXT,
  skills JSONB,
  could_be JSONB,
  good_for JSONB,
  ai_model TEXT,
  analyzed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.archetype,
    a.skills,
    a.could_be,
    a.good_for,
    a.ai_model,
    a.analyzed_at
  FROM master_profile_ai_analysis a
  WHERE a.master_profile_id = p_master_profile_id
  ORDER BY a.analyzed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTION: Check if AI analysis is stale
-- =============================================================================

CREATE OR REPLACE FUNCTION is_ai_analysis_stale(p_master_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_updated_at TIMESTAMPTZ;
  analysis_at TIMESTAMPTZ;
BEGIN
  -- Get profile's last update time
  SELECT last_updated_at INTO profile_updated_at
  FROM master_profiles
  WHERE id = p_master_profile_id;

  IF profile_updated_at IS NULL THEN
    RETURN true;  -- Profile doesn't exist
  END IF;

  -- Get latest analysis time
  SELECT ai_analyzed_at INTO analysis_at
  FROM master_profiles
  WHERE id = p_master_profile_id;

  IF analysis_at IS NULL THEN
    RETURN true;  -- Never analyzed
  END IF;

  -- Stale if profile updated after analysis
  RETURN profile_updated_at > analysis_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
