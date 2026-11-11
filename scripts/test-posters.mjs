import assert from "node:assert/strict"
import { getPosterDraftKey, loadPosterDraft, savePosterDraft, removePosterDraft } from "../lib/posters/drafts.ts"
import { getPosterLogoSource } from "../lib/posters/assets.ts"
import nextConfig from "../next.config.mjs"
import { getPosterTeams, getPosterTeamKey, getPosterTeamLogo, getPosterRoundLayout, getPosterSponsorHeight, getPosterSponsors, getPosterScorers, createPosterOptions, getPosterDateLabel, getPosterFilename, getPosterMatchScore, getPosterMatchTime, getPosterPages, POSTER_FORMATS } from "../lib/posters/model.ts"

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

assert.equal(getPosterSponsorHeight({sponsors}), 0, "A main sponsor uses the existing footer, without taking space from fixtures")
assert.equal(getPosterSponsorHeight({sponsors:eightSponsors.slice(0, 5)}), 88, "Up to four secondary partners fit in one row above the footer")
assert.equal(getPosterSponsorHeight({sponsors:eightSponsors}), 152, "Seven secondary partners fit in two rows")
const selectedSponsors = getPosterSponsors({sponsors:eightSponsors, mainSponsorId:"5"})
assert.equal(selectedSponsors.main.id, "5")
assert.equal(selectedSponsors.partners.length, 7)
assert.ok(selectedSponsors.partners.every(sponsor => sponsor.id !== "5"), "The main logo must not be repeated among secondary partners")
assert.equal(getPosterSponsors({sponsors:[{id:"draft",name:"Draft",url:""}, ...sponsors],mainSponsorId:"draft"}).main.id, "main", "An unfinished main logo must fall back to a usable sponsor")
assert.equal(getPosterSponsors({sponsors:[]}).main, undefined)
for (const format of ["square", "post", "story"]) {
  assert.equal(getPosterRoundLayout(data, {...options,format,sponsors}).bottom, getPosterRoundLayout(data,{...options,format,sponsors:[]}).bottom, "The main sponsor must not reduce space above the footer")
}

// Drafts survive immediate close/reopen and remain scoped to tournament + target.
const draftRecords = new Map()
const draftStorage = {
  getItem: key => draftRecords.get(key) ?? null,
  setItem: (key, value) => draftRecords.set(key, value),
  removeItem: key => draftRecords.delete(key),
}
const draftKey = getPosterDraftKey(data)
assert.ok(draftKey)
assert.equal(getPosterDraftKey({...data, matches:[...matches].reverse()}), draftKey)
assert.equal(getPosterDraftKey({...data, matches:[{...matches[0], id:999}, ...matches]}), draftKey, "Adding a fixture must not lose the round draft")
assert.equal(getPosterDraftKey({...data, matches:matches.slice(1)}), draftKey)
assert.notEqual(getPosterDraftKey({...data, mode:"match"}), draftKey)
assert.notEqual(getPosterDraftKey({...data, matches:matches.map(match=>({...match, championship_id:2}))}), draftKey)
assert.notEqual(getPosterDraftKey({...data, matches:matches.map(match=>({...match, round:5}))}), draftKey)
assert.notEqual(getPosterDraftKey({...data, mode:"match", matches:[matches[0]]}), getPosterDraftKey({...data, mode:"match", matches:[matches[1]]}))
assert.equal(getPosterDraftKey({...data,matches:[]}), null)
assert.equal(loadPosterDraft(draftStorage, draftKey, options).restored, false)
const completeDraft = {
  options: {...options, title:"Збережена афіша", subtitle:"Підзаголовок", venue:"Стадіон", footer:"KSLIGA.COM", format:"square", template:"editorial", font:"serif", accent:"#0a84ff", showTime:false, showVenue:false, showScores:true, showScorers:true, backgroundUrl:"https://imgpx.com/background.webp", backgroundOpacity:37, backgroundPosition:62, sponsors:[{id:"primary",name:"Головний",url:"https://imgpx.com/main.webp"},{id:"secondary",name:"Партнер",url:""}], mainSponsorId:"primary", page:99},
  imageUrls: {background:"https://imgpx.com/not-yet-applied", "sponsor:primary":"https://imgpx.com/changed-but-not-applied", "sponsor:secondary":"unfinished URL"},
}
assert.equal(savePosterDraft(draftStorage, draftKey, completeDraft), true)
const restoredDraft = loadPosterDraft(draftStorage, draftKey, options)
assert.equal(restoredDraft.restored, true)
assert.deepEqual(restoredDraft.draft, {...completeDraft, options:{...completeDraft.options, page:0}}, "Every setting and unapplied URL must be restored; pagination starts on a valid first page")
const otherKey = getPosterDraftKey({...data, mode:"match"})
assert.equal(loadPosterDraft(draftStorage, otherKey, options).restored, false, "A round draft must not leak into a match")
savePosterDraft(draftStorage, otherKey, completeDraft)
assert.equal(removePosterDraft(draftStorage, draftKey), true)
assert.equal(loadPosterDraft(draftStorage, draftKey, options).restored, false)
assert.equal(loadPosterDraft(draftStorage, otherKey, options).restored, true, "Resetting a draft must preserve every other target")
for (const raw of ["{broken", JSON.stringify({version:99,options}), JSON.stringify({version:1,options:null}), "x".repeat(100001)]) {
  draftRecords.set(draftKey, raw)
  assert.deepEqual(loadPosterDraft(draftStorage, draftKey, options).draft, {options,imageUrls:{}}, "Damaged or obsolete data must not break the editor")
}
draftRecords.set(draftKey, JSON.stringify({version:1,options:{...completeDraft.options, format:"bad", template:"bad",font:"bad",accent:"url(bad)",backgroundOpacity:-10,backgroundPosition:500,backgroundUrl:"data:image/png;base64,abc",sponsors:[{id:"a",name:"A",url:"javascript:alert(1)"},{id:"a",name:"Duplicate",url:"https://imgpx.com/a.webp"}],mainSponsorId:"missing"}}))
const repaired = loadPosterDraft(draftStorage,draftKey,options).draft.options
assert.equal(repaired.format,options.format)
assert.equal(repaired.template,options.template)
assert.equal(repaired.font,options.font)
assert.equal(repaired.accent,options.accent)
assert.equal(repaired.backgroundOpacity,0)
assert.equal(repaired.backgroundPosition,100)
assert.equal(repaired.backgroundUrl,undefined)
assert.equal(repaired.sponsors.length,1)
assert.equal(repaired.sponsors[0].url,"")
assert.equal(repaired.mainSponsorId,undefined)
const deniedStorage = {getItem:()=>{throw new Error("denied")},setItem:()=>{throw new Error("quota")},removeItem:()=>{throw new Error("denied")}}
assert.equal(loadPosterDraft(deniedStorage,draftKey,options).available,false)
assert.equal(savePosterDraft(deniedStorage,draftKey,completeDraft),false)
assert.equal(removePosterDraft(deniedStorage,draftKey),false)
assert.equal(savePosterDraft(undefined,draftKey,completeDraft),false)
assert.equal(savePosterDraft(draftStorage,null,completeDraft),false)
console.log("Poster draft persistence, recovery, reset and isolation checks passed")

// Manual emblem URLs are scoped by tournament and team and survive old/new drafts.
const homeLogoKey = getPosterTeamKey(1, "ФК Тучапи")
const awayLogoKey = getPosterTeamKey(1, "Еверест")
const logoData = {...data, teams:[{id:1,name:"ФК Тучапи",logo:"https://imgpx.com/original.webp",championship_id:1},{id:2,name:"ФК Тучапи",logo:"https://imgpx.com/other-tournament.webp",championship_id:2}]}
assert.equal(getPosterTeamKey(1,"  ФК ТУЧАПИ  "),homeLogoKey)
assert.equal(getPosterTeams(logoData).length,2,"A team playing repeatedly in the round needs only one URL field")
assert.equal(getPosterTeams(logoData).find(team=>team.key===homeLogoKey).logo,"https://imgpx.com/original.webp")
const editedLogos = {...options, teamLogos:{[homeLogoKey]:"https://imgpx.com/replacement.webp"}}
assert.equal(getPosterTeamLogo(logoData,editedLogos,1,"ФК ТУЧАПИ"),"https://imgpx.com/replacement.webp")
assert.equal(getPosterTeamLogo(logoData,editedLogos,2,"ФК Тучапи"),"https://imgpx.com/other-tournament.webp")
assert.equal(getPosterTeamLogo(logoData,editedLogos,1,"Еверест"),undefined)
assert.equal(logoData.teams[0].logo,"https://imgpx.com/original.webp","Poster edits must not mutate site team records")
assert.equal(getPosterTeamLogo(logoData,{...options,teamLogos:{}},1,"ФК Тучапи"),"https://imgpx.com/original.webp","Reset must restore the current site emblem")
const extendedRound = {...logoData,matches:[...matches,{...matches[0],id:500,home_team:"Третя команда",away_team:"Четверта команда",date:"2027-01-01"}]}
assert.equal(getPosterTeams(extendedRound).length,4)
assert.equal(getPosterTeams({...extendedRound,mode:"match"}).length,2,"A match poster must not list unrelated teams")
const logoDraft = {...completeDraft,options:{...completeDraft.options,teamLogos:editedLogos.teamLogos},imageUrls:{...completeDraft.imageUrls,[homeLogoKey]:"https://imgpx.com/pending-logo.webp",[awayLogoKey]:"unfinished replacement URL"}}
assert.equal(savePosterDraft(draftStorage,draftKey,logoDraft),true)
const recoveredLogos = loadPosterDraft(draftStorage,draftKey,options).draft
assert.deepEqual(recoveredLogos.options.teamLogos,editedLogos.teamLogos)
assert.equal(recoveredLogos.imageUrls[homeLogoKey],"https://imgpx.com/pending-logo.webp")
assert.equal(recoveredLogos.imageUrls[awayLogoKey],"unfinished replacement URL","Unapplied team URLs must not be lost on close")
const oldDraftOptions = {...completeDraft.options};delete oldDraftOptions.teamLogos
const oldDraftRecord = {version:1,options:oldDraftOptions,imageUrls:completeDraft.imageUrls}
draftRecords.set(draftKey,JSON.stringify(oldDraftRecord))
const migratedDraft = loadPosterDraft(draftStorage,draftKey,options).draft
assert.deepEqual(migratedDraft.options.teamLogos,{})
assert.equal(migratedDraft.options.title,completeDraft.options.title)
assert.deepEqual(migratedDraft.options.sponsors,completeDraft.options.sponsors,"Existing drafts must retain sponsors and formatting")
draftRecords.set(draftKey,JSON.stringify({version:1,options:{...options,teamLogos:{[homeLogoKey]:"javascript:alert(1)",[awayLogoKey]:"data:image/png;base64,x",rogue:"https://imgpx.com/a.webp"}},imageUrls:{[homeLogoKey]:"pending",rogue:"bad"}}))
const sanitizedLogos = loadPosterDraft(draftStorage,draftKey,options).draft
assert.deepEqual(sanitizedLogos.options.teamLogos,{})
assert.deepEqual(sanitizedLogos.imageUrls,{[homeLogoKey]:"pending"})
console.log("Poster team emblem overrides and draft compatibility checks passed")
