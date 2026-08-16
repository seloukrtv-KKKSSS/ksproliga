const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migratePro() {
  console.log('🚀 Connecting to Supabase PostgreSQL to initialize KSLIGA: Від Села до УПЛ...');
  await client.connect();
  console.log('✅ Connected!');

  console.log('📦 Creating pro_* tables for Player Career RPG...');

  await client.query(`
    -- 1. PRO Users
    CREATE TABLE IF NOT EXISTS public.pro_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_active_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. PRO Leagues (5 tiers)
    CREATE TABLE IF NOT EXISTS public.pro_leagues (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tier INT NOT NULL,
      region TEXT,
      reputation INT DEFAULT 100,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. PRO Clubs
    CREATE TABLE IF NOT EXISTS public.pro_clubs (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT,
      city TEXT NOT NULL,
      region TEXT NOT NULL,
      league_id BIGINT REFERENCES public.pro_leagues(id) ON DELETE SET NULL,
      tier INT NOT NULL,
      reputation INT DEFAULT 100,
      primary_color TEXT DEFAULT '#0F5E10',
      secondary_color TEXT DEFAULT '#F59E0B',
      badge_symbol TEXT DEFAULT 'shield',
      stadium_name TEXT NOT NULL,
      stadium_capacity INT DEFAULT 500,
      budget BIGINT DEFAULT 10000,
      squad_strength INT DEFAULT 45,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. PRO Careers (The Player RPG Entity)
    CREATE TABLE IF NOT EXISTS public.pro_careers (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES public.pro_users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      nickname TEXT,
      age INT DEFAULT 17,
      position TEXT NOT NULL,
      secondary_positions JSONB DEFAULT '[]'::jsonb,
      foot TEXT DEFAULT 'right',
      height INT DEFAULT 180,
      weight INT DEFAULT 74,
      overall_rating INT DEFAULT 42,
      potential INT DEFAULT 80,
      form INT DEFAULT 75,
      energy INT DEFAULT 100,
      morale INT DEFAULT 100,
      reputation INT DEFAULT 50,
      current_club_id BIGINT REFERENCES public.pro_clubs(id) ON DELETE SET NULL,
      contract_years_left INT DEFAULT 2,
      wage_per_week INT DEFAULT 1000,
      squad_role TEXT DEFAULT 'starter',
      is_captain BOOLEAN DEFAULT FALSE,
      is_injured BOOLEAN DEFAULT FALSE,
      injury_name TEXT,
      injury_matches_left INT DEFAULT 0,
      is_retired BOOLEAN DEFAULT FALSE,
      current_season_number INT DEFAULT 1,
      current_fixture_round INT DEFAULT 1,
      attributes JSONB NOT NULL,
      career_stats JSONB DEFAULT '{"total_matches": 0, "total_goals": 0, "total_assists": 0, "total_trophies": 0, "avg_rating": 7.0, "season_goals": 0, "season_assists": 0, "season_matches": 0}'::jsonb,
      season_logs JSONB DEFAULT '[]'::jsonb,
      clubs_history JSONB DEFAULT '[]'::jsonb,
      trophies JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. PRO Matches
    CREATE TABLE IF NOT EXISTS public.pro_matches (
      id BIGSERIAL PRIMARY KEY,
      career_id BIGINT REFERENCES public.pro_careers(id) ON DELETE CASCADE,
      home_club_id BIGINT REFERENCES public.pro_clubs(id) ON DELETE SET NULL,
      away_club_id BIGINT REFERENCES public.pro_clubs(id) ON DELETE SET NULL,
      home_club_name TEXT NOT NULL,
      away_club_name TEXT NOT NULL,
      home_score INT DEFAULT 0,
      away_score INT DEFAULT 0,
      player_club_is_home BOOLEAN DEFAULT TRUE,
      player_played BOOLEAN DEFAULT TRUE,
      player_minutes INT DEFAULT 90,
      player_goals INT DEFAULT 0,
      player_assists INT DEFAULT 0,
      player_rating NUMERIC(3,1) DEFAULT 7.0,
      player_shots INT DEFAULT 0,
      player_tackles INT DEFAULT 0,
      player_xg NUMERIC(4,2) DEFAULT 0.0,
      moments_log JSONB DEFAULT '[]'::jsonb,
      season_number INT DEFAULT 1,
      fixture_round INT DEFAULT 1,
      match_type TEXT DEFAULT 'league',
      played_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. PRO Story Events
    CREATE TABLE IF NOT EXISTS public.pro_story_events (
      id BIGSERIAL PRIMARY KEY,
      career_id BIGINT REFERENCES public.pro_careers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      character_name TEXT NOT NULL,
      character_role TEXT NOT NULL,
      dialogue_text TEXT NOT NULL,
      choices JSONB DEFAULT '[]'::jsonb,
      chosen_option_index INT,
      consequence_text TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. PRO Transfer Offers
    CREATE TABLE IF NOT EXISTS public.pro_transfer_offers (
      id BIGSERIAL PRIMARY KEY,
      career_id BIGINT REFERENCES public.pro_careers(id) ON DELETE CASCADE,
      from_club_id BIGINT REFERENCES public.pro_clubs(id) ON DELETE CASCADE,
      from_club_name TEXT NOT NULL,
      tier INT NOT NULL,
      weekly_wage INT NOT NULL,
      contract_years INT DEFAULT 2,
      squad_role TEXT NOT NULL,
      signing_bonus INT DEFAULT 0,
      scout_pitch TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 8. PRO Achievements
    CREATE TABLE IF NOT EXISTS public.pro_achievements (
      id BIGSERIAL PRIMARY KEY,
      career_id BIGINT REFERENCES public.pro_careers(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_pro_careers_user_id ON public.pro_careers(user_id);
    CREATE INDEX IF NOT EXISTS idx_pro_clubs_tier ON public.pro_clubs(tier);
    CREATE INDEX IF NOT EXISTS idx_pro_matches_career ON public.pro_matches(career_id);
    CREATE INDEX IF NOT EXISTS idx_pro_story_career ON public.pro_story_events(career_id);
    CREATE INDEX IF NOT EXISTS idx_pro_transfers_career ON public.pro_transfer_offers(career_id);
  `);

  console.log('🔒 Applying RLS Policies for pro_* tables...');
  const tables = [
    'pro_users', 'pro_leagues', 'pro_clubs', 'pro_careers',
    'pro_matches', 'pro_story_events', 'pro_transfer_offers', 'pro_achievements'
  ];

  for (const t of tables) {
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

  console.log('🎉 Migration for "Від Села до УПЛ" completed successfully!');
  await client.end();
}

migratePro().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
