const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🚀 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected!');

  console.log('📦 Creating KSLIGA Football Manager tables...');

  await client.query(`
    -- 1. FM Users / Managers
    CREATE TABLE IF NOT EXISTS public.fm_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT TRUE,
      verification_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_active_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. FM Leagues
    CREATE TABLE IF NOT EXISTS public.fm_leagues (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tier INT DEFAULT 1,
      season TEXT DEFAULT '2025/2026',
      max_teams INT DEFAULT 10,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. FM Clubs
    CREATE TABLE IF NOT EXISTS public.fm_clubs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES public.fm_users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      short_name TEXT,
      city TEXT NOT NULL,
      badge_symbol TEXT DEFAULT 'shield',
      primary_color TEXT DEFAULT '#0F5E10',
      secondary_color TEXT DEFAULT '#F59E0B',
      balance BIGINT DEFAULT 250000,
      manager_level INT DEFAULT 1,
      manager_xp INT DEFAULT 0,
      reputation INT DEFAULT 100,
      fans_count INT DEFAULT 1500,
      league_id BIGINT REFERENCES public.fm_leagues(id) ON DELETE SET NULL,
      is_bot BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. FM Players
    CREATE TABLE IF NOT EXISTS public.fm_players (
      id BIGSERIAL PRIMARY KEY,
      club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      nationality TEXT DEFAULT 'Україна',
      age INT NOT NULL,
      position TEXT NOT NULL,
      overall_rating INT NOT NULL,
      pace INT DEFAULT 60,
      shooting INT DEFAULT 60,
      passing INT DEFAULT 60,
      dribbling INT DEFAULT 60,
      defending INT DEFAULT 60,
      physical INT DEFAULT 60,
      goalkeeping INT DEFAULT 10,
      stamina INT DEFAULT 100,
      morale INT DEFAULT 100,
      form INT DEFAULT 80,
      potential INT DEFAULT 75,
      market_value INT DEFAULT 50000,
      wage INT DEFAULT 1500,
      matches_played INT DEFAULT 0,
      goals INT DEFAULT 0,
      assists INT DEFAULT 0,
      yellow_cards INT DEFAULT 0,
      red_cards INT DEFAULT 0,
      is_starter BOOLEAN DEFAULT FALSE,
      pitch_slot INT DEFAULT 0,
      is_on_transfer BOOLEAN DEFAULT FALSE,
      transfer_price INT DEFAULT 0,
      is_injured BOOLEAN DEFAULT FALSE,
      injury_matches INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. FM Tactics
    CREATE TABLE IF NOT EXISTS public.fm_tactics (
      id BIGSERIAL PRIMARY KEY,
      club_id BIGINT UNIQUE REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      formation TEXT DEFAULT '4-4-2',
      mentality TEXT DEFAULT 'balanced',
      passing_style TEXT DEFAULT 'mixed',
      pressing TEXT DEFAULT 'normal',
      tackling TEXT DEFAULT 'normal',
      captain_player_id BIGINT,
      penalty_taker_id BIGINT,
      freekick_taker_id BIGINT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. FM Stadiums / Facilities
    CREATE TABLE IF NOT EXISTS public.fm_stadiums (
      id BIGSERIAL PRIMARY KEY,
      club_id BIGINT UNIQUE REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      capacity INT DEFAULT 5000,
      pitch_level INT DEFAULT 1,
      training_level INT DEFAULT 1,
      medical_level INT DEFAULT 1,
      youth_academy_level INT DEFAULT 1,
      marketing_level INT DEFAULT 1,
      ticket_price INT DEFAULT 15,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. FM Matches
    CREATE TABLE IF NOT EXISTS public.fm_matches (
      id BIGSERIAL PRIMARY KEY,
      home_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      away_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      home_club_name TEXT NOT NULL,
      away_club_name TEXT NOT NULL,
      home_score INT DEFAULT 0,
      away_score INT DEFAULT 0,
      is_played BOOLEAN DEFAULT FALSE,
      match_type TEXT DEFAULT 'friendly',
      league_id BIGINT REFERENCES public.fm_leagues(id) ON DELETE SET NULL,
      events_log JSONB DEFAULT '[]'::jsonb,
      stats JSONB DEFAULT '{}'::jsonb,
      revenue INT DEFAULT 0,
      xp_reward INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      played_at TIMESTAMPTZ
    );

    -- 8. FM Transfers
    CREATE TABLE IF NOT EXISTS public.fm_transfers (
      id BIGSERIAL PRIMARY KEY,
      player_id BIGINT REFERENCES public.fm_players(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      position TEXT NOT NULL,
      rating INT NOT NULL,
      seller_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      buyer_club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE SET NULL,
      price INT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 9. FM Youth Prospects
    CREATE TABLE IF NOT EXISTS public.fm_youth_prospects (
      id BIGSERIAL PRIMARY KEY,
      club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age INT NOT NULL,
      position TEXT NOT NULL,
      potential INT NOT NULL,
      rating INT NOT NULL,
      attributes JSONB DEFAULT '{}'::jsonb,
      scouted_at TIMESTAMPTZ DEFAULT NOW(),
      is_signed BOOLEAN DEFAULT FALSE
    );

    -- 10. FM League Standings
    CREATE TABLE IF NOT EXISTS public.fm_league_standings (
      id BIGSERIAL PRIMARY KEY,
      league_id BIGINT REFERENCES public.fm_leagues(id) ON DELETE CASCADE,
      club_id BIGINT REFERENCES public.fm_clubs(id) ON DELETE CASCADE,
      club_name TEXT NOT NULL,
      played INT DEFAULT 0,
      won INT DEFAULT 0,
      drawn INT DEFAULT 0,
      lost INT DEFAULT 0,
      goals_for INT DEFAULT 0,
      goals_against INT DEFAULT 0,
      points INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(league_id, club_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_fm_players_club_id ON public.fm_players(club_id);
    CREATE INDEX IF NOT EXISTS idx_fm_matches_home_club ON public.fm_matches(home_club_id);
    CREATE INDEX IF NOT EXISTS idx_fm_matches_away_club ON public.fm_matches(away_club_id);
    CREATE INDEX IF NOT EXISTS idx_fm_transfers_status ON public.fm_transfers(status);
  `);

  console.log('🔒 Applying RLS policies...');
  const tables = [
    'fm_users', 'fm_leagues', 'fm_clubs', 'fm_players', 'fm_tactics',
    'fm_stadiums', 'fm_matches', 'fm_transfers', 'fm_youth_prospects', 'fm_league_standings'
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

  // Seed default league
  console.log('🌱 Seeding initial league & bot clubs...');
  const leagueCheck = await client.query('SELECT id FROM public.fm_leagues LIMIT 1');
  if (leagueCheck.rows.length === 0) {
    const lRes = await client.query(`
      INSERT INTO public.fm_leagues (name, tier, season, max_teams)
      VALUES ('KS Прем''єр Ліга', 1, '2025/2026', 10)
      RETURNING id;
    `);
    const leagueId = lRes.rows[0].id;
    console.log('Created default league ID', leagueId);

    // Seed bot clubs
    const botClubs = [
      { name: 'ФК Село Юнайтед', city: 'Село', primary: '#1E40AF', secondary: '#F59E0B', badge: 'shield' },
      { name: 'Атлетик Поділля', city: 'Вінниця', primary: '#DC2626', secondary: '#FFFFFF', badge: 'trophy' },
      { name: 'Спартак Дрогобич', city: 'Дрогобич', primary: '#7C3AED', secondary: '#10B981', badge: 'crown' },
      { name: 'Металург Запоріжжя', city: 'Запоріжжя', primary: '#EA580C', secondary: '#000000', badge: 'star' },
      { name: 'Чорноморець Одеса', city: 'Одеса', primary: '#0284C7', secondary: '#000000', badge: 'anchor' },
      { name: 'Карпати Львів', city: 'Львів', primary: '#0F5E10', secondary: '#FFFFFF', badge: 'shield' },
      { name: 'Полісся Житомир', city: 'Житомир', primary: '#16A34A', secondary: '#FBBF24', badge: 'flag' },
      { name: 'Авангард Краматорськ', city: 'Краматорськ', primary: '#4B5563', secondary: '#E5E7EB', badge: 'award' },
    ];

    for (const b of botClubs) {
      const cRes = await client.query(`
        INSERT INTO public.fm_clubs (name, short_name, city, primary_color, secondary_color, badge_symbol, balance, manager_level, manager_xp, reputation, fans_count, league_id, is_bot)
        VALUES ($1, $1, $2, $3, $4, $5, 500000, 2, 500, 120, 3000, $6, TRUE)
        RETURNING id;
      `, [b.name, b.city, b.primary, b.secondary, b.badge, leagueId]);

      const clubId = cRes.rows[0].id;

      // Add stadium
      await client.query(`
        INSERT INTO public.fm_stadiums (club_id, name, capacity, pitch_level, training_level, medical_level, youth_academy_level, marketing_level)
        VALUES ($1, $2, 6500, 1, 1, 1, 1, 1);
      `, [clubId, 'Арена ' + b.name]);

      // Add tactics
      await client.query(`
        INSERT INTO public.fm_tactics (club_id, formation, mentality, passing_style, pressing, tackling)
        VALUES ($1, '4-4-2', 'balanced', 'mixed', 'normal', 'normal');
      `, [clubId]);

      // Add standing
      await client.query(`
        INSERT INTO public.fm_league_standings (league_id, club_id, club_name, played, won, drawn, lost, goals_for, goals_against, points)
        VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0);
      `, [leagueId, clubId, b.name]);
    }
  }

  console.log('🎉 Migration completed successfully!');
  await client.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
