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
  ProTransferOffer
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
 * Starter Attributes Generator for a 17-year old rookie (OVR ~ 40-44)
 */
export function generateStarterAttributes(
  pos: ProPosition,
  potential: number
): ProAttributes {
  const base = 40 + Math.floor(Math.random() * 5)
  const isAttack = ["ST", "RW", "LW", "CAM"].includes(pos)
  const isMid = ["CM", "CDM"].includes(pos)
  const isDef = ["LB", "CB", "RB"].includes(pos)
  const isGk = pos === "GK"

  return {
    pace: isAttack || ["LB", "RB"].includes(pos) ? base + 8 : base,
    shooting: isAttack ? base + 7 : isMid ? base + 2 : base - 8,
    passing: isMid || pos === "CAM" ? base + 7 : base + 1,
    dribbling: isAttack || isMid ? base + 6 : base - 2,
    defending: isDef || pos === "CDM" ? base + 8 : isAttack ? base - 12 : base - 4,
    physical: isDef || pos === "ST" ? base + 6 : base + 2,
    positioning: base + 4,
    decision_making: base + 2,
    stamina: 55 + Math.floor(Math.random() * 10),
    goalkeeping: isGk ? base + 10 : 25
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
  const isGK = pos === "GK"

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
  } else if (isDefender) {
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
  } else {
    // GK
    moments.push({
      id: "m1",
      minute: 24,
      title: "Небезпечний дальній удар",
      situation_text: `Півзахисник суперника завдає підступного крученого удару під стійку!`,
      pitch_position: "penalty_spot",
      choices: [
        {
          id: "c1_save_dive",
          label: "🧤 Стрибок у кут намертво",
          description: "Зафіксувати м'яч у рукавицях",
          required_attributes: ["goalkeeping", "decision_making"],
          base_probability: 0.65,
          risk_level: "medium"
        },
        {
          id: "c1_save_parry",
          label: "✋ Перевести на кутовий кінчиками пальців",
          description: "Надійно відбити м'яч за лицьову лінію",
          required_attributes: ["goalkeeping", "positioning"],
          base_probability: 0.85,
          risk_level: "low"
        }
      ]
    })
  }

  // Moment 2: Decisive Second Half Action (55' - 75')
  moments.push({
    id: "m2",
    minute: 68,
    title: isAttacker ? "Сам-на-сам із голкіпером" : isMidfielder ? "Стандарт біля карного" : "Рятувальний блок",
    situation_text: isAttacker
      ? `Партнер робить ідеальну передачу через захисну лінію. Ти вириваєшся один на один із воротарем ${opponentClub.name}!`
      : isMidfielder
      ? `Штрафний удар по центру за 24 метри до воріт. Трибуни затамували подих.`
      : `Нападник суперника завдає удару впритул з 8 метрів. Ти єдиний захисник на шляху м'яча!`,
    pitch_position: isAttacker ? "center_box" : isMidfielder ? "outside_box" : "defense_line",
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
      : isMidfielder
      ? [
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
      : [
          {
            id: "c2_block",
            label: "🛡️ Стрибок під удар тілом",
            description: "Героїчно заблокувати політ м'яча",
            required_attributes: ["defending", "physical"],
            base_probability: 0.75,
            risk_level: "medium"
          }
        ]
  })

  // Moment 3: Climax at 89th minute (90th Min Bullet-Time)
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
  const formFactor = (career.form / 100) * 0.3 + 0.7 // 0.7 .. 1.0
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
    if (choice.id.includes("shoot") || choice.id.includes("corner") || choice.id.includes("chip") || choice.id.includes("fk_curl") || choice.id.includes("hero_shot")) {
      return {
        success: true,
        result_type: "goal",
        commentary: `🔥 ГООООЛ! Неймовірний удар у дев'ятку! ${career.last_name} вибухає емоціями, а трибуни сходять з розуму!`,
        rating_impact: 0.8,
        score_change: { home: 1, away: 0 }
      }
    } else if (choice.id.includes("pass") || choice.id.includes("cross") || choice.id.includes("through") || choice.id.includes("hero_pass")) {
      return {
        success: true,
        result_type: "assist",
        commentary: `✨ ГОЛЬОВИЙ ПАС! Геніальна передача ${career.last_name}! Партнер розстрілює порожні ворота!`,
        rating_impact: 0.6,
        score_change: { home: 1, away: 0 }
      }
    } else if (choice.id.includes("tackle") || choice.id.includes("block") || choice.id.includes("jockey")) {
      return {
        success: true,
        result_type: "tackle_won",
        commentary: `🛡️ Блискучий відбір! ${career.last_name} рятує команду в критичний момент!`,
        rating_impact: 0.5
      }
    } else if (choice.id.includes("save")) {
      return {
        success: true,
        result_type: "shot_saved",
        commentary: `🧤 Фантастичний сейв! ${career.last_name} витягує м'яч з самої дев'ятки!`,
        rating_impact: 0.6
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
 * Simulates Full Match & Calculates Post-Match Ratings, XP, and Fatigue
 */
export function simulateFullMatch(
  career: ProCareer,
  playerClub: ProClub,
  opponentClub: ProClub,
  isHome: boolean,
  resolvedMoments: ProMatchMoment[]
): ProMatchResult {
  let playerGoals = 0
  let playerAssists = 0
  let playerShots = 0
  let playerTackles = 0
  let baseRating = 6.8 + Math.random() * 0.4

  for (const m of resolvedMoments) {
    if (m.outcome?.result_type === "goal") {
      playerGoals++
      playerShots++
      baseRating += 0.8
    } else if (m.outcome?.result_type === "assist") {
      playerAssists++
      baseRating += 0.6
    } else if (m.outcome?.result_type === "tackle_won" || m.outcome?.result_type === "shot_saved") {
      playerTackles++
      baseRating += 0.4
    } else if (m.outcome?.success) {
      baseRating += 0.3
    } else {
      baseRating -= 0.15
    }
  }

  // Team goals calculation
  const strengthDiff = (playerClub.squad_strength - opponentClub.squad_strength) * 0.05
  const homeAdvantage = isHome ? 0.3 : -0.3

  let homeBase = Math.max(0, Math.round(1.4 + (isHome ? strengthDiff : -strengthDiff) + homeAdvantage + (Math.random() - 0.4)))
  let awayBase = Math.max(0, Math.round(1.1 + (!isHome ? strengthDiff : -strengthDiff) - homeAdvantage + (Math.random() - 0.5)))

  let myTeamScore = isHome ? homeBase : awayBase
  let opponentScore = isHome ? awayBase : homeBase

  // Ensure user goals are counted in team score
  if (myTeamScore < playerGoals + playerAssists) {
    myTeamScore = playerGoals + playerAssists
  }

  const finalHomeScore = isHome ? myTeamScore : opponentScore
  const finalAwayScore = isHome ? opponentScore : myTeamScore

  const finalRating = Math.max(4.0, Math.min(10.0, Math.round(baseRating * 10) / 10))

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
    season_number: career.current_season_number,
    fixture_round: career.current_fixture_round,
    match_type: "league"
  }
}

/**
 * Generates Narrative Story Events & Moral Dilemmas
 */
export function generateStoryEvent(
  career: ProCareer,
  matchResult?: ProMatchResult
): ProStoryEvent | null {
  // 1. Debut event for 17-year old rookie
  if (career.career_stats.total_matches === 0) {
    return {
      title: "🌱 Перший крок у дорослий футбол",
      character_name: "Михайлович",
      character_role: "first_coach",
      dialogue_text: `«Слухай сюди, хлопче. Сьогодні ти вперше вийдеш на це поле у формі нашого клубу. Знаю, коліна трохи тремтять, але я бачу в тобі те, чого ти сам поки не усвідомлюєш. Сільський стадіон повний, знайомі обличчя дивляться на тебе. Не змарнуй свій шанс!»`,
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

  // 2. Scout Approach after high rating
  if (matchResult && matchResult.player_rating >= 8.0 && career.reputation >= 80 && Math.random() < 0.4) {
    return {
      title: "🕵️ Таємничий гість біля роздягальні",
      character_name: "Орест Степанович",
      character_role: "scout",
      dialogue_text: `«Після фінального свистка до тебе підійшов солідний чоловік у довгому пальто з блокнотом у руках. Він уважно подивився на тебе: "Я спостерігаю за тобою вже третій матч. У тебе є справжня іскра. Рівень району ти вже переріс. Якщо хочеш рухатися на рівень області або в професіонали — я допоможу відкрити потрібні двері."»`,
      choices: [
        {
          text: "«Я готовий зробити крок уперед та підкорювати нові вершини!»",
          impact_description: "+25 Репутації, відкриває пропозиції від клубів Області",
          rep_delta: 25,
          unlocks_transfer: true
        },
        {
          text: "«Я люблю свій рідний клуб і хочу спершу стати його легендою.»",
          impact_description: "+20 Поваги фанатів села, статус Улюбленця клубу",
          morale_delta: 20,
          rep_delta: 15
        }
      ]
    }
  }

  // 3. Post-Defeat Locker Room talk
  if (matchResult && matchResult.player_rating < 6.0 && Math.random() < 0.3) {
    return {
      title: "🌧️ Важка розмова у роздягальні",
      character_name: "Михайлович",
      character_role: "first_coach",
      dialogue_text: `«У роздягальні панує тиша. Чути лише шум дощу за вікном. Тренер зупиняється навпроти тебе: "Сьогодні гра не пішла. Але пам'ятай: справжній футболіст визначається не тим, скільки разів він падає, а тим, як він піднімається."»`,
      choices: [
        {
          text: "«Завтра о 7 ранку я буду першим на тренувальному полі!»",
          impact_description: "+10 Характеру, +5 Форми після важких тренувань",
          form_delta: 5,
          morale_delta: 10
        },
        {
          text: "«Потрібно видихнути, проаналізувати помилки та спокійно готуватися до наступного туру.»",
          impact_description: "+5 Досвіду прийняття рішень",
          morale_delta: 5
        }
      ]
    }
  }

  return null
}
