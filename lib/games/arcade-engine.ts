// Pure simulation: a fixed 60 Hz clock keeps the same rules on 60/120/144 Hz screens.
export type GameKind = "dino" | "snake"
export type GameMode = "arena" | "daily"
export type Direction = "up" | "right" | "down" | "left"
export type GameAction = Direction | "jump" | "slide" | "release"
export type Point = { x: number; y: number }
export type GameEvent = Point & {
  type: "jump" | "pickup" | "bonus" | "portal" | "crash"
  text?: string
}
export const RUN_WIDTH = 640
export const RUN_HEIGHT = 360
export const GROUND = 286
export const GRID = 18
export const GATE_ROW = 9
export const STEP = 1 / 60

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dailySeed(date: string, kind: GameKind) {
  let hash = 2166136261
  for (const char of `${date}:${kind}:arena-v2`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

type Base = {
  score: number
  elapsed: number
  collected: number
  combo: number
  comboTime: number
  over: boolean
  won: boolean
  events: GameEvent[]
  random: () => number
}
export type Hurdle = { x: number; air: boolean; passed: boolean }
export type RunCoin = Point & { taken: boolean }
export type RunnerState = Base & {
  kind: "dino"
  y: number
  vy: number
  jumps: number
  slide: boolean
  slideTime: number
  distance: number
  speed: number
  nextSpawn: number
  hurdles: Hurdle[]
  coins: RunCoin[]
  charge: number
  rush: number
  dodged: number
}
export type SnakeState = Base & {
  kind: "snake"
  body: Point[]
  previous: Point[]
  direction: Direction
  queue: Direction[]
  food: Point | null
  golden: Point | null
  goldenTime: number
  accumulator: number
  interval: number
  portals: number
  teleported: boolean
}
export type ArcadeState = RunnerState | SnakeState

function base(seed: number): Base {
  return {
    score: 0,
    elapsed: 0,
    collected: 0,
    combo: 0,
    comboTime: 0,
    over: false,
    won: false,
    events: [],
    random: seededRandom(seed),
  }
}

export function createRunner(seed: number): RunnerState {
  return {
    ...base(seed),
    kind: "dino",
    y: 0,
    vy: 0,
    jumps: 0,
    slide: false,
    slideTime: 0,
    distance: 0,
    speed: 245,
    nextSpawn: 450,
    hurdles: [],
    coins: [],
    charge: 0,
    rush: 0,
    dodged: 0,
  }
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y
export function freeCell(
  body: Point[],
  random: () => number,
  reserved: Point[] = [],
): Point | null {
  const occupied = new Set([...body, ...reserved].map((p) => p.y * GRID + p.x))
  const free: Point[] = []
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(y * GRID + x)) free.push({ x, y })
    }
  return free.length ? free[Math.floor(random() * free.length)] : null
}

export function createSnake(seed: number): SnakeState {
  const state: SnakeState = {
    ...base(seed),
    kind: "snake",
    body: [
      { x: 5, y: 9 },
      { x: 4, y: 9 },
      { x: 3, y: 9 },
    ],
    previous: [],
    direction: "right",
    queue: [],
    food: null,
    golden: null,
    goldenTime: 0,
    accumulator: 0,
    interval: 0.185,
    portals: 0,
    teleported: false,
  }
  // An approachable first pickup; subsequent cells use the session seed.
  state.food = { x: 9, y: 9 }
  state.previous = state.body.map((p) => ({ ...p }))
  return state
}

const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
}
const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function act(state: ArcadeState, action: GameAction) {
  if (state.over) return
  if (state.kind === "snake") {
    if (!(action in opposite) || state.queue.length >= 2) return
    const direction = action as Direction
    const last = state.queue.at(-1) ?? state.direction
    if (direction !== last && direction !== opposite[last])
      state.queue.push(direction)
    return
  }
  if ((action === "jump" || action === "up") && state.jumps < 2) {
    state.slide = false
    state.slideTime = 0
    state.vy = state.jumps === 0 ? 610 : 530
    state.jumps++
    state.events.push({
      type: "jump",
      x: 105,
      y: GROUND - state.y,
      text: state.jumps === 2 ? "AIR +" : undefined,
    })
  } else if (action === "slide" || action === "down") {
    state.slide = true
    state.slideTime = 0.65
    if (state.y > 0) state.vy = -650
  } else if (action === "release") {
    state.slide = false
    state.slideTime = 0
  }
}

function pickup(state: Base, x: number, y: number, golden = false) {
  state.combo = state.comboTime > 0 ? Math.min(3, state.combo + 1) : 1
  state.comboTime = 6
  const points = (golden ? 50 : 10) * state.combo
  state.score += points
  state.events.push({
    type: golden ? "bonus" : "pickup",
    x,
    y,
    text: `+${points}`,
  })
}

export function stepRunner(state: RunnerState, dt: number) {
  if (state.over) return
  state.elapsed += dt
  state.comboTime = Math.max(0, state.comboTime - dt)
  if (!state.comboTime) state.combo = 0
  state.rush = Math.max(0, state.rush - dt)
  state.slideTime = Math.max(0, state.slideTime - dt)
  if (!state.slideTime) state.slide = false
  state.speed = Math.min(435, 245 + state.elapsed * 1.2)
  const travel = state.speed * dt
  const oldDistance = state.distance
  state.distance += travel
  state.score +=
    (Math.floor(state.distance / 38) - Math.floor(oldDistance / 38)) *
    (state.rush > 0 ? 2 : 1)
  state.y = Math.max(0, state.y + state.vy * dt)
  state.vy -= 1750 * dt
  if (state.y === 0) {
    state.vy = 0
    state.jumps = 0
  }
  state.nextSpawn -= travel
  if (state.nextSpawn <= 0) {
    const air = state.elapsed > 8 && state.random() > 0.62
    state.hurdles.push({ x: RUN_WIDTH + 40, air, passed: false })
    const coinY = air ? GROUND - 16 : GROUND - 98
    state.coins.push(
      { x: RUN_WIDTH + 15, y: coinY, taken: false },
      { x: RUN_WIDTH + 63, y: coinY, taken: false },
    )
    // At least 1.35 seconds between hazards even at maximum speed.
    state.nextSpawn = state.speed * (1.35 + state.random() * 0.55)
  }
  const player = {
    x: 86,
    y: GROUND - state.y - (state.slide ? 22 : 44),
    w: state.slide ? 44 : 29,
    h: state.slide ? 20 : 42,
  }
  for (const hurdle of state.hurdles) {
    hurdle.x -= travel
    const top = hurdle.air ? GROUND - 76 : GROUND - 40
    const height = hurdle.air ? 43 : 40
    const hit =
      player.x + player.w - 4 > hurdle.x + 5 &&
      player.x + 4 < hurdle.x + 35 &&
      player.y + player.h - 3 > top + 3 &&
      player.y + 3 < top + height - 3
    if (hit && !hurdle.passed) {
      if (state.rush > 0) {
        hurdle.passed = true
        state.dodged++
        state.score += 20
        state.events.push({ type: "bonus", x: hurdle.x, y: top, text: "+20" })
      } else {
        state.over = true
        state.events.push({ type: "crash", x: 104, y: player.y + 20 })
        return
      }
    }
    if (hurdle.x + 40 < player.x && !hurdle.passed) {
      hurdle.passed = true
      state.dodged++
    }
  }
  for (const coin of state.coins) {
    coin.x -= travel
    if (
      !coin.taken &&
      coin.x > player.x - 13 &&
      coin.x < player.x + player.w + 13 &&
      coin.y > player.y - 13 &&
      coin.y < player.y + player.h + 13
    ) {
      coin.taken = true
      state.collected++
      pickup(state, coin.x, coin.y)
      state.charge++
      if (state.charge === 6) {
        state.charge = 0
        state.rush = 6
        state.events.push({
          type: "bonus",
          x: 110,
          y: player.y - 18,
          text: "TURBO!",
        })
      }
    }
  }
  state.hurdles = state.hurdles.filter((h) => h.x > -60)
  state.coins = state.coins.filter((c) => c.x > -30 && !c.taken)
}

export function stepSnake(state: SnakeState, dt: number) {
  if (state.over) return
  state.elapsed += dt
  state.comboTime = Math.max(0, state.comboTime - dt)
  if (!state.comboTime) state.combo = 0
  state.goldenTime = Math.max(0, state.goldenTime - dt)
  if (!state.goldenTime) state.golden = null
  state.interval = Math.max(0.095, 0.185 - state.collected * 0.003)
  state.accumulator += dt
  while (state.accumulator >= state.interval && !state.over) {
    state.accumulator -= state.interval
    state.previous = state.body.map((p) => ({ ...p }))
    state.direction = state.queue.shift() ?? state.direction
    const vector = vectors[state.direction]
    const head = {
      x: state.body[0].x + vector.x,
      y: state.body[0].y + vector.y,
    }
    state.teleported = false
    if ((head.x < 0 || head.x >= GRID) && head.y === GATE_ROW) {
      head.x = (head.x + GRID) % GRID
      state.teleported = true
      state.portals++
      state.events.push({
        type: "portal",
        x: head.x,
        y: head.y,
        text: "PORTAL",
      })
    }
    const eats = state.food !== null && same(head, state.food)
    const gold = state.golden !== null && same(head, state.golden)
    // The tail vacates its cell on a non-growing turn, so moving into it is legal.
    const occupied = eats || gold ? state.body : state.body.slice(0, -1)
    if (
      head.x < 0 ||
      head.x >= GRID ||
      head.y < 0 ||
      head.y >= GRID ||
      occupied.some((p) => same(p, head))
    ) {
      state.over = true
      state.events.push({ type: "crash", ...state.body[0] })
      return
    }
    state.body.unshift(head)
    if (!eats && !gold) state.body.pop()
    else {
      pickup(state, head.x, head.y, gold)
      if (gold) {
        state.golden = null
        state.goldenTime = 0
      }
      if (eats) {
        state.collected++
        state.food = freeCell(
          state.body,
          state.random,
          state.golden ? [state.golden] : [],
        )
        // If only the golden cell is free, make it normal food rather than ending early.
        if (!state.food && state.golden) {
          state.food = state.golden
          state.golden = null
          state.goldenTime = 0
        }
        if (state.collected % 4 === 0 && !state.golden && state.food) {
          state.golden = freeCell(state.body, state.random, [state.food])
          state.goldenTime = state.golden ? 8 : 0
        }
      }
      if (state.body.length === GRID * GRID) {
        state.over = true
        state.won = true
        state.score += 500
      }
    }
  }
}

export function advance(state: ArcadeState, dt = STEP) {
  if (state.kind === "dino") stepRunner(state, dt)
  else stepSnake(state, dt)
}
