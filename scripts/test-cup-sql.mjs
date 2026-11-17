import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { buildCupFixtures, createCupConfig, distributeCupGroups } from "../lib/cup.ts"

const db = new PGlite()
const file = (path) => readFile(new URL(path, import.meta.url), "utf8")
const q = async (sql, params = []) => (await db.query(sql, params)).rows
const owner = "00000000-0000-0000-0000-000000000001"
async function publish(championship, config, revision = 0) {
  const teams = await q("select * from teams where championship_id=$1 order by id", [championship])
  return q("select public.publish_cup_format($1,$2::jsonb,$3::jsonb,$4) revision", [championship, JSON.stringify(config), JSON.stringify(buildCupFixtures(config, teams)), revision])
}
async function configFor(championship, count = 4) {
  await q("insert into championships(id,name,season,tournament_type) values($1,$2,'2026','cup')", [championship, `Cup ${championship}`])
  for (let i = 0; i < count; i++) await q("insert into teams(name,championship_id) values($1,$2)", [`Cup ${championship} Club ${i + 1}`, championship])
  const teams = await q("select * from teams where championship_id=$1 order by id", [championship])
  return { ...createCupConfig(teams), startDate: "2026-11-17" }
}
const games = (championship, fixture) => q("select * from matches where championship_id=$1 and cup_fixture_id=$2 order by cup_leg", [championship, fixture])
const finish = (id, home = 2, away = 0) => q("update matches set is_finished=true,home_score=$2,away_score=$3 where id=$1", [id, home, away])
try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_uid',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_user::text$$;
    grant usage on schema auth to authenticated,anon; grant execute on all functions in schema auth to authenticated,anon;`)
  await db.exec(await file("./01-create-tables.sql"))
  await db.exec(await file("./11-add-match-cards.sql"))
  await db.exec(`alter table matches add column youtube_url text;
    grant select on teams,matches,championships to anon,authenticated;
    create table organizer_profiles(user_id uuid primary key,is_active boolean,role text,championship_ids integer[]);
    alter table organizer_profiles enable row level security;
    create policy profiles_self on organizer_profiles for select to authenticated using(user_id=(select auth.uid()));
    grant select on organizer_profiles to authenticated;
    create table match_votings(match_id integer references matches(id) on delete cascade);
    create table voting_candidates(id serial primary key,match_id integer references matches(id) on delete cascade);
    insert into organizer_profiles values('${owner}',true,'organizer',array[1,3,4,5,6,7,8]);
    select set_config('app.test_uid','${owner}',false);`)
  await db.exec(await file("../supabase/migrations/20261117180900_tournament_sponsors_and_cup.sql"))
  await db.exec(await file("../supabase/migrations/20261117181018_scope_sponsor_mutation_policies.sql"))
  await db.exec(await file("../supabase/migrations/20261117201617_cup_stage_legs.sql"))
  const c1 = await configFor(1)
  const c2 = await configFor(2)
  await db.exec("set role authenticated")
  await assert.rejects(publish(2,c2), /Немає доступу/)
  await publish(1,c1)
  await assert.rejects(publish(1,c1,0), /Інший адміністратор/)
  await db.exec("reset role")
  assert.equal((await games(1,"ko-1-1")).length,1)
  assert.equal((await games(1,"ko-2-1")).length,0)
  const semi1 = (await games(1,"ko-1-1"))[0], semi2 = (await games(1,"ko-1-2"))[0]
  await finish(semi1.id); await finish(semi2.id)
  let final = (await games(1,"ko-2-1"))[0]
  assert.equal(final.home_team,semi1.home_team)
  await finish(semi1.id,0,3)
  final = (await games(1,"ko-2-1"))[0]
  assert.equal(final.home_team,semi1.away_team,"Untouched next round follows corrected result")
  await q("insert into match_goals(match_id,player_name,team_name) values($1,'Player',$2)",[final.id,final.home_team])
  await assert.rejects(finish(semi1.id,4,0), /Спочатку виправте/)
  assert.equal((await games(1,"ko-1-1"))[0].away_score,3,"Rejected correction rolls back the upstream score")
  await assert.rejects(publish(1,c1,1), /розпочатого/)
  await assert.rejects(q("delete from matches where id=$1",[final.id]), /конструкторі/)

  const c3 = { ...await configFor(3), knockoutLegs: 2, thirdPlace: true }
  await publish(3,c3)
  const legs = await games(3,"ko-1-1")
  assert.equal(legs.length,2)
  assert.equal(legs[1].home_team,legs[0].away_team)
  await finish(legs[0].id,2,0); await finish(legs[1].id,2,0)
  assert.equal((await q("select resolved from cup_fixtures where championship_id=3 and id='ko-1-1'"))[0].resolved,false)
  await q("update matches set penalty_home=3,penalty_away=4 where id=$1",[legs[1].id])
  const otherLegs = await games(3,"ko-1-2")
  await finish(otherLegs[0].id,0,1); await finish(otherLegs[1].id,2,0)
  assert.equal((await games(3,"ko-2-1")).length,1)
  assert.equal((await games(3,"third-place")).length,1)
  assert.equal((await games(3,"ko-2-1"))[0].home_team,legs[0].home_team,"Aggregate tie is decided by second-leg penalties, in second-leg orientation")

  const base4 = await configFor(4)
  const c4 = { ...base4, mode: "groups_knockout", groups: distributeCupGroups(base4.teamIds,2), qualifiers: 1, points: { win: 5,draw: 2,loss: 0 } }
  await publish(4,c4)
  const groupGames = await q("select * from matches where championship_id=4 order by id")
  assert.equal(groupGames.length,2)
  await finish(groupGames[0].id,0,1)
  assert.equal((await games(4,"ko-1-1")).length,0)
  await finish(groupGames[1].id,0,2)
  const groupFinal = (await games(4,"ko-1-1"))[0]
  assert.equal(groupFinal.home_team,groupGames[0].away_team)
  assert.equal(groupFinal.away_team,groupGames[1].away_team)

  const c7 = await configFor(7,8)
  await publish(7,c7)
  await db.exec("set role authenticated")
  await assert.rejects(q("select set_cup_stage_legs(2,1,2,1,false)"), /Немає доступу/)
  await q("select set_cup_stage_legs(7,1,2,1,false)")
  await db.exec("reset role")
  assert.equal((await games(7,"ko-1-1")).length,2)
  assert.ok((await q("select legs from cup_fixtures where championship_id=7 and stage=1")).every(row=>row.legs===2))
  assert.equal((await q("select round from cup_fixtures where championship_id=7 and id='ko-2-1'"))[0].round,3)
  assert.equal((await q("select config from cup_formats where championship_id=7"))[0].config.stageLegs['1'],2)
  await assert.rejects(q("select set_cup_stage_legs(7,1,1,1,false)"),/змінилися/)
  await q("select set_cup_stage_legs(7,1,1,2,false)")
  assert.equal((await games(7,"ko-1-1")).length,1)
  const first7 = (await games(7,"ko-1-1"))[0]
  await finish(first7.id)
  await assert.rejects(q("select set_cup_stage_legs(7,1,2,3,false)"),/вже мають/)
  await q("select set_cup_stage_legs(7,2,2,3,false)")
  assert.equal((await games(7,"ko-1-1"))[0].home_score,2,"Changing future stages preserves earlier results")
  assert.equal((await q("select legs from cup_fixtures where championship_id=7 and id='ko-2-1'"))[0].legs,2)
  await assert.rejects(q("update cup_formats set config=jsonb_set(config,'{stageLegs}','{\"1\":3}'::jsonb) where championship_id=7"),/check constraint/)
  const c8 = {...await configFor(8),thirdPlace:true}
  await publish(8,c8)
  await q("select set_cup_stage_legs(8,2,2,1,true)")
  assert.equal((await q("select legs from cup_fixtures where championship_id=8 and id='third-place'"))[0].legs,2)
  assert.equal((await q("select legs from cup_fixtures where championship_id=8 and id='ko-2-1'"))[0].legs,1)
  await assert.rejects(q("select set_cup_stage_legs(8,2,3,2,true)"),/один або два/)
  const c5 = await configFor(5,5)
  await publish(5,c5)
  assert.equal((await q("select count(*)::int count from matches m join cup_fixtures f on f.championship_id=m.championship_id and f.id=m.cup_fixture_id where m.championship_id=5 and f.stage=1"))[0].count,1,"Byes do not create fake opponents or matches")
  const bye = (await q("select * from cup_fixtures where championship_id=5 and id='ko-1-1'"))[0]
  assert.equal(bye.resolved,true)
  assert.ok(bye.winner_team_id)
  const c6 = await configFor(6)
  await publish(6,c6)
  const first6 = (await games(6,"ko-1-1"))[0]
  await q("update matches set is_finished=true,is_technical_defeat=true,technical_winner=away_team where id=$1",[first6.id])
  assert.equal((await q("select winner_team_id from cup_fixtures where championship_id=6 and id='ko-1-1'"))[0].winner_team_id,c6.teamIds[3])
  await q("select schedule_cup_fixture(6,'ko-1-2','2026-12-01','14:00',3,'Моя стадія',1)")
  assert.equal((await games(6,"ko-1-2"))[0].cup_stage,"Моя стадія")
  await assert.rejects(q("select schedule_cup_fixture(6,'ko-1-2','2026-12-02','15:00',3,'Моя стадія',1)"), /змінилися/)
  const renamedTeam = (await q("select * from teams where id=$1",[c6.teamIds[0]]))[0]
  await q("update teams set name='Renamed Cup Team' where id=$1",[renamedTeam.id])
  assert.equal((await games(6,"ko-1-1"))[0].home_team,"Renamed Cup Team")
  await assert.rejects(q("delete from teams where id=$1",[renamedTeam.id]), /бере участь/)
  const legacyId = (await q("insert into matches(championship_id,round,date,home_team,away_team) values(6,99,'2026-11-17','Legacy A','Legacy B') returning id"))[0].id
  assert.ok(legacyId)

  await db.exec("set role authenticated")
  await q("insert into tournament_sponsors(championship_id,name,logo_url,placements) values(1,'Partner','https://example.com/logo.png',array['cup','match','posters'])")
  await assert.rejects(q("insert into tournament_sponsors(championship_id,name,logo_url) values(2,'Other','https://example.com/logo.png')"), /row-level security/)
  assert.equal((await q("update tournament_sponsors set placements='{}' where championship_id=2 returning id")).length,0)
  await assert.rejects(q("insert into tournament_sponsors(championship_id,name,logo_url,placements) values(1,'X','https://example.com/logo.png',array['admin'])"), /check constraint/)
  await assert.rejects(q("update cup_formats set config='{}' where championship_id=1"), /permission denied/)
  await db.exec("reset role; set role anon")
  assert.equal((await q("select * from tournament_sponsors where championship_id=1")).length,1)
  assert.ok((await q("select * from cup_fixtures")).length)
  await assert.rejects(publish(1,c1,1), /permission denied/)
  await db.exec("reset role; delete from championships where id=6")
  assert.equal((await q("select * from matches where championship_id=6")).length,0,"Explicit tournament deletion can still cascade")
  console.log("Cup SQL migration, automatic advancement, two legs, penalties, byes, groups, protection and scoped permissions passed")
} catch (error) { console.error(error.message, error.where || ""); process.exitCode = 1 } finally { await db.close() }
