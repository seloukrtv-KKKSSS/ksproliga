const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function cleanupFmDb() {
  console.log('🧹 Connecting to Supabase PostgreSQL to clean up legacy FM tables...');
  await client.connect();
  console.log('✅ Connected!');

  const tablesToDrop = [
    'fm_matches',
    'fm_transfers',
    'fm_youth_prospects',
    'fm_league_standings',
    'fm_players',
    'fm_tactics',
    'fm_stadiums',
    'fm_staff',
    'fm_tournaments',
    'fm_clubs',
    'fm_leagues',
    'fm_users'
  ];

  console.log('🗑️ Dropping legacy FM tables with CASCADE...');
  for (const table of tablesToDrop) {
    try {
      await client.query(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
      console.log(`  ✓ Dropped ${table}`);
    } catch (err) {
      console.warn(`  ⚠️ Warning on ${table}:`, err.message);
    }
  }

  // Verify no fm_* tables remain
  const checkRes = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'fm_%';
  `);

  if (checkRes.rows.length === 0) {
    console.log('🎉 ALL legacy FM tables successfully purged! Ready for "Від Села до УПЛ" (pro_*).');
  } else {
    console.log('Remaining fm_ tables:', checkRes.rows.map(r => r.table_name));
  }

  await client.end();
}

cleanupFmDb().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
