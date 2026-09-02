import assert from "node:assert/strict"

import {
  formatDateTimeForTimeZoneInput,
  formatDateTimeForViewer,
  getMatchBroadcastState,
  getMatchDateTime,
  getNextMatchGroup,
  normalizeYouTubeUrl,
  parseDateTimeInTimeZone,
  parseStoredUtcDateTime,
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
  getMatchBroadcastState(match(1, "2026-09-04", "18:00"), new Date("2026-09-04T14:59:00Z")),
  "scheduled",
)
assert.equal(
  getMatchBroadcastState(match(1, "2026-09-04", "18:00"), new Date("2026-09-04T15:01:00Z")),
  "broadcast",
)
assert.equal(
  getMatchBroadcastState(match(1, "2026-09-04", "18:00", true), new Date("2026-09-04T15:01:00Z")),
  "recording",
)

const winterKyivTime = parseDateTimeInTimeZone("2026-01-15T18:30")
assert.equal(winterKyivTime, "2026-01-15T16:30:00.000Z")
assert.equal(formatDateTimeForTimeZoneInput(winterKyivTime), "2026-01-15T18:30")

const summerKyivTime = parseDateTimeInTimeZone("2026-07-15T18:30")
assert.equal(summerKyivTime, "2026-07-15T15:30:00.000Z")
assert.equal(formatDateTimeForTimeZoneInput(summerKyivTime), "2026-07-15T18:30")
assert.equal(getMatchDateTime(match(1, "2026-07-15", "18:30")).toISOString(), summerKyivTime)
assert.equal(parseStoredUtcDateTime("2026-07-15T15:30:00")?.toISOString(), summerKyivTime)
assert.match(formatDateTimeForViewer(summerKyivTime, "en-GB", "America/New_York"), /11:30/)

console.log("Match utility tests passed")
