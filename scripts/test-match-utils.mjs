import assert from "node:assert/strict"

import {
  formatDateTimeForTimeZoneInput,
  formatDateTimeForViewer,
  formatInstantForViewer,
  formatMatchDateTimeForViewer,
  getMatchBroadcastState,
  getMatchDateTime,
  getMatchDateRangeForViewer,
  getMatchStartIso,
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

// Match inputs always describe Kyiv clock time, including database TIME values with seconds.
assert.equal(getMatchStartIso(match(1, "2026-07-15", "18:30:59")), summerKyivTime)
assert.equal(getMatchStartIso(match(1, "2026-01-15", "18:30:00")), winterKyivTime)
const localKickoffs = [
  ["2026-07-15", "Europe/Kyiv", "18:30"],
  ["2026-07-15", "Europe/Rome", "17:30"],
  ["2026-07-15", "America/New_York", "11:30"],
  ["2026-07-15", "Asia/Kolkata", "21:00"],
  ["2026-07-15", "Asia/Kathmandu", "21:15"],
  ["2026-01-15", "Europe/Kyiv", "18:30"],
  ["2026-01-15", "Europe/Rome", "17:30"],
  ["2026-01-15", "America/New_York", "11:30"],
  ["2026-01-15", "Asia/Kolkata", "22:00"],
  ["2026-01-15", "Asia/Kathmandu", "22:15"],
  // The US changes clocks on different dates from Europe.
  ["2026-03-15", "America/New_York", "12:30"],
  ["2026-10-28", "America/New_York", "12:30"],
]
for (const [date, timeZone, expectedTime] of localKickoffs) {
  const fixture = match(1, date, "18:30:59")
  assert.equal(formatMatchDateTimeForViewer(fixture, timeZone, "time"), expectedTime, `${date} in ${timeZone}`)
  assert.doesNotMatch(formatMatchDateTimeForViewer(fixture, timeZone), /\d{2}:\d{2}:\d{2}/)
}

// The displayed date must move with the kickoff, including across New Year.
assert.equal(
  formatMatchDateTimeForViewer(match(1, "2026-01-01", "00:15"), "America/New_York"),
  "31.12.2025, 17:15",
)
assert.equal(
  formatMatchDateTimeForViewer(match(1, "2026-12-31", "23:45"), "Asia/Kolkata"),
  "01.01.2027, 03:15",
)
assert.equal(
  formatMatchDateTimeForViewer(match(1, "2026-07-15", "00:30"), "Europe/Rome", "date"),
  "14.07.2026",
)
assert.equal(
  formatMatchDateTimeForViewer(match(1, "2026-07-15", "23:30"), "Asia/Kathmandu", "date"),
  "16.07.2026",
)

// A missing kickoff is a date-only schedule; never invent noon or shift that date.
for (const missingTime of [null, undefined, "", "   "]) {
  const fixture = match(1, "2026-01-01", missingTime)
  assert.equal(getMatchStartIso(fixture), null)
  for (const timeZone of ["Europe/Kyiv", "America/Los_Angeles", "Pacific/Kiritimati"]) {
    assert.equal(formatMatchDateTimeForViewer(fixture, timeZone, "date"), "01.01.2026")
    assert.equal(formatMatchDateTimeForViewer(fixture, timeZone, "time"), "Час уточнюється")
    assert.equal(formatMatchDateTimeForViewer(fixture, timeZone), "01.01.2026 · Час уточнюється")
  }
}

// A range mixing known and unknown kickoffs must follow displayed calendar dates.
const mixedRange = [match(1, "2026-09-06", null), match(2, "2026-09-06", "12:30")]
assert.deepEqual(getMatchDateRangeForViewer(mixedRange, "Pacific/Honolulu").map(({id}) => id), [2, 1])
assert.deepEqual(
  getMatchDateRangeForViewer(mixedRange, "Pacific/Honolulu").map((entry) => formatMatchDateTimeForViewer(entry, "Pacific/Honolulu", "date")),
  ["05.09.2026", "06.09.2026"],
)
assert.deepEqual(getMatchDateRangeForViewer([], "Europe/Kyiv"), [])

// Midnight stays 00:00 in a 24-hour format, even for a locale that normally uses AM/PM.
assert.equal(formatInstantForViewer("2026-07-14T21:00:59Z", "Europe/Kyiv", "time"), "00:00")
const midnightForUsLocale = formatDateTimeForViewer("2026-07-14T21:00:59Z", "en-US", "Europe/Kyiv")
assert.match(midnightForUsLocale, /00:00/)
assert.doesNotMatch(midnightForUsLocale, /24:00|AM|PM|\d{2}:\d{2}:\d{2}/)

// Stored UTC timestamps accept explicit offsets and legacy values without an offset.
for (const storedTimestamp of [
  "2026-07-15T15:30:45Z",
  "2026-07-15T15:30:45",
  "2026-07-15T18:30:45+03:00",
  "2026-07-15T18:30:45+0300",
  "2026-07-15T11:30:45-04:00",
]) {
  assert.equal(parseStoredUtcDateTime(storedTimestamp)?.toISOString(), "2026-07-15T15:30:45.000Z")
  assert.equal(formatInstantForViewer(storedTimestamp, "Europe/Rome"), "15.07.2026, 17:30")
  assert.equal(formatDateTimeForTimeZoneInput(storedTimestamp), "2026-07-15T18:30")
}
for (const invalidTimestamp of [null, undefined, "", "not a date"]) {
  assert.equal(formatInstantForViewer(invalidTimestamp, "Europe/Kyiv"), "")
}

// Reject nonexistent local times at the spring transition; valid neighbors remain exact.
assert.equal(parseDateTimeInTimeZone("2026-03-29T02:59", "Europe/Kyiv"), "2026-03-29T00:59:00.000Z")
assert.equal(parseDateTimeInTimeZone("2026-03-29T03:30", "Europe/Kyiv"), null)
assert.equal(parseDateTimeInTimeZone("2026-03-29T04:00", "Europe/Kyiv"), "2026-03-29T01:00:00.000Z")
assert.equal(parseDateTimeInTimeZone("2026-03-29T02:30", "Europe/Rome"), null)
assert.equal(parseDateTimeInTimeZone("2026-03-08T02:30", "America/New_York"), null)
assert.equal(parseDateTimeInTimeZone("2026-03-08T03:00", "America/New_York"), "2026-03-08T07:00:00.000Z")

// An autumn repeated hour must resolve to a real instant with the entered Kyiv clock time.
const repeatedKyivHour = parseDateTimeInTimeZone("2026-10-25T03:30", "Europe/Kyiv")
assert.ok(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"].includes(repeatedKyivHour))
assert.equal(formatDateTimeForTimeZoneInput(repeatedKyivHour), "2026-10-25T03:30")
assert.equal(parseDateTimeInTimeZone("2026-10-25T04:00", "Europe/Kyiv"), "2026-10-25T02:00:00.000Z")

console.log("Match utility tests passed")
