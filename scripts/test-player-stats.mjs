import assert from "node:assert/strict"
import { registerHooks } from "node:module"

const libRoot = new URL("../lib/", import.meta.url).href
globalThis.playerStatsTransport = { from() { throw new Error("Unexpected production query") } }
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(libRoot) && specifier === "./supabase") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export let isSupabaseConfigured = false; globalThis.configurePlayerStatsTest = value => { isSupabaseConfigured = value }; export const supabase = { from(...args) { return globalThis.playerStatsTransport.from(...args) } };",
      }
    }
    if (context.parentURL?.startsWith(libRoot) && specifier.startsWith("./") && !specifier.endsWith(".ts")) return next(`${specifier}.ts`, context)
    return next(specifier, context)
  },
})

try {
  const db = await import("../lib/database.ts")
  const { normalizeRoster, playerNameKey } = await import("../lib/player-stats.ts")
  assert.deepEqual(normalizeRoster(["  Іван   Петренко ", "іван петренко", "", "  Андрій\u00a0Коваль  "]), ["Іван Петренко", "Андрій Коваль"])
  assert.equal(playerNameKey("Іван\tПетренко"), playerNameKey(" іван Петренко "))

  const team = await db.addTeam({ name: "Test Club", championship_id: 101, roster: ["Іван Петренко", "іван  петренко", "Марко Коваль"] })
  let players = await db.getPlayers(101)
  assert.equal(players.length, 2, "import creates one canonical record per normalized name")
  const player = players.find((item) => item.name === "Іван Петренко")
  await assert.rejects(db.deletePlayer(player.id), /Спочатку приберіть/, "roster-linked players cannot be deleted")
  await db.updatePlayer(player.id, { goals: 4, yellow_cards: 2, red_cards: 1 })
  await db.updateTeam(team.id, { roster: ["ІВАН Петренко", "Марко Коваль", "Новий Гравець"] })
  players = await db.getPlayers(101)
  assert.equal(players.length, 3)
  assert.deepEqual(players.find((item) => item.id === player.id), { ...player, goals: 4, yellow_cards: 2, red_cards: 1 }, "reimport preserves ID and all totals")
  await db.updateTeam(team.id, { roster: ["Новий Гравець"] })
  assert.equal((await db.getPlayers(101)).length, 3, "removing from roster preserves historical statistics")
  await assert.rejects(db.addPlayer({ name: " ІВАН  петренко ", team: team.name, championship_id: 101, goals: 0 }), /уже є/)
  await assert.rejects(db.updatePlayer(player.id, { goals: -1 }), /невід’ємними/)
  await assert.rejects(db.updatePlayer(player.id, { yellow_cards: 1.5 }), /невід’ємними/)
  await assert.rejects(db.updatePlayer(player.id, { red_cards: Number.NaN }), /невід’ємними/)
  await assert.rejects(db.updatePlayer(player.id, { team: "Other Club" }), /можна змінювати статистику/)

  const sameNameElsewhere = await db.addPlayer({ name: player.name, team: team.name, championship_id: 102, goals: 0 })
  assert.notEqual(sameNameElsewhere.id, player.id, "identical names in other tournaments remain separate")
  const match = await db.addMatch({ round: 1, date: "2026-11-10", home_team: team.name, away_team: "Opponent", home_score: null, away_score: null, is_finished: false, championship_id: 101 })
  const goal = await db.addMatchGoal({ match_id: match.id, player_name: "іван  Петренко", team_name: team.name, goal_type: "regular" })
  const ownGoal = await db.addMatchGoal({ match_id: match.id, player_name: player.name, team_name: team.name, goal_type: "own_goal" })
  const card = await db.addMatchCard({ match_id: match.id, player_name: player.name, team_name: team.name, card_type: "yellow_red" })
  await assert.rejects(db.deletePlayer(player.id), /Спочатку приберіть/, "event-linked players remain protected after roster removal")
  let current = await db.getPlayerById(player.id)
  assert.deepEqual([current.goals, current.yellow_cards, current.red_cards], [4, 2, 1], "unfinished events do not affect totals")
  await db.updateMatch(match.id, { is_finished: true, home_score: 1, away_score: 0 })
  current = await db.getPlayerById(player.id)
  assert.deepEqual([current.goals, current.yellow_cards, current.red_cards], [5, 3, 2], "own goals excluded; yellow-red contributes to both card totals")
  assert.equal((await db.getPlayerById(sameNameElsewhere.id)).goals, 0)
  assert.equal((await db.getPlayerGoals(player.name, team.name, 101)).length, 2)
  assert.equal((await db.getPlayerGoals(" ІВАН  Петренко ", " test   CLUB ", 101)).length, 2, "history matches legacy team casing and whitespace by canonical identity")
  assert.equal((await db.getPlayerCards(player.name, " TEST club ", 101)).length, 1)
  assert.equal((await db.getPlayerGoals(player.name, team.name, 102)).length, 0)
  await db.updateMatch(match.id, { is_technical_defeat: true })
  current = await db.getPlayerById(player.id)
  assert.deepEqual([current.goals, current.yellow_cards, current.red_cards], [4, 2, 1])
  await db.updateMatch(match.id, { is_technical_defeat: false })
  await db.deleteMatchGoal(goal.id)
  await db.deleteMatchGoal(ownGoal.id)
  await db.deleteMatchCard(card.id)
  current = await db.getPlayerById(player.id)
  assert.deepEqual([current.goals, current.yellow_cards, current.red_cards], [4, 2, 1], "event deletion reverses only event contribution")
  await db.addMatchCard({ match_id: match.id, player_name: "Лише Картка", team_name: team.name, card_type: "yellow" })
  const cardOnly = (await db.getPlayers(101)).find((item) => item.name === "Лише Картка")
  assert.deepEqual([cardOnly.goals, cardOnly.yellow_cards, cardOnly.red_cards], [0, 1, 0])
  await db.deleteMatch(match.id)
  assert.equal((await db.getPlayerById(cardOnly.id)).yellow_cards, 0, "match deletion removes its event contributions")
  await db.deletePlayer(cardOnly.id)
  assert.equal(await db.getPlayerById(cardOnly.id), null, "standalone event-free players may be deleted")

  // Simulate a REST row cap below the requested page size, to prove the list
  const editMatch = await db.addMatch({ round: 2, date: "2026-11-12", home_team: team.name, away_team: "Opponent", home_score: 1, away_score: 0, is_finished: true, championship_id: 101 })
  const editableGoal = await db.addMatchGoal({ match_id: editMatch.id, player_name: player.name, team_name: team.name, goal_type: "regular", minute: 10 })
  await db.updateMatchGoal(editableGoal.id, editMatch.id, { player_name: player.name, team_name: team.name, goal_type: "penalty", minute: null })
  assert.equal((await db.getMatchGoals(editMatch.id)).length, 1, "editing must not insert another goal")
  assert.equal((await db.getMatchGoals(editMatch.id))[0].minute, undefined, "minute can be cleared")
  const goalBeforeTransfer = (await db.getPlayerById(player.id)).goals
  await db.updateMatchGoal(editableGoal.id, editMatch.id, { player_name: "Марко Коваль", team_name: team.name, goal_type: "regular", minute: 42 })
  assert.equal((await db.getPlayerById(player.id)).goals, goalBeforeTransfer - 1)
  const marko = (await db.getPlayers(101)).find(p => p.name === "Марко Коваль")
  assert.equal(marko.goals, 1)
  await db.updateMatchGoal(editableGoal.id, editMatch.id, { player_name: marko.name, team_name: team.name, goal_type: "own_goal", minute: 42 })
  assert.equal((await db.getPlayerById(marko.id)).goals, 0)
  await assert.rejects(db.updateMatchGoal(editableGoal.id, editMatch.id + 999, { player_name: marko.name, team_name: team.name, goal_type: "regular", minute: 1 }), /іншому матчу/)
  const editableCard = await db.addMatchCard({ match_id: editMatch.id, player_name: marko.name, team_name: team.name, card_type: "yellow" })
  await db.updateMatchCard(editableCard.id, editMatch.id, { player_name: marko.name, team_name: team.name, card_type: "red", minute: 88 })
  let edited = await db.getPlayerById(marko.id)
  assert.deepEqual([edited.yellow_cards, edited.red_cards], [0, 1])
  await db.updateMatchCard(editableCard.id, editMatch.id, { player_name: marko.name, team_name: team.name, card_type: "yellow_red", minute: 89 })
  await db.updatePlayer(marko.id, { yellow_cards: 0, red_cards: 0 })
  await db.updateMatchCard(editableCard.id, editMatch.id, { player_name: marko.name, team_name: team.name, card_type: "yellow", minute: null })
  edited = await db.getPlayerById(marko.id)
  assert.deepEqual([edited.yellow_cards, edited.red_cards], [0, 0], "net edits preserve manually corrected zero totals")
  assert.equal((await db.getMatchCards(editMatch.id)).length, 1)
  await assert.rejects(db.updateMatchCard(editableCard.id, editMatch.id, { player_name: marko.name, team_name: team.name, card_type: "red", minute: 1.5 }), /Хвилина/)
  await db.deleteMatch(editMatch.id)

  // Simulate a REST row cap below the requested page size, to prove the list
  // continues until an empty page rather than losing players after the cap.
  const transportPlayers = Array.from({ length: 1003 }, (_, index) => ({ id: index + 100, name: `Player ${index}`, team: "Club", goals: 1, championship_id: 104, created_at: "2026-11-10" }))
  let calls = 0
  let failure = null
  globalThis.playerStatsTransport = {
    from(table) {
      assert.equal(table, "players")
      const query = {
        select() { return query }, order() { return query }, eq() { return query },
        async range(start) { calls++; return { data: transportPlayers.slice(start, start + 97), error: failure } },
      }
      return query
    },
  }
  globalThis.configurePlayerStatsTest(true)
  const allPlayers = await db.getPlayers(104)
  assert.equal(allPlayers.length, 1003)
  assert.equal(allPlayers.at(-1).id, 1102)
  assert.equal(allPlayers[0].yellow_cards, 0)
  assert.ok(calls > 10)
  failure = { message: "Not authorized", code: "42501" }
  await assert.rejects(db.getPlayers(104), (error) => error === failure, "configured query failures must not display demo records")
  const eventFilters = []
  globalThis.playerStatsTransport = {
    from(table) {
      assert.equal(table, "match_goals")
      const query = {
        select() { return query }, order() { return query },
        eq(column, value) { eventFilters.push([column, value]); return query },
        async range(start) {
          return { data: start ? [] : [
            { id: 1, match_id: 1, player_name: " ІВАН  Петренко ", team_name: " TEST   club ", goal_type: "regular" },
            { id: 2, match_id: 1, player_name: "Іван Петренко", team_name: "Other Club", goal_type: "regular" },
          ], error: null }
        },
      }
      return query
    },
  }
  const normalizedHistory = await db.getPlayerGoals("Іван Петренко", "Test Club", 101)
  assert.equal(normalizedHistory.length, 1)
  assert.equal(normalizedHistory[0].id, 1)
  assert.ok(eventFilters.some(([column, value]) => column === "matches.championship_id" && value === 101))
  assert.ok(eventFilters.every(([column]) => column !== "team_name"), "database exact-name filters must not drop canonical team aliases")
  console.log("Player statistics tests passed (roster import, event totals, corrections, tournament isolation and paginated reads)")
} finally {
  hooks.deregister()
  delete globalThis.playerStatsTransport
  delete globalThis.configurePlayerStatsTest
}
