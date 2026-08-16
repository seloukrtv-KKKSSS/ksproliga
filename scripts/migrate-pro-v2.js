const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrateProV2() {
  console.log('🚀 Running database schema migration for Pro Career 2.0 (Avatar, Timers, News)...');
  await client.connect();

  await client.query(`
    ALTER TABLE public.pro_careers 
      ADD COLUMN IF NOT EXISTS avatar JSONB DEFAULT '{"skin_tone":"peach","face_shape":"oval","hair_style":"short_fade","hair_color":"dark_brown","eye_shape":"normal","eye_color":"brown","nose_type":"straight","mouth_type":"confident","facial_hair":"stubble"}'::jsonb,
      ADD COLUMN IF NOT EXISTS last_rest_timestamp BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_spa_timestamp BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS news_articles JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS contract_signed_this_season BOOLEAN DEFAULT FALSE;
  `);

  console.log('✅ Columns avatar, last_rest_timestamp, last_spa_timestamp, news_articles, contract_signed_this_season ensured!');
  await client.end();
}

migrateProV2().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
