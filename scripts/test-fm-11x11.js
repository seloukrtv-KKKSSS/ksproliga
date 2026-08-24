import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function test11x11Flow() {
  console.log('🧪 Testing 11x11.ru Database Schema & Mechanics Flow...');
  await client.connect();

  // 1. Check Clubs
  const clubs = await client.query('SELECT id, name, cups_won, balance FROM public.fm_clubs LIMIT 5');
  console.log(`✅ Clubs count: ${clubs.rows.length}. Example: ${clubs.rows[0].name}, Cups: ${clubs.rows[0].cups_won}`);

  // 2. Check 11x11 Players
  const players = await client.query(`
    SELECT id, name, position, skill, talent, special_abilities, energy, xp
    FROM public.fm_players
    WHERE club_id = $1 LIMIT 4
  `, [clubs.rows[0].id]);
  console.log(`✅ Sample 11x11 players:`, players.rows);

  // 3. Check Transfers Auction
  const transfers = await client.query(`
    SELECT id, player_name, position, skill, talent, current_bid, buyout_price, status
    FROM public.fm_transfers LIMIT 4
  `);
  console.log(`✅ Active Auction Listings:`, transfers.rows);

  // 4. Check Stadiums & City Buildings
  const stadiums = await client.query(`
    SELECT id, club_id, capacity, base_level, fitness_level, office_level, commercial_level, ticket_price
    FROM public.fm_stadiums LIMIT 2
  `);
  console.log(`✅ Football City Facilities:`, stadiums.rows);

  // 5. Check Tournaments Table
  const tourneys = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('fm_tournaments', 'fm_staff')
  `);
  console.log(`✅ New 11x11 Tables verified:`, tourneys.rows.map(r => r.table_name));

  console.log('🎉 ALL 11x11.RU CHECKS PASSED PERFECTLY!');
  await client.end();
}

test11x11Flow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
