import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function inspectChamps() {
  await client.connect();

  const champs = await client.query(`SELECT * FROM public.championships;`);
  console.log('🏆 Championships in public.championships:');
  console.table(champs.rows);

  const allTeams = await client.query(`SELECT id, name, city, logo_url FROM public.teams ORDER BY id;`);
  console.log('🏟️ All teams in public.teams:');
  console.table(allTeams.rows);

  await client.end();
}

inspectChamps().catch(console.error);
