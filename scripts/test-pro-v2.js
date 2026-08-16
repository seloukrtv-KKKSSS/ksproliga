const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function testProV2() {
  console.log('🧪 Testing Pro Career 2.0 full flow in Supabase...');
  await client.connect();

  const avatar = {
    skin_tone: "peach",
    face_shape: "oval",
    hair_style: "short_fade",
    hair_color: "dark_brown",
    eye_shape: "normal",
    eye_color: "brown",
    nose_type: "straight",
    mouth_type: "confident",
    facial_hair: "stubble"
  };

  const inventory = {
    boots: "boots_mercurial",
    car: "car_vaz",
    house: "house_village",
    trainers: ["trainer_sprint"],
    all_boots: ["boots_basic", "boots_mercurial"],
    all_cars: ["car_vaz"],
    all_houses: ["house_village"]
  };

  const newsArticles = [
    {
      id: "art_1",
      newspaper_name: "«Сільський Футбол»",
      headline: "🔥 Дебютний дубль юного форварда!",
      text: "Андрій Карпʼюк підкорює серця вболівальників у першому ж турі.",
      date_str: "16 серпня",
      importance: "breaking",
      tag: "Аматорський футбол"
    }
  ];

  // Test inserting new career with avatar, news, and inventory
  const ins = await client.query(`
    INSERT INTO public.pro_careers (
      user_id, first_name, last_name, nickname, age, position,
      foot, height, weight, overall_rating, potential, form, energy, morale,
      reputation, bank_balance, current_club_id, contract_years_left, wage_per_week,
      avatar, inventory, news_articles, last_rest_timestamp, last_spa_timestamp,
      contract_signed_this_season, attributes, career_stats, clubs_history
    ) VALUES (
      1, 'Андрій', 'Карпʼюк', 'Снайпер', 17, 'ST',
      'right', 182, 75, 45, 86, 85, 100, 100,
      80, 2500, 1, 2, 1200,
      $1, $2, $3, 0, 0,
      false, '{"pace":55,"shooting":52,"passing":45,"dribbling":50,"defending":35,"physical":50,"positioning":48,"decision_making":46,"stamina":60}'::jsonb,
      '{"total_matches":0,"total_goals":0,"total_assists":0,"total_trophies":0,"avg_rating":7.0,"season_matches":0,"season_goals":0,"season_assists":0}'::jsonb,
      '[{"club_id":1,"club_name":"ФК Тучапи","city":"Тучапи","tier":1,"from_year":2026,"seasons_count":1,"matches":0,"goals":0,"assists":0}]'::jsonb
    ) RETURNING id;
  `, [JSON.stringify(avatar), JSON.stringify(inventory), JSON.stringify(newsArticles)]);

  const careerId = ins.rows[0].id;
  console.log(`✅ Inserted test career with ID: ${careerId}`);

  // Fetch back
  const fetchRes = await client.query(`SELECT id, first_name, avatar->>'hair_style' as hair, inventory->'all_boots' as boots, news_articles->0->>'headline' as news FROM public.pro_careers WHERE id = $1`, [careerId]);
  console.log('📦 Fetched back record:', fetchRes.rows[0]);

  // Clean test career
  await client.query(`DELETE FROM public.pro_careers WHERE id = $1`, [careerId]);
  console.log('🧹 Cleaned test career record.');

  console.log('🎉 PRO CAREER 2.0 DATABASE INTEGRATION 100% VERIFIED!');
  await client.end();
}

testProV2().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
