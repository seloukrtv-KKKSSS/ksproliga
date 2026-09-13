import assert from "node:assert/strict"
import {
  createRunner,
  createSnake,
  act,
  advance,
  seededRandom,
  dailySeed,
  freeCell,
  GRID,
  GATE_ROW,
  STEP,
} from "../lib/games/arcade-engine.ts"

let passed = 0
function test(name, run) {
  run()
  passed++
  console.log(`PASS ${name}`)
}
function tick(state, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) advance(state)
}

test("daily scenarios reproduce for the same date and differ across days and games", () => {
  const a = seededRandom(dailySeed("2026-09-13", "dino"))
  const b = seededRandom(dailySeed("2026-09-13", "dino"))
  assert.deepEqual(Array.from({ length: 30 }, a), Array.from({ length: 30 }, b))
  assert.notEqual(
    dailySeed("2026-09-13", "dino"),
    dailySeed("2026-09-14", "dino"),
  )
  assert.notEqual(
    dailySeed("2026-09-13", "dino"),
    dailySeed("2026-09-13", "snake"),
  )
})
test("runner supports two airborne jumps, rejects a third, and resets on landing", () => {
  const s = createRunner(1)
  act(s, "jump")
  tick(s, 0.15)
  act(s, "jump")
  const velocity = s.vy
  act(s, "jump")
  assert.equal(s.vy, velocity)
  assert.equal(s.jumps, 2)
  tick(s, 1.4)
  assert.equal(s.y, 0)
  assert.equal(s.jumps, 0)
})
test("ground barrier causes a collision, sliding clears an airborne drone", () => {
  const ground = createRunner(1)
  ground.hurdles = [{ x: 108, air: false, passed: false }]
  advance(ground)
  assert.equal(ground.over, true)
  const air = createRunner(1)
  air.hurdles = [{ x: 108, air: true, passed: false }]
  act(air, "slide")
  tick(air, 0.2)
  assert.equal(air.over, false)
  const standing = createRunner(1)
  standing.hurdles = [{ x: 108, air: true, passed: false }]
  advance(standing)
  assert.equal(standing.over, true)
})
test("six pickups unlock timed Turbo; protection expires", () => {
  const s = createRunner(1)
  for (let i = 0; i < 6; i++) {
    s.coins = [{ x: 105, y: 266, taken: false }]
    advance(s)
  }
  assert.equal(s.collected, 6)
  assert.equal(s.charge, 0)
  assert.equal(s.rush, 6)
  s.hurdles = [{ x: 108, air: false, passed: false }]
  advance(s)
  assert.equal(s.over, false)
  s.hurdles = []
  s.nextSpawn = 100000
  tick(s, 6.1)
  assert.equal(s.rush, 0)
  s.hurdles = [{ x: 108, air: false, passed: false }]
  advance(s)
  assert.equal(s.over, true)
})
test("runner simulation yields matching outcomes for 30/60/120/144 Hz render schedules", () => {
  function run(fps) {
    const s = createRunner(7)
    s.nextSpawn = 100000
    let accumulator = 0
    for (let frame = 0; frame < fps * 3; frame++) {
      accumulator += 1 / fps
      while (accumulator + 1e-10 >= STEP) {
        advance(s)
        accumulator -= STEP
      }
    }
    return [s.score, s.distance, s.elapsed]
  }
  for (const fps of [30, 120, 144]) assert.deepEqual(run(fps), run(60))
})
test("snake queues two safe turns and rejects reversals and excess input", () => {
  const s = createSnake(1)
  act(s, "left")
  assert.deepEqual(s.queue, [])
  act(s, "up")
  act(s, "left")
  act(s, "down")
  assert.deepEqual(s.queue, ["up", "left"])
  tick(s, 0.2)
  assert.equal(s.direction, "up")
  assert.equal(s.over, false)
  tick(s, 0.2)
  assert.equal(s.direction, "left")
  assert.equal(s.over, false)
})
test("snake portals connect only the designated gate row", () => {
  const s = createSnake(1)
  s.body = [
    { x: 17, y: GATE_ROW },
    { x: 16, y: GATE_ROW },
  ]
  tick(s, 0.2)
  assert.deepEqual(s.body[0], { x: 0, y: GATE_ROW })
  assert.equal(s.portals, 1)
  const wall = createSnake(1)
  wall.body = [
    { x: 17, y: 8 },
    { x: 16, y: 8 },
  ]
  tick(wall, 0.2)
  assert.equal(wall.over, true)
})
test("snake can enter a vacating tail but cannot pass through its body or occupied portal exit", () => {
  const tail = createSnake(1)
  tail.body = [
    { x: 4, y: 4 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 5, y: 4 },
  ]
  tick(tail, 0.2)
  assert.equal(tail.over, false)
  const blocked = createSnake(1)
  blocked.body = [
    { x: 17, y: 9 },
    { x: 0, y: 9 },
    { x: 1, y: 9 },
  ]
  tick(blocked, 0.2)
  assert.equal(blocked.over, true)
})
test("snake food grows the body, every fourth pickup spawns a timed golden ball", () => {
  const s = createSnake(1)
  s.collected = 3
  s.food = { x: 6, y: 9 }
  tick(s, 0.2)
  assert.equal(s.body.length, 4)
  assert.equal(s.collected, 4)
  assert.ok(s.golden)
  assert.ok(!s.body.some((p) => p.x === s.golden.x && p.y === s.golden.y))
  s.goldenTime = 0.01
  advance(s)
  assert.equal(s.golden, null)
})
test("golden ball scores 50 and grows the snake without moving regular food", () => {
  const s = createSnake(1)
  s.golden = { x: 6, y: 9 }
  s.goldenTime = 8
  tick(s, 0.2)
  assert.equal(s.score, 50)
  assert.equal(s.body.length, 4)
  assert.equal(s.golden, null)
  assert.deepEqual(s.food, { x: 9, y: 9 })
})
test("full-board spawn search terminates and final pickup wins", () => {
  const cells = Array.from({ length: GRID * GRID }, (_, i) => ({
    x: i % GRID,
    y: Math.floor(i / GRID),
  }))
  assert.equal(freeCell(cells, seededRandom(1)), null)
  const s = createSnake(1)
  const head = { x: 0, y: 0 },
    last = { x: 1, y: 0 }
  s.body = [
    head,
    ...cells.filter(
      (p) => !(p.x === 0 && p.y === 0) && !(p.x === 1 && p.y === 0),
    ),
  ]
  s.food = last
  tick(s, 0.2)
  assert.equal(s.over, true)
  assert.equal(s.won, true)
  assert.equal(s.body.length, GRID * GRID)
})
test("combo expires and finished simulations ignore further input", () => {
  const s = createRunner(1)
  s.coins = [{ x: 105, y: 266, taken: false }]
  advance(s)
  s.nextSpawn = 100000
  tick(s, 6.1)
  assert.equal(s.combo, 0)
  s.over = true
  const before = s.elapsed
  act(s, "jump")
  advance(s)
  assert.equal(s.elapsed, before)
  assert.equal(s.jumps, 0)
})
console.log(`${passed} arcade engine checks passed`)
