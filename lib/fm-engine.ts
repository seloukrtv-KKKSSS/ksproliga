import {
  FMClub,
  FMPlayer,
  FMTactics,
  FMStadium,
  FMMatch,
  FMMatchEvent,
  FMMatchStats,
  FormationType,
  PlayerPosition,
  FMYouthProspect
} from "./fm-types"

// -------------------------------------------------------------
// 1. FORMATION SLOTS & COORDINATES (% from top-left of pitch)
// -------------------------------------------------------------
export interface PitchSlot {
  slot: number
  position: PlayerPosition
  x: number // 0% - 100% horizontal
  y: number // 0% - 100% vertical (0 = goal, 100 = opponents goal)
  roleLabel: string
}

export const FORMATIONS_MAP: Record<FormationType, PitchSlot[]> = {
  "4-4-2": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "LB", x: 15, y: 70, roleLabel: "ЛЗ" },
    { slot: 3, position: "CB", x: 38, y: 73, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 62, y: 73, roleLabel: "ЦЗ" },
    { slot: 5, position: "RB", x: 85, y: 70, roleLabel: "ПЗ" },
    { slot: 6, position: "LM", x: 15, y: 44, roleLabel: "ЛП" },
    { slot: 7, position: "CM", x: 38, y: 46, roleLabel: "ЦП" },
    { slot: 8, position: "CM", x: 62, y: 46, roleLabel: "ЦП" },
    { slot: 9, position: "RM", x: 85, y: 44, roleLabel: "ПП" },
    { slot: 10, position: "ST", x: 36, y: 18, roleLabel: "ФРВ" },
    { slot: 11, position: "ST", x: 64, y: 18, roleLabel: "ФРВ" },
  ],
  "4-3-3": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "LB", x: 15, y: 70, roleLabel: "ЛЗ" },
    { slot: 3, position: "CB", x: 38, y: 73, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 62, y: 73, roleLabel: "ЦЗ" },
    { slot: 5, position: "RB", x: 85, y: 70, roleLabel: "ПЗ" },
    { slot: 6, position: "CDM", x: 50, y: 55, roleLabel: "ОП" },
    { slot: 7, position: "CM", x: 32, y: 40, roleLabel: "ЦП" },
    { slot: 8, position: "CAM", x: 68, y: 40, roleLabel: "АП" },
    { slot: 9, position: "LW", x: 18, y: 22, roleLabel: "ЛВ" },
    { slot: 10, position: "ST", x: 50, y: 16, roleLabel: "ФРВ" },
    { slot: 11, position: "RW", x: 82, y: 22, roleLabel: "ПВ" },
  ],
  "3-5-2": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "CB", x: 25, y: 74, roleLabel: "ЦЗ" },
    { slot: 3, position: "CB", x: 50, y: 75, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 75, y: 74, roleLabel: "ЦЗ" },
    { slot: 5, position: "LM", x: 12, y: 45, roleLabel: "ЛЛ" },
    { slot: 6, position: "CDM", x: 38, y: 56, roleLabel: "ОП" },
    { slot: 7, position: "CAM", x: 50, y: 38, roleLabel: "АП" },
    { slot: 8, position: "CDM", x: 62, y: 56, roleLabel: "ОП" },
    { slot: 9, position: "RM", x: 88, y: 45, roleLabel: "ПЛ" },
    { slot: 10, position: "ST", x: 36, y: 18, roleLabel: "ФРВ" },
    { slot: 11, position: "ST", x: 64, y: 18, roleLabel: "ФРВ" },
  ],
  "4-2-3-1": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "LB", x: 15, y: 70, roleLabel: "ЛЗ" },
    { slot: 3, position: "CB", x: 38, y: 73, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 62, y: 73, roleLabel: "ЦЗ" },
    { slot: 5, position: "RB", x: 85, y: 70, roleLabel: "ПЗ" },
    { slot: 6, position: "CDM", x: 38, y: 56, roleLabel: "ОП" },
    { slot: 7, position: "CDM", x: 62, y: 56, roleLabel: "ОП" },
    { slot: 8, position: "LM", x: 18, y: 35, roleLabel: "ЛП" },
    { slot: 9, position: "CAM", x: 50, y: 34, roleLabel: "АП" },
    { slot: 10, position: "RM", x: 82, y: 35, roleLabel: "ПП" },
    { slot: 11, position: "ST", x: 50, y: 16, roleLabel: "ФРВ" },
  ],
  "5-3-2": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "LB", x: 12, y: 66, roleLabel: "ЛЗ" },
    { slot: 3, position: "CB", x: 32, y: 74, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 50, y: 75, roleLabel: "ЦЗ" },
    { slot: 5, position: "CB", x: 68, y: 74, roleLabel: "ЦЗ" },
    { slot: 6, position: "RB", x: 88, y: 66, roleLabel: "ПЗ" },
    { slot: 7, position: "CM", x: 30, y: 46, roleLabel: "ЦП" },
    { slot: 8, position: "CAM", x: 50, y: 42, roleLabel: "АП" },
    { slot: 9, position: "CM", x: 70, y: 46, roleLabel: "ЦП" },
    { slot: 10, position: "ST", x: 36, y: 18, roleLabel: "ФРВ" },
    { slot: 11, position: "ST", x: 64, y: 18, roleLabel: "ФРВ" },
  ],
  "4-1-4-1": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "LB", x: 15, y: 70, roleLabel: "ЛЗ" },
    { slot: 3, position: "CB", x: 38, y: 73, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 62, y: 73, roleLabel: "ЦЗ" },
    { slot: 5, position: "RB", x: 85, y: 70, roleLabel: "ПЗ" },
    { slot: 6, position: "CDM", x: 50, y: 56, roleLabel: "ОП" },
    { slot: 7, position: "LM", x: 15, y: 38, roleLabel: "ЛП" },
    { slot: 8, position: "CM", x: 38, y: 40, roleLabel: "ЦП" },
    { slot: 9, position: "CM", x: 62, y: 40, roleLabel: "ЦП" },
    { slot: 10, position: "RM", x: 85, y: 38, roleLabel: "ПП" },
    { slot: 11, position: "ST", x: 50, y: 16, roleLabel: "ФРВ" },
  ],
  "3-4-3": [
    { slot: 1, position: "GK", x: 50, y: 90, roleLabel: "ВР" },
    { slot: 2, position: "CB", x: 25, y: 74, roleLabel: "ЦЗ" },
    { slot: 3, position: "CB", x: 50, y: 75, roleLabel: "ЦЗ" },
    { slot: 4, position: "CB", x: 75, y: 74, roleLabel: "ЦЗ" },
    { slot: 5, position: "LM", x: 15, y: 46, roleLabel: "ЛП" },
    { slot: 6, position: "CM", x: 38, y: 48, roleLabel: "ЦП" },
    { slot: 7, position: "CM", x: 62, y: 48, roleLabel: "ЦП" },
    { slot: 8, position: "RM", x: 85, y: 46, roleLabel: "ПП" },
    { slot: 9, position: "LW", x: 20, y: 20, roleLabel: "ЛВ" },
    { slot: 10, position: "ST", x: 50, y: 16, roleLabel: "ФРВ" },
    { slot: 11, position: "RW", x: 80, y: 20, roleLabel: "ПВ" },
  ]
}

// -------------------------------------------------------------
// 2. REALISTIC NAME GENERATOR
// -------------------------------------------------------------
const UA_FIRST_NAMES = [
  "Андрій", "Олександр", "Михайло", "Тарас", "Іван", "Дмитро", "Віталій", "Богдан",
  "Максим", "Роман", "Сергій", "Артем", "Назар", "Ярослав", "Владислав", "Олег",
  "Василь", "Юрій", "Денис", "Ігор", "Вадим", "Руслан", "Павло", "Євген", "Микола",
  "Данило", "Гліб", "Тимофій", "Олексій", "Ілля", "Кирило", "Маркіян"
]

const UA_LAST_NAMES = [
  "Шевченко", "Ярмоленко", "Зінченко", "Мудрик", "Довбик", "Трубін", "Забарний", "Миколенко",
  "Степаненко", "Шапаренко", "Судаков", "Бущан", "Циганков", "Матвієнко", "Конопля", "Тимчик",
  "Сидорчук", "Караваєв", "Ванат", "Гуцуляк", "Бондаренко", "Криськів", "Бражко", "Таловєров",
  "Карпюк", "Ковальчук", "Мельник", "Ткачук", "Кравченко", "Лисенко", "Олійник", "Поліщук",
  "Савченко", "Гончарук", "Мороз", "Клименко", "Петренко", "Бойко", "Козак", "Данилюк"
]

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateRandomName(): string {
  const f = UA_FIRST_NAMES[Math.floor(Math.random() * UA_FIRST_NAMES.length)]
  const l = UA_LAST_NAMES[Math.floor(Math.random() * UA_LAST_NAMES.length)]
  return `${f} ${l}`
}

// -------------------------------------------------------------
// 3. STARTING SQUAD GENERATOR (16 players for new club)
// -------------------------------------------------------------
export function generateStarterSquad(clubId: number): Omit<FMPlayer, "id">[] {
  const templatePositions: PlayerPosition[] = [
    "GK", "GK",
    "LB", "CB", "CB", "RB", "CB",
    "CDM", "CM", "CM", "CAM", "LM", "RM",
    "ST", "ST", "LW"
  ]

  return templatePositions.map((pos, idx) => {
    const isGK = pos === "GK"
    const isStarter = idx < 11
    const age = getRandomInt(18, 29)
    const baseRating = isStarter ? getRandomInt(63, 70) : getRandomInt(58, 64)

    const pace = isGK ? getRandomInt(35, 52) : (pos === "LW" || pos === "RM" || pos === "LM" ? getRandomInt(68, 85) : getRandomInt(58, 76))
    const shooting = isGK ? getRandomInt(15, 25) : (pos === "ST" || pos === "LW" ? getRandomInt(65, 78) : getRandomInt(45, 68))
    const passing = isGK ? getRandomInt(45, 65) : (pos.includes("M") ? getRandomInt(65, 78) : getRandomInt(52, 68))
    const dribbling = isGK ? getRandomInt(20, 40) : (pos === "LW" || pos === "CAM" ? getRandomInt(66, 80) : getRandomInt(54, 72))
    const defending = isGK ? getRandomInt(20, 40) : (pos.includes("B") || pos === "CDM" ? getRandomInt(64, 76) : getRandomInt(35, 58))
    const physical = getRandomInt(58, 80)
    const goalkeeping = isGK ? baseRating : getRandomInt(10, 20)

    const marketValue = baseRating * baseRating * 12 + getRandomInt(5000, 15000)
    const wage = Math.round(baseRating * 25)
    const potential = Math.min(92, baseRating + (30 - age) * 2 + getRandomInt(2, 6))

    return {
      club_id: clubId,
      name: generateRandomName(),
      nationality: "Україна",
      age,
      position: pos,
      overall_rating: baseRating,
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
      goalkeeping,
      stamina: 100,
      morale: 100,
      form: 80,
      potential,
      market_value: marketValue,
      wage,
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      is_starter: isStarter,
      pitch_slot: isStarter ? idx + 1 : 0,
      is_on_transfer: false,
      transfer_price: 0,
      is_injured: false,
      injury_matches: 0,
      created_at: new Date().toISOString()
    }
  })
}

// -------------------------------------------------------------
// 4. TEAM RATINGS & STRENGTH CALCULATION
// -------------------------------------------------------------
export interface TeamPower {
  attack: number
  midfield: number
  defense: number
  goalkeeper: number
  overall: number
}

export function calculateTeamPower(players: FMPlayer[], tactics?: FMTactics): TeamPower {
  const starters = players.filter((p) => p.is_starter && !p.is_injured)
  if (starters.length === 0) {
    return { attack: 50, midfield: 50, defense: 50, goalkeeper: 50, overall: 50 }
  }

  let attSum = 0, attCount = 0
  let midSum = 0, midCount = 0
  let defSum = 0, defCount = 0
  let gkSum = 0, gkCount = 0

  starters.forEach((p) => {
    // Condition multiplier (stamina & morale & form)
    const condition = ((p.stamina / 100) * 0.4 + (p.morale / 100) * 0.3 + (p.form / 100) * 0.3)
    const effectiveRating = p.overall_rating * condition

    if (p.position === "GK") {
      gkSum += effectiveRating
      gkCount++
    } else if (p.position === "CB" || p.position === "LB" || p.position === "RB") {
      defSum += effectiveRating
      defCount++
    } else if (p.position === "CDM" || p.position === "CM" || p.position === "CAM" || p.position === "LM" || p.position === "RM") {
      midSum += effectiveRating
      midCount++
    } else {
      attSum += effectiveRating
      attCount++
    }
  })

  let att = attCount > 0 ? Math.round(attSum / attCount) : 55
  let mid = midCount > 0 ? Math.round(midSum / midCount) : 55
  let def = defCount > 0 ? Math.round(defSum / defCount) : 55
  let gk = gkCount > 0 ? Math.round(gkSum / gkCount) : 55

  // Tactical modifiers
  if (tactics) {
    if (tactics.mentality === "all_out_attack") {
      att = Math.round(att * 1.15)
      def = Math.round(def * 0.88)
    } else if (tactics.mentality === "attacking") {
      att = Math.round(att * 1.08)
      def = Math.round(def * 0.94)
    } else if (tactics.mentality === "defensive") {
      att = Math.round(att * 0.92)
      def = Math.round(def * 1.08)
    } else if (tactics.mentality === "very_defensive") {
      att = Math.round(att * 0.85)
      def = Math.round(def * 1.15)
    }

    if (tactics.pressing === "intense" || tactics.pressing === "high") {
      mid = Math.round(mid * 1.06)
    }
  }

  const overall = Math.round((att * 0.3) + (mid * 0.35) + (def * 0.25) + (gk * 0.1))

  return { attack: att, midfield: mid, defense: def, goalkeeper: gk, overall }
}

// -------------------------------------------------------------
// 5. MATCH SIMULATION ENGINE
// -------------------------------------------------------------
export interface SimulationResult {
  match: FMMatch
  updatedHomePlayers: FMPlayer[]
  updatedAwayPlayers: FMPlayer[]
  homeRevenue: number
  managerXpEarned: number
}

export function simulateFullMatch(
  homeClub: FMClub,
  awayClub: FMClub,
  homePlayers: FMPlayer[],
  awayPlayers: FMPlayer[],
  homeTactics?: FMTactics,
  awayTactics?: FMTactics,
  homeStadium?: FMStadium,
  matchType: "friendly" | "league" | "cup" = "friendly"
): SimulationResult {
  const homePower = calculateTeamPower(homePlayers, homeTactics)
  const awayPower = calculateTeamPower(awayPlayers, awayTactics)

  const homeStarters = homePlayers.filter((p) => p.is_starter && !p.is_injured)
  const awayStarters = awayPlayers.filter((p) => p.is_starter && !p.is_injured)

  // Midfield possession dominance
  const totalMid = homePower.midfield + awayPower.midfield
  let homePossession = Math.round((homePower.midfield / Math.max(1, totalMid)) * 100)
  // Home advantage (+3%)
  homePossession = Math.min(75, Math.max(25, homePossession + 3))
  const awayPossession = 100 - homePossession

  const events: FMMatchEvent[] = []
  let homeScore = 0
  let awayScore = 0
  let homeShots = 0
  let awayShots = 0
  let homeShotsOnTarget = 0
  let awayShotsOnTarget = 0
  let homeXg = 0
  let awayXg = 0
  let homeFouls = 0
  let awayFouls = 0
  let homeCorners = 0
  let awayCorners = 0
  let homeYellows = 0
  let awayYellows = 0
  let homeReds = 0
  let awayReds = 0

  const clonedHomePlayers = JSON.parse(JSON.stringify(homePlayers)) as FMPlayer[]
  const clonedAwayPlayers = JSON.parse(JSON.stringify(awayPlayers)) as FMPlayer[]

  // Kickoff event
  events.push({
    minute: 1,
    type: "whistle",
    text: `🔔 Суддя дає свисток про початок матчу! На полі зустрічаються ${homeClub.name} та ${awayClub.name}.`,
    team: "home",
    is_home: true,
    home_score_at_time: 0,
    away_score_at_time: 0
  })

  // Timeline events distribution (approx 12-18 checkpoints across 90 mins)
  const eventMinutes = [6, 14, 21, 28, 35, 42, 45, 52, 59, 67, 74, 81, 88, 90]

  for (const minute of eventMinutes) {
    if (minute === 45) {
      events.push({
        minute: 45,
        type: "whistle",
        text: `⏱️ Перерва! Перший тайм завершено. Рахунок: ${homeClub.name} ${homeScore}:${awayScore} ${awayClub.name}.`,
        team: "home",
        is_home: true,
        home_score_at_time: homeScore,
        away_score_at_time: awayScore
      })
      continue
    }

    // Determine which team creates the action
    const isHomeAction = Math.random() * 100 < homePossession
    const attackingTeam = isHomeAction ? homeClub.name : awayClub.name
    const defendingTeam = isHomeAction ? awayClub.name : homeClub.name
    const attackers = isHomeAction ? homeStarters : awayStarters
    const defenders = isHomeAction ? awayStarters : homeStarters
    const attPower = isHomeAction ? homePower.attack : awayPower.attack
    const defPower = isHomeAction ? awayPower.defense : homePower.defense
    const gkPower = isHomeAction ? awayPower.goalkeeper : homePower.goalkeeper

    const attacker = attackers.length > 0 ? attackers[Math.floor(Math.random() * attackers.length)] : null
    const assistMan = attackers.length > 1 ? attackers.filter((p) => p.name !== attacker?.name)[Math.floor(Math.random() * (attackers.length - 1))] : null
    const defender = defenders.length > 0 ? defenders[Math.floor(Math.random() * defenders.length)] : null
    const keeper = defenders.find((p) => p.position === "GK") || defenders[0]

    const roll = Math.random() * 100

    if (roll < 40) {
      // Dangerous shot / Goal chance
      if (isHomeAction) {
        homeShots++
        homeXg += 0.15 + (attPower > defPower ? 0.15 : 0)
      } else {
        awayShots++
        awayXg += 0.15 + (attPower > defPower ? 0.15 : 0)
      }

      // Shot accuracy check
      const onTarget = Math.random() * 100 < 55 + (attPower - defPower) * 0.3
      if (onTarget) {
        if (isHomeAction) homeShotsOnTarget++
        else awayShotsOnTarget++

        // Goal check vs GK
        const goalProbability = 35 + (attPower - gkPower) * 0.5
        const isGoal = Math.random() * 100 < goalProbability

        if (isGoal && attacker) {
          if (isHomeAction) homeScore++
          else awayScore++

          // Update player stats
          const pList = isHomeAction ? clonedHomePlayers : clonedAwayPlayers
          const pMatch = pList.find((p) => p.name === attacker.name)
          if (pMatch) pMatch.goals++
          if (assistMan) {
            const aMatch = pList.find((p) => p.name === assistMan.name)
            if (aMatch) aMatch.assists++
          }

          const commentary = [
            `⚽ ГООООЛ! ${attacker.name} фантастичним гарматним ударом прошиває сітку воріт! (Асист: ${assistMan ? assistMan.name : "індивідуальний прохід"})`,
            `⚽ ГООООЛ! Філігранна комбінація ${attackingTeam}! ${attacker.name} замикає простріл у дотик!`,
            `⚽ ГООООЛ! ${attacker.name} виграє верхову дуель після навісу та відправляє м'яч під поперечину!`,
            `⚽ ГООООЛ! Помилка захисту ${defendingTeam}, яку блискавично карає ${attacker.name}!`
          ]
          const chosenText = commentary[Math.floor(Math.random() * commentary.length)]

          events.push({
            minute,
            type: "goal",
            text: `${minute}' ${chosenText}`,
            team: isHomeAction ? "home" : "away",
            player_name: attacker.name,
            assist_player_name: assistMan?.name,
            is_home: isHomeAction,
            home_score_at_time: homeScore,
            away_score_at_time: awayScore
          })
        } else {
          // Goalkeeper Save
          const saveCommentary = [
            `🧤 Блискучий сейв! ${keeper ? keeper.name : "Воротар"} у неймовірному стрибку витягує м'яч із "дев'ятки" після удару ${attacker ? attacker.name : "нападника"}!`,
            `🧤 Сейв! ${attacker ? attacker.name : "Гравець"} пробивав з близької відстані, але ${keeper ? keeper.name : "голкіпер"} рятує команду!`,
            `🧤 Надійний воротар: ${keeper ? keeper.name : "Голкіпер"} фіксує м'яч після дальнього удару.`
          ]
          events.push({
            minute,
            type: "save",
            text: `${minute}' ${saveCommentary[Math.floor(Math.random() * saveCommentary.length)]}`,
            team: isHomeAction ? "home" : "away",
            player_name: attacker?.name,
            is_home: isHomeAction,
            home_score_at_time: homeScore,
            away_score_at_time: awayScore
          })
        }
      } else {
        // Shot Miss / Corner
        if (Math.random() > 0.5) {
          if (isHomeAction) homeCorners++
          else awayCorners++
          events.push({
            minute,
            type: "chance",
            text: `${minute}' Небезпечний рикошет після удару ${attacker ? attacker.name : "атаки"} — м'яч іде на кутовий.`,
            team: isHomeAction ? "home" : "away",
            player_name: attacker?.name,
            is_home: isHomeAction,
            home_score_at_time: homeScore,
            away_score_at_time: awayScore
          })
        } else {
          events.push({
            minute,
            type: "shot_miss",
            text: `${minute}' ${attacker ? attacker.name : "Форвард"} вискочив на ударну позицію, але пробив поруч зі стійкою.`,
            team: isHomeAction ? "home" : "away",
            player_name: attacker?.name,
            is_home: isHomeAction,
            home_score_at_time: homeScore,
            away_score_at_time: awayScore
          })
        }
      }
    } else if (roll < 65) {
      // Foul / Card check
      if (isHomeAction) awayFouls++
      else homeFouls++

      const cardRoll = Math.random() * 100
      if (cardRoll < 25 && defender) {
        // Yellow card
        if (isHomeAction) awayYellows++
        else homeYellows++

        const pList = isHomeAction ? clonedAwayPlayers : clonedHomePlayers
        const pMatch = pList.find((p) => p.name === defender.name)
        if (pMatch) pMatch.yellow_cards++

        events.push({
          minute,
          type: "yellow_card",
          text: `${minute}' 🟨 Жовта картка: ${defender.name} грубим підкатом зриває швидку атаку.`,
          team: isHomeAction ? "away" : "home",
          player_name: defender.name,
          is_home: !isHomeAction,
          home_score_at_time: homeScore,
          away_score_at_time: awayScore
        })
      } else {
        events.push({
          minute,
          type: "foul",
          text: `${minute}' Фол у центрі поля: ${defender ? defender.name : "захисник"} порушує правила проти ${attacker ? attacker.name : "суперника"}.`,
          team: isHomeAction ? "away" : "home",
          is_home: !isHomeAction,
          home_score_at_time: homeScore,
          away_score_at_time: awayScore
        })
      }
    }
  }

  // Final whistle event
  events.push({
    minute: 90,
    type: "whistle",
    text: `🏁 Фінальний свисток! Матч завершено. Підсумковий рахунок: ${homeClub.name} ${homeScore}:${awayScore} ${awayClub.name}.`,
    team: "home",
    is_home: true,
    home_score_at_time: homeScore,
    away_score_at_time: awayScore
  })

  // Post-match player stamina & matches played update
  const homeMedicalLevel = homeStadium?.medical_level || 1
  const staminaDrain = Math.max(4, 12 - homeMedicalLevel)

  clonedHomePlayers.forEach((p) => {
    if (p.is_starter) {
      p.matches_played++
      p.stamina = Math.max(10, p.stamina - staminaDrain)
      // Form & morale change based on result
      if (homeScore > awayScore) {
        p.morale = Math.min(100, p.morale + 5)
        p.form = Math.min(100, p.form + 4)
      } else if (homeScore < awayScore) {
        p.morale = Math.max(40, p.morale - 4)
        p.form = Math.max(40, p.form - 2)
      }
    } else {
      // Bench players recover slightly
      p.stamina = Math.min(100, p.stamina + 8)
    }
  })

  clonedAwayPlayers.forEach((p) => {
    if (p.is_starter) {
      p.matches_played++
      p.stamina = Math.max(10, p.stamina - 10)
    }
  })

  // Stadium ticket revenue calculation
  const capacity = homeStadium?.capacity || 5000
  const ticketPrice = homeStadium?.ticket_price || 15
  const fanCount = homeClub.fans_count || 1500
  const attendanceRate = Math.min(1, (fanCount * 1.5) / capacity + (homeClub.reputation / 300))
  const attendance = Math.min(capacity, Math.round(capacity * Math.max(0.3, attendanceRate)))
  const ticketRevenue = Math.round(attendance * ticketPrice)

  // Manager XP & match win bonuses
  let managerXpEarned = 50
  let bonusCash = 0
  if (homeScore > awayScore) {
    managerXpEarned = 150
    bonusCash = 25000
  } else if (homeScore === awayScore) {
    managerXpEarned = 80
    bonusCash = 10000
  } else {
    managerXpEarned = 35
    bonusCash = 3000
  }

  const totalHomeRevenue = ticketRevenue + bonusCash

  const stats: FMMatchStats = {
    home_possession: homePossession,
    away_possession: awayPossession,
    home_shots: homeShots,
    away_shots: awayShots,
    home_shots_on_target: homeShotsOnTarget,
    away_shots_on_target: awayShotsOnTarget,
    home_xg: parseFloat(homeXg.toFixed(2)),
    away_xg: parseFloat(awayXg.toFixed(2)),
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
    league_id: homeClub.league_id,
    events_log: events,
    stats,
    revenue: totalHomeRevenue,
    xp_reward: managerXpEarned,
    created_at: new Date().toISOString(),
    played_at: new Date().toISOString()
  }

  return {
    match,
    updatedHomePlayers: clonedHomePlayers,
    updatedAwayPlayers: clonedAwayPlayers,
    homeRevenue: totalHomeRevenue,
    managerXpEarned
  }
}

// -------------------------------------------------------------
// 6. YOUTH ACADEMY PROSPECTS GENERATOR
// -------------------------------------------------------------
export function generateYouthProspect(clubId: number, academyLevel = 1): Omit<FMYouthProspect, "id"> {
  const positions: PlayerPosition[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "ST", "LW", "RW"]
  const pos = positions[Math.floor(Math.random() * positions.length)]
  const isGK = pos === "GK"
  const age = getRandomInt(15, 17)

  const minRating = 52 + academyLevel * 2
  const maxRating = 64 + academyLevel * 3
  const rating = getRandomInt(minRating, maxRating)

  const minPotential = 72 + academyLevel * 3
  const maxPotential = Math.min(95, 82 + academyLevel * 3)
  const potential = getRandomInt(minPotential, maxPotential)

  const pace = isGK ? getRandomInt(35, 55) : getRandomInt(65, 88)
  const shooting = isGK ? getRandomInt(15, 25) : (pos === "ST" ? getRandomInt(60, 78) : getRandomInt(45, 68))
  const passing = isGK ? getRandomInt(45, 65) : getRandomInt(55, 75)
  const dribbling = isGK ? getRandomInt(20, 40) : getRandomInt(60, 78)
  const defending = isGK ? getRandomInt(20, 40) : (pos.includes("B") ? getRandomInt(60, 76) : getRandomInt(40, 60))
  const physical = getRandomInt(55, 75)
  const goalkeeping = isGK ? rating : getRandomInt(10, 20)

  return {
    club_id: clubId,
    name: generateRandomName(),
    age,
    position: pos,
    potential,
    rating,
    attributes: {
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
      goalkeeping
    },
    scouted_at: new Date().toISOString(),
    is_signed: false
  }
}

// -------------------------------------------------------------
// 7. STADIUM & INFRASTRUCTURE UPGRADE CALCULATOR
// -------------------------------------------------------------
export interface FacilityInfo {
  name: string
  key: keyof FMStadium
  description: string
  currentLevel: number
  maxLevel: number
  upgradeCost: number
  benefitText: string
  icon: string
}

export function getFacilityDetails(stadium: FMStadium): FacilityInfo[] {
  return [
    {
      name: "Місткість Трибун",
      key: "capacity",
      description: "Розширення стадіону збільшує кількість відвідувачів та дохід від продажу квитків на домашні матчі.",
      currentLevel: Math.round(stadium.capacity / 2500),
      maxLevel: 10,
      upgradeCost: (Math.round(stadium.capacity / 2500) + 1) * 75000,
      benefitText: `Поточна місткість: ${stadium.capacity.toLocaleString()} глядачів (+2,500 місць за рівень)`,
      icon: "building"
    },
    {
      name: "Якість Газону",
      key: "pitch_level",
      description: "Ідеальне поле знижує ризик травмування гравців та підвищує точність передач.",
      currentLevel: stadium.pitch_level || 1,
      maxLevel: 5,
      upgradeCost: (stadium.pitch_level + 1) * 45000,
      benefitText: `Рівень ${stadium.pitch_level}/5 (-${stadium.pitch_level * 15}% ризик травм)`,
      icon: "sparkles"
    },
    {
      name: "Тренувальна База",
      key: "training_level",
      description: "Сучасні тренажери та поля прискорюють прогрес гравців та зростання характеристик.",
      currentLevel: stadium.training_level || 1,
      maxLevel: 5,
      upgradeCost: (stadium.training_level + 1) * 60000,
      benefitText: `Рівень ${stadium.training_level}/5 (+${stadium.training_level * 20}% досвіду на тренуваннях)`,
      icon: "dumbbell"
    },
    {
      name: "Медичний Центр",
      key: "medical_level",
      description: "Кваліфіковані лікарі та відновлювальні процедури швидше відновлюють витривалість між матчами.",
      currentLevel: stadium.medical_level || 1,
      maxLevel: 5,
      upgradeCost: (stadium.medical_level + 1) * 50000,
      benefitText: `Рівень ${stadium.medical_level}/5 (+${stadium.medical_level * 25}% швидкість регенерації сил)`,
      icon: "heart-pulse"
    },
    {
      name: "Академія Молоді",
      key: "youth_academy_level",
      description: "Скаути та дитячі тренери приводять у клуб перспективних вихованців із вищим потенціалом.",
      currentLevel: stadium.youth_academy_level || 1,
      maxLevel: 5,
      upgradeCost: (stadium.youth_academy_level + 1) * 80000,
      benefitText: `Рівень ${stadium.youth_academy_level}/5 (Шанс знайти зірку з потенціалом 90+)`,
      icon: "graduation-cap"
    },
    {
      name: "Маркетинг & Фан-Шоп",
      key: "marketing_level",
      description: "Робота з вболівальниками та реклама збільшують армію фанатів та спонсорські виплати.",
      currentLevel: stadium.marketing_level || 1,
      maxLevel: 5,
      upgradeCost: (stadium.marketing_level + 1) * 55000,
      benefitText: `Рівень ${stadium.marketing_level}/5 (+${stadium.marketing_level * 500} нових фанатів щотижня)`,
      icon: "store"
    }
  ]
}
