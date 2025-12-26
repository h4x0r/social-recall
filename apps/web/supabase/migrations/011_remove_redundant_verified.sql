-- Remove redundant verified boolean column
-- verified_at IS NULL = not verified
-- verified_at IS NOT NULL = verified

ALTER TABLE master_profiles DROP COLUMN IF EXISTS verified;
