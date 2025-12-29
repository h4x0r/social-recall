-- Migration: Remove IP address from consent_logs
-- Part of consent redesign: use OAuth user_id instead of IP for authentication

-- Remove IP address column (no longer needed)
ALTER TABLE consent_logs DROP COLUMN IF EXISTS ip_address;

-- Remove IP index
DROP INDEX IF EXISTS idx_consent_logs_ip;

-- Update table comment
COMMENT ON TABLE consent_logs IS 'GDPR-compliant consent logging - linked to authenticated OAuth users';

-- Note: Making user_id NOT NULL requires all existing records to have a user_id
-- If there are records without user_id, they need to be handled first
-- For now, we'll leave user_id as nullable until we verify no orphan records exist
-- ALTER TABLE consent_logs ALTER COLUMN user_id SET NOT NULL;
