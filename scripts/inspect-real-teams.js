const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

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
