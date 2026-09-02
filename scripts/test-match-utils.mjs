import assert from "node:assert/strict"

import {
  getMatchBroadcastState,
  getNextMatchGroup,
  normalizeYouTubeUrl,
} from "../lib/match-utils.ts"

const match = (id, date, matchTime, isFinished = false) => ({
  id,
  date,
  match_time: matchTime,
  is_finished: isFinished,
})

const nextMatches = getNextMatchGroup([
  match(8, "2026-09-05", "20:00"),
  match(3, "2026-09-04", "18:00"),
  match(1, "2026-09-04", "18:00"),
  match(5, "2026-09-04", "19:00"),
])
assert.deepEqual(nextMatches.map(({ id }) => id), [1, 3])

assert.equal(
  normalizeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?feature=shared"),
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
)
assert.equal(normalizeYouTubeUrl("https://example.com/video"), null)

assert.equal(
  getMatchBroadcastState(match(1, "2026-09-04", "18:00"), new Date("2026-09-04T17:59:00")),
  "scheduled",
)
assert.equal(
  getMatchBroadcastState(match(1, "2026-09-04", "18:00"), new Date("2026-09-04T18:01:00")),
  "broadcast",
)
assert.equal(
  getMatchBroadcastState(match(1, "2026-09-04", "18:00", true), new Date("2026-09-04T18:01:00")),
  "recording",
)

console.log("Match utility tests passed")
