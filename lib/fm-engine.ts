import {
  PlayerPosition,
  FormationType,
  FMPlayer,
  FMTactics,
  FMStadium,
  FMMatchEvent,
  FMMatchStats,
  FMMatch,
  SpecialAbilityId,
  SpecialAbilityDef,
  FMTournamentBracket,
  FMTournamentMatch,
  FMYouthProspect
} from "./fm-types"

// ==========================================
// 1. 11x11.ru SPECIAL ABILITIES DEFINITION
// ==========================================

export const SPECIAL_ABILITIES: SpecialAbilityDef[] = [
  {
    id: "pass",
    name: "Пас",
    shortCode: "PAS",
    description: "Підвищує точність і культуру передач на +15%",
    icon: "🎯",
    allowedPositions: ["MID", "FWD", "DEF"],
    costXp: 120,
    costMoney: 15000
  },
  {
    id: "long_shot",
    name: "Далекий удар",
    shortCode: "LSH",
    description: "Небезпечні гарматні постріли з-за меж штрафного майданчика",
    icon: "🚀",
    allowedPositions: ["MID", "FWD"],
    costXp: 150,
    costMoney: 20000
  },
  {
    id: "tackling",
    name: "Відбір",
    shortCode: "TCK",
    description: "Чистий і безкомпромісний відбір м'яча без порушення правил",
    icon: "🛡️",
    allowedPositions: ["DEF", "MID"],
    costXp: 130,
    costMoney: 18000
  },
  {
    id: "header",
    name: "Гра головою",
    shortCode: "HDR",
    description: "Домінування у верхових дуелях при кутових та навісах",
    icon: "🤾",
    allowedPositions: ["DEF", "FWD"],
    costXp: 120,
    costMoney: 15000
  },
  {
    id: "speed",
    name: "Швидкість",
    shortCode: "SPD",
    description: "Вибуховий ривок у вільну зону та відрив від опікуна",
    icon: "⚡",
    allowedPositions: ["FWD", "MID", "DEF"],
    costXp: 160,
    costMoney: 22000
  },
  {
    id: "playmaker",
    name: "Розігруючий",
    shortCode: "PLM",
    description: "Диригент атак: створює 100% гольові моменти для партнерів",
    icon: "🪄",
    allowedPositions: ["MID"],
    costXp: 180,
    costMoney: 25000
  },
  {
    id: "penalty",
    name: "Пенальтист",
    shortCode: "PEN",
    description: "Холоднокровна та безпомилкова реалізація 11-метрових",
    icon: "🥅",
    allowedPositions: ["FWD", "MID"],
    costXp: 100,
    costMoney: 12000
  },
  {
    id: "one_on_one",
    name: "Один-на-один",
    shortCode: "1v1",
    description: "Філігранна реалізація виходів сам-на-сам із голкіпером",
    icon: "🔥",
    allowedPositions: ["FWD"],
    costXp: 160,
    costMoney: 22000
  },
  {
    id: "interception",
    name: "Перехоплення",
    shortCode: "INT",
    description: "Читання ліній передач суперника та випередження",
    icon: "👀",
    allowedPositions: ["DEF", "MID"],
    costXp: 130,
    costMoney: 18000
  },
  {
    id: "gk_reaction",
    name: "Рефлекси",
    shortCode: "REF",
    description: "Блискавичні сейви на лінії воріт у безнадійних ситуаціях",
    icon: "🧤",
    allowedPositions: ["GK"],
    costXp: 150,
    costMoney: 20000
  },
  {
    id: "gk_exit",
    name: "Вихід з воріт",
    shortCode: "EXT",
    description: "Впевнена гра на виходах при навісах та стандартах",
    icon: "🦅",
    allowedPositions: ["GK"],
    costXp: 130,
    costMoney: 16000
  },
  {
    id: "dribbling",
    name: "Дриблінг",
    shortCode: "DRB",
    description: "Ефектний обіграш захисників 1-в-1 на носовій хустинці",
    icon: "🌪️",
    allowedPositions: ["FWD", "MID"],
    costXp: 140,
    costMoney: 19000
  }
]

export const SPECIAL_ABILITIES_MAP: Record<SpecialAbilityId, SpecialAbilityDef> =
  SPECIAL_ABILITIES.reduce((acc, def) => {
    acc[def.id] = def
    return acc
  }, {} as Record<SpecialAbilityId, SpecialAbilityDef>)

// ==========================================
// 2. TACTICAL FORMATIONS WITH 11x11 ROLES
// ==========================================

export interface PitchSlot {
  slot: number
  x: number // 0-100% horizontal
  y: number // 0-100% vertical (0 = bottom GK, 100 = top FWD)
  role: PlayerPosition
  category: "GK" | "DEF" | "MID" | "FWD"
  label: string
}

export const FORMATIONS_MAP: Record<FormationType, PitchSlot[]> = {
  "4-4-2": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 16, y: 32, role: "LD", category: "DEF", label: "ЛЗ" },
    { slot: 3, x: 38, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 62, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 5, x: 84, y: 32, role: "RD", category: "DEF", label: "ПЗ" },
    { slot: 6, x: 16, y: 58, role: "LM", category: "MID", label: "ЛП" },
    { slot: 7, x: 38, y: 54, role: "CM", category: "MID", label: "ЦП" },
    { slot: 8, x: 62, y: 54, role: "CM", category: "MID", label: "ЦП" },
    { slot: 9, x: 84, y: 58, role: "RM", category: "MID", label: "ПП" },
    { slot: 10, x: 38, y: 84, role: "CF", category: "FWD", label: "ФОР" },
    { slot: 11, x: 62, y: 84, role: "CF", category: "FWD", label: "ФОР" }
  ],
  "4-3-3": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 16, y: 32, role: "LD", category: "DEF", label: "ЛЗ" },
    { slot: 3, x: 38, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 62, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 5, x: 84, y: 32, role: "RD", category: "DEF", label: "ПЗ" },
    { slot: 6, x: 50, y: 48, role: "CM", category: "MID", label: "ОП" },
    { slot: 7, x: 30, y: 60, role: "CM", category: "MID", label: "ЦП" },
    { slot: 8, x: 70, y: 60, role: "CM", category: "MID", label: "ЦП" },
    { slot: 9, x: 18, y: 82, role: "LF", category: "FWD", label: "ЛВ" },
    { slot: 10, x: 50, y: 86, role: "CF", category: "FWD", label: "ЦФ" },
    { slot: 11, x: 82, y: 82, role: "RF", category: "FWD", label: "ПВ" }
  ],
  "3-5-2": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 25, y: 30, role: "CD", category: "DEF", label: "ЛЦЗ" },
    { slot: 3, x: 50, y: 26, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 75, y: 30, role: "CD", category: "DEF", label: "ПЦЗ" },
    { slot: 5, x: 14, y: 55, role: "LM", category: "MID", label: "ЛП" },
    { slot: 6, x: 38, y: 50, role: "CM", category: "MID", label: "ЦП" },
    { slot: 7, x: 62, y: 50, role: "CM", category: "MID", label: "ЦП" },
    { slot: 8, x: 86, y: 55, role: "RM", category: "MID", label: "ПП" },
    { slot: 9, x: 50, y: 66, role: "CM", category: "MID", label: "АП" },
    { slot: 10, x: 36, y: 85, role: "CF", category: "FWD", label: "ФОР" },
    { slot: 11, x: 64, y: 85, role: "CF", category: "FWD", label: "ФОР" }
  ],
  "4-2-3-1": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 16, y: 32, role: "LD", category: "DEF", label: "ЛЗ" },
    { slot: 3, x: 38, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 62, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 5, x: 84, y: 32, role: "RD", category: "DEF", label: "ПЗ" },
    { slot: 6, x: 36, y: 48, role: "CM", category: "MID", label: "ОП" },
    { slot: 7, x: 64, y: 48, role: "CM", category: "MID", label: "ОП" },
    { slot: 8, x: 20, y: 68, role: "LM", category: "MID", label: "ЛАП" },
    { slot: 9, x: 50, y: 68, role: "CM", category: "MID", label: "ЦАП" },
    { slot: 10, x: 80, y: 68, role: "RM", category: "MID", label: "ПАП" },
    { slot: 11, x: 50, y: 86, role: "CF", category: "FWD", label: "СТ" }
  ],
  "5-3-2": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 14, y: 38, role: "LD", category: "DEF", label: "ЛЗБ" },
    { slot: 3, x: 32, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 50, y: 25, role: "CD", category: "DEF", label: "ЛІБ" },
    { slot: 5, x: 68, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 6, x: 86, y: 38, role: "RD", category: "DEF", label: "ПЗБ" },
    { slot: 7, x: 30, y: 56, role: "CM", category: "MID", label: "ЦП" },
    { slot: 8, x: 50, y: 52, role: "CM", category: "MID", label: "ОП" },
    { slot: 9, x: 70, y: 56, role: "CM", category: "MID", label: "ЦП" },
    { slot: 10, x: 38, y: 84, role: "CF", category: "FWD", label: "ФОР" },
    { slot: 11, x: 62, y: 84, role: "CF", category: "FWD", label: "ФОР" }
  ],
  "4-1-4-1": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 16, y: 32, role: "LD", category: "DEF", label: "ЛЗ" },
    { slot: 3, x: 38, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 62, y: 28, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 5, x: 84, y: 32, role: "RD", category: "DEF", label: "ПЗ" },
    { slot: 6, x: 50, y: 46, role: "CM", category: "MID", label: "ОП" },
    { slot: 7, x: 18, y: 64, role: "LM", category: "MID", label: "ЛП" },
    { slot: 8, x: 38, y: 62, role: "CM", category: "MID", label: "ЦП" },
    { slot: 9, x: 62, y: 62, role: "CM", category: "MID", label: "ЦП" },
    { slot: 10, x: 82, y: 64, role: "RM", category: "MID", label: "ПП" },
    { slot: 11, x: 50, y: 86, role: "CF", category: "FWD", label: "ФОР" }
  ],
  "3-4-3": [
    { slot: 1, x: 50, y: 12, role: "GK", category: "GK", label: "ВР" },
    { slot: 2, x: 26, y: 30, role: "CD", category: "DEF", label: "ЛЦЗ" },
    { slot: 3, x: 50, y: 26, role: "CD", category: "DEF", label: "ЦЗ" },
    { slot: 4, x: 74, y: 30, role: "CD", category: "DEF", label: "ПЦЗ" },
    { slot: 5, x: 16, y: 55, role: "LM", category: "MID", label: "ЛП" },
    { slot: 6, x: 38, y: 52, role: "CM", category: "MID", label: "ЦП" },
    { slot: 7, x: 62, y: 52, role: "CM", category: "MID", label: "ЦП" },
    { slot: 8, x: 84, y: 55, role: "RM", category: "MID", label: "ПП" },
    { slot: 9, x: 20, y: 82, role: "LF", category: "FWD", label: "ЛВ" },
    { slot: 10, x: 50, y: 86, role: "CF", category: "FWD", label: "ЦФ" },
    { slot: 11, x: 80, y: 82, role: "RF", category: "FWD", label: "ПВ" }
  ]
}

// Map position to category (GK, DEF, MID, FWD)
export function getPositionCategory(pos: string): "GK" | "DEF" | "MID" | "FWD" {
  if (pos === "GK") return "GK"
  if (["LD", "CD", "RD", "LB", "CB", "RB"].includes(pos)) return "DEF"
  if (["LM", "CM", "RM", "CDM", "CAM"].includes(pos)) return "MID"
  return "FWD"
}

// Check if player position matches slot role (with secondary position & side tolerance)
export function getPositionSuitability(player: FMPlayer, targetRole: PlayerPosition): {
  isMatch: boolean
  penalty: number // 1.0 = perfect, 0.85 = acceptable side, 0.70 = wrong category
  note: string
} {
  const pPos = player.position
  const sPos = player.secondary_position

  if (pPos === targetRole || sPos === targetRole) {
    return { isMatch: true, penalty: 1.0, note: "Ідеальна позиція" }
  }

  const pCat = getPositionCategory(pPos)
  const tCat = getPositionCategory(targetRole)

  if (pCat === tCat) {
    return { isMatch: true, penalty: 0.88, note: "Суміжний фланг / позиція (-12%)" }
  }

  return { isMatch: false, penalty: 0.65, note: "Не рідна позиція! Штраф (-35%)" }
}

// ==========================================
// 3. NAME GENERATOR
// ==========================================

const UA_FIRST_NAMES = [
  "Андрій", "Олександр", "Максим", "Дмитро", "Сергій", "Артем", "Владислав", "Тарас",
  "Богдан", "Ярослав", "Роман", "Віталій", "Олег", "Назар", "Денис", "Михайло",
  "Іван", "Євген", "Василь", "Вадим", "Юрій", "Ілля", "Павло", "Руслан", "Степан"
]

const UA_LAST_NAMES = [
  "Шевченко", "Ярмоленко", "Зінченко", "Мудрик", "Циганков", "Забарний", "Миколенко",
  "Лунін", "Трубін", "Довбик", "Шапаренко", "Бондаренко", "Судаков", "Сидорчук",
  "Степаненко", "Матвієнко", "Тимчик", "Караваєв", "Бущан", "Конопля", "Гуцуляк",
  "Піхальонок", "Ванат", "Яремчук", "Бражко", "Таловєров", "Сич", "Батагов"
]

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateRandomName(): string {
  const fn = UA_FIRST_NAMES[getRandomInt(0, UA_FIRST_NAMES.length - 1)]
  const ln = UA_LAST_NAMES[getRandomInt(0, UA_LAST_NAMES.length - 1)]
  return `${fn} ${ln}`
}

// ==========================================
// 4. 11x11.ru STARTER SQUAD GENERATOR
// ==========================================

export function generateStarterSquad(clubId: number): Omit<FMPlayer, "id">[] {
  const squadLayout: { pos: PlayerPosition; sec?: PlayerPosition; roleLabel: string }[] = [
    // 2 Goalkeepers
    { pos: "GK", roleLabel: "ВР" },
    { pos: "GK", roleLabel: "ВР" },
    // 5 Defenders
    { pos: "LD", sec: "CD", roleLabel: "ЛЗ" },
    { pos: "CD", roleLabel: "ЦЗ" },
    { pos: "CD", sec: "RD", roleLabel: "ЦЗ" },
    { pos: "RD", roleLabel: "ПЗ" },
    { pos: "CD", sec: "LD", roleLabel: "ЦЗ" },
    // 5 Midfielders
    { pos: "LM", sec: "LF", roleLabel: "ЛП" },
    { pos: "CM", roleLabel: "ЦП" },
    { pos: "CM", sec: "RM", roleLabel: "ЦП" },
    { pos: "RM", roleLabel: "ПП" },
    { pos: "CM", sec: "LM", roleLabel: "ЦП" },
    // 4 Forwards
    { pos: "LF", sec: "CF", roleLabel: "ЛВ" },
    { pos: "CF", roleLabel: "ЦФ" },
    { pos: "RF", sec: "CF", roleLabel: "ПВ" },
    { pos: "CF", roleLabel: "ЦФ" }
  ]

  return squadLayout.map((slotInfo, idx) => {
    const isStarter = idx < 11
    const pitchSlot = isStarter ? idx + 1 : 0
    const age = getRandomInt(19, 29)
    const talent = getRandomInt(2, 4) // 2-4 stars for starter
    const skill = getRandomInt(130, 230) // 130 - 230 starting skill

    // 1-2 random special abilities on higher talent players
    const special_abilities: SpecialAbilityId[] = []
    if (talent >= 3 && Math.random() > 0.4) {
      if (slotInfo.pos === "GK") {
        special_abilities.push(Math.random() > 0.5 ? "gk_reaction" : "gk_exit")
      } else if (getPositionCategory(slotInfo.pos) === "DEF") {
        special_abilities.push(Math.random() > 0.5 ? "tackling" : "interception")
      } else if (getPositionCategory(slotInfo.pos) === "MID") {
        special_abilities.push(Math.random() > 0.5 ? "pass" : "playmaker")
      } else {
        special_abilities.push(Math.random() > 0.5 ? "one_on_one" : "speed")
      }
    }

    const market_value = Math.round(skill * talent * 450)
    const wage = Math.round(skill * 8)

    return {
      club_id: clubId,
      name: generateRandomName(),
      nationality: "Україна",
      age,
      position: slotInfo.pos,
      secondary_position: slotInfo.sec || null,
      skill,
      talent,
      special_abilities,
      energy: 100,
      morale: 100,
      xp: 50,
      market_value,
      wage,
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      is_starter: isStarter,
      pitch_slot: pitchSlot,
      is_on_transfer: false,
      transfer_price: 0,
      is_injured: false,
      injury_matches: 0,
      overall_rating: Math.round(skill / 3), // legacy fallback
      stamina: 100
    }
  })
}

// ==========================================
// 5. 11x11.ru TEAM POWER CALCULATOR
// ==========================================

export interface TeamPower {
  attack: number
  midfield: number
  defense: number
  goalkeeper: number
  overall: number
}

export function calculateTeamPower(
  players: FMPlayer[],
  tactics?: FMTactics | null
): TeamPower {
  const starters = players.filter((p) => p.is_starter && p.pitch_slot > 0)

  if (starters.length === 0) {
    return { attack: 30, midfield: 30, defense: 30, goalkeeper: 30, overall: 30 }
  }

  const formation = tactics?.formation || "4-4-2"
  const formationSlots = FORMATIONS_MAP[formation] || FORMATIONS_MAP["4-4-2"]

  let attackSum = 0
  let attackCount = 0
  let midSum = 0
  let midCount = 0
  let defSum = 0
  let defCount = 0
  let gkSum = 0
  let gkCount = 0

  for (const player of starters) {
    const slotDef = formationSlots.find((s) => s.slot === player.pitch_slot)
    const targetRole = slotDef?.role || player.position
    const { penalty } = getPositionSuitability(player, targetRole)

    // Effective skill calculation
    const baseSkill = player.skill || (player.overall_rating ? player.overall_rating * 3 : 150)
    const energyMod = Math.max(0.4, (player.energy ?? player.stamina ?? 100) / 100)
    const moraleMod = 0.9 + ((player.morale ?? 100) / 100) * 0.2 // 0.9 - 1.1

    // Special abilities bonus (+4% per ability)
    const abilitiesCount = (player.special_abilities || []).length
    const abilityMod = 1 + abilitiesCount * 0.04

    const effectivePower = baseSkill * penalty * energyMod * moraleMod * abilityMod

    const category = slotDef?.category || getPositionCategory(player.position)

    if (category === "GK") {
      gkSum += effectivePower
      gkCount++
    } else if (category === "DEF") {
      defSum += effectivePower
      defCount++
    } else if (category === "MID") {
      midSum += effectivePower
      midCount++
    } else {
      attackSum += effectivePower
      attackCount++
    }
  }

  // Tactical modifiers
  let atkMod = 1.0
  let defMod = 1.0
  let midMod = 1.0

  if (tactics?.mentality === "all_out_attack") {
    atkMod *= 1.15
    defMod *= 0.88
  } else if (tactics?.mentality === "attacking") {
    atkMod *= 1.08
    defMod *= 0.94
  } else if (tactics?.mentality === "defensive") {
    atkMod *= 0.92
    defMod *= 1.10
  } else if (tactics?.mentality === "very_defensive") {
    atkMod *= 0.82
    defMod *= 1.18
  }

  if (tactics?.pressing === "intense" || tactics?.pressing === "high") {
    midMod *= 1.08
    defMod *= 1.05
  }

  const finalGk = Math.round((gkCount > 0 ? gkSum / gkCount : 40))
  const finalDef = Math.round((defCount > 0 ? defSum / defCount : 40) * defMod)
  const finalMid = Math.round((midCount > 0 ? midSum / midCount : 40) * midMod)
  const finalAtk = Math.round((attackCount > 0 ? attackSum / attackCount : 40) * atkMod)

  const overall = Math.round(finalGk * 0.15 + finalDef * 0.3 + finalMid * 0.3 + finalAtk * 0.25)

  return {
    attack: finalAtk,
    midfield: finalMid,
    defense: finalDef,
    goalkeeper: finalGk,
    overall
  }
}

// ==========================================
// 6. 11x11.ru FULL 90-MIN MATCH SIMULATOR
// ==========================================

export interface SimulationResult {
  match: FMMatch
  homePower: TeamPower
  awayPower: TeamPower
  playerFatigueDrained: { id: number; newEnergy: number; xpGained: number }[]
}

export function simulateFullMatch(
  homeClub: { id: number; name: string },
  homePlayers: FMPlayer[],
  homeTactics: FMTactics | null,
  homeStadium: FMStadium | null,
  awayClub: { id: number; name: string },
  awayPlayers: FMPlayer[],
  awayTactics: FMTactics | null,
  matchType: "friendly" | "league" | "cup" = "cup",
  tournamentId?: number
): SimulationResult {
  const homePower = calculateTeamPower(homePlayers, homeTactics)
  const awayPower = calculateTeamPower(awayPlayers, awayTactics)

  const events: FMMatchEvent[] = []
  let homeScore = 0
  let awayScore = 0

  let homeShots = 0
  let awayShots = 0
  let homeShotsOnTarget = 0
  let awayShotsOnTarget = 0
  let homeFouls = 0
  let awayFouls = 0
  let homeCorners = 0
  let awayCorners = 0
  let homeYellows = 0
  let awayYellows = 0
  const homeReds = 0
  const awayReds = 0
  let homeXg = 0
  let awayXg = 0

  // Midfield possession balance
  const totalMid = homePower.midfield + awayPower.midfield
  const homePossession = Math.round(
    Math.min(75, Math.max(25, (homePower.midfield / (totalMid || 1)) * 100 + getRandomInt(-4, 6)))
  )
  const awayPossession = 100 - homePossession

  events.push({
    minute: 0,
    type: "whistle",
    text: `🔔 Свисток арбітра! Матч розпочався: ${homeClub.name} приймає ${awayClub.name}. Поле в чудовому стані!`,
    team: "home",
    is_home: true,
    home_score_at_time: 0,
    away_score_at_time: 0
  })

  // 14 Key simulation minute checkpoints
  const simMinutes = [7, 14, 22, 29, 36, 43, 45, 53, 61, 68, 75, 82, 88, 90]

  const homeStarters = homePlayers.filter((p) => p.is_starter && p.pitch_slot > 0)
  const awayStarters = awayPlayers.filter((p) => p.is_starter && p.pitch_slot > 0)

  const getRandomPlayer = (list: FMPlayer[], category?: "GK" | "DEF" | "MID" | "FWD") => {
    if (list.length === 0) return null
    if (category) {
      const filtered = list.filter((p) => getPositionCategory(p.position) === category)
      if (filtered.length > 0) return filtered[getRandomInt(0, filtered.length - 1)]
    }
    return list[getRandomInt(0, list.length - 1)]
  }

  for (const minute of simMinutes) {
    const isHomeAttack = Math.random() * 100 < homePossession

    if (isHomeAttack) {
      // Home team creates opportunity
      homeShots++
      const attackAdvantage = (homePower.attack - awayPower.defense) / 100
      const shotXg = Math.min(0.85, Math.max(0.08, 0.22 + attackAdvantage * 0.25 + (Math.random() * 0.2 - 0.1)))
      homeXg += Number(shotXg.toFixed(2))

      const shooter = getRandomPlayer(homeStarters, "FWD") || getRandomPlayer(homeStarters, "MID") || getRandomPlayer(homeStarters)
      const passer = getRandomPlayer(homeStarters, "MID") || getRandomPlayer(homeStarters)
      const awayGk = getRandomPlayer(awayStarters, "GK")

      // Check special abilities trigger
      const hasPlaymaker = passer?.special_abilities?.includes("playmaker")
      const hasLongShot = shooter?.special_abilities?.includes("long_shot")
      const hasOneOnOne = shooter?.special_abilities?.includes("one_on_one")
      const hasGkReaction = awayGk?.special_abilities?.includes("gk_reaction")

      const isGoal = Math.random() < shotXg * 0.75 + (hasPlaymaker || hasLongShot || hasOneOnOne ? 0.12 : 0) - (hasGkReaction ? 0.08 : 0)

      if (isGoal) {
        homeScore++
        homeShotsOnTarget++
        let commentary = `⚽ ГОООЛ! [${homeClub.name}] ${shooter?.name || "Нападник"} вражає ворота!`
        if (hasPlaymaker && passer) {
          commentary = `✨ [${homeClub.name}] 🪄 ${passer.name} активує 'Розігруючий' і видає шедевральний пас — ⚽ ${shooter?.name} в один дотик забиває ГОЛ!`
        } else if (hasLongShot) {
          commentary = `🚀 [${homeClub.name}] 🎯 ${shooter?.name} запускає гармату з-за меж штрафного (спецуміння 'Далекий удар') — м'яч у самій дев'ятці! ГОЛ!`
        } else if (hasOneOnOne) {
          commentary = `🔥 [${homeClub.name}] ⚡ ${shooter?.name} завдяки навичці 'Один-на-один' холоднокровно переграє голкіпера! ГОЛ!`
        }

        events.push({
          minute,
          type: "goal",
          text: commentary,
          team: "home",
          player_name: shooter?.name,
          assist_player_name: passer?.name,
          is_home: true,
          home_score_at_time: homeScore,
          away_score_at_time: awayScore
        })
      } else if (Math.random() < 0.55) {
        homeShotsOnTarget++
        const saveComment = hasGkReaction && awayGk
          ? `🧤 Фантастичний сейв! Голкіпер ${awayGk.name} завдяки 'Рефлексам' тягне м'яч з під поперечини після удару ${shooter?.name}!`
          : `🧤 Сейв! Воротар ${awayGk?.name || "гостей"} відбиває небезпечний удар ${shooter?.name} на кутовий.`
        homeCorners++
        events.push({
          minute,
          type: "save",
          text: saveComment,
          team: "away",
          player_name: awayGk?.name,
          is_home: false
        })
      } else {
        events.push({
          minute,
          type: "shot_miss",
          text: `💨 ${shooter?.name || "Гравець"} пробиває вище поперечини після розіграшу позиційної атаки.`,
          team: "home",
          is_home: true
        })
      }
    } else {
      // Away team creates opportunity
      awayShots++
      const attackAdvantage = (awayPower.attack - homePower.defense) / 100
      const shotXg = Math.min(0.85, Math.max(0.08, 0.22 + attackAdvantage * 0.25 + (Math.random() * 0.2 - 0.1)))
      awayXg += Number(shotXg.toFixed(2))

      const shooter = getRandomPlayer(awayStarters, "FWD") || getRandomPlayer(awayStarters, "MID") || getRandomPlayer(awayStarters)
      const passer = getRandomPlayer(awayStarters, "MID") || getRandomPlayer(awayStarters)
      const homeGk = getRandomPlayer(homeStarters, "GK")

      const hasGkReaction = homeGk?.special_abilities?.includes("gk_reaction")
      const isGoal = Math.random() < shotXg * 0.75 - (hasGkReaction ? 0.08 : 0)

      if (isGoal) {
        awayScore++
        awayShotsOnTarget++
        events.push({
          minute,
          type: "goal",
          text: `⚽ Гол суперника! [${awayClub.name}] ${shooter?.name || "Нападник"} замикає простріл у ворота.`,
          team: "away",
          player_name: shooter?.name,
          assist_player_name: passer?.name,
          is_home: false,
          home_score_at_time: homeScore,
          away_score_at_time: awayScore
        })
      } else if (Math.random() < 0.55) {
        awayShotsOnTarget++
        awayCorners++
        events.push({
          minute,
          type: "save",
          text: `🧤 Наш голкіпер ${homeGk?.name || "воротар"} рятує команду від пропущеного м'яча!`,
          team: "home",
          player_name: homeGk?.name,
          is_home: true
        })
      } else {
        events.push({
          minute,
          type: "shot_miss",
          text: `⚠️ [${awayClub.name}] Удар повз ворота після небезпечної контратаки.`,
          team: "away",
          is_home: false
        })
      }
    }

    // Occasional foul/card
    if (Math.random() < 0.28) {
      const isHomeFoul = Math.random() > 0.5
      if (isHomeFoul) {
        homeFouls++
        const fouler = getRandomPlayer(homeStarters, "DEF") || getRandomPlayer(homeStarters)
        if (Math.random() < 0.35) {
          homeYellows++
          events.push({
            minute: Math.min(89, minute + 1),
            type: "yellow_card",
            text: `🟨 Жовта картка: ${fouler?.name || "Гравець"} попереджений за грубий підкат.`,
            team: "home",
            player_name: fouler?.name,
            is_home: true
          })
        }
      } else {
        awayFouls++
        const fouler = getRandomPlayer(awayStarters, "DEF") || getRandomPlayer(awayStarters)
        if (Math.random() < 0.35) {
          awayYellows++
          events.push({
            minute: Math.min(89, minute + 1),
            type: "yellow_card",
            text: `🟨 Жовта картка суперника: ${fouler?.name || "Гравець"} порушив правила.`,
            team: "away",
            player_name: fouler?.name,
            is_home: false
          })
        }
      }
    }
  }

  // Final whistle event
  events.push({
    minute: 90,
    type: "whistle",
    text: `🏁 Фінальний свисток! Підсумок матчу: ${homeClub.name} ${homeScore}:${awayScore} ${awayClub.name}`,
    team: "home",
    is_home: true,
    home_score_at_time: homeScore,
    away_score_at_time: awayScore
  })

  // Stadium Ticket Revenue
  const capacity = homeStadium?.capacity || 5000
  const ticketPrice = homeStadium?.ticket_price || 20
  const attendanceRate = 0.65 + (homeScore > awayScore ? 0.3 : 0.15)
  const attendance = Math.round(capacity * Math.min(1.0, attendanceRate))
  const ticketRevenue = attendance * ticketPrice

  // Win/Loss XP & Bonus Money
  const isWin = homeScore > awayScore
  const isDraw = homeScore === awayScore

  const baseReward = isWin ? 35000 : isDraw ? 15000 : 5000
  const totalRevenue = ticketRevenue + baseReward
  const managerXpReward = isWin ? 150 : isDraw ? 75 : 35

  // Calculate stamina / energy drain and player XP gains
  const playerFatigueDrained = homeStarters.map((p) => {
    const drain = getRandomInt(12, 20) // -12% to -20% energy
    const currentEnergy = p.energy ?? p.stamina ?? 100
    const newEnergy = Math.max(10, currentEnergy - drain)
    const xpGained = (isWin ? 35 : isDraw ? 20 : 12) + (p.goals > 0 ? 15 : 0)

    return {
      id: p.id,
      newEnergy,
      xpGained
    }
  })

  const stats: FMMatchStats = {
    home_possession: homePossession,
    away_possession: awayPossession,
    home_shots: homeShots,
    away_shots: awayShots,
    home_shots_on_target: homeShotsOnTarget,
    away_shots_on_target: awayShotsOnTarget,
    home_xg: Number(homeXg.toFixed(2)),
    away_xg: Number(awayXg.toFixed(2)),
    home_fouls: homeFouls,
    away_fouls: awayFouls,
    home_corners: homeCorners,
    away_corners: awayCorners,
    home_yellows: homeYellows,
    away_yellows: awayYellows,
    home_reds: homeReds,
    away_reds: awayReds
  }

  const match: FMMatch = {
    home_club_id: homeClub.id,
    away_club_id: awayClub.id,
    home_club_name: homeClub.name,
    away_club_name: awayClub.name,
    home_score: homeScore,
    away_score: awayScore,
    is_played: true,
    match_type: matchType,
    tournament_id: tournamentId,
    events_log: events,
    stats,
    revenue: totalRevenue,
    xp_reward: managerXpReward,
    played_at: new Date().toISOString()
  }

  return {
    match,
    homePower,
    awayPower,
    playerFatigueDrained
  }
}

// ==========================================
// 7. TOURNAMENT GENERATOR (8-TEAM BRACKET)
// ==========================================

export function generateTournamentBracket(
  userClub: { id: number; name: string; badge?: string; color?: string },
  botClubs: { id: number; name: string; badge?: string; color?: string }[]
): FMTournamentBracket {
  const selectedBots = [...botClubs].sort(() => Math.random() - 0.5).slice(0, 7)

  const teams = [userClub, ...selectedBots]

  const quarter_finals: FMTournamentMatch[] = [
    {
      home_club_id: teams[0].id,
      home_club_name: teams[0].name,
      home_club_badge: teams[0].badge || "shield",
      home_club_color: teams[0].color || "#0F5E10",
      away_club_id: teams[1].id,
      away_club_name: teams[1].name,
      away_club_badge: teams[1].badge || "trophy",
      away_club_color: teams[1].color || "#1E40AF",
      is_played: false
    },
    {
      home_club_id: teams[2].id,
      home_club_name: teams[2].name,
      home_club_badge: teams[2].badge || "crown",
      home_club_color: teams[2].color || "#DC2626",
      away_club_id: teams[3].id,
      away_club_name: teams[3].name,
      away_club_badge: teams[3].badge || "star",
      away_club_color: teams[3].color || "#7C3AED",
      is_played: false
    },
    {
      home_club_id: teams[4].id,
      home_club_name: teams[4].name,
      home_club_badge: teams[4].badge || "anchor",
      home_club_color: teams[4].color || "#0284C7",
      away_club_id: teams[5].id,
      away_club_name: teams[5].name,
      away_club_badge: teams[5].badge || "flag",
      away_club_color: teams[5].color || "#16A34A",
      is_played: false
    },
    {
      home_club_id: teams[6].id,
      home_club_name: teams[6].name,
      home_club_badge: teams[6].badge || "award",
      home_club_color: teams[6].color || "#EA580C",
      away_club_id: teams[7].id,
      away_club_name: teams[7].name,
      away_club_badge: teams[7].badge || "shield",
      away_club_color: teams[7].color || "#4B5563",
      is_played: false
    }
  ]

  return {
    quarter_finals,
    semi_finals: [],
    final: {
      home_club_id: 0,
      home_club_name: "Переможець ПФ 1",
      away_club_id: 0,
      away_club_name: "Переможець ПФ 2",
      is_played: false
    }
  }
}

// ==========================================
// 8. 11x11 FOOTBALL CITY BUILDINGS INFO
// ==========================================

export interface CityBuildingInfo {
  id: string
  name: string
  level: number
  maxLevel: number
  icon: string
  color: string
  description: string
  benefitText: string
  nextUpgradeCost: number
}

export function getCityBuildings(stadium: FMStadium | null): CityBuildingInfo[] {
  const s = stadium || ({} as FMStadium)

  const capacity = s.capacity || 5000
  const baseLvl = s.base_level || 1
  const fitLvl = s.fitness_level || 1
  const medLvl = s.medical_level || 1
  const youthLvl = s.youth_academy_level || 1
  const officeLvl = s.office_level || 1
  const commLvl = s.commercial_level || 1

  return [
    {
      id: "stadium",
      name: "Головний Стадіон",
      level: Math.floor(capacity / 5000),
      maxLevel: 10,
      icon: "🏟️",
      color: "from-emerald-600 to-teal-700",
      description: "Місткість глядацьких трибун. Збільшує дохід від продажу квитків на домашні матчі.",
      benefitText: `Поточна місткість: ${capacity.toLocaleString()} глядачів`,
      nextUpgradeCost: (Math.floor(capacity / 5000) + 1) * 35000
    },
    {
      id: "base",
      name: "Клубна База",
      level: baseLvl,
      maxLevel: 5,
      icon: "🏰",
      color: "from-blue-600 to-indigo-700",
      description: "Серце клубу. Визначає максимальний розмір складу та ліміт рівнів усіх інших споруд.",
      benefitText: `Макс. гравців: ${16 + baseLvl * 2}, ліміт будівель: рівень ${baseLvl + 1}`,
      nextUpgradeCost: (baseLvl + 1) * 45000
    },
    {
      id: "fitness",
      name: "Фітнес-Центр",
      level: fitLvl,
      maxLevel: 5,
      icon: "🏋️",
      color: "from-amber-600 to-orange-700",
      description: "Тренажерні зали та СПА. Прискорює природне відновлення енергії (фізичної форми) гравців.",
      benefitText: `Відновлення сил: +${fitLvl * 15}% швидше між турнірами`,
      nextUpgradeCost: (fitLvl + 1) * 30000
    },
    {
      id: "medical",
      name: "Медичний Центр",
      level: medLvl,
      maxLevel: 5,
      icon: "🏥",
      color: "from-rose-600 to-red-700",
      description: "Сучасна спортивна клініка. Знижує ризик отримання травм у матчах та пришвидшує лікування.",
      benefitText: `Захист від травм: -${medLvl * 18}%, швидке лікування`,
      nextUpgradeCost: (medLvl + 1) * 25000
    },
    {
      id: "youth",
      name: "Школа Юніорів",
      level: youthLvl,
      maxLevel: 5,
      icon: "🎓",
      color: "from-purple-600 to-pink-700",
      description: "Академія виховання молодих талантів. Дозволяє скаутувати гравців із 4-6 зірками таланту.",
      benefitText: `Талант випускників: до ${Math.min(6, youthLvl + 2)} ⭐ зірок`,
      nextUpgradeCost: (youthLvl + 1) * 40000
    },
    {
      id: "office",
      name: "Офіс Клубу",
      level: officeLvl,
      maxLevel: 5,
      icon: "💼",
      color: "from-cyan-600 to-blue-700",
      description: "Адміністративний центр. Відкриває додаткові слоти для найму спеціалізованого персоналу.",
      benefitText: `Доступно слотів персоналу: ${officeLvl} із 4`,
      nextUpgradeCost: (officeLvl + 1) * 32000
    },
    {
      id: "commercial",
      name: "Торговий Центр",
      level: commLvl,
      maxLevel: 5,
      icon: "🛍️",
      color: "from-yellow-600 to-amber-700",
      description: "Фан-шопи та продаж клубної атрибутики. Генерує щоденний пасивний дохід у скарбницю клубу.",
      benefitText: `Пасивний дохід: +${commLvl * 7500} ₴ за турнір`,
      nextUpgradeCost: (commLvl + 1) * 28000
    }
  ]
}

// ==========================================
// 9. YOUTH PROSPECT GENERATOR (11x11 STYLE)
// ==========================================

export function generateYouthProspect(clubId: number, academyLevel: number = 1): FMYouthProspect {
  const positions: PlayerPosition[] = ["GK", "LD", "CD", "RD", "LM", "CM", "RM", "LF", "CF", "RF"]
  const pos = positions[getRandomInt(0, positions.length - 1)]
  const age = getRandomInt(15, 17)

  // Talent scale with academy level
  const minTalent = Math.min(5, Math.max(1, academyLevel))
  const maxTalent = Math.min(6, academyLevel + 1)
  const talent = getRandomInt(minTalent, maxTalent)

  const skill = getRandomInt(100 + academyLevel * 15, 180 + academyLevel * 20)

  const special_abilities: SpecialAbilityId[] = []
  if (talent >= 4 && Math.random() > 0.45) {
    if (pos === "GK") special_abilities.push("gk_reaction")
    else if (getPositionCategory(pos) === "DEF") special_abilities.push("tackling")
    else if (getPositionCategory(pos) === "MID") special_abilities.push("pass")
    else special_abilities.push("one_on_one")
  }

  const signingCost = Math.round(skill * talent * 120)

  return {
    id: Date.now() + getRandomInt(1, 9999),
    club_id: clubId,
    name: generateRandomName(),
    age,
    position: pos,
    skill,
    talent,
    special_abilities,
    signing_cost: signingCost,
    is_signed: false
  }
}
