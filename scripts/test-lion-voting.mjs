import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"

import { renderLionVotingDocument } from "../lib/obs/lion-voting-document.ts"
import {
  createLionVotingSnapshot,
  matchesLionVotingEtag,
  parseLionVotingMatchId,
} from "../lib/obs/lion-voting-model.ts"

const match = { home_team: "Леви", away_team: "Соколи" }
const candidate = (id, votes, extra = {}) => ({
  id, votes, player_name: `Гравець ${id}`, team_name: "Леви", ...extra,
})

assert.equal(parseLionVotingMatchId("42"), 42)
for (const invalid of [null, undefined, "", "0", "-1", "1.5", "1e2", "42oops", "Infinity", "9007199254740992"]) {
  assert.equal(parseLionVotingMatchId(invalid), null, `Reject invalid match ID: ${invalid}`)
}

const candidates = [
  candidate(4, 10), candidate(2, 30), candidate(1, 40), candidate(3, 20),
  candidate(5, 900, { is_hidden: true }),
]
const initialOrder = candidates.map(({ id }) => id)
const snapshot = createLionVotingSnapshot(match, candidates)
assert.deepEqual(snapshot, {
  homeTeam: "Леви", awayTeam: "Соколи", totalVotes: 100,
  leaders: [
    { id: 1, playerName: "Гравець 1", teamName: "Леви", votes: 40, percent: 40 },
    { id: 2, playerName: "Гравець 2", teamName: "Леви", votes: 30, percent: 30 },
    { id: 3, playerName: "Гравець 3", teamName: "Леви", votes: 20, percent: 20 },
  ],
}, "Hidden candidates are excluded; percentages include visible candidates outside the top three")
assert.deepEqual(candidates.map(({ id }) => id), initialOrder, "Snapshot does not reorder caller data")
const tied = [candidate(3, 5), candidate(1, 5), candidate(2, 5)]
assert.deepEqual(
  createLionVotingSnapshot(match, tied).leaders.map(({ id }) => id),
  createLionVotingSnapshot(match, [...tied].reverse()).leaders.map(({ id }) => id),
  "Tied results remain stable when the database returns a different row order",
)
assert.deepEqual(createLionVotingSnapshot(match, []).leaders, [])
assert.equal(createLionVotingSnapshot(match, [candidate(1, 100, { is_hidden: true })]).totalVotes, 0)
const zero = createLionVotingSnapshot(match, [candidate(1, null), candidate(2, 0)])
assert.equal(zero.totalVotes, 0)
assert.ok(zero.leaders.every(({ votes, percent }) => votes === 0 && percent === 0))
assert.equal(matchesLionVotingEtag(null, '"current"'), false)
assert.equal(matchesLionVotingEtag('"old"', '"current"'), false)
assert.equal(matchesLionVotingEtag('"current"', '"current"'), true)
assert.equal(matchesLionVotingEtag('"old", W/"current"', '"current"'), true)
assert.equal(matchesLionVotingEtag("*", '"current"'), true)

const html = renderLionVotingDocument(42, 5000)
assert.match(html, /^<!doctype html>/i)
assert.match(html, /data-match-id="42"/)
assert.match(html, /data-refresh-ms="5000"/)
assert.equal((html.match(/<script\b/g) || []).length, 1)
assert.match(html, /src="\/obs\/lion-voting\.js(?:\?[^"\s]*)?" defer/)
assert.equal((html.match(/\bdata-row hidden/g) || []).length, 3)
assert.match(html, /font-family: Arial, Helvetica, sans-serif/)
assert.doesNotMatch(html, /@font-face|@keyframes|\banimation\s*:|\btransition\s*:|backdrop-filter|<canvas|_next\//i)
for (const invalid of [null, 0, -1, 1.5, Number.NaN]) {
  const missing = renderLionVotingDocument(invalid, 5000)
  assert.doesNotMatch(missing, /<script\b|data-match-id=/)
  assert.match(missing, /matchId=ID/)
}

const source = await readFile(new URL("../public/obs/lion-voting.js", import.meta.url), "utf8")

// Track writes even when a setter receives an identical value: those writes can
// still invalidate browser rendering and are the regression this suite catches.
function createDisplay({ hidden = false, online = true } = {}) {
  const writes = []
  function element(label, attributes = {}, initiallyHidden = false, initialText = "") {
    let text = initialText
    let isHidden = initiallyHidden
    let width = ""
    return {
      get textContent() { return text },
      set textContent(value) { writes.push(`${label}.text`); text = String(value) },
      get hidden() { return isHidden },
      set hidden(value) { writes.push(`${label}.hidden`); isHidden = value },
      set innerHTML(_value) { assert.fail("Untrusted voting data must never enter innerHTML") },
      getAttribute(name) { return attributes[name] ?? null },
      setAttribute(name, value) { writes.push(`${label}.${name}`); attributes[name] = String(value) },
      style: {
        get width() { return width },
        set width(value) { writes.push(`${label}.width`); width = value },
      },
    }
  }
  const rows = Array.from({ length: 3 }, (_, index) => {
    const row = element(`row${index}`, {}, true)
    const fields = Object.fromEntries(["name", "team", "initials", "percent", "votes", "bar"].map((field) => [
      field, element(`row${index}.${field}`, { "data-field": field }),
    ]))
    row.querySelectorAll = () => Object.values(fields)
    return { row, fields }
  })
  const widget = element("widget", { "data-match-id": "42", "data-refresh-ms": "5000" })
  widget.querySelectorAll = () => rows.map(({ row }) => row)
  const elements = {
    widget,
    "match-label": element("match"),
    "total-votes": element("total", {}, false, "—"),
    "empty-state": element("empty", {}, false, "Завантаження результатів…"),
    "sync-status": element("status"),
  }
  const timers = new Map()
  const listeners = new Map()
  const calls = []
  const navigator = { onLine: online }
  let now = 0
  let timerId = 0
  let outstanding = 0
  let maxOutstanding = 0
  const document = { hidden, getElementById: (id) => elements[id] }
  const context = vm.createContext({
    document, navigator, AbortController,
    window: { addEventListener: (name, handler) => listeners.set(name, handler) },
    setTimeout: (handler, delay) => {
      const id = ++timerId
      timers.set(id, { handler, due: now + delay })
      return id
    },
    clearTimeout: (id) => timers.delete(id),
    fetch: (url, options) => new Promise((resolve, reject) => {
      outstanding += 1
      maxOutstanding = Math.max(maxOutstanding, outstanding)
      let settled = false
      function settle(callback, value) {
        if (settled) return
        settled = true
        outstanding -= 1
        callback(value)
      }
      const call = {
        url, options, jsonReads: 0,
        respond(data, status = 200, etag = '"v1"') {
          settle(resolve, {
            status, ok: status >= 200 && status < 300,
            headers: { get: (name) => name.toLowerCase() === "etag" ? etag : null },
            json: () => { call.jsonReads += 1; return Promise.resolve(data) },
          })
        },
        fail: () => settle(reject, new Error("Network unavailable")),
      }
      options.signal.addEventListener("abort", () => settle(reject, new Error("Aborted")), { once: true })
      calls.push(call)
    }),
  })
  vm.runInContext(source, context, { filename: "lion-voting.js" })
  async function flush() {
    for (let turn = 0; turn < 8; turn += 1) await Promise.resolve()
  }
  return {
    writes, rows, elements, calls, document, navigator,
    get maxOutstanding() { return maxOutstanding },
    get timerCount() { return timers.size },
    nextDelay: () => Math.min(...[...timers.values()].map(({ due }) => due - now)),
    flush,
    emit: (event) => listeners.get(event)?.(),
    async advance(milliseconds) {
      const target = now + milliseconds
      let iterations = 0
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0]
        if (!next) break
        assert.ok(++iterations < 1000, "Timer loop must remain bounded")
        timers.delete(next[0])
        now = next[1].due
        next[1].handler()
        await flush()
      }
      now = target
      await flush()
    },
    async respond(data, status = 200, etag) {
      calls.at(-1).respond(data, status, etag)
      await flush()
    },
  }
}

const display = createDisplay({ hidden: true })
assert.equal(display.calls.length, 1, "Hidden CEF capture starts fetching immediately")
assert.equal(display.calls[0].url, "/obs/lion-voting/data?matchId=42")
await display.respond(snapshot)
assert.equal(display.elements["total-votes"].textContent, "100")
assert.ok(display.rows.every(({ row }) => !row.hidden))
assert.equal(display.elements["empty-state"].hidden, true)
display.writes.length = 0
await display.advance(5000)
assert.equal(display.calls.length, 2, "Hidden CEF capture keeps refreshing")
assert.equal(display.calls.at(-1).options.headers["If-None-Match"], '"v1"')
await display.respond(null, 304)
assert.equal(display.calls.at(-1).jsonReads, 0, "304 does not parse a response body")
assert.deepEqual(display.writes, [], "304 produces zero DOM writes")
await display.advance(5000)
await display.respond(structuredClone(snapshot))
assert.deepEqual(display.writes, [], "Identical 200 response produces zero DOM writes")

const changed = createLionVotingSnapshot(match, [candidate(1, 40), candidate(2, 80)])
await display.advance(5000)
await display.respond(changed, 200, '"v2"')
assert.equal(display.elements["total-votes"].textContent, "120")
assert.equal(display.rows[0].fields.name.textContent, "Гравець 2")
assert.equal(display.rows[0].fields.percent.textContent, "67%")
assert.equal(display.rows[0].fields.bar.style.width, "67%")
assert.equal(display.rows[2].row.hidden, true, "A removed candidate disappears immediately")
await display.advance(5000)
display.calls.at(-1).fail()
await display.flush()
assert.equal(display.elements["total-votes"].textContent, "120", "A failed request preserves last real totals")
assert.equal(display.rows[0].fields.name.textContent, "Гравець 2")

for (let failure = 0; failure < 8; failure += 1) {
  const delay = display.nextDelay()
  assert.ok(delay >= 5000 && delay <= 60000, "Outages use bounded, low-frequency retries")
  await display.advance(delay)
  display.emit("online")
  display.emit("pageshow")
  assert.equal(display.maxOutstanding, 1, "Events never overlap an in-flight fetch")
  display.calls.at(-1).fail()
  await display.flush()
}
assert.equal(display.nextDelay(), 60000, "Retry backoff stops growing")
assert.equal(display.elements["total-votes"].textContent, "120")
await display.advance(display.nextDelay())
await display.respond(createLionVotingSnapshot(match, []))
assert.equal(display.elements["total-votes"].textContent, "0")
assert.ok(display.rows.every(({ row }) => row.hidden), "An empty snapshot removes every old row")
assert.equal(display.elements["empty-state"].hidden, false)
assert.equal(display.nextDelay(), 5000, "Successful recovery restores normal cadence")

const injection = '<img src=x onerror="alert(1)">'
await display.advance(5000)
await display.respond(createLionVotingSnapshot(
  { home_team: injection, away_team: "Соколи" },
  [candidate(1, 4, { player_name: injection, team_name: injection })],
))
assert.equal(display.rows[0].fields.name.textContent, injection)
assert.equal(display.rows[0].fields.team.textContent, injection)
assert.equal(display.elements["match-label"].textContent, `${injection} — Соколи`)

await display.advance(5000)
const beforeOffline = display.calls.length
display.navigator.onLine = false
display.emit("offline")
await display.flush()
assert.equal(display.calls.at(-1).options.signal.aborted, true)
assert.equal(display.timerCount, 0)
await display.advance(120000)
assert.equal(display.calls.length, beforeOffline, "Offline sources perform no background requests")
display.navigator.onLine = true
display.emit("online")
assert.equal(display.calls.length, beforeOffline + 1)
await display.respond(snapshot)

await display.advance(5000)
display.emit("pagehide")
await display.flush()
const beforeHidden = display.calls.length
assert.equal(display.timerCount, 0)
assert.equal(display.calls.at(-1).options.signal.aborted, true)
await display.advance(120000)
assert.equal(display.calls.length, beforeHidden, "Unloaded sources stop all timers and requests")
display.emit("pageshow")
assert.equal(display.calls.length, beforeHidden + 1)
await display.respond(changed)
assert.equal(display.elements["total-votes"].textContent, "120")

// Suspend after headers arrive but before JSON completes. A late response from
// the previous page lifecycle must never overwrite a newer broadcast result.
await display.advance(5000)
let finishOldJson
const slowJson = new Promise((resolve) => { finishOldJson = resolve })
display.calls.at(-1).respond(slowJson)
await display.flush()
display.emit("pagehide")
display.emit("pageshow")
await display.respond(changed)
display.writes.length = 0
finishOldJson(snapshot)
await display.flush()
assert.equal(display.elements["total-votes"].textContent, "120")
assert.deepEqual(display.writes, [], "A response from an abandoned lifecycle cannot touch the DOM")
assert.equal(display.timerCount, 1, "An abandoned request cannot replace the current refresh timer")

const timeout = createDisplay()
await timeout.advance(10000)
assert.equal(timeout.calls[0].options.signal.aborted, true, "A stalled request is aborted")
assert.ok(timeout.nextDelay() >= 5000 && timeout.nextDelay() <= 60000)
await timeout.advance(timeout.nextDelay())
await timeout.respond(snapshot)
assert.equal(timeout.elements["total-votes"].textContent, "100", "Timeouts do not permanently block refresh")

const initiallyOffline = createDisplay({ online: false })
assert.equal(initiallyOffline.calls.length, 0)
assert.equal(initiallyOffline.timerCount, 0)
initiallyOffline.navigator.onLine = true
initiallyOffline.emit("online")
assert.equal(initiallyOffline.calls.length, 1)
await initiallyOffline.respond(snapshot)
await initiallyOffline.advance(5000)
await initiallyOffline.respond({ ...snapshot, totalVotes: -1 })
assert.equal(initiallyOffline.elements["total-votes"].textContent, "100", "Invalid data preserves the last valid snapshot")

console.log("Lion voting model, static document and CEF client regression tests passed")
