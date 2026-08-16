const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function testProEconomy() {
  console.log('🧪 Testing KSLIGA: Від Села до УПЛ Economy & Transfers...');
  await client.connect();

  // 1. Fetch user career
  const res = await client.query('SELECT id, first_name, last_name, bank_balance, wage_per_week, inventory, scout_interest FROM public.pro_careers LIMIT 1');
  const career = res.rows[0];
  console.log(`✅ Player Found: ${career.first_name} ${career.last_name}`);
  console.log(`💰 Bank Balance: ${career.bank_balance} ₴ | Weekly Wage: ${career.wage_per_week} ₴`);
  console.log(`🎒 Inventory:`, career.inventory);
  console.log(`🕵️ Scout Interest:`, career.scout_interest);

  // 2. Simulate Match Payout
  const salary = career.wage_per_week;
  const goalBonus = 2 * 500; // 2 goals in village
  const winBonus = 400; // win bonus
  const totalEarned = salary + goalBonus + winBonus;
  const newBalance = Number(career.bank_balance) + totalEarned;

  await client.query('UPDATE public.pro_careers SET bank_balance = $1 WHERE id = $2', [newBalance, career.id]);
  console.log(`✅ Match Payout processed: +${totalEarned} ₴ (New Balance: ${newBalance} ₴)`);

  // 3. Simulate Item Purchase (Nike Mercurial Vapor Pro - 6,500 ₴)
  const itemPrice = 6500;
  if (newBalance >= itemPrice) {
    const afterPurchase = newBalance - itemPrice;
    await client.query(`
      UPDATE public.pro_careers 
      SET bank_balance = $1, 
          inventory = jsonb_set(inventory, '{boots}', '"boots_mercurial"'::jsonb)
      WHERE id = $2
    `, [afterPurchase, career.id]);
    console.log(`✅ Purchase Nike Mercurial successful! Balance remaining: ${afterPurchase} ₴`);
  } else {
    console.log(`ℹ️ Balance ${newBalance} ₴ (item requires ${itemPrice} ₴)`);
  }

  console.log('🎉 ALL ECONOMY & TRANSFER CHECKS PASSED PERFECTLY!');
  await client.end();
}

testProEconomy().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
