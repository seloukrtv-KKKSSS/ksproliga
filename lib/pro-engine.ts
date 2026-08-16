import {
  ProAttributes,
  ProCareer,
  ProClub,
  ProMatchMoment,
  ProMomentChoice,
  ProMomentOutcome,
  ProMatchResult,
  ProPosition,
  ProStoryEvent,
  ProStoreItem,
  ProScoutRequirement,
  ProMatchEarnings,
  ProNewsArticle,
  ProAvatar
} from "./pro-types"

/**
 * Calculates Overall Rating (OVR 10-99) based on position weights
 */
export function calculateOverallRating(
  pos: ProPosition,
  attr: ProAttributes
): number {
  let ovr = 40
  const gk = attr.goalkeeping || 40

  switch (pos) {
    case "ST":
      ovr =
        attr.shooting * 0.35 +
        attr.pace * 0.25 +
        attr.positioning * 0.15 +
        attr.dribbling * 0.15 +
        attr.physical * 0.1
      break
    case "RW":
    case "LW":
      ovr =
        attr.pace * 0.3 +
        attr.dribbling * 0.25 +
        attr.shooting * 0.2 +
        attr.passing * 0.15 +
        attr.positioning * 0.1
      break
    case "CAM":
      ovr =
        attr.passing * 0.3 +
        attr.dribbling * 0.25 +
        attr.shooting * 0.2 +
        attr.decision_making * 0.15 +
        attr.positioning * 0.1
      break
    case "CM":
      ovr =
        attr.passing * 0.25 +
        attr.decision_making * 0.2 +
        attr.stamina * 0.15 +
        attr.defending * 0.15 +
        attr.physical * 0.15 +
        attr.shooting * 0.1
      break
    case "CDM":
      ovr =
        attr.defending * 0.3 +
        attr.physical * 0.25 +
        attr.passing * 0.2 +
        attr.decision_making * 0.15 +
        attr.stamina * 0.1
      break
    case "LB":
    case "RB":
      ovr =
        attr.pace * 0.3 +
        attr.defending * 0.25 +
        attr.stamina * 0.2 +
        attr.passing * 0.15 +
        attr.physical * 0.1
      break
    case "CB":
      ovr =
        attr.defending * 0.35 +
        attr.physical * 0.3 +
        attr.positioning * 0.15 +
        attr.decision_making * 0.1 +
        attr.pace * 0.1
      break
    case "GK":
      ovr = gk * 0.7 + attr.positioning * 0.15 + attr.decision_making * 0.15
      break
  }

  return Math.max(30, Math.min(99, Math.round(ovr)))
}

/**
 * Anatomical Physical Modifiers based on Height (160-205 cm) & Weight (55-105 kg)
 */
export interface AnatomyModifiers {
  bodyTypeLabel: string
  description: string
  paceMod: number
  dribbleMod: number
  physicalMod: number
  shootingMod: number
  defendingMod: number
  potentialOffset: number
}

export function calculateAnatomyModifiers(
  height: number,
  weight: number,
  pos: ProPosition
): AnatomyModifiers {
  // Height baseline: 180 cm, Weight baseline: 74 kg
  const heightDiff = height - 180
  const weightDiff = weight - 74

  let paceMod = Math.round(-heightDiff * 0.3 - weightDiff * 0.15)
  let dribbleMod = Math.round(-heightDiff * 0.25 - weightDiff * 0.1)
  let physicalMod = Math.round(heightDiff * 0.35 + weightDiff * 0.3)
  let shootingMod = Math.round(weightDiff * 0.15 + (height > 185 ? 2 : 0))
  let defendingMod = Math.round(heightDiff * 0.2 + weightDiff * 0.2)

  let bodyTypeLabel = "Збалансований атлет"
  let description = "Гармонійний баланс швидкості, сили та витривалості."
  let potentialOffset = 0

  if (height <= 174 && weight <= 70) {
    bodyTypeLabel = "⚡ Спринтер-віртуоз"
    description = "Низький центр тяжіння: вибухова швидкість та дриблінг, але слабша гра корпусом."
    paceMod += 4
    dribbleMod += 4
    physicalMod -= 4
    potentialOffset = ["RW", "LW", "CAM"].includes(pos) ? 4 : -2
  } else if (height >= 190 && weight >= 82) {
    bodyTypeLabel = "🧱 Таранний гігант"
    description = "Могутня статура: домінування на другому поверсі та в єдиноборствах, менша маневреність."
    physicalMod += 6
    shootingMod += 3
    paceMod -= 4
    dribbleMod -= 4
    potentialOffset = ["ST", "CB", "GK"].includes(pos) ? 4 : -2
  } else if (height >= 183 && weight <= 75) {
    bodyTypeLabel = "🏃 Легкоатлет"
    description = "Широкий біговий крок та висока витривалість."
    paceMod += 2
    potentialOffset = 2
  }

  return {
    bodyTypeLabel,
    description,
    paceMod,
    dribbleMod,
    physicalMod,
    shootingMod,
    defendingMod,
    potentialOffset
  }
}

/**
 * Starter Attributes Generator incorporating anatomical modifiers
 */
export function generateStarterAttributes(
  pos: ProPosition,
  potential: number,
  height = 178,
  weight = 72
): ProAttributes {
  const base = 40 + Math.floor(Math.random() * 4)
  const isAttack = ["ST", "RW", "LW", "CAM"].includes(pos)
  const isMid = ["CM", "CDM"].includes(pos)
  const isDef = ["LB", "CB", "RB"].includes(pos)
  const isGk = pos === "GK"

  const anatomy = calculateAnatomyModifiers(height, weight, pos)

  const pace = Math.max(35, Math.min(85, (isAttack || ["LB", "RB"].includes(pos) ? base + 8 : base) + anatomy.paceMod))
  const shooting = Math.max(30, Math.min(85, (isAttack ? base + 7 : isMid ? base + 2 : base - 8) + anatomy.shootingMod))
  const passing = Math.max(30, Math.min(85, isMid || pos === "CAM" ? base + 7 : base + 1))
  const dribbling = Math.max(30, Math.min(85, (isAttack || isMid ? base + 6 : base - 2) + anatomy.dribbleMod))
  const defending = Math.max(25, Math.min(85, (isDef || pos === "CDM" ? base + 8 : isAttack ? base - 12 : base - 4) + anatomy.defendingMod))
  const physical = Math.max(35, Math.min(85, (isDef || pos === "ST" ? base + 6 : base + 2) + anatomy.physicalMod))

  return {
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    positioning: base + 4,
    decision_making: base + 2,
    stamina: 55 + Math.floor(Math.random() * 10),
    goalkeeping: isGk ? base + 10 : 25
  }
}

/**
 * Store Items Catalog (Trainers, Boots, Cars, Housing)
 */
export const STORE_ITEMS: ProStoreItem[] = [
  // 1. Personal Trainers (Прокачка)
  {
    id: "trainer_sprint",
    name: "Персональний тренер зі спринту",
    category: "trainers",
    price: 8500,
    description: "Індивідуальна робота над стартовим прискоренням та біговою технікою",
    stat_boost: "+2 до Швидкості (PAC)",
    icon: "🏃",
    attribute_boost: { key: "pace", value: 2 }
  },
  {
    id: "trainer_shooting",
    name: "Тренер з ударної майстерності",
    category: "trainers",
    price: 9000,
    description: "Постановка удару з обох ніг, підкрутка та реалізація виходів",
    stat_boost: "+2 до Удару (SHO)",
    icon: "🎯",
    attribute_boost: { key: "shooting", value: 2 }
  },
  {
    id: "trainer_passing",
    name: "Майстер-клас плеймейкера",
    category: "trainers",
    price: 7500,
    description: "Розвиток культури розрізного пасу та бачення поля",
    stat_boost: "+2 до Пасу (PAS)",
    icon: "📐",
    attribute_boost: { key: "passing", value: 2 }
  },
  {
    id: "trainer_dribbling",
    name: "Тренер з фрістайлу та дриблінгу",
    category: "trainers",
    price: 7500,
    description: "Швидка робота ніг на носочках, обіграш у вузьких зонах",
    stat_boost: "+2 до Дриблінгу (DRI)",
    icon: "✨",
    attribute_boost: { key: "dribbling", value: 2 }
  },
  {
    id: "trainer_nutrition",
    name: "Спортивний нутриціолог",
    category: "trainers",
    price: 11000,
    description: "Персональний раціон харчування для витривалості та швидкого відновлення",
    stat_boost: "+3 до Витривалості (STA)",
    icon: "🥗",
    attribute_boost: { key: "stamina", value: 3 }
  },

  // 2. Professional Boots & Equipment
  {
    id: "boots_mercurial",
    name: "Nike Mercurial Vapor Pro",
    category: "boots",
    price: 12500,
    description: "Ультралегкі шипи для максимального зчеплення та спринтерських ривків",
    stat_boost: "+2 PAC, +1 DRI",
    icon: "👟",
    attribute_boost: { key: "pace", value: 2 }
  },
  {
    id: "boots_predator",
    name: "Adidas Predator Elite",
    category: "boots",
    price: 16500,
    description: "Гумові накладки Strikeskin для ідеальної підкрутки та гарматних ударів",
    stat_boost: "+3 SHO, +1 PAS",
    icon: "⚡",
    attribute_boost: { key: "shooting", value: 3 }
  },
  {
    id: "boots_future",
    name: "Puma Future Ultimate",
    category: "boots",
    price: 14000,
    description: "Анатомічна фіксація стопи для віртуозного контролю м'яча",
    stat_boost: "+2 DRI, +2 PAS",
    icon: "🎨",
    attribute_boost: { key: "dribbling", value: 2 }
  },

  // 3. Vehicles (Транспорт)
  {
    id: "car_vaz",
    name: "ВАЗ 2109 «Дев'ятка»",
    category: "cars",
    price: 35000,
    description: "Класичне авто, щоб швидко добиратися на матчі між селами",
    stat_boost: "+10 до Моралі, +15 Репутації",
    icon: "🚗",
    morale_boost: 10,
    rep_boost: 15
  },
  {
    id: "car_golf",
    name: "Volkswagen Golf GTI",
    category: "cars",
    price: 180000,
    description: "Надійний міський хетчбек для поїздок на матчі Чемпіонату Області",
    stat_boost: "+20 до Моралі, +35 Репутації",
    icon: "🚘",
    morale_boost: 20,
    rep_boost: 35
  },
  {
    id: "car_bmw",
    name: "BMW M5 Competition",
    category: "cars",
    price: 950000,
    description: "Швидкісний спорткар професійного гравця ПФЛ",
    stat_boost: "+35 до Моралі, +80 Репутації",
    icon: "🏎️",
    morale_boost: 35,
    rep_boost: 80
  },
  {
    id: "car_gwagon",
    name: "Mercedes-Benz G-Class (Гелік)",
    category: "cars",
    price: 3200000,
    description: "Абсолютний статус зірки УПЛ та лідера роздягальні",
    stat_boost: "+50 до Моралі, +180 Репутації",
    icon: "🚙",
    morale_boost: 50,
    rep_boost: 180
  },

  // 4. Housing & Real Estate (Житло)
  {
    id: "house_frankivsk_rent",
    name: "Оренда квартири у Франківську / Чернівцях",
    category: "houses",
    price: 60000,
    description: "Сучасне житло біля міського стадіону",
    stat_boost: "+15 до Моралі, +20 Репутації",
    icon: "🏢",
    morale_boost: 15,
    rep_boost: 20
  },
  {
    id: "house_new_apartment",
    name: "Власна 3-кімнатна квартира в новобудові",
    category: "houses",
    price: 650000,
    description: "Просторе житло з власним тренажерним куточком",
    stat_boost: "+30 до Моралі, +70 Репутації",
    icon: "🏙️",
    morale_boost: 30,
    rep_boost: 70
  },
  {
    id: "house_penthouse_kyiv",
    name: "Пентхаус на Печерську (Київ)",
    category: "houses",
    price: 4200000,
    description: "Елітний пентхаус з панорамою на НСК «Олімпійський»",
    stat_boost: "+50 до Моралі, +250 Репутації",
    icon: "🏰",
    morale_boost: 50,
    rep_boost: 250
  }
]

/**
 * Calculate Match Financial Earnings based on club contract and match performance
 */
export function calculateMatchEarnings(
  career: ProCareer,
  playerClub: ProClub,
  goals: number,
  assists: number,
  isWin: boolean,
  isCleanSheet: boolean
): ProMatchEarnings {
  const wage = career.wage_per_week

  // Bonus scale per tier
  const tier = playerClub.tier
  const goalRate = tier === 1 ? 500 : tier === 2 ? 1500 : tier === 3 ? 5000 : tier === 4 ? 15000 : 40000
  const assistRate = tier === 1 ? 300 : tier === 2 ? 1000 : tier === 3 ? 3000 : tier === 4 ? 8000 : 25000
  const winRate = tier === 1 ? 400 : tier === 2 ? 1200 : tier === 3 ? 4000 : tier === 4 ? 12000 : 35000

  const goalBonus = goals * goalRate
  const assistBonus = assists * assistRate
  const winBonus = isWin ? winRate : 0

  return {
    wage,
    goal_bonus: goalBonus,
    assist_bonus: assistBonus,
    win_bonus: winBonus,
    total: wage + goalBonus + assistBonus + winBonus
  }
}

/**
 * Evaluate Scout Requirements for a Target League Tier
 */
export function getScoutRequirements(
  career: ProCareer,
  tier: number
): ProScoutRequirement {
  const stats = career.career_stats
  const totalGAndA = stats.total_goals + stats.total_assists
  const ovr = career.overall_rating
  const matches = stats.total_matches
  const avgRating = stats.avg_rating

  let minOvr = 40
  let minMatches = 0
  let minGoals = 0
  let minAvgRating = 6.0
  let tierName = "Село / Район"

  if (tier === 2) {
    tierName = "Чемпіонат Області"
    minOvr = 48
    minMatches = 4
    minGoals = 3
    minAvgRating = 7.0
  } else if (tier === 3) {
    tierName = "Друга Ліга ПФЛ"
    minOvr = 58
    minMatches = 8
    minGoals = 7
    minAvgRating = 7.3
  } else if (tier === 4) {
    tierName = "Перша Ліга ПФЛ"
    minOvr = 68
    minMatches = 14
    minGoals = 12
    minAvgRating = 7.5
  } else if (tier === 5) {
    tierName = "Українська Премʼєр Ліга (УПЛ)"
    minOvr = 78
    minMatches = 20
    minGoals = 18
    minAvgRating = 7.8
  }

  const missingReasons: string[] = []
  let completedChecks = 0

  if (ovr >= minOvr) {
    completedChecks++
  } else {
    missingReasons.push(`Потрібен рейтинг OVR ${minOvr}+ (у тебе ${ovr})`)
  }

  if (matches >= minMatches) {
    completedChecks++
  } else {
    missingReasons.push(`Потрібно зіграти мінімум ${minMatches} матчів (зіграно ${matches})`)
  }

  if (totalGAndA >= minGoals) {
    completedChecks++
  } else {
    missingReasons.push(`Потрібно ${minGoals} голів/асистів (у тебе ${totalGAndA})`)
  }

  if (avgRating >= minAvgRating) {
    completedChecks++
  } else {
    missingReasons.push(`Середня оцінка повинна бути >= ${minAvgRating} (у тебе ${avgRating.toFixed(1)})`)
  }

  const progressPercent = Math.round((completedChecks / 4) * 100)
  const isUnlocked = completedChecks === 4

  return {
    tier,
    tier_name: tierName,
    min_ovr: minOvr,
    min_matches: minMatches,
    min_goal_contributions: minGoals,
    min_avg_rating: minAvgRating,
    scout_interest: progressPercent,
    is_unlocked: isUnlocked,
    progress_percent: progressPercent,
    missing_reasons: missingReasons
  }
}

/**
 * Generate 3 to 5 Dramatic Interactive Key Moments tailored to Position
 */
export function generateKeyMomentsForMatch(
  career: ProCareer,
  playerClub: ProClub,
  opponentClub: ProClub,
  isHome: boolean
): ProMatchMoment[] {
  const moments: ProMatchMoment[] = []
  const pos = career.position
  const isAttacker = ["ST", "RW", "LW", "CAM"].includes(pos)
  const isMidfielder = ["CM", "CDM"].includes(pos)
  const isDefender = ["LB", "CB", "RB"].includes(pos)

  // Moment 1: Early Opportunity (15' - 30')
  if (isAttacker) {
    moments.push({
      id: "m1",
      minute: 22,
      title: "Швидкий прорив флангом",
      situation_text: `Отримуєш розрізний пас на вільному просторі перед карним майданчиком ${opponentClub.name}. Захисник намагається тебе витиснути.`,
      pitch_position: pos === "ST" ? "center_box" : pos === "RW" ? "flank_right" : "flank_left",
      choices: [
        {
          id: "c1_dribble",
          label: "⚡ Обіграти на швидкості",
          description: "Різкий прокид м'яча повз захисника на ривку",
          required_attributes: ["pace", "dribbling"],
          base_probability: 0.65,
          risk_level: "medium"
        },
        {
          id: "c1_cross",
          label: "🎯 Виконати гострий простріл",
          description: "Навісити на набігаючого партнера у воротарський",
          required_attributes: ["passing", "decision_making"],
          base_probability: 0.75,
          risk_level: "low"
        },
        {
          id: "c1_shoot",
          label: "🚀 Несподіваний дальній удар",
          description: "Пробити з напівпозиції у дальній кут",
          required_attributes: ["shooting", "decision_making"],
          base_probability: 0.5,
          risk_level: "high"
        }
      ]
    })
  } else if (isMidfielder) {
    moments.push({
      id: "m1",
      minute: 27,
      title: "Перехоплення в центрі поля",
      situation_text: `Ти підстеріг помилку півзахисника ${opponentClub.name} і відібрав м'яч у центральному колі. Відкриваються зони для атаки.`,
      pitch_position: "midfield",
      choices: [
        {
          id: "c1_through",
          label: "🎯 Розрізний пас у розріз",
          description: "Вивести форварда один в один із воротарем",
          required_attributes: ["passing", "positioning"],
          base_probability: 0.68,
          risk_level: "medium"
        },
        {
          id: "c1_drive",
          label: "🏃 Сольний прохід до карного",
          description: "Тягнути м'яч уперед на дриблінгу",
          required_attributes: ["dribbling", "pace"],
          base_probability: 0.62,
          risk_level: "medium"
        },
        {
          id: "c1_longshot",
          label: "🚀 Гарматний удар з 30 метрів",
          description: "Спіймати воротаря, що вийшов задалеко",
          required_attributes: ["shooting", "physical"],
          base_probability: 0.45,
          risk_level: "high"
        }
      ]
    })
  } else {
    // Defender / GK
    moments.push({
      id: "m1",
      minute: 19,
      title: "Небезпечна контратака суперника",
      situation_text: `Форвард ${opponentClub.name} набирає хід на твоєму фланзі та готується вриватися у карний майданчик.`,
      pitch_position: "defense_line",
      choices: [
        {
          id: "c1_tackle",
          label: "🛡️ Жорсткий підкат у м'яч",
          description: "Вибити м'яч чисто в аут або на кутовий",
          required_attributes: ["defending", "physical"],
          base_probability: 0.72,
          risk_level: "medium"
        },
        {
          id: "c1_jockey",
          label: "🧠 Пласуватися та витискати у фланг",
          description: "Заблокувати зону передачі без ризику фолу",
          required_attributes: ["positioning", "decision_making"],
          base_probability: 0.82,
          risk_level: "low"
        }
      ]
    })
  }

  // Moment 2: Decisive Second Half Action (68')
  moments.push({
    id: "m2",
    minute: 68,
    title: isAttacker ? "Сам-на-сам із голкіпером" : "Небезпечний стандарт біля воріт",
    situation_text: isAttacker
      ? `Партнер робить ідеальну передачу через захисну лінію. Ти вириваєшся один на один із воротарем ${opponentClub.name}!`
      : `Штрафний удар по центру за 24 метри до воріт. Трибуни затамували подих.`,
    pitch_position: isAttacker ? "center_box" : "outside_box",
    choices: isAttacker
      ? [
          {
            id: "c2_corner",
            label: "🎯 Прицільний удар у кут воріт",
            description: "Щічкою під саму стійку повз воротаря",
            required_attributes: ["shooting", "decision_making"],
            base_probability: 0.7,
            risk_level: "medium"
          },
          {
            id: "c2_chip",
            label: "✨ Черпак над воротарем",
            description: "Елегантно перекинути голкіпера, що впав",
            required_attributes: ["dribbling", "shooting"],
            base_probability: 0.55,
            risk_level: "high"
          },
          {
            id: "c2_pass",
            label: "🤝 Покотити на порожні ворота партнеру",
            description: "Безкорислива передача на вільний гол",
            required_attributes: ["passing", "decision_making"],
            base_probability: 0.88,
            risk_level: "low"
          }
        ]
      : [
          {
            id: "c2_fk_curl",
            label: "🎯 Прямий кручений удар над стінкою",
            description: "Закрутити м'яч прямо у дев'ятку",
            required_attributes: ["shooting", "passing"],
            base_probability: 0.6,
            risk_level: "high"
          },
          {
            id: "c2_fk_cross",
            label: "📐 М'яка подача на дальню стійку",
            description: "Знайти голову високого захисника",
            required_attributes: ["passing", "positioning"],
            base_probability: 0.78,
            risk_level: "medium"
          }
        ]
  })

  // Moment 3: Climax at 90th minute
  moments.push({
    id: "m3",
    minute: 90,
    title: "⚡ Кульмінація: 90-та хвилина матчу!",
    situation_text: `Останні секунди доданого часу! Напруга сягає піку. М'яч відскакує прямо до твоїх ніг!`,
    pitch_position: isAttacker ? "center_box" : "midfield",
    choices: [
      {
        id: "c3_hero_shot",
        label: "🚀 Переможний удар у дотик!",
        description: "Вкласти всю силу та душу у вирішальний постріл",
        required_attributes: ["shooting", "decision_making"],
        base_probability: 0.62,
        risk_level: "high"
      },
      {
        id: "c3_hero_pass",
        label: "🎯 Тонкий розрізний пас",
        description: "Знайти вільну зону в паніці оборони",
        required_attributes: ["passing", "decision_making"],
        base_probability: 0.75,
        risk_level: "medium"
      }
    ]
  })

  return moments
}

/**
 * Resolves player decision in key moment
 */
export function resolveMomentChoice(
  career: ProCareer,
  moment: ProMatchMoment,
  choice: ProMomentChoice,
  opponentStrength: number
): ProMomentOutcome {
  const reqAttrs = choice.required_attributes
  let attrSum = 0
  for (const attr of reqAttrs) {
    attrSum += (career.attributes as any)[attr] || 40
  }
  const avgAttr = attrSum / (reqAttrs.length || 1)

  // Modifiers
  const formFactor = (career.form / 100) * 0.3 + 0.7
  const energyFactor = career.energy < 50 ? 0.8 : 1.0
  const diffOffset = (career.overall_rating - opponentStrength) * 0.005

  const totalProb = Math.max(
    0.15,
    Math.min(
      0.95,
      choice.base_probability * (avgAttr / 50) * formFactor * energyFactor +
        diffOffset
    )
  )

  const roll = Math.random()
  const success = roll < totalProb

  if (success) {
    if (
      choice.id.includes("shoot") ||
      choice.id.includes("corner") ||
      choice.id.includes("chip") ||
      choice.id.includes("fk_curl") ||
      choice.id.includes("hero_shot")
    ) {
      return {
        success: true,
        result_type: "goal",
        commentary: `🔥 ГООООЛ! Неймовірний удар у дев'ятку! ${career.last_name} вибухає емоціями, а трибуни сходять з розуму!`,
        rating_impact: 0.8,
        score_change: { home: 1, away: 0 }
      }
    } else if (
      choice.id.includes("pass") ||
      choice.id.includes("cross") ||
      choice.id.includes("through") ||
      choice.id.includes("hero_pass")
    ) {
      return {
        success: true,
        result_type: "assist",
        commentary: `✨ ГОЛЬОВИЙ ПАС! Геніальна передача ${career.last_name}! Партнер розстрілює порожні ворота!`,
        rating_impact: 0.6,
        score_change: { home: 1, away: 0 }
      }
    } else if (
      choice.id.includes("tackle") ||
      choice.id.includes("block") ||
      choice.id.includes("jockey")
    ) {
      return {
        success: true,
        result_type: "tackle_won",
        commentary: `🛡️ Блискучий відбір! ${career.last_name} рятує команду в критичний момент!`,
        rating_impact: 0.5
      }
    } else {
      return {
        success: true,
        result_type: "foul_drawn",
        commentary: `⚡ Чудовий дриблінг! ${career.last_name} легко прибирає захисника на замаху!`,
        rating_impact: 0.4
      }
    }
  } else {
    if (choice.risk_level === "high") {
      return {
        success: false,
        result_type: "miss",
        commentary: `❌ М'яч проходить у лічених сантиметрах від стійки! Який прикрий момент!`,
        rating_impact: -0.2
      }
    } else {
      return {
        success: false,
        result_type: "turnover",
        commentary: `⚠️ Захисник зумів прочитати задум та перехопив м'яч.`,
        rating_impact: -0.1
      }
    }
  }
}

/**
 * Generates Real Dynamic Coach Commentary based on Player's actual club & Performance
 */
export function generateCoachCommentary(
  career: ProCareer,
  club: ProClub,
  goals: number,
  assists: number,
  rating: number,
  isWin: boolean,
  opponentClub: ProClub
): string {
  const clubName = club.name
  const oppName = opponentClub.name
  const lastName = career.last_name

  if (goals >= 3) {
    return `«Фантастика, ${lastName}! Оформити хет-трик у ворота ${oppName} — це рівень справжнього майстра! Всі вболівальники ${clubName} сьогодні носять тебе на руках!»`
  }
  if (goals === 2) {
    return `«Дубль у такому матчі проти ${oppName}! ${lastName}, ти зробив гру для ${clubName}! Продовжуй так само на кожному тренуванні!»`
  }
  if (goals === 1 && assists >= 1) {
    return `«Гол плюс пас! Сьогодні ти був мотором усіх наших атак проти ${oppName}. Тренерський штаб ${clubName} дуже задоволений твоєю самовіддачею!»`
  }
  if (goals === 1) {
    return `«Твій забитий м'яч став вирішальним епізодом гри! ${lastName}, ти чудово знайшов свій шанс у карному майданчику ${oppName}!»`
  }
  if (assists >= 2) {
    return `«Геніальне бачення поля, ${lastName}! Дві гольові передачі на партнерів — це класика плеймейкера ${clubName}!»`
  }
  if (assists === 1) {
    return `«Відмінний асист! Ти віддав своєчасну передачу і допоміг ${clubName} організувати взяття воріт.»`
  }
  if (rating >= 8.0) {
    return `«Блискучий матч, ${lastName}! Оцінка ${rating.toFixed(1)} говорить сама за себе. Ти лідер команди ${clubName}!»`
  }
  if (isWin) {
    return `«Гарна командна перемога ${clubName} над ${oppName}! Ти відпрацював свій мікроматч на совість. Рухаємося далі по таблиці!»`
  }
  if (rating <= 5.5) {
    return `«Сьогодні була важка гра, ${lastName}. Суперник із ${oppName} перекрив твої зони. Зробимо висновки на розборі польотів у ${clubName}.»`
  }

  return `«Добротний поєдинок. Ти витримав темп і допоміг ${clubName} у боротьбі. Готуємося до наступного туру!»`
}

/**
 * Newspaper Article Generator
 */
export function generateNewspaperArticle(
  career: ProCareer,
  club: ProClub,
  opponentClub: ProClub,
  result: { home_score: number; away_score: number; goals: number; assists: number; rating: number; is_home: boolean }
): ProNewsArticle {
  const tier = club.tier
  const paperName =
    tier === 1
      ? "«Сільський Футбол» (Снятинщина & Коломийщина)"
      : tier === 2
      ? "«Галицький Спорт» (Івано-Франківськ & Чернівці)"
      : tier <= 4
      ? "«Український Футбол» (ПФЛ Огляд)"
      : "«Футбольна Україна» (УПЛ Експрес)"

  const myScore = result.is_home ? result.home_score : result.away_score
  const oppScore = result.is_home ? result.away_score : result.home_score
  const isWin = myScore > oppScore
  const isDraw = myScore === oppScore

  let headline = ""
  let text = ""
  let importance: ProNewsArticle["importance"] = "medium"

  if (result.goals >= 2) {
    headline = `🔥 Бенефіс ${career.last_name}! Дубль приносить успіх ${club.name}`
    text = `У напруженому поєдинку проти ${opponentClub.name} справжньою зіркою матчу став ${career.age}-річний ${career.first_name} ${career.last_name}. Його точні удари та впевнена гра на вістрі атаки підірвали трибуни. Скаути вже записують прізвище таланта у свої блокноти.`
    importance = "breaking"
  } else if (result.goals === 1) {
    headline = `⚡ Гол ${career.last_name} запалює гру ${club.name} проти ${opponentClub.name}!`
    text = `Матч між ${club.name} та ${opponentClub.name} завершився з рахунком ${result.home_score}:${result.away_score}. Результативним ударом відзначився ${career.last_name}, показавши зрілий та технічний футбол.`
    importance = "medium"
  } else if (isWin) {
    headline = `🏆 Переконлива перемога ${club.name} у черговому турі!`
    text = `Команда ${club.name} продемонструвала відмінну тактичну дисципліну та здолала ${opponentClub.name} (${result.home_score}:${result.away_score}). ${career.last_name} провів солідний поєдинок, отримавши оцінку ⭐ ${result.rating.toFixed(1)}.`
    importance = "medium"
  } else if (isDraw) {
    headline = `⚖️ Бойова нічия: ${club.name} ділить очки з ${opponentClub.name}`
    text = `Запекла боротьба на кожному клаптику поля закінчилася миром (${result.home_score}:${result.away_score}). Обидві команди зберегли інтригу в турнірній таблиці.`
    importance = "low"
  } else {
    headline = `⚠️ Поразка ${club.name}: ${opponentClub.name} святкує перемогу`
    text = `Незважаючи на старання ${career.last_name} та команди, ${club.name} поступилися суперникам із рахунком ${result.home_score}:${result.away_score}. Попереду робота над помилками.`
    importance = "low"
  }

  return {
    id: `art_${Date.now()}`,
    newspaper_name: paperName,
    headline,
    text,
    date_str: new Date().toLocaleDateString("uk-UA", { day: "numeric", month: "long" }),
    importance,
    tag: tier >= 4 ? "Професійний футбол" : "Аматорський футбол",
    rating: result.rating,
    goals_scored: result.goals
  }
}

/**
 * Match-Fixing (Договірний матч) Logic
 */
export interface MatchFixResult {
  success: boolean
  cost: number
  reputationDelta: number
  moneyDelta: number
  message: string
  scandalOccurred: boolean
}

export function attemptMatchFixing(
  career: ProCareer,
  opponentClub: ProClub
): MatchFixResult {
  const cost = opponentClub.tier === 1 ? 5000 : opponentClub.tier === 2 ? 15000 : 40000

  if ((career.bank_balance || 0) < cost) {
    return {
      success: false,
      cost,
      reputationDelta: 0,
      moneyDelta: 0,
      message: `Недостатньо коштів! Щоб домовитися з суперником потрібно ${cost.toLocaleString()} ₴.`,
      scandalOccurred: false
    }
  }

  // Success depends on opponent tier and reputation
  const baseChance = opponentClub.tier === 1 ? 0.65 : opponentClub.tier === 2 ? 0.45 : 0.25
  const roll = Math.random()

  if (roll < baseChance) {
    return {
      success: true,
      cost,
      reputationDelta: -5,
      moneyDelta: -cost,
      message: `🤫 Домовленості досягнуто! Керівництво ${opponentClub.name} погодилося не грати на повну силу за ${cost.toLocaleString()} ₴.`,
      scandalOccurred: false
    }
  } else {
    // Scandal!
    return {
      success: false,
      cost,
      reputationDelta: -45,
      moneyDelta: -cost,
      message: `🚨 СКАНДАЛ! Капітан ${opponentClub.name} обурено відхилив вашу пропозицію та розповів про це журналістам! Ваша репутація різко впала!`,
      scandalOccurred: true
    }
  }
}

/**
 * Simulates Full Match & Calculates Post-Match Ratings, Realistic Goals, Earnings, Commentary, and News
 */
export function simulateFullMatch(
  career: ProCareer,
  playerClub: ProClub,
  opponentClub: ProClub,
  isHome: boolean,
  resolvedMoments: ProMatchMoment[],
  isMatchFixed = false
): ProMatchResult {
  let playerGoals = 0
  let playerAssists = 0
  let playerShots = 0
  let playerTackles = 0
  let baseRating = 6.6 + Math.random() * 0.5

  for (const m of resolvedMoments) {
    if (m.outcome?.result_type === "goal") {
      playerGoals++
      playerShots++
      baseRating += 0.85
    } else if (m.outcome?.result_type === "assist") {
      playerAssists++
      baseRating += 0.65
    } else if (
      m.outcome?.result_type === "tackle_won" ||
      m.outcome?.result_type === "shot_saved"
    ) {
      playerTackles++
      baseRating += 0.45
    } else if (m.outcome?.success) {
      baseRating += 0.3
    } else {
      baseRating -= 0.15
    }
  }

  // Realistic Score Generation (Wide realistic distribution: 0:0, 1:0, 0:2, 3:1, 2:2, 4:0, 1:3, 5:2)
  const strengthDiff = (playerClub.squad_strength - opponentClub.squad_strength) * 0.04
  const homeAdvantage = isHome ? 0.4 : -0.4
  const fixBonus = isMatchFixed ? 1.5 : 0

  // Poisson-like distribution for realistic football scores
  const scorePresets = [
    { p: 0.12, home: 1, away: 0 },
    { p: 0.12, home: 0, away: 1 },
    { p: 0.14, home: 2, away: 0 },
    { p: 0.14, home: 0, away: 2 },
    { p: 0.10, home: 1, away: 1 },
    { p: 0.08, home: 0, away: 0 },
    { p: 0.09, home: 3, away: 1 },
    { p: 0.08, home: 1, away: 3 },
    { p: 0.05, home: 2, away: 2 },
    { p: 0.04, home: 4, away: 0 },
    { p: 0.02, home: 4, away: 2 },
    { p: 0.02, home: 5, away: 1 }
  ]

  const randomRoll = Math.random()
  let selectedPreset = scorePresets[Math.floor(Math.random() * scorePresets.length)]

  let myTeamScore = isHome ? selectedPreset.home : selectedPreset.away
  let opponentScore = isHome ? selectedPreset.away : selectedPreset.home

  if (strengthDiff + homeAdvantage + fixBonus > 0.5) {
    myTeamScore += Math.floor(Math.random() * 2)
  } else if (strengthDiff + homeAdvantage < -0.5) {
    opponentScore += Math.floor(Math.random() * 2)
  }

  if (myTeamScore < playerGoals + playerAssists) {
    myTeamScore = playerGoals + playerAssists
  }

  const finalHomeScore = isHome ? myTeamScore : opponentScore
  const finalAwayScore = isHome ? opponentScore : myTeamScore

  const isWin = myTeamScore > opponentScore
  const isCleanSheet = opponentScore === 0

  const finalRating = Math.max(
    4.0,
    Math.min(10.0, Math.round(baseRating * 10) / 10)
  )

  const earnings = calculateMatchEarnings(
    career,
    playerClub,
    playerGoals,
    playerAssists,
    isWin,
    isCleanSheet
  )

  const coachCommentary = generateCoachCommentary(
    career,
    playerClub,
    playerGoals,
    playerAssists,
    finalRating,
    isWin,
    opponentClub
  )

  const newsArticle = generateNewspaperArticle(career, playerClub, opponentClub, {
    home_score: finalHomeScore,
    away_score: finalAwayScore,
    goals: playerGoals,
    assists: playerAssists,
    rating: finalRating,
    is_home: isHome
  })

  return {
    home_club: isHome ? playerClub : opponentClub,
    away_club: isHome ? opponentClub : playerClub,
    home_score: finalHomeScore,
    away_score: finalAwayScore,
    player_club_is_home: isHome,
    player_played: true,
    player_minutes: 90,
    player_goals: playerGoals,
    player_assists: playerAssists,
    player_rating: finalRating,
    player_shots: playerShots + Math.floor(Math.random() * 2),
    player_tackles: playerTackles + Math.floor(Math.random() * 2),
    player_xg: Math.round((playerGoals * 0.45 + Math.random() * 0.3) * 100) / 100,
    moments: resolvedMoments,
    earnings,
    coach_commentary: coachCommentary,
    news_article: newsArticle,
    season_number: career.current_season_number,
    fixture_round: career.current_fixture_round,
    match_type: "league",
    is_match_fixed: isMatchFixed
  }
}

/**
 * Generates Narrative Story Events & Moral Dilemmas
 */
export function generateStoryEvent(
  career: ProCareer,
  matchResult?: ProMatchResult
): ProStoryEvent | null {
  if (career.career_stats.total_matches === 0) {
    return {
      title: "🌱 Перший крок у дорослий футбол",
      character_name: "Михайлович",
      character_role: "first_coach",
      dialogue_text: `«Слухай сюди, ${career.first_name}. Сьогодні ти вперше вийдеш на це поле у формі нашого клубу. Знаю, коліна трохи тремтять, але я бачу в тобі те, чого ти сам поки не усвідомлюєш. Сільський стадіон повний, знайомі обличчя дивляться на тебе. Не змарнуй свій шанс!»`,
      choices: [
        {
          text: "«Я викладуся на всі 200% заради рідного села, Михайловичу!»",
          impact_description: "+15 Моралі, +5 Форми, +10 Репутації в селі",
          morale_delta: 15,
          form_delta: 5,
          rep_delta: 10
        },
        {
          text: "«Я просто хочу показати свій найкращий футбол без зайвого шуму.»",
          impact_description: "+10 Концентрації, +5 Форми",
          morale_delta: 5,
          form_delta: 5
        }
      ]
    }
  }

  return null
}
