const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function ensureDefaultUser() {
  await client.connect();

  await client.query(`
    INSERT INTO public.pro_users (id, username, email, password_hash)
    VALUES (1, 'Гравець KS Games', 'gamer@ksliga.com', 'hash_pro')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✅ Default user #1 ensured in pro_users!');
  await client.end();
}

ensureDefaultUser().catch(console.error);
