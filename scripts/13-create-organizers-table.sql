-- Create organizers table for tournament level access control
CREATE TABLE IF NOT EXISTS organizers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  championship_ids INTEGER[] DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access on organizers" ON organizers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert organizers" ON organizers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update organizers" ON organizers FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete organizers" ON organizers FOR DELETE USING (true);
