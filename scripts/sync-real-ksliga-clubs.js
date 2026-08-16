const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.tkshtyrfwvihpzsnbmvx:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function syncRealClubs() {
  console.log('🏟️ Syncing real KSLIGA teams and logos into pro_clubs...');
  await client.connect();

  // Ensure logo_url column exists in pro_clubs
  await client.query(`
    ALTER TABLE public.pro_clubs 
      ADD COLUMN IF NOT EXISTS logo_url TEXT;
  `);

  // Ensure gender column in pro_careers
  await client.query(`
    ALTER TABLE public.pro_careers 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';
  `);

  // Real teams from KSLIGA
  const realTeams = [
    // Tier 1: Снятинський & Коломийський Район (Село)
    {
      name: "ФК Тучапи",
      short_name: "Тучапи",
      city: "Тучапи",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 85,
      primary_color: "#15803D",
      secondary_color: "#FACC15",
      badge_symbol: "shield",
      logo_url: "https://kdfa.if.ua/storage/teams/58/team-logo-58.png",
      stadium_name: "Сільський стадіон «Колос»",
      stadium_capacity: 600,
      budget: 35000,
      squad_strength: 42
    },
    {
      name: "СК Трійця",
      short_name: "Трійця",
      city: "Трійця",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 80,
      primary_color: "#1E3A8A",
      secondary_color: "#F59E0B",
      badge_symbol: "shield",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/1/15/Troica_gerb.png",
      stadium_name: "Стадіон ім. Героїв",
      stadium_capacity: 500,
      budget: 30000,
      squad_strength: 40
    },
    {
      name: "ФК Снятин",
      short_name: "Снятин",
      city: "Снятин",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 90,
      primary_color: "#DC2626",
      secondary_color: "#FFFFFF",
      badge_symbol: "shield",
      logo_url: "https://kdfa.if.ua/storage/teams/58/team-logo-58.png",
      stadium_name: "Міський стадіон «Колос»",
      stadium_capacity: 1200,
      budget: 50000,
      squad_strength: 46
    },
    {
      name: "Темп",
      short_name: "Темп",
      city: "Заболотів",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 88,
      primary_color: "#D97706",
      secondary_color: "#1E293B",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/temp.png",
      stadium_name: "Стадіон «Темп»",
      stadium_capacity: 800,
      budget: 45000,
      squad_strength: 44
    },
    {
      name: "ФК Вільхівці",
      short_name: "Вільхівці",
      city: "Вільхівці",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 82,
      primary_color: "#047857",
      secondary_color: "#FDE047",
      badge_symbol: "shield",
      logo_url: "https://kdfa.if.ua/storage/clubs/32/club-logo-32.png",
      stadium_name: "Сільська Арена",
      stadium_capacity: 500,
      budget: 32000,
      squad_strength: 41
    },
    {
      name: "Кремінь",
      short_name: "Кремінь",
      city: "Пістинь",
      region: "Івано-Франківська обл.",
      tier: 1,
      reputation: 80,
      primary_color: "#475569",
      secondary_color: "#38BDF8",
      badge_symbol: "shield",
      logo_url: "https://kdfa.if.ua/storage/teams/76/team-logo-76.png",
      stadium_name: "Стадіон «Кремінь»",
      stadium_capacity: 600,
      budget: 30000,
      squad_strength: 40
    },

    // Tier 2: Чемпіонат Області (Перша ліга області - Івано-Франківськ & Буковина)
    {
      name: "Покуття",
      short_name: "Покуття",
      city: "Коломия",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 280,
      primary_color: "#166534",
      secondary_color: "#FACC15",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/pokuttia.png",
      stadium_name: "Стадіон «Юність»",
      stadium_capacity: 5000,
      budget: 250000,
      squad_strength: 58
    },
    {
      name: "Прикарпаття-Тепловик",
      short_name: "Прикарпаття-Т",
      city: "Івано-Франківськ",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 270,
      primary_color: "#15803D",
      secondary_color: "#FBBF24",
      badge_symbol: "shield",
      logo_url: "https://fc.if.ua/assets/images/logo-fcp.png",
      stadium_name: "Стадіон «Рух» (запасне поле)",
      stadium_capacity: 3500,
      budget: 220000,
      squad_strength: 57
    },
    {
      name: "ФК Бурштин",
      short_name: "Бурштин",
      city: "Бурштин",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 250,
      primary_color: "#B45309",
      secondary_color: "#FDE68A",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/fk-burshtyn.png",
      stadium_name: "Стадіон «Енергетик»",
      stadium_capacity: 4000,
      budget: 200000,
      squad_strength: 55
    },
    {
      name: "Хімік",
      short_name: "Хімік",
      city: "Калуш",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 260,
      primary_color: "#2563EB",
      secondary_color: "#FFFFFF",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/khimik.png",
      stadium_name: "Стадіон «Хімік»",
      stadium_capacity: 7000,
      budget: 230000,
      squad_strength: 56
    },
    {
      name: "Горгани",
      short_name: "Горгани",
      city: "Рожнятів",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 230,
      primary_color: "#059669",
      secondary_color: "#A7F3D0",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/horhany.png",
      stadium_name: "Стадіон «Горгани»",
      stadium_capacity: 2500,
      budget: 180000,
      squad_strength: 53
    },
    {
      name: "Карпати",
      short_name: "Карпати Б",
      city: "Болехів",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 235,
      primary_color: "#166534",
      secondary_color: "#FFFFFF",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/karpaty-bolekhiv.png",
      stadium_name: "Стадіон «Карпати»",
      stadium_capacity: 2000,
      budget: 190000,
      squad_strength: 54
    },
    {
      name: "Пробій-2",
      short_name: "Пробій-2",
      city: "Городенка",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 240,
      primary_color: "#DC2626",
      secondary_color: "#FACC15",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/probii-2.png",
      stadium_name: "Стадіон «Колос»",
      stadium_capacity: 3000,
      budget: 210000,
      squad_strength: 55
    },
    {
      name: "Хутровик",
      short_name: "Хутровик",
      city: "Тисмениця",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 230,
      primary_color: "#7C3AED",
      secondary_color: "#DDD6FE",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/khutrovyk.png",
      stadium_name: "Стадіон «Хутровик»",
      stadium_capacity: 2500,
      budget: 185000,
      squad_strength: 53
    },
    {
      name: "Вихор",
      short_name: "Вихор",
      city: "Ямниця",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 235,
      primary_color: "#0891B2",
      secondary_color: "#CFFAFE",
      badge_symbol: "shield",
      logo_url: "https://kdfa.if.ua/storage/teams/174/team-logo-174.png",
      stadium_name: "Стадіон «Вихор-Арена»",
      stadium_capacity: 2200,
      budget: 190000,
      squad_strength: 54
    },
    {
      name: "Прут",
      short_name: "Прут",
      city: "Делятин",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 225,
      primary_color: "#0284C7",
      secondary_color: "#BAE6FD",
      badge_symbol: "shield",
      logo_url: "https://oxcore.if.ua/logos/prut.png",
      stadium_name: "Стадіон «Прут»",
      stadium_capacity: 1800,
      budget: 175000,
      squad_strength: 52
    },
    {
      name: "Сокіл",
      short_name: "Сокіл",
      city: "Павлівка",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 220,
      primary_color: "#4F46E5",
      secondary_color: "#E0E7FF",
      badge_symbol: "shield",
      logo_url: "https://imgpx.com/oWoNJPt85swV.webp",
      stadium_name: "Стадіон «Сокіл»",
      stadium_capacity: 1500,
      budget: 170000,
      squad_strength: 51
    },
    {
      name: "Лісоруб",
      short_name: "Лісоруб",
      city: "Перегінське",
      region: "Івано-Франківська обл.",
      tier: 2,
      reputation: 220,
      primary_color: "#15803D",
      secondary_color: "#86EFAC",
      badge_symbol: "shield",
      logo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkR_KEDxkAfr6YbfKVKSorkf8fc0xNf0v4P5yh_rhE3g&s=10",
      stadium_name: "Стадіон «Лісоруб»",
      stadium_capacity: 1600,
      budget: 170000,
      squad_strength: 51
    }
  ];

  for (const team of realTeams) {
    const existing = await client.query(`SELECT id FROM public.pro_clubs WHERE name = $1;`, [team.name]);
    if (existing.rows.length > 0) {
      await client.query(`
        UPDATE public.pro_clubs SET
          short_name = $2,
          city = $3,
          region = $4,
          tier = $5,
          reputation = $6,
          primary_color = $7,
          secondary_color = $8,
          badge_symbol = $9,
          logo_url = $10,
          stadium_name = $11,
          stadium_capacity = $12,
          budget = $13,
          squad_strength = $14
        WHERE id = $1;
      `, [
        existing.rows[0].id, team.short_name, team.city, team.region,
        team.tier, team.reputation, team.primary_color, team.secondary_color,
        team.badge_symbol, team.logo_url, team.stadium_name, team.stadium_capacity,
        team.budget, team.squad_strength
      ]);
    } else {
      await client.query(`
        INSERT INTO public.pro_clubs (
          name, short_name, city, region, league_id, tier, reputation,
          primary_color, secondary_color, badge_symbol, logo_url, stadium_name,
          stadium_capacity, budget, squad_strength
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        );
      `, [
        team.name, team.short_name, team.city, team.region,
        team.tier, team.tier, team.reputation,
        team.primary_color, team.secondary_color, team.badge_symbol,
        team.logo_url, team.stadium_name, team.stadium_capacity,
        team.budget, team.squad_strength
      ]);
    }
  }

  console.log('✅ All real KSLIGA clubs with emblems updated successfully!');
  await client.end();
}

syncRealClubs().catch(console.error);
