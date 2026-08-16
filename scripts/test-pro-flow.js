const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function testProFlow() {
  console.log('🧪 Testing KSLIGA: Від Села до УПЛ Database & Flow...');
  await client.connect();

  // 1. Check Leagues
  const leagues = await client.query('SELECT * FROM public.pro_leagues ORDER BY tier ASC');
  console.log(`✅ Leagues seeded: ${leagues.rows.length} tiers. Example: ${leagues.rows[0].name}`);

  // 2. Check Clubs (Tier 1 to 5)
  const clubs = await client.query('SELECT id, name, city, tier, reputation, stadium_name FROM public.pro_clubs ORDER BY tier ASC, reputation DESC LIMIT 10');
  console.log(`✅ Sample Clubs across Pyramid:`, clubs.rows.map(c => `[T${c.tier}] ${c.name} (${c.city}) - Rep: ${c.reputation}`));

  // 3. Check Village Starter Club
  const tuchapy = await client.query("SELECT * FROM public.pro_clubs WHERE name = 'ФК Тучапи'");
  console.log(`✅ Starter Village Club verified:`, tuchapy.rows[0]?.name, `• Stadium: ${tuchapy.rows[0]?.stadium_name}`);

  // 4. Test Career Insertion
  const user = await client.query(`
    INSERT INTO public.pro_users (username, email, password_hash)
    VALUES ('ТестГравець', 'test@ksliga.com', 'hash')
    ON CONFLICT (email) DO UPDATE SET last_active_at = NOW()
    RETURNING id;
  `);

  const userId = user.rows[0].id;
  const career = await client.query(`
    INSERT INTO public.pro_careers (
      user_id, first_name, last_name, nickname, age, position, foot,
      overall_rating, potential, form, energy, reputation, current_club_id,
      attributes, career_stats, clubs_history
    ) VALUES (
      $1, 'Андрій', 'Карпʼюк', 'Снайпер', 17, 'RW', 'left',
      44, 88, 85, 100, 60, $2,
      '{"pace": 52, "shooting": 48, "passing": 44, "dribbling": 50, "defending": 32, "physical": 44, "positioning": 46, "decision_making": 43, "stamina": 60}'::jsonb,
      '{"total_matches": 0, "total_goals": 0, "total_assists": 0, "total_trophies": 0, "avg_rating": 7.0, "season_matches": 0, "season_goals": 0, "season_assists": 0}'::jsonb,
      '[{"club_id": 1, "club_name": "ФК Тучапи", "city": "Тучапи", "tier": 1, "from_year": 2026, "seasons_count": 1, "matches": 0, "goals": 0, "assists": 0}]'::jsonb
    ) RETURNING id, first_name, last_name, overall_rating;
  `, [userId, tuchapy.rows[0].id]);

  console.log(`✅ Career creation verified: ${career.rows[0].first_name} ${career.rows[0].last_name} (OVR: ${career.rows[0].overall_rating})`);

  console.log('🎉 ALL PRO CAREER CHECKS PASSED PERFECTLY!');
  await client.end();
}

testProFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
