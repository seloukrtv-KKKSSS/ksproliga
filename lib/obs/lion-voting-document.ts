const OVERLAY_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; min-width: 0; background: transparent; }
body { overflow: hidden; color: #f4f7fb; font-family: Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; }
[hidden] { display: none !important; }
.stage { display: flex; justify-content: center; padding: 12px; }
.widget { position: relative; width: 420px; max-width: 100%; overflow: hidden; padding: 14px; border: 1px solid #2b3f55; border-radius: 14px; background: #091726; contain: layout paint; }
.widget::before { content: ""; position: absolute; top: 0; right: 0; left: 0; height: 3px; background: #eeb642; }
.header { display: flex; align-items: center; gap: 10px; height: 60px; padding-bottom: 10px; border-bottom: 1px solid #2b3f55; }
.brand { display: flex; flex: 0 0 36px; align-items: center; justify-content: center; height: 36px; border-radius: 8px; color: #13202d; background: #eeb642; font-size: 14px; font-weight: 900; letter-spacing: -1px; }
.heading { flex: 1; min-width: 0; }
.eyebrow { margin: 0 0 2px; color: #93a6ba; font-size: 9px; font-weight: 700; line-height: 11px; letter-spacing: 1.5px; }
h1 { margin: 0; color: #f4c86a; font-size: 18px; font-weight: 700; line-height: 21px; }
#match-label { overflow: hidden; margin: 3px 0 0; color: #a9b8c8; font-size: 10px; line-height: 12px; text-overflow: ellipsis; white-space: nowrap; }
.top-label { flex: none; padding: 5px 7px; border: 1px solid #3e4b55; border-radius: 5px; color: #d0d9e3; font-size: 9px; font-weight: 700; line-height: 11px; letter-spacing: 1px; }
.results { position: relative; height: 214px; padding: 10px 0; }
#candidate-list { display: grid; grid-template-rows: repeat(3, 60px); gap: 7px; height: 194px; }
.candidate { position: relative; display: grid; grid-template-columns: 22px 32px minmax(0, 1fr) 58px; align-items: center; gap: 8px; height: 60px; overflow: hidden; padding: 8px 9px 12px; border: 1px solid #293e54; border-radius: 8px; background: #112337; contain: layout paint; }
.candidate.leader { border-color: #806a36; background: #252b27; }
.rank { color: #93a9bf; font-size: 13px; font-weight: 700; text-align: center; }
.leader .rank { color: #f4c86a; }
.initials { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; overflow: hidden; border: 1px solid #3c5065; border-radius: 6px; color: #c2cfdd; background: #1a3046; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; }
.leader .initials { border-color: #685b37; color: #f4c86a; background: #373929; }
.candidate-copy { min-width: 0; }
.name, .team { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name { color: #f4f7fb; font-size: 14px; font-weight: 700; line-height: 17px; }
.team { margin-top: 3px; color: #a0b1c3; font-size: 10px; line-height: 12px; }
.result { min-width: 0; text-align: right; }
.percent { display: block; color: #f4f7fb; font-size: 20px; font-weight: 700; line-height: 21px; }
.leader .percent { color: #f4c86a; }
.votes { display: block; overflow: hidden; margin-top: 2px; color: #a0b1c3; font-size: 9px; line-height: 11px; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { position: absolute; right: 9px; bottom: 5px; left: 9px; height: 3px; overflow: hidden; background: #2a3d50; }
.bar { display: block; width: 0; height: 3px; background: #7a9fbd; }
.leader .bar { background: #eeb642; }
#empty-state { position: absolute; inset: 10px 0; display: flex; align-items: center; justify-content: center; padding: 20px; color: #a9b8c8; font-size: 13px; line-height: 20px; text-align: center; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 27px; padding-top: 10px; border-top: 1px solid #2b3f55; }
#sync-status { overflow: hidden; color: #91a5b9; font-size: 9px; line-height: 12px; text-overflow: ellipsis; white-space: nowrap; }
#sync-status[data-state="error"], #sync-status[data-state="stale"] { color: #e9bd67; }
.total { flex: none; color: #91a5b9; font-size: 10px; line-height: 14px; white-space: nowrap; }
#total-votes { margin-left: 5px; color: #f4f7fb; font-size: 13px; }
.message { padding: 26px 22px; text-align: center; }
.message .brand { width: 36px; margin: 0 auto 12px; }
.message p { margin: 12px 0 0; color: #a9b8c8; font-size: 13px; line-height: 21px; }
.message code { color: #f4c86a; font-family: Consolas, monospace; font-size: 12px; }
@media (max-width: 370px) {
  .stage { padding: 8px; }
  .widget { padding: 12px; }
  .candidate { grid-template-columns: 17px 28px minmax(0, 1fr) 51px; gap: 6px; padding-right: 7px; padding-left: 7px; }
  .initials { width: 28px; height: 28px; font-size: 9px; }
  .name { font-size: 12px; }
  .percent { font-size: 18px; }
  .top-label { padding-right: 5px; padding-left: 5px; }
}
`

function renderCandidateRow(rank: number): string {
  return `<article class="candidate${rank === 1 ? " leader" : ""}" data-row hidden>
  <span class="rank">${rank}</span>
  <span class="initials" data-field="initials" aria-hidden="true"></span>
  <div class="candidate-copy"><strong class="name" data-field="name"></strong><span class="team" data-field="team"></span></div>
  <div class="result"><strong class="percent" data-field="percent"></strong><span class="votes" data-field="votes"></span></div>
  <span class="bar-track" aria-hidden="true"><span class="bar" data-field="bar"></span></span>
</article>`
}

export function renderLionVotingDocument(matchId: number | null, refreshMs: number): string {
  const validMatchId = matchId !== null && Number.isSafeInteger(matchId) && matchId > 0
  const interval = Number.isSafeInteger(refreshMs) && refreshMs > 0 ? refreshMs : 5_000
  const content = validMatchId
    ? `<section class="widget" id="widget" data-match-id="${matchId}" data-refresh-ms="${interval}" aria-label="Результати голосування за лева матчу">
  <header class="header">
    <span class="brand" aria-hidden="true">KS</span>
    <div class="heading"><p class="eyebrow">KS LIGA</p><h1>Лев матчу</h1><p id="match-label">Голосування глядачів</p></div>
    <span class="top-label">ТОП 3</span>
  </header>
  <div class="results">
    <div id="candidate-list">${[1, 2, 3].map(renderCandidateRow).join("\n")}</div>
    <div id="empty-state">Завантаження результатів…</div>
  </div>
  <footer class="footer"><span id="sync-status">Підключення…</span><span class="total">Усього голосів<strong id="total-votes">—</strong></span></footer>
</section>`
    : `<section class="widget message">
  <span class="brand" aria-hidden="true">KS</span>
  <h1>Лев матчу</h1>
  <p>Додайте до адреси номер матчу:<br><code>/obs/lion-voting?matchId=ID</code></p>
</section>`

  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:,">
  <title>Лев матчу — KS LIGA</title>
  <style>${OVERLAY_CSS}</style>
</head>
<body>
  <main class="stage">${content}</main>
  ${validMatchId ? '<script src="/obs/lion-voting.js?v=1" defer></script>' : ""}
</body>
</html>`
}
