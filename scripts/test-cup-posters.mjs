import assert from "node:assert/strict"
import { buildCupFixtures, createCupConfig } from "../lib/cup.ts"
import { createPosterOptions, getCupPosterEntries, getCupPosterFixtures, getCupPosterLayout, getCupPosterPages, getPosterFilename, getPosterTeamKey } from "../lib/posters/model.ts"
import { getPosterDraftKey, savePosterDraft, loadPosterDraft } from "../lib/posters/drafts.ts"

function cup(count, stageLegs = {}) {
  const teams = Array.from({length:count},(_,index)=>({id:index+1,name:`Club ${index+1}`,championship_id:1,logo:`https://example.com/${index+1}.png`}))
  const config = {...createCupConfig(teams),stageLegs,thirdPlace:count>=4,startDate:"2026-11-17"}
  const fixtures = buildCupFixtures(config,teams)
  const matches=[]
  const ids=new Map()
  const resolve=source=>source.kind==="team"?source.teamId:source.kind==="bye"?0:ids.get(source.fixtureId)?.[source.kind]
  for(const fixture of fixtures){
    const h=resolve(fixture.home_source),a=resolve(fixture.away_source)
    if(!h||!a){fixture.resolved=true;fixture.winner_team_id=h||a||null;ids.set(fixture.id,{winner:h||a||0,loser:0});continue}
    for(let leg=1;leg<=fixture.legs;leg++)matches.push({id:matches.length+1,championship_id:1,cup_fixture_id:fixture.id,cup_leg:leg,cup_stage:fixture.label,round:fixture.round+leg-1,date:fixture.scheduled_date,home_team:teams.find(team=>team.id===(leg===1?h:a)).name,away_team:teams.find(team=>team.id===(leg===1?a:h)).name,home_score:leg===1?2:0,away_score:1,is_finished:true})
    fixture.resolved=true;fixture.winner_team_id=h;fixture.loser_team_id=a;ids.set(fixture.id,{winner:h,loser:a})
  }
  return {mode:"cup",championship:{id:1,name:"Test Cup",season:"2026–2027",tournament_type:"cup"},teams,matches,cup:{config,fixtures}}
}
const sponsors=Array.from({length:8},(_,index)=>({id:String(index),name:`Sponsor ${index}`,url:`https://example.com/sponsor${index}.png`}))
for(const count of [2,4,5,8,16,32,64,128])for(const format of ["landscape","post","story","square"]){
  const data=cup(count),options={...createPosterOptions(data),format,sponsors}
  const pages=getCupPosterPages(data,options),layout=getCupPosterLayout(data,options)
  const seen=new Set([...pages.flatMap(page=>page.entries),...layout.preliminary].map(entry=>entry.fixture.id))
  assert.equal(seen.size,data.cup.fixtures.length,`All fixtures survive ${count} teams / ${format} / eight sponsors`)
  assert.ok(pages.every(page=>page.stages.length<=4))
  assert.ok(layout.bottom>layout.top)
  if(count===8)assert.equal(pages.length,1,"Quarterfinals through final and third place fit on one image")
  if(count===16&&format==="landscape")assert.equal(pages.length,1)
}
const data=cup(8,{1:2,2:1,3:1,"third-place":2}),options=createPosterOptions(data)
assert.equal(options.format,"landscape")
assert.equal(options.showScores,true)
const first=getCupPosterEntries(data)[0]
assert.equal(first.homeScore,"3");assert.equal(first.awayScore,"1")
assert.equal(first.winner,first.home.name)
assert.match(first.detail,/1-й:.*2-й:/)
const tied=structuredClone(data)
const firstGames=tied.matches.filter(match=>match.cup_fixture_id===first.fixture.id)
firstGames[0].home_score=2;firstGames[0].away_score=0
firstGames[1].home_score=2;firstGames[1].away_score=0
firstGames[1].penalty_home=4;firstGames[1].penalty_away=3
assert.equal(getCupPosterEntries(tied)[0].winner,first.away.name,"Second-leg shootout uses the second-leg home/away orientation")
const partial=structuredClone(data);partial.matches.find(match=>match.cup_fixture_id===first.fixture.id&&match.cup_leg===2).is_finished=false
partial.cup.fixtures[0].resolved=false;partial.cup.fixtures[0].winner_team_id=null
assert.match(getCupPosterEntries(partial)[0].detail,/зіграно 1/)
assert.equal(getCupPosterEntries(partial)[0].winner,undefined)
const cancelledLeg=structuredClone(data)
cancelledLeg.cup.fixtures[0].excluded_legs=[1]
cancelledLeg.matches=cancelledLeg.matches.filter(match=>match.cup_fixture_id!==first.fixture.id||match.cup_leg===2)
const remainingLeg=getCupPosterEntries(cancelledLeg)[0]
assert.equal(remainingLeg.complete,true,"A cancelled leg is excluded from the required match count")
assert.equal(remainingLeg.winner,first.home.name,"The remaining away leg determines the winner with correct orientation")
assert.match(remainingLeg.detail,/скасовано 1/)
cancelledLeg.cup.fixtures[0].excluded_legs=[1,2]
cancelledLeg.matches=cancelledLeg.matches.filter(match=>match.cup_fixture_id!==first.fixture.id)
const cancelledTie=getCupPosterEntries(cancelledLeg)[0]
assert.equal(cancelledTie.complete,false)
assert.equal(cancelledTie.winner,undefined,"A cancelled tie cannot advance its former stored winner")
assert.match(cancelledTie.detail,/Пару скасовано/)
const upcoming={...data,matches:[],cup:{...data.cup,fixtures:data.cup.fixtures.map(fixture=>({...fixture,resolved:false,winner_team_id:null,loser_team_id:null}))}}
assert.ok(getCupPosterEntries(upcoming).find(entry=>entry.fixture.stage===2).home.pending)
const technical=structuredClone(cup(4));technical.matches[0].is_technical_defeat=true;technical.matches[0].technical_winner=technical.matches[0].away_team
assert.equal(getCupPosterEntries(technical)[0].awayScore,"+")
assert.equal(getCupPosterEntries(technical)[0].homeScore,"−")

const legacySource=cup(8)
const legacy={...legacySource,cup:undefined,matches:legacySource.matches.map(match=>({...match,cup_fixture_id:null,cup_leg:null,round:match.round+1}))}
legacy.teams=[...legacy.teams,{id:9,name:"Preliminary team",championship_id:1}]
legacy.matches.unshift({id:999,championship_id:1,round:1,cup_stage:"Попередній етап",date:"2026-11-10",home_team:legacy.teams[0].name,away_team:"Preliminary team",home_score:6,away_score:3,is_finished:true})
assert.equal(getCupPosterLayout(legacy,options).preliminary.length,1)
assert.equal(getCupPosterPages(legacy,options).length,1)
assert.equal(getCupPosterFixtures(legacy).length,9)
assert.ok(getCupPosterEntries(legacy).some(entry=>entry.fixture.home_source.kind==="winner"),"Older manually entered cups retain connections")
const records=new Map(),storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)}
const key=getPosterDraftKey(data)
assert.equal(key,"ksliga:poster-draft:v1:1:cup")
assert.equal(savePosterDraft(storage,key,{options:{...options,teamLogos:{[getPosterTeamKey(1,"Club 1")]:"https://example.com/custom.png"},sponsors},imageUrls:{background:"unfinished URL"}}),true)
const restored=loadPosterDraft(storage,key,options).draft
assert.equal(restored.options.format,"landscape")
assert.equal(restored.options.sponsors.length,8)
assert.equal(restored.imageUrls.background,"unfinished URL")
assert.equal(getPosterFilename(data,options),"ksliga-cup-1-landscape.png")
console.log("Cup poster coverage, legacy brackets, byes, penalties, aggregate scores, sponsor capacity and draft persistence passed")
