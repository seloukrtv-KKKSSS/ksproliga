-- Create match_cards table
CREATE TABLE IF NOT EXISTS match_cards (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  minute INTEGER,
  card_type VARCHAR(20) DEFAULT 'yellow' CHECK (card_type IN ('yellow', 'red', 'yellow_red')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE match_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access on match_cards" ON match_cards FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert match_cards" ON match_cards FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update match_cards" ON match_cards FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete match_cards" ON match_cards FOR DELETE USING (auth.role() = 'authenticated');
