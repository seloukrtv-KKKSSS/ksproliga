import assert from "node:assert/strict"
import { createPosterOptions, getPosterDateLabel, getPosterFilename, getPosterMatchScore, getPosterMatchTime, getPosterPages, POSTER_FORMATS } from "../lib/posters/model.ts"

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
console.log("Poster model checks passed")
