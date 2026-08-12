const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const FIRST_NAMES = [
  'Андрій', 'Олександр', 'Михайло', 'Тарас', 'Іван', 'Дмитро', 'Віталій', 'Богдан',
  'Максим', 'Роман', 'Сергій', 'Артем', 'Назар', 'Ярослав', 'Владислав', 'Олег',
  'Василь', 'Юрій', 'Денис', 'Ігор', 'Вадим', 'Руслан', 'Павло', 'Євген'
];

const LAST_NAMES = [
  'Шевченко', 'Ярмоленко', 'Зінченко', 'Мудрик', 'Довбик', 'Трубін', 'Забарний', 'Миколенко',
  'Степаненко', 'Шапаренко', 'Судаков', 'Бущан', 'Циганков', 'Матвієнко', 'Конопля', 'Тимчик',
  'Сидорчук', 'Караваєв', 'Ванат', 'Гуцуляк', 'Бондаренко', 'Криськів', 'Бражко', 'Таловєров',
  'Карпюк', 'Селоук', 'Ковальчук', 'Мельник', 'Ткачук', 'Кравченко', 'Лисенко', 'Олійник'
];

const POSITIONS = [
  'GK', 'GK',
  'CB', 'CB', 'CB', 'LB', 'RB',
  'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM',
  'ST', 'ST', 'LW', 'RW'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

async function seedBots() {
  await client.connect();
  console.log('🌱 Seeding bot squad players and initial transfer market...');

  const clubsRes = await client.query('SELECT id, name FROM public.fm_clubs WHERE is_bot = TRUE;');
  console.log(`Found ${clubsRes.rows.length} bot clubs.`);

  for (const club of clubsRes.rows) {
    const pCount = await client.query('SELECT COUNT(*) FROM public.fm_players WHERE club_id = $1', [club.id]);
    if (parseInt(pCount.rows[0].count, 10) >= 11) {
      console.log(`Club ${club.name} already has ${pCount.rows[0].count} players.`);
      continue;
    }

    console.log(`Generating squad for ${club.name}...`);
    for (let i = 0; i < POSITIONS.length; i++) {
      const pos = POSITIONS[i];
      const isGK = pos === 'GK';
      const age = getRandomInt(18, 33);
      const overall = getRandomInt(62, 78);
      const isStarter = i < 11;

      const pace = isGK ? getRandomInt(30, 50) : getRandomInt(55, 85);
      const shooting = isGK ? getRandomInt(15, 30) : (pos === 'ST' || pos === 'LW' || pos === 'RW' ? getRandomInt(65, 82) : getRandomInt(45, 70));
      const passing = isGK ? getRandomInt(40, 65) : getRandomInt(55, 80);
      const dribbling = isGK ? getRandomInt(20, 40) : getRandomInt(55, 80);
      const defending = isGK ? getRandomInt(20, 40) : (pos.includes('B') || pos === 'CDM' ? getRandomInt(65, 82) : getRandomInt(40, 65));
      const physical = getRandomInt(55, 85);
      const goalkeeping = isGK ? overall : getRandomInt(10, 20);

      const marketValue = overall * overall * 15;
      const wage = Math.round(overall * 35);
      const potential = Math.min(95, overall + (33 - age) * 2);

      const pRes = await client.query(`
        INSERT INTO public.fm_players (
          club_id, name, nationality, age, position, overall_rating,
          pace, shooting, passing, dribbling, defending, physical, goalkeeping,
          stamina, morale, form, potential, market_value, wage,
          is_starter, pitch_slot, is_on_transfer, transfer_price
        ) VALUES (
          $1, $2, 'Україна', $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          100, 100, 80, $13, $14, $15,
          $16, $17, $18, $19
        ) RETURNING id;
      `, [
        club.id, getRandomName(), age, pos, overall,
        pace, shooting, passing, dribbling, defending, physical, goalkeeping,
        potential, marketValue, wage,
        isStarter, isStarter ? i + 1 : 0,
        i === 15, i === 15 ? Math.round(marketValue * 1.1) : 0
      ]);

      // If player is on transfer, create transfer listing
      if (i === 15) {
        await client.query(`
          INSERT INTO public.fm_transfers (
            player_id, player_name, position, rating, seller_club_id, price, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        `, [pRes.rows[0].id, getRandomName(), pos, overall, club.id, Math.round(marketValue * 1.1)]);
      }
    }
  }

  console.log('✅ Bot players seeded successfully!');
  await client.end();
}

seedBots().catch((err) => {
  console.error('❌ Error seeding bots:', err);
  process.exit(1);
});
