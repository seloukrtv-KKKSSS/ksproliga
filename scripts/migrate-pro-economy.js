const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrateProEconomy() {
  console.log('🚀 Connecting to Supabase PostgreSQL to add Economy & Inventory columns...');
  await client.connect();
  console.log('✅ Connected!');

  await client.query(`
    ALTER TABLE public.pro_careers
      ADD COLUMN IF NOT EXISTS bank_balance BIGINT DEFAULT 2500,
      ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{"boots": "boots_basic", "car": "car_none", "house": "house_village", "trainers": []}'::jsonb,
      ADD COLUMN IF NOT EXISTS scout_interest JSONB DEFAULT '{"tier2": 25, "tier3": 0, "tier4": 0, "tier5": 0}'::jsonb;
  `);

  console.log('✅ Economy columns successfully added to pro_careers!');
  await client.end();
}

migrateProEconomy().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
