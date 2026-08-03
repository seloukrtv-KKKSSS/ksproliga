const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Connected to Postgres database')
  
  await client.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS roster text[];')
  console.log('SUCCESS: Added roster column to teams table')
  
  await client.query('ALTER TABLE voting_candidates ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;')
  console.log('SUCCESS: Added is_hidden column to voting_candidates table')

  await client.end()
}

run().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
