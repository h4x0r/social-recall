-- Social Recall Initial Schema
-- Contacts, employers, skills, and notes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users when auth is set up
  linkedin_id TEXT, -- LinkedIn-specific identifier (from profile URL)
  name TEXT NOT NULL,
  headline TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  last_synced_at TIMESTAMPTZ,
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, linkedin_id)
);

-- Contact employers (employment history)
CREATE TABLE contact_employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT,
  logo_url TEXT,
  is_current BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id, company, title)
);

-- Contact skills with review status
CREATE TABLE contact_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  confidence DECIMAL(3, 2) DEFAULT 1.0, -- 0.00 to 1.00
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected', 'manual')),
  source TEXT DEFAULT 'inferred', -- 'inferred', 'manual', 'linkedin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id, name)
);

-- Contact notes
CREATE TABLE contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_linkedin_id ON contacts(linkedin_id);
CREATE INDEX idx_contacts_is_new ON contacts(is_new);
CREATE INDEX idx_contact_employers_contact_id ON contact_employers(contact_id);
CREATE INDEX idx_contact_skills_contact_id ON contact_skills(contact_id);
CREATE INDEX idx_contact_skills_status ON contact_skills(status);
CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contact_skills_updated_at
  BEFORE UPDATE ON contact_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contact_notes_updated_at
  BEFORE UPDATE ON contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY contacts_policy ON contacts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY contact_employers_policy ON contact_employers
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY contact_skills_policy ON contact_skills
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY contact_notes_policy ON contact_notes
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );
