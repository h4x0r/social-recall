-- Simplify contributor tracking
-- Master profile changes don't need to track who contributed
-- Only user's private data needs user attribution (already has user_id)

-- Remove contributor tracking from master_profiles
ALTER TABLE master_profiles
  DROP COLUMN IF EXISTS first_contributed_by,
  DROP COLUMN IF EXISTS contributor_count;

-- Remove contributor tracking from master_profile_employers
ALTER TABLE master_profile_employers
  DROP COLUMN IF EXISTS last_updated_by;

-- Remove contributor tracking from master_profile_history
ALTER TABLE master_profile_history
  DROP COLUMN IF EXISTS contributed_by;

-- Remove contributor tracking from master_profile_employer_history
ALTER TABLE master_profile_employer_history
  DROP COLUMN IF EXISTS contributed_by;

-- Drop the helper function that tracked contributors
DROP FUNCTION IF EXISTS increment_profile_contributors(UUID, UUID);

-- Update upsert function to remove contributor tracking
CREATE OR REPLACE FUNCTION upsert_master_profile(
  p_linkedin_id TEXT,
  p_name TEXT,
  p_headline TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_profile_url TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id
  FROM master_profiles
  WHERE linkedin_id = p_linkedin_id;

  IF existing_id IS NOT NULL THEN
    UPDATE master_profiles
    SET
      name = COALESCE(p_name, name),
      headline = COALESCE(p_headline, headline),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      profile_url = COALESCE(p_profile_url, profile_url),
      location = COALESCE(p_location, location)
    WHERE id = existing_id;
    profile_id := existing_id;
  ELSE
    INSERT INTO master_profiles (
      linkedin_id, name, headline, avatar_url, profile_url, location
    ) VALUES (
      p_linkedin_id, p_name, p_headline, p_avatar_url, p_profile_url, p_location
    )
    RETURNING id INTO profile_id;

    -- Record initial state in history
    INSERT INTO master_profile_history (
      master_profile_id, name, headline, avatar_url, profile_url, location
    ) VALUES (
      profile_id, p_name, p_headline, p_avatar_url, p_profile_url, p_location
    );
  END IF;

  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
