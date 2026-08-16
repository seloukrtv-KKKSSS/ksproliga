const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixForeignKey() {
  await client.connect();

  await client.query(`
    -- Drop strict foreign key constraint if present to allow guest gamers to create careers seamlessly
    ALTER TABLE public.pro_careers DROP CONSTRAINT IF EXISTS pro_careers_user_id_fkey;
    
    -- Re-add with ON DELETE SET NULL
    ALTER TABLE public.pro_careers 
      ADD CONSTRAINT pro_careers_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.pro_users(id) ON DELETE SET NULL;
  `);

  console.log('✅ Foreign key updated to ON DELETE SET NULL!');
  await client.end();
}

fixForeignKey().catch(console.error);
