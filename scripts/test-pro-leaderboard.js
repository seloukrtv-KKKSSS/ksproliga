const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function testLeaderboard() {
  console.log('🧪 Testing Hall of Fame / Leaderboard for Pro Careers...');
  await client.connect();

  const res = await client.query(`
    SELECT 
      c.id,
      c.first_name || ' ' || c.last_name as player_name,
      c.overall_rating,
      c.bank_balance,
      c.wage_per_week,
      cl.name as club_name,
      cl.tier,
      c.career_stats->>'total_goals' as goals,
      c.career_stats->>'total_matches' as matches,
      (
        c.overall_rating * 50 + 
        COALESCE((c.career_stats->>'total_goals')::int, 0) * 30 + 
        COALESCE((c.career_stats->>'total_assists')::int, 0) * 20 + 
        COALESCE((c.career_stats->>'total_matches')::int, 0) * 10 + 
        cl.tier * 500 + 
        (c.bank_balance / 1000)
      ) as legacy_score
    FROM public.pro_careers c
    LEFT JOIN public.pro_clubs cl ON cl.id = c.current_club_id
    ORDER BY legacy_score DESC
    LIMIT 5;
  `);

  console.log('🏆 Top Footballers in Hall of Fame:');
  console.table(res.rows);

  console.log('🎉 HALL OF FAME LEADERBOARD QUERY VERIFIED!');
  await client.end();
}

testLeaderboard().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
