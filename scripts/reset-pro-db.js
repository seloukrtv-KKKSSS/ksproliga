const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function resetProDb() {
  console.log('🧹 Purging user careers and test data from Supabase PostgreSQL...');
  await client.connect();

  await client.query(`
    TRUNCATE TABLE public.pro_matches CASCADE;
    TRUNCATE TABLE public.pro_story_events CASCADE;
    TRUNCATE TABLE public.pro_transfer_offers CASCADE;
    TRUNCATE TABLE public.pro_achievements CASCADE;
    TRUNCATE TABLE public.pro_careers CASCADE;
    TRUNCATE TABLE public.pro_users CASCADE;
  `);

  console.log('✅ User data, careers, and matches cleanly purged!');

  // Verify clubs & leagues remain
  const clubs = await client.query('SELECT COUNT(*) as count FROM public.pro_clubs;');
  const leagues = await client.query('SELECT COUNT(*) as count FROM public.pro_leagues;');
  console.log(`🏟️ Verified: ${clubs.rows[0].count} clubs and ${leagues.rows[0].count} leagues ready for new careers.`);

  await client.end();
}

resetProDb().catch((err) => {
  console.error('❌ Reset error:', err);
  process.exit(1);
});
