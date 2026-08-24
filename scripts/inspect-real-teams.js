import { createDatabaseClient } from './db-client.js';

const client = createDatabaseClient();

async function inspect() {
  await client.connect();

  const champs = await client.query(`SELECT * FROM public.championships;`);
  console.log('🏆 Championships:');
  console.table(champs.rows);

  const teams = await client.query(`SELECT * FROM public.teams;`);
  console.log('🏟️ All Teams:');
  console.table(teams.rows.map(t => ({ id: t.id, name: t.name, city: t.city, logo: t.logo, color: t.color })));

  await client.end();
}

inspect().catch(console.error);
