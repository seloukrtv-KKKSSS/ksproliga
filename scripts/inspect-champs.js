const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

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
