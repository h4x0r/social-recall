-- Migration: Create deletion_requests table for GDPR data deletion workflow
-- Stores pending deletion requests with confirmation tokens

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX idx_deletion_requests_token ON deletion_requests(token);

-- Index for cleanup of expired requests
CREATE INDEX idx_deletion_requests_expires_at ON deletion_requests(expires_at);

-- Comment
COMMENT ON TABLE deletion_requests IS 'Stores pending data deletion requests with confirmation tokens for GDPR compliance';
