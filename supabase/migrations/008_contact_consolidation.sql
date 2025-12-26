-- Migration: Contact Consolidation
-- Add tables and columns for merging LinkedIn + Google contacts

-- Add new columns to contacts table for Google data
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create index for google_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_google_id ON contacts(google_id) WHERE google_id IS NOT NULL;

-- Contact sources table - tracks where contact data came from
CREATE TABLE IF NOT EXISTS contact_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('linkedin', 'google', 'icloud', 'manual')),
  source_id TEXT NOT NULL, -- LinkedIn ID, Google resourceName, etc.
  raw_data JSONB, -- Original data from source
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each contact can only have one record per source type
  UNIQUE(contact_id, source)
);

-- RLS for contact_sources
ALTER TABLE contact_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact sources"
  ON contact_sources FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own contact sources"
  ON contact_sources FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own contact sources"
  ON contact_sources FOR DELETE
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Pending matches table - stores matches awaiting user review
CREATE TABLE IF NOT EXISTS pending_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  google_resource_name TEXT NOT NULL, -- Google People API resourceName
  google_contact_data JSONB NOT NULL, -- Cached Google contact data
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  signals JSONB NOT NULL DEFAULT '{}', -- Match signals breakdown
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'skipped')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each LinkedIn contact can only have one pending match per Google contact
  UNIQUE(linkedin_contact_id, google_resource_name)
);

-- Indexes for pending_matches
CREATE INDEX IF NOT EXISTS idx_pending_matches_user_status ON pending_matches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_matches_linkedin_contact ON pending_matches(linkedin_contact_id);

-- RLS for pending_matches
ALTER TABLE pending_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending matches"
  ON pending_matches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own pending matches"
  ON pending_matches FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending matches"
  ON pending_matches FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pending matches"
  ON pending_matches FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at on pending_matches
CREATE OR REPLACE FUNCTION update_pending_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pending_matches_updated_at ON pending_matches;
CREATE TRIGGER pending_matches_updated_at
  BEFORE UPDATE ON pending_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_matches_updated_at();
