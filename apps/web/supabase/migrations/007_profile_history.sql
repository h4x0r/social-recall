-- Profile History Tracking
-- Stores timestamped changes to contact profile fields (name, headline, location, employers, education)

-- Profile history table
CREATE TABLE contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN ('name', 'headline', 'location', 'employers', 'education')),
  old_value JSONB, -- Can store strings or arrays (employers/education)
  new_value JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL, -- When the change was first detected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add location field to contacts table if not exists
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location TEXT;

-- Indexes for efficient queries
CREATE INDEX idx_contact_history_contact_id ON contact_history(contact_id);
CREATE INDEX idx_contact_history_detected_at ON contact_history(detected_at DESC);
CREATE INDEX idx_contact_history_field ON contact_history(field);

-- Row Level Security
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access history for their own contacts
CREATE POLICY contact_history_policy ON contact_history
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- Comment on table
COMMENT ON TABLE contact_history IS 'Timestamped history of changes to contact profile fields';
COMMENT ON COLUMN contact_history.detected_at IS 'When the change was first spotted by Social Recall (not when the user actually made the change on LinkedIn)';
