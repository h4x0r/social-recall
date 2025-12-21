-- Tags table (user-defined labels for organizing contacts)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name) -- Each user can only have one tag with a given name
);

-- Junction table for contact-tag relationships
CREATE TABLE contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (contact_id, tag_id)
);

-- Indexes
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON contact_tags(tag_id);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- Policies for tags (users can only see their own tags)
CREATE POLICY tags_policy ON tags
  FOR ALL USING (user_id = auth.uid());

-- Policies for contact_tags (users can only manage tags on their own contacts)
CREATE POLICY contact_tags_policy ON contact_tags
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );
