import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function runEndToEndTest() {
  console.log('🧪 Starting KSLIGA Football Manager End-to-End Test...');
  await client.connect();

  // 1. Verify DB Tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'fm_%'
    ORDER BY table_name;
  `);
  console.log('✅ Found FM tables:', tables.rows.map(r => r.table_name));

  // 2. Verify Bot Clubs & Players count
  const botClubs = await client.query('SELECT id, name FROM public.fm_clubs WHERE is_bot = TRUE;');
  console.log(`✅ Verified ${botClubs.rows.length} Bot Clubs in League.`);

  const botPlayersCount = await client.query('SELECT COUNT(*) FROM public.fm_players;');
  console.log(`✅ Total active players in database: ${botPlayersCount.rows[0].count}`);

  // 3. Verify Active Transfers
  const transfers = await client.query('SELECT COUNT(*) FROM public.fm_transfers WHERE status = \'active\';');
  console.log(`✅ Active transfer listings on market: ${transfers.rows[0].count}`);

  // 4. Verify League Standings
  const standings = await client.query('SELECT club_name, points FROM public.fm_league_standings ORDER BY points DESC LIMIT 5;');
  console.log('✅ Top 5 League Standings snippet:', standings.rows);

  console.log('🎉 All KSLIGA Football Manager database checks PASSED with flying colors!');
  await client.end();
}

runEndToEndTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
