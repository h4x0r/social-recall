-- Opportunities table
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_company', 'role_change', 'left_job')),
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT false,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact relationships (how you know someone)
CREATE TABLE contact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('intro', 'conference', 'worked_together', 'co_investor', 'portfolio', 'advisor', 'cold_outreach', 'other')),
  context TEXT,
  introduced_by_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  shared_company TEXT,
  relationship_date DATE,
  strength INTEGER DEFAULT 3 CHECK (strength >= 1 AND strength <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id) -- One relationship per contact
);

-- Indexes
CREATE INDEX idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX idx_opportunities_dismissed ON opportunities(dismissed);
CREATE INDEX idx_contact_relationships_contact_id ON contact_relationships(contact_id);
CREATE INDEX idx_contact_relationships_introduced_by ON contact_relationships(introduced_by_id);

-- Updated at trigger for relationships
CREATE TRIGGER contact_relationships_updated_at
  BEFORE UPDATE ON contact_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY opportunities_policy ON opportunities
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY contact_relationships_policy ON contact_relationships
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );
