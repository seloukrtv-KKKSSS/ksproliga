const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seedProClubs() {
  console.log('🌱 Seeding Ukrainian Football Pyramid (5 Tiers, 40+ Clubs)...');
  await client.connect();

  // 1. Seed Leagues
  const leagues = [
    { tier: 1, name: 'Снятинський & Коломийський Район (Село)', region: 'Івано-Франківська / Чернівецька обл.', rep: 80 },
    { tier: 2, name: 'Перша Ліга Області (Івано-Франківськ & Буковина)', region: 'Західний Регіон', rep: 250 },
    { tier: 3, name: 'Друга Ліга України (ПФЛ)', region: 'Україна', rep: 450 },
    { tier: 4, name: 'Перша Ліга України (ПФЛ)', region: 'Україна', rep: 650 },
    { tier: 5, name: 'Українська Премʼєр Ліга (УПЛ)', region: 'Україна', rep: 900 }
  ];

  await client.query('DELETE FROM public.pro_clubs;');
  await client.query('DELETE FROM public.pro_leagues;');

  const leagueMap = {};
  for (const l of leagues) {
    const res = await client.query(`
      INSERT INTO public.pro_leagues (name, tier, region, reputation)
      VALUES ($1, $2, $3, $4)
      RETURNING id, tier;
    `, [l.name, l.tier, l.region, l.rep]);
    leagueMap[l.tier] = res.rows[0].id;
  }

  // 2. Clubs Data
  const clubsData = [
    // TIER 1: Село & Район
    { name: 'ФК Тучапи', short: 'ТУЧ', city: 'Тучапи', region: 'Івано-Франківська обл.', tier: 1, rep: 60, pCol: '#166534', sCol: '#FACC15', stadium: 'Сільський Стадіон «Колос»', cap: 350, str: 40 },
    { name: 'ФК Снятин', short: 'СНЯ', city: 'Снятин', region: 'Івано-Франківська обл.', tier: 1, rep: 95, pCol: '#1E3A8A', sCol: '#E0E7FF', stadium: 'Міський Стадіон «Колос»', cap: 800, str: 44 },
    { name: 'ФК Заболотів', short: 'ЗАБ', city: 'Заболотів', region: 'Івано-Франківська обл.', tier: 1, rep: 70, pCol: '#B91C1C', sCol: '#FEF08A', stadium: 'Стадіон «Юність»', cap: 400, str: 41 },
    { name: 'ФК Підгірʼя', short: 'ПІД', city: 'Підгірʼя', region: 'Івано-Франківська обл.', tier: 1, rep: 65, pCol: '#047857', sCol: '#A7F3D0', stadium: 'Арена «Підгірʼя»', cap: 300, str: 39 },
    { name: 'ФК Кіцмань', short: 'КІЦ', city: 'Кіцмань', region: 'Чернівецька обл.', tier: 1, rep: 85, pCol: '#4338CA', sCol: '#FDE047', stadium: 'Стадіон ім. Івасюка', cap: 600, str: 43 },
    { name: 'ФК Новоселиця', short: 'НОВ', city: 'Новоселиця', region: 'Чернівецька обл.', tier: 1, rep: 80, pCol: '#0369A1', sCol: '#BAE6FD', stadium: 'Колос Арена', cap: 500, str: 42 },
    { name: 'ФК Мамаївці', short: 'МАМ', city: 'Мамаївці', region: 'Чернівецька обл.', tier: 1, rep: 75, pCol: '#0F766E', sCol: '#CCFBF1', stadium: 'Сільська Арена', cap: 400, str: 41 },
    { name: 'ФК Косів', short: 'КОС', city: 'Косів', region: 'Івано-Франківська обл.', tier: 1, rep: 90, pCol: '#9A3412', sCol: '#FFEDD5', stadium: 'Гуцульщина', cap: 700, str: 43 },
    { name: 'ФК Гвіздець', short: 'ГВІ', city: 'Гвіздець', region: 'Івано-Франківська обл.', tier: 1, rep: 65, pCol: '#374151', sCol: '#E5E7EB', stadium: 'Стадіон «Нива»', cap: 350, str: 39 },
    { name: 'ФК Отинія', short: 'ОТИ', city: 'Отинія', region: 'Івано-Франківська обл.', tier: 1, rep: 70, pCol: '#6B21A8', sCol: '#F3E8FF', stadium: 'Стадіон «Локомотив»', cap: 450, str: 40 },

    // TIER 2: Чемпіонат Області
    { name: 'Покуття', short: 'ПОК', city: 'Коломия', region: 'Івано-Франківська обл.', tier: 2, rep: 260, pCol: '#C2410C', sCol: '#FEF08A', stadium: 'Стадіон «Юність»', cap: 3500, str: 55 },
    { name: 'Пробій', short: 'ПРБ', city: 'Городенка', region: 'Івано-Франківська обл.', tier: 2, rep: 280, pCol: '#047857', sCol: '#FDE047', stadium: 'Пробій Арена', cap: 2500, str: 57 },
    { name: 'Прикарпаття-2', short: 'ПР2', city: 'Івано-Франківськ', region: 'Івано-Франківська обл.', tier: 2, rep: 250, pCol: '#15803D', sCol: '#FEF08A', stadium: 'Рух (Мале Поле)', cap: 2000, str: 54 },
    { name: 'ФСК Чернівці', short: 'ФСК', city: 'Чернівці', region: 'Чернівецька обл.', tier: 2, rep: 270, pCol: '#1D4ED8', sCol: '#FACC15', stadium: 'Олімпія', cap: 3000, str: 56 },
    { name: 'ФК Волока', short: 'ВОЛ', city: 'Волока', region: 'Чернівецька обл.', tier: 2, rep: 260, pCol: '#854D0E', sCol: '#FEF9C3', stadium: 'Волока Парк', cap: 1500, str: 55 },
    { name: 'Ураган', short: 'УРА', city: 'Черніїв', region: 'Івано-Франківська обл.', tier: 2, rep: 240, pCol: '#B91C1C', sCol: '#000000', stadium: 'Черніїв Арена', cap: 1200, str: 53 },
    { name: 'Блакитний Дунай', short: 'ДУН', city: 'Задубрівка', region: 'Чернівецька обл.', tier: 2, rep: 230, pCol: '#0284C7', sCol: '#E0F2FE', stadium: 'Дунай Стедіум', cap: 1000, str: 52 },
    { name: 'Карпати', short: 'КБР', city: 'Брошнів-Осада', region: 'Івано-Франківська обл.', tier: 2, rep: 240, pCol: '#166534', sCol: '#FFFFFF', stadium: 'Карпати Брошнів', cap: 1800, str: 53 },

    // TIER 3: Друга Ліга України (ПФЛ)
    { name: 'Скала 1911', short: 'СКЛ', city: 'Стрий', region: 'Львівська обл.', tier: 3, rep: 440, pCol: '#1E40AF', sCol: '#FDE047', stadium: 'Сокіл Стрий', cap: 6000, str: 66 },
    { name: 'Рух-2', short: 'РХ2', city: 'Львів', region: 'Львівська обл.', tier: 3, rep: 460, pCol: '#CA8A04', sCol: '#000000', stadium: 'Ім. Богдана Маркевича', cap: 3500, str: 68 },
    { name: 'Карпати-2', short: 'КП2', city: 'Львів', region: 'Львівська обл.', tier: 3, rep: 450, pCol: '#15803D', sCol: '#FFFFFF', stadium: 'Україна (Тренувальне)', cap: 4000, str: 67 },
    { name: 'Нива', short: 'НВН', city: 'Вінниця', region: 'Вінницька обл.', tier: 3, rep: 480, pCol: '#15803D', sCol: '#FFFFFF', stadium: 'Центральний Стадіон', cap: 14000, str: 69 },
    { name: 'ФК Кудрівка', short: 'КУД', city: 'Кудрівка', region: 'Чернігівська обл.', tier: 3, rep: 450, pCol: '#0F766E', sCol: '#FACC15', stadium: 'Кудрівка Арена', cap: 2500, str: 67 },
    { name: 'Реал Фарма', short: 'РФР', city: 'Одеса', region: 'Одеська обл.', tier: 3, rep: 420, pCol: '#B91C1C', sCol: '#FFFFFF', stadium: 'Іван', cap: 3000, str: 65 },

    // TIER 4: Перша Ліга України (ПФЛ)
    { name: 'Прикарпаття', short: 'ПРК', city: 'Івано-Франківськ', region: 'Івано-Франківська обл.', tier: 4, rep: 660, pCol: '#15803D', sCol: '#FEF08A', stadium: 'МЦС «Рух»', cap: 15000, str: 75 },
    { name: 'Буковина', short: 'БУК', city: 'Чернівці', region: 'Чернівецька обл.', tier: 4, rep: 670, pCol: '#EAB308', sCol: '#000000', stadium: 'Стадіон «Буковина»', cap: 12000, str: 76 },
    { name: 'Епіцентр', short: 'ЕПІ', city: 'Камʼянець-Подільський', region: 'Хмельницька обл.', tier: 4, rep: 680, pCol: '#1D4ED8', sCol: '#FFFFFF', stadium: 'ім. Тонкочеєва', cap: 7000, str: 77 },
    { name: 'Нива Тернопіль', short: 'НТР', city: 'Тернопіль', region: 'Тернопільська обл.', tier: 4, rep: 650, pCol: '#166534', sCol: '#FDE047', stadium: 'Міський ім. Шухевича', cap: 15150, str: 74 },
    { name: 'Агробізнес', short: 'АГР', city: 'Волочиськ', region: 'Хмельницька обл.', tier: 4, rep: 660, pCol: '#0284C7', sCol: '#FACC15', stadium: 'Юність', cap: 2700, str: 75 },
    { name: 'Металіст', short: 'МЕТ', city: 'Харків', region: 'Харківська обл.', tier: 4, rep: 700, pCol: '#EAB308', sCol: '#1E3A8A', stadium: 'Авангард', cap: 8000, str: 78 },
    { name: 'Вікторія', short: 'ВІК', city: 'Суми', region: 'Сумська обл.', tier: 4, rep: 640, pCol: '#0D9488', sCol: '#FFFFFF', stadium: 'Ювілейний', cap: 25000, str: 74 },

    // TIER 5: Премʼєр Ліга України (УПЛ)
    { name: 'Динамо Київ', short: 'ДИН', city: 'Київ', region: 'Київ', tier: 5, rep: 950, pCol: '#1D4ED8', sCol: '#FFFFFF', stadium: 'НСК «Олімпійський» / Динамо', cap: 70050, str: 88 },
    { name: 'Шахтар Донецьк', short: 'ШАХ', city: 'Донецьк / Львів', region: 'Україна', tier: 5, rep: 960, pCol: '#EA580C', sCol: '#000000', stadium: 'Арена Львів', cap: 34915, str: 89 },
    { name: 'Карпати Львів', short: 'КАР', city: 'Львів', region: 'Львівська обл.', tier: 5, rep: 870, pCol: '#15803D', sCol: '#FFFFFF', stadium: 'Стадіон «Україна»', cap: 28051, str: 82 },
    { name: 'Полісся', short: 'ПОЛ', city: 'Житомир', region: 'Житомирська обл.', tier: 5, rep: 880, pCol: '#65A30D', sCol: '#FACC15', stadium: 'Центральний Стадіон', cap: 5928, str: 83 },
    { name: 'Кривбас', short: 'КРВ', city: 'Кривий Ріг', region: 'Дніпропетровська обл.', tier: 5, rep: 860, pCol: '#DC2626', sCol: '#FFFFFF', stadium: 'Гірник', cap: 4500, str: 82 },
    { name: 'Рух', short: 'РУХ', city: 'Львів', region: 'Львівська обл.', tier: 5, rep: 850, pCol: '#EAB308', sCol: '#000000', stadium: 'Арена Львів', cap: 34915, str: 81 },
    { name: 'Ворскла', short: 'ВОР', city: 'Полтава', region: 'Полтавська обл.', tier: 5, rep: 840, pCol: '#16A34A', sCol: '#FFFFFF', stadium: 'ім. Бутовського', cap: 24795, str: 80 },
    { name: 'Олександрія', short: 'ОЛЕ', city: 'Олександрія', region: 'Кіровоградська обл.', tier: 5, rep: 850, pCol: '#2563EB', sCol: '#FACC15', stadium: 'КСК «Ніка»', cap: 7000, str: 81 },
    { name: 'ЛНЗ', short: 'ЛНЗ', city: 'Черкаси', region: 'Черкаська обл.', tier: 5, rep: 830, pCol: '#4F46E5', sCol: '#F43F5E', stadium: 'Черкаси Арена', cap: 10321, str: 79 },
    { name: 'Чорноморець', short: 'ЧОР', city: 'Одеса', region: 'Одеська обл.', tier: 5, rep: 840, pCol: '#0284C7', sCol: '#000000', stadium: 'Стадіон «Чорноморець»', cap: 34164, str: 80 }
  ];

  console.log(`🏟️ Inserting ${clubsData.length} clubs across 5 tiers...`);
  for (const c of clubsData) {
    const leagueId = leagueMap[c.tier];
    await client.query(`
      INSERT INTO public.pro_clubs (
        name, short_name, city, region, league_id, tier, reputation,
        primary_color, secondary_color, badge_symbol, stadium_name,
        stadium_capacity, budget, squad_strength
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
    `, [
      c.name, c.short, c.city, c.region, leagueId, c.tier, c.rep,
      c.pCol, c.sCol, 'shield', c.stadium,
      c.cap, c.tier * 500000 + 50000, c.str
    ]);
  }

  console.log('✅ Clubs & Leagues Seeding Completed!');
  await client.end();
}

seedProClubs().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
