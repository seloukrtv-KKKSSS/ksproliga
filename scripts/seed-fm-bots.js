const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const UA_FIRST_NAMES = [
  "Андрій", "Олександр", "Максим", "Дмитро", "Сергій", "Артем", "Владислав", "Тарас",
  "Богдан", "Ярослав", "Роман", "Віталій", "Олег", "Назар", "Денис", "Михайло",
  "Іван", "Євген", "Василь", "Вадим", "Юрій", "Ілля", "Павло", "Руслан", "Степан"
];

const UA_LAST_NAMES = [
  "Шевченко", "Ярмоленко", "Зінченко", "Мудрик", "Циганков", "Забарний", "Миколенко",
  "Лунін", "Трубін", "Довбик", "Шапаренко", "Бондаренко", "Судаков", "Сидорчук",
  "Степаненко", "Матвієнко", "Тимчик", "Караваєв", "Бущан", "Конопля", "Гуцуляк",
  "Піхальонок", "Ванат", "Яремчук", "Бражко", "Таловєров", "Сич", "Батагов"
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomName() {
  const fn = UA_FIRST_NAMES[getRandomInt(0, UA_FIRST_NAMES.length - 1)];
  const ln = UA_LAST_NAMES[getRandomInt(0, UA_LAST_NAMES.length - 1)];
  return `${fn} ${ln}`;
}

async function seed11x11Bots() {
  console.log('🌱 Connecting to PostgreSQL to seed 11x11.ru bot squads & market...');
  await client.connect();

  const clubsRes = await client.query('SELECT id, name FROM public.fm_clubs WHERE is_bot = TRUE');
  console.log(`Found ${clubsRes.rows.length} bot clubs to populate with 11x11 squads...`);

  // Clear existing players of bot clubs to regenerate clean 11x11 stats
  await client.query('DELETE FROM public.fm_players WHERE club_id IN (SELECT id FROM public.fm_clubs WHERE is_bot = TRUE)');
  await client.query('DELETE FROM public.fm_transfers');

  const positions = [
    { pos: "GK", sec: null },
    { pos: "GK", sec: null },
    { pos: "LD", sec: "CD" },
    { pos: "CD", sec: null },
    { pos: "CD", sec: "RD" },
    { pos: "RD", sec: null },
    { pos: "CD", sec: "LD" },
    { pos: "LM", sec: "LF" },
    { pos: "CM", sec: null },
    { pos: "CM", sec: "RM" },
    { pos: "RM", sec: null },
    { pos: "CM", sec: "LM" },
    { pos: "LF", sec: "CF" },
    { pos: "CF", sec: null },
    { pos: "RF", sec: "CF" },
    { pos: "CF", sec: null }
  ];

  const abilitiesPool = ["pass", "long_shot", "tackling", "header", "speed", "playmaker", "penalty", "one_on_one", "interception", "gk_reaction", "gk_exit", "dribbling"];

  for (const club of clubsRes.rows) {
    console.log(`Seeding 11x11 squad for: ${club.name} (ID: ${club.id})...`);

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const isStarter = i < 11;
      const pitchSlot = isStarter ? i + 1 : 0;
      const skill = getRandomInt(140, 240);
      const talent = getRandomInt(2, 5);
      const energy = 100;
      const xp = getRandomInt(20, 100);

      const playerAbilities = [];
      if (talent >= 3 && Math.random() > 0.4) {
        playerAbilities.push(abilitiesPool[getRandomInt(0, abilitiesPool.length - 1)]);
      }

      const pRes = await client.query(`
        INSERT INTO public.fm_players (
          club_id, name, nationality, age, position, secondary_position,
          skill, talent, special_abilities, energy, morale, xp,
          market_value, wage, matches_played, goals, assists, yellow_cards, red_cards,
          is_starter, pitch_slot, is_on_transfer, transfer_price, is_injured, injury_matches,
          overall_rating, stamina
        ) VALUES (
          $1, $2, 'Україна', $3, $4, $5,
          $6, $7, $8, $9, 100, $10,
          $11, $12, 0, 0, 0, 0, 0,
          $13, $14, $15, $16, FALSE, 0,
          $17, 100
        ) RETURNING id, name, position, skill, talent;
      `, [
        club.id,
        generateRandomName(),
        getRandomInt(19, 31),
        p.pos,
        p.sec,
        skill,
        talent,
        JSON.stringify(playerAbilities),
        energy,
        xp,
        skill * talent * 450,
        skill * 8,
        isStarter,
        pitchSlot,
        i === 15, // Put 16th player on transfer market
        i === 15 ? Math.round(skill * talent * 500) : 0,
        Math.round(skill / 3)
      ]);

      // If on transfer, add to fm_transfers
      if (i === 15) {
        const createdPlayer = pRes.rows[0];
        const buyout = Math.round(skill * talent * 550);
        const startBid = Math.round(buyout * 0.7);

        await client.query(`
          INSERT INTO public.fm_transfers (
            player_id, player_name, position, rating, skill, talent, special_abilities,
            seller_club_id, seller_club_name, current_bid, buyout_price, price, status, ends_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $10, 'active', NOW() + INTERVAL '2 hours'
          )
        `, [
          createdPlayer.id,
          createdPlayer.name,
          createdPlayer.position,
          Math.round(skill / 3),
          skill,
          talent,
          JSON.stringify(playerAbilities),
          club.id,
          club.name,
          startBid,
          buyout
        ]);
      }
    }
  }

  console.log('🎉 11x11.ru bots seeding completed successfully!');
  await client.end();
}

seed11x11Bots().catch((err) => {
  console.error('❌ Bot seeding failed:', err);
  process.exit(1);
});
