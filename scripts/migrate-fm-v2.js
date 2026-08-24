import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function migrateV2() {
  console.log('🚀 Connecting to Supabase PostgreSQL for v2 (11x11.ru) Migration...');
  await client.connect();
  console.log('✅ Connected!');

  console.log('📦 Altering and creating tables for 11x11.ru system...');

  await client.query(`
    -- 1. Alter fm_players for 11x11.ru RPG stats
    ALTER TABLE public.fm_players
      ADD COLUMN IF NOT EXISTS skill INT DEFAULT 150,
      ADD COLUMN IF NOT EXISTS talent INT DEFAULT 3,
      ADD COLUMN IF NOT EXISTS special_abilities JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS energy INT DEFAULT 100,
      ADD COLUMN IF NOT EXISTS secondary_position TEXT,
      ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;

    -- 2. Alter fm_stadiums for Football City buildings
    ALTER TABLE public.fm_stadiums
      ADD COLUMN IF NOT EXISTS base_level INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS fitness_level INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS office_level INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS commercial_level INT DEFAULT 1;

    -- 3. Alter fm_clubs for cup trophies
    ALTER TABLE public.fm_clubs
      ADD COLUMN IF NOT EXISTS cups_won INT DEFAULT 0;

    -- 4. Alter fm_transfers for auction mechanism
    ALTER TABLE public.fm_transfers
      ADD COLUMN IF NOT EXISTS skill INT DEFAULT 150,
      ADD COLUMN IF NOT EXISTS talent INT DEFAULT 3,
      ADD COLUMN IF NOT EXISTS special_abilities JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS highest_bidder_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS highest_bidder_club_name TEXT,
      ADD COLUMN IF NOT EXISTS current_bid INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS buyout_price INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour';

    -- 5. Create fm_staff table
    CREATE TABLE IF NOT EXISTS public.fm_staff (
      id BIGSERIAL PRIMARY KEY,
      club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      level INT DEFAULT 1,
      salary INT DEFAULT 500,
      bonus_desc TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. Create fm_tournaments table (8-team Cup Knockouts)
    CREATE TABLE IF NOT EXISTS public.fm_tournaments (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tier INT DEFAULT 1,
      status TEXT DEFAULT 'registration',
      bracket JSONB DEFAULT '{}'::jsonb,
      prize_pool INT DEFAULT 50000,
      entry_fee INT DEFAULT 5000,
      winner_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE SET NULL,
      winner_club_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. Indexes
    CREATE INDEX IF NOT EXISTS idx_fm_staff_club_id ON public.fm_staff(club_id);
    CREATE INDEX IF NOT EXISTS idx_fm_tournaments_status ON public.fm_tournaments(status);
  `);

  console.log('🔒 Applying RLS policies for new tables...');
  const newTables = ['fm_staff', 'fm_tournaments'];
  for (const t of newTables) {
    await client.query(`
      ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow public select on ${t}" ON public.${t};
      CREATE POLICY "Allow public select on ${t}" ON public.${t} FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow public insert on ${t}" ON public.${t};
      CREATE POLICY "Allow public insert on ${t}" ON public.${t} FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow public update on ${t}" ON public.${t};
      CREATE POLICY "Allow public update on ${t}" ON public.${t} FOR UPDATE USING (true);

      DROP POLICY IF EXISTS "Allow public delete on ${t}" ON public.${t};
      CREATE POLICY "Allow public delete on ${t}" ON public.${t} FOR DELETE USING (true);
    `);
  }

  console.log('🎉 Migration v2 completed successfully!');
  await client.end();
}

migrateV2().catch((err) => {
  console.error('❌ Migration v2 failed:', err);
  process.exit(1);
});
