import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function inspectTeams() {
  await client.connect();

  // List all tables in public schema
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('📋 All public tables:', tables.rows.map(r => r.table_name));

  // Check if teams table exists
  try {
    const teams = await client.query(`SELECT * FROM public.teams LIMIT 25;`);
    console.log('🏟️ Site Teams in public.teams:');
    console.table(teams.rows.map(t => ({ id: t.id, name: t.name, city: t.city, logo: t.logo_url || t.logo })));
  } catch (e) {
    console.log('teams query notice:', e.message);
  }

  // Check leagues
  try {
    const leagues = await client.query(`SELECT * FROM public.leagues LIMIT 25;`);
    console.log('🏆 Site Leagues in public.leagues:');
    console.table(leagues.rows);
  } catch (e) {
    console.log('leagues query notice:', e.message);
  }

  // Check tournaments
  try {
    const tourneys = await client.query(`SELECT * FROM public.tournaments LIMIT 25;`);
    console.log('🏆 Tournaments:');
    console.table(tourneys.rows);
  } catch (e) {
    console.log('tournaments query notice:', e.message);
  }

  await client.end();
}

inspectTeams().catch(console.error);
