import assert from "node:assert/strict"
import { buildCupFixtures, buildCupGroupTable, createCupConfig, distributeCupGroups, getCupSeeds } from "../lib/cup.ts"

const teams = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, name: `Club ${index + 1}`, championship_id: 1 }))
const base = { ...createCupConfig(teams), startDate: "2026-11-17" }
for (let count = 2; count <= 9; count++) {
  const config = { ...base, teamIds: teams.slice(0, count).map((team) => team.id) }
  const fixtures = buildCupFixtures(config, teams)
  const first = fixtures.filter((fixture) => fixture.stage === 1).flatMap((fixture) => [fixture.home_source, fixture.away_source]).filter((source) => source.kind === "team")
  assert.equal(first.length, count)
  assert.equal(new Set(first.map((source) => source.teamId)).size, count)
  assert.equal(fixtures.length, 2 ** Math.ceil(Math.log2(count)) - 1)
  for (const fixture of fixtures) for (const source of [fixture.home_source, fixture.away_source]) if (source.kind === "winner") assert.ok(fixtures.find((previous) => previous.id === source.fixtureId && previous.stage < fixture.stage))
}
for (const count of [3, 4, 5, 6]) for (const legs of [1, 2]) {
  const ids = teams.slice(0, count).map((team) => team.id)
  const config = { ...base, teamIds: ids, mode: "groups", groups: distributeCupGroups(ids, 1), groupLegs: legs }
  const fixtures = buildCupFixtures(config, teams)
  assert.equal(fixtures.length, count * (count - 1) / 2 * legs)
  const pairs = fixtures.map((fixture) => [fixture.home_source.teamId, fixture.away_source.teamId].sort((a, b) => a - b).join("-"))
  for (const pair of new Set(pairs)) assert.equal(pairs.filter((item) => item === pair).length, legs)
  for (const round of new Set(fixtures.map((fixture) => fixture.round))) {
    const playing = fixtures.filter((fixture) => fixture.round === round).flatMap((fixture) => [fixture.home_source.teamId, fixture.away_source.teamId])
    assert.equal(new Set(playing).size, playing.length, "A team plays once per group round, including odd groups")
  }
}
const grouped = { ...base, teamIds: [1, 2, 3, 4], mode: "groups_knockout", groups: distributeCupGroups([1, 2, 3, 4], 2), qualifiers: 2, thirdPlace: true }
const fixtures = buildCupFixtures(grouped, teams)
assert.equal(getCupSeeds(grouped).length, 4)
assert.equal(fixtures.filter((fixture) => fixture.id === "third-place").length, 1)
assert.deepEqual(fixtures.find((fixture) => fixture.id === "ko-1-1").away_source, { kind: "group", groupId: "g2", rank: 2 })
const first = fixtures.find((fixture) => fixture.group_id === "g1")
const rows = buildCupGroupTable(grouped, grouped.groups[0], fixtures, [{ cup_fixture_id: first.id, is_finished: true, home_team: "Club 1", away_team: "Club 3", is_technical_defeat: true, technical_winner: "Club 3" }], teams)
assert.equal(rows[0].teamId, 3)
assert.equal(rows[0].pts, 3)
assert.equal(rows[0].gf, 3)
assert.throws(() => buildCupFixtures({ ...base, teamIds: [1, 1] }, teams), /різних/)
assert.throws(() => buildCupFixtures({ ...grouped, groups: [{ ...grouped.groups[0], teamIds: [1, 2] }, { ...grouped.groups[1], teamIds: [2, 3] }] }, teams), /рівно/)
assert.throws(() => buildCupFixtures({ ...base, seeds: [{ kind: "team", teamId: 1 }, { kind: "team", teamId: 1 }] }, teams), /повторюватись/)
console.log("Cup seeding, byes, round robin, custom groups and standings checks passed")
