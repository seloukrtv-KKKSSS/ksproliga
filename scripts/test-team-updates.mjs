import assert from "node:assert/strict"
import { registerHooks } from "node:module"

// Exercise the real persistence function against an in-memory transport. No
// credentials or production writes are needed to check tournament isolation.
const rows = {
  teams: [{ id: 1, name: "Club", championship_id: 1 }, { id: 2, name: "Club", championship_id: 2 }],
  matches: Array.from({ length: 503 }, (_, id) => ({
    id, championship_id: id === 0 ? 1 : 2,
    home_team: "Club", away_team: "Opponent", technical_winner: "Club", penalty_winner: "Club",
  })),
  players: [{ id: 1, team: "Club", championship_id: 1 }, { id: 2, team: "Club", championship_id: 2 }],
}
for (const table of ["match_goals", "match_cards", "voting_candidates"]) {
  rows[table] = rows.matches.flatMap((match) => [
    { match_id: match.id, team_name: "Club" },
    { match_id: match.id, team_name: "Opponent" },
  ])
}

globalThis.teamTestClient = {
  from(table) {
    const filters = []
    let updates
    let bounds
    const query = {
      select() { return query },
      update(value) { updates = value; return query },
      eq(column, value) { filters.push((row) => row[column] === value); return query },
      in(column, values) { filters.push((row) => values.includes(row[column])); return query },
      order() { return query },
      range(start, end) { bounds = [start, end + 1]; return query },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          let data = rows[table].filter((row) => filters.every((filter) => filter(row)))
          if (bounds) data = data.slice(...bounds)
          if (updates) data.forEach((row) => Object.assign(row, updates))
          return { data: structuredClone(data), error: null }
        }).then(resolve, reject)
      },
      async single() {
        const result = await query
        assert.equal(result.data.length, 1)
        return { data: result.data[0], error: null }
      },
      maybeSingle() { return query.single() },
    }
    return query
  },
}

const libRoot = new URL("../lib/", import.meta.url).href
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(libRoot) && specifier === "./supabase") {
      return { shortCircuit: true, url: "data:text/javascript,export const isSupabaseConfigured = true; export const supabase = globalThis.teamTestClient;" }
    }
    if (context.parentURL?.startsWith(libRoot) && specifier.startsWith("./") && !specifier.endsWith(".ts")) {
      return next(`${specifier}.ts`, context)
    }
    return next(specifier, context)
  },
})

try {
  const { updateTeam } = await import("../lib/database.ts")
  // No championship_id in the patch: scope must come from the stored team.
  await updateTeam(2, { name: "Renamed Club" }, "Club")
  assert.equal(rows.teams[0].name, "Club")
  assert.equal(rows.teams[1].name, "Renamed Club")
  assert.deepEqual(rows.players.map((row) => row.team), ["Club", "Renamed Club"])
  for (const match of rows.matches) {
    const expected = match.championship_id === 1 ? "Club" : "Renamed Club"
    for (const column of ["home_team", "technical_winner", "penalty_winner"]) {
      assert.equal(match[column], expected)
    }
    assert.equal(match.away_team, "Opponent")
  }
  for (const table of ["match_goals", "match_cards", "voting_candidates"]) {
    for (let i = 0; i < rows[table].length; i += 2) {
      assert.equal(rows[table][i].team_name, rows[table][i].match_id === 0 ? "Club" : "Renamed Club")
      assert.equal(rows[table][i + 1].team_name, "Opponent")
    }
  }
  console.log("Team update isolation tests passed (including paginated matches and all event tables)")
} finally {
  hooks.deregister()
  delete globalThis.teamTestClient
}
