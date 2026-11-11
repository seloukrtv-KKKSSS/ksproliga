import assert from "node:assert/strict"
import { getPosterLogoSource } from "../lib/posters/assets.ts"
import nextConfig from "../next.config.mjs"
import { getPosterRoundLayout, getPosterSponsorHeight, getPosterScorers, createPosterOptions, getPosterDateLabel, getPosterFilename, getPosterMatchScore, getPosterMatchTime, getPosterPages, POSTER_FORMATS } from "../lib/posters/model.ts"

const matches = Array.from({ length: 22 }, (_, index) => ({
  id: index + 1, round: 4, date: `2026-11-${index < 11 ? "15" : "16"}`, match_time: `${String(8 + index % 11).padStart(2, "0")}:00`,
  home_team: "ФК Тучапи", away_team: "Еверест", home_score: null, away_score: null, is_finished: false, championship_id: 1, created_at: "",
})).reverse()
const data = { mode: "round", matches, teams: [], championship: { id: 1, name: "Суперліга", season: "2026–2027", tournament_type: "league" } }
const options = createPosterOptions(data)
assert.equal(options.title, "ТУР 4")
assert.equal(options.showScores, false)
for (const { id } of POSTER_FORMATS) {
  const pages = getPosterPages(data, { format: id })
  assert.equal(pages.flat().length, matches.length, "Every fixture must appear on a carousel page")
  assert.equal(new Set(pages.flat().map(({ id }) => id)).size, matches.length)
  assert.equal(pages[0][0].date, "2026-11-15")
  assert.equal(pages[0][0].match_time, "08:00")
}
assert.equal(getPosterPages({ ...data, matches: [] }, options).length, 1)
assert.equal(getPosterPages({ ...data, mode: "match" }, options)[0].length, 1)
assert.equal(getPosterFilename(data, { ...options, page: 1 }), "ksliga-round-4-post-2.png")
assert.equal(getPosterDateLabel([matches[0]]), "16 листопада")
assert.equal(getPosterDateLabel(matches), "15 листопада — 16 листопада")
assert.equal(getPosterDateLabel([]), "Дату уточнюємо")
assert.equal(getPosterMatchTime({ match_time: "18:30:59" }), "18:30")
assert.equal(getPosterMatchTime({ match_time: "24:30" }), "Час уточнюємо")
assert.equal(getPosterMatchTime({}), "Час уточнюємо")
assert.equal(getPosterMatchScore(matches[0]), null)
assert.equal(getPosterMatchScore({ ...matches[0], is_finished: true, home_score: 0, away_score: 2 }), "0 : 2")
assert.equal(getPosterMatchScore({ ...matches[0], is_finished: true }), "— : —")
assert.equal(getPosterMatchScore({ ...matches[0], is_finished: true, is_technical_defeat: true, technical_winner: "ФК Тучапи" }), "+ : −")
assert.equal(getPosterMatchScore({ ...matches[0], is_finished: true, is_technical_defeat: true, technical_winner: "Еверест" }), "− : +")
assert.equal(getPosterMatchScore({ ...matches[0], is_finished: true, is_technical_defeat: true }), "ТЕХ.")
assert.equal(createPosterOptions({ ...data, mode: "match", matches: [{ ...matches[0], is_finished: true }] }).showScores, true)
assert.equal(createPosterOptions({ ...data, championship: { ...data.championship, tournament_type: "cup" }, matches: [{ ...matches[0], cup_stage: "ФІНАЛ" }] }).title, "ФІНАЛ")
for (const source of ["https://imgpx.com/6JUCdiXP5OtG.webp", "https://kdfa.if.ua/storage/teams/20/team-logo-20.png?v=2"]) {
  const optimized = new URL(getPosterLogoSource(source), "https://ksliga.com")
  assert.equal(optimized.origin, "https://ksliga.com", "Logo optimization must stay on the current site")
  assert.equal(optimized.pathname, "/_next/image")
  assert.equal(optimized.searchParams.get("url"), source)
  assert.equal(optimized.searchParams.get("w"), "256")
  assert.equal(optimized.searchParams.get("q"), "85")
  const upstream = new URL(source)
  assert.ok(nextConfig.images.remotePatterns.some((pattern) => pattern.hostname === upstream.hostname && pattern.protocol === "https" && pattern.port === ""), "Optimized badge providers must be allowed by Next")
}
assert.ok(nextConfig.images.qualities.includes(85), "Canvas badge quality must be allowed by Next")
assert.equal(new URL(getPosterLogoSource("https://imgpx.com/logo.png#badge"), "https://ksliga.com").searchParams.get("url"), "https://imgpx.com/logo.png")
for (const source of [
  "/images/ks-logo.png",
  "blob:https://ksliga.com/uploaded-background",
  "data:image/png;base64,aGVsbG8=",
  "https://other.example/team.png",
  "https://imgpx.com.evil.example/team.png",
  "https://imgpx.com@evil.example/team.png",
  "https://evil.example@imgpx.com/team.png",
  "https://user:password@imgpx.com/team.png",
  "http://imgpx.com/team.png",
  "https://imgpx.com:8443/team.png",
  "https://www.imgpx.com/team.png",
  "https://kdfa.if.ua/other/team.png",
  "https://kdfa.if.ua/storage/teams-other/team.png",
  "https://kdfa.if.ua/storage/teams/../../other/team.png",
]) assert.equal(getPosterLogoSource(source), source, "Only exact approved logo providers and paths may use the optimizer")
console.log("Poster model and logo source checks passed")

assert.equal(options.footer, "KSLIGA.COM")
assert.equal(options.showScorers, false)
const sponsors = [{id: "main", name: "Partner", url: "https://imgpx.com/logo.webp"}]
for (const format of ["post", "square", "story"]) {
  const pages = getPosterPages(data, {format, showScorers: true, sponsors})
  assert.equal(pages.flat().length, matches.length)
  assert.ok(pages.length > 1, "Large rounds must still paginate")
}
const goal = {id: 1, match_id: 1, player_name: "Іван Петренко", team_name: "ФК Тучапи", minute: 0, goal_type: "regular", created_at: ""}
assert.equal(getPosterScorers([goal, {...goal, id:2, minute:12}], 1, "ФК Тучапи"), "Іван Петренко ×2 (0′, 12′)")
assert.equal(getPosterScorers([{...goal, goal_type:"own_goal",minute:null}], 1, "ФК Тучапи"), "Іван Петренко (АГ)")
assert.equal(getPosterScorers([goal], 2, "ФК Тучапи"), "")
assert.equal(getPosterScorers([goal], 1, "Інша команда"), "")

// A normal round must stay together when sponsors or the scorer toggle are added.
const eightSponsors = Array.from({ length: 8 }, (_, index) => ({ id: String(index), name: `Sponsor ${index}`, url: `https://imgpx.com/logo-${index}.png` }))
for (const format of ["post", "square", "story"]) {
  for (const count of [4, 6, 8]) {
    for (const sponsorList of [[], sponsors, eightSponsors]) {
      const round = { ...data, matches: matches.slice(0, count) }
      const settings = { ...options, format, sponsors: sponsorList, showScorers: true, showVenue: true, venue: "Стадіон" }
      assert.equal(getPosterPages(round, settings).length, 1, `${count} fixtures must stay together in ${format} with ${sponsorList.length} sponsors, even with an empty scorer toggle`)
    }
  }
}
const busyRound = { ...data, matches: matches.slice(0, 4).map((match, i) => ({ ...match, date: i % 2 ? "2026-11-15" : "2026-11-16", is_finished: true })), goals: [] }
busyRound.goals = busyRound.matches.flatMap(match => [match.home_team, match.away_team].flatMap(team => Array.from({ length: 6 }, (_, index) => ({ ...goal, id: match.id * 100 + index, match_id: match.id, team_name: team, minute: index * 7, player_name: `Довге прізвище гравця ${index}` }))))
for (const format of ["post", "square", "story"]) {
  const settings = { ...options, format, sponsors: eightSponsors, showScorers: true, showVenue: true, venue: "Спорткомплекс" }
  assert.equal(getPosterPages(busyRound, settings).length, 1, "Four fixtures with goals, different dates, venue and eight sponsors must fit")
  for (const round of [busyRound, data]) {
    const pages = getPosterPages(round, settings)
    assert.deepEqual(pages.flat().map(match => match.id).sort((a,b) => a-b), round.matches.map(match => match.id).sort((a,b) => a-b))
    const layout = getPosterRoundLayout(round, settings)
    for (const page of pages) {
      const required = page.reduce((height, match) => height + layout.minimumRowHeight(match), 0) + Math.max(0, page.length - 1) * layout.gap
      assert.ok(required <= layout.bottom - layout.top, "All rows must stay above sponsors, venue and footer")
    }
  }
}
assert.equal(getPosterSponsorHeight({sponsors: [{id:"draft", name:"Draft", url:""}]}), 0)
assert.ok(getPosterSponsorHeight({sponsors:eightSponsors}) < 160, "Sponsor strip must stay compact")
assert.equal(getPosterPages({ ...busyRound, mode: "match" }, {...options, sponsors: eightSponsors, showScorers:true}).length, 1)
console.log("Poster pagination and sponsor layout regressions passed")
