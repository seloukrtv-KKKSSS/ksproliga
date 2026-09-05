/* Standalone CEF display: no framework, realtime socket, animation or render loop. */
(function () {
  "use strict"

  var widget = document.getElementById("widget")
  if (!widget) return

  var interval = Number(widget.getAttribute("data-refresh-ms")) || 5000
  var endpoint = "/obs/lion-voting/data?matchId=" + widget.getAttribute("data-match-id")
  var matchLabel = document.getElementById("match-label")
  var totalLabel = document.getElementById("total-votes")
  var empty = document.getElementById("empty-state")
  var status = document.getElementById("sync-status")
  var rows = Array.prototype.map.call(widget.querySelectorAll("[data-row]"), function (row) {
    var fields = {}
    Array.prototype.forEach.call(row.querySelectorAll("[data-field]"), function (field) {
      fields[field.getAttribute("data-field")] = field
    })
    return { element: row, fields: fields }
  })
  var timer = null
  var request = null
  var active = true
  var hasSnapshot = false
  var etag = ""
  var failures = 0

  function text(element, value) {
    if (element.textContent !== value) element.textContent = value
  }

  function hidden(element, value) {
    if (element.hidden !== value) element.hidden = value
  }

  function connection(label, state) {
    text(status, label)
    if (status.getAttribute("data-state") !== state) status.setAttribute("data-state", state)
  }

  function votesLabel(votes) {
    var lastTwo = votes % 100
    var last = votes % 10
    if (lastTwo >= 11 && lastTwo <= 14) return votes + " голосів"
    if (last === 1) return votes + " голос"
    if (last >= 2 && last <= 4) return votes + " голоси"
    return votes + " голосів"
  }

  function validSnapshot(data) {
    return data && typeof data.homeTeam === "string" && typeof data.awayTeam === "string"
      && Number.isSafeInteger(data.totalVotes) && data.totalVotes >= 0
      && Array.isArray(data.leaders) && data.leaders.length <= 3
      && data.leaders.every(function (candidate) {
        return candidate && Number.isSafeInteger(candidate.id) && candidate.id > 0
          && typeof candidate.playerName === "string" && typeof candidate.teamName === "string"
          && Number.isSafeInteger(candidate.votes) && candidate.votes >= 0
          && Number.isInteger(candidate.percent) && candidate.percent >= 0 && candidate.percent <= 100
      })
  }

  function render(data) {
    text(matchLabel, data.homeTeam + " — " + data.awayTeam)
    text(totalLabel, String(data.totalVotes))
    rows.forEach(function (row, index) {
      var candidate = data.leaders[index]
      if (!candidate) {
        hidden(row.element, true)
        return
      }
      var fields = row.fields
      text(fields.name, candidate.playerName)
      text(fields.team, candidate.teamName)
      text(fields.percent, candidate.percent + "%")
      text(fields.votes, votesLabel(candidate.votes))
      var width = candidate.percent + "%"
      if (fields.bar.style.width !== width) fields.bar.style.width = width
      hidden(row.element, false)
    })
    text(empty, "Очікуємо кандидатів")
    hidden(empty, data.leaders.length > 0)
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function schedule(delay) {
    clearTimer()
    if (active && navigator.onLine !== false) timer = setTimeout(refresh, delay)
  }

  async function refresh() {
    if (!active || request || navigator.onLine === false) return
    clearTimer()
    var current = new AbortController()
    request = current
    var timeout = setTimeout(function () { current.abort() }, 10000)
    var responseStatus = 0

    try {
      var headers = { Accept: "application/json" }
      if (etag) headers["If-None-Match"] = etag
      var response = await fetch(endpoint, {
        headers: headers,
        cache: "no-store",
        credentials: "omit",
        signal: current.signal,
      })
      if (!active || request !== current) return
      responseStatus = response.status
      if (response.status === 304 && hasSnapshot) {
        // No JSON parsing or candidate DOM writes when the result is unchanged.
        failures = 0
      } else {
        if (!response.ok) throw new Error("Snapshot unavailable")
        var data = await response.json()
        if (!active || request !== current) return
        if (!validSnapshot(data)) throw new Error("Invalid snapshot")
        render(data)
        hasSnapshot = true
        etag = response.headers.get("ETag") || ""
        failures = 0
      }
      connection("НАЖИВО", "live")
    } catch {
      if (!active || request !== current) return
      failures += 1
      // Never replace a previously displayed result with zeros or demo data.
      if (!hasSnapshot) {
        text(empty, responseStatus === 404 ? "Матч не знайдено" : "Очікуємо з’єднання…")
        connection("НЕМАЄ ДАНИХ", "stale")
      } else if (failures >= 2) {
        connection("НЕМАЄ ЗВ’ЯЗКУ", "stale")
      }
    } finally {
      clearTimeout(timeout)
      if (request === current) {
        request = null
        // One request at a time; bounded backoff also limits work during outages.
        schedule(failures ? Math.min(60000, interval * Math.pow(2, Math.min(failures, 5))) : interval)
      }
    }
  }

  function offline() {
    clearTimer()
    if (request) request.abort()
    connection("НЕМАЄ ЗВ’ЯЗКУ", "stale")
  }

  function stop() {
    active = false
    clearTimer()
    if (request) request.abort()
    request = null
  }

  window.addEventListener("offline", offline)
  window.addEventListener("online", function () { void refresh() })
  window.addEventListener("pagehide", stop)
  window.addEventListener("pageshow", function () {
    if (!active) {
      active = true
      void refresh()
    }
  })
  // CEF can mark an offscreen broadcast source hidden while still capturing it.
  // Keep the low-frequency refresh running regardless of document.hidden.
  if (navigator.onLine === false) offline()
  else void refresh()
})()
