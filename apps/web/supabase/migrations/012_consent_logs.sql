-- Consent logs table for GDPR compliance
-- Stores consent records when users accept data collection

CREATE TABLE IF NOT EXISTS consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Consent details
    extension_version TEXT NOT NULL,
    consent_text_version TEXT NOT NULL,  -- Hash of the consent text
    user_agent TEXT NOT NULL,
    ip_address TEXT NOT NULL,  -- Raw IP, anonymized on deletion request

    -- Consent status
    given BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- User association (optional - for logged-in users)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for looking up consent by user
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);

-- Index for finding consents by IP (for auditing)
CREATE INDEX IF NOT EXISTS idx_consent_logs_ip ON consent_logs(ip_address);

-- Comment explaining the table
COMMENT ON TABLE consent_logs IS 'GDPR-compliant consent logging for authenticated proxy data collection';
COMMENT ON COLUMN consent_logs.ip_address IS 'Raw IP address, last two octets redacted on data deletion request';
COMMENT ON COLUMN consent_logs.consent_text_version IS 'Hash of the consent text shown to user - for tracking if consent text changes';
