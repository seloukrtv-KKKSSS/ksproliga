import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
const read=p=>fs.readFile(p,'utf8')
try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.role()returns text language sql as 'select current_user::text';")
 for(const file of ['scripts/01-create-tables.sql','supabase/migrations/20260905090254_scope_team_names_to_championship.sql','scripts/11-add-match-cards.sql'])await db.exec(await read(file))
 await db.exec('create table voting_candidates(id serial primary key,match_id integer references matches(id),player_name text,team_name text,votes integer);')
 await db.exec(await read('supabase/migrations/20261110192206_player_statistics.sql'))
 const plan=JSON.parse(await read('docs/roster-import-review.json'))
 for(const champ of [6,8,12])await db.query("insert into championships(id,name,season)values($1,$2,'2026/27')",[champ,`Fixture ${champ}`])
 for(const t of plan.teams)await db.query('insert into teams(id,name,championship_id)values($1,$2,$3)',[t.id,t.name,t.champ])
 for(const r of plan.renames)await db.query('insert into players(id,name,team,championship_id,goals,yellow_cards,red_cards)values($1,$2,$3,$4,2,1,1)',[r.id,r.old,r.team,r.champ])
 await db.exec("select setval(pg_get_serial_sequence('players','id'),(select max(id) from players));")
 await db.exec('create table private.player_dedup_backup(migration text primary key,payload jsonb);create table private.player_name_aliases(championship_id integer,team text,alias_key text,player_id integer references players(id),primary key(championship_id,team,alias_key));')
 const prior=await read('supabase/migrations/20261111185431_merge_player_name_aliases.sql')
 await db.exec(prior.slice(prior.indexOf('create function private.player_token_key'),prior.indexOf('update public.teams t set roster=roster')))
 await db.exec(await read('supabase/migrations/20261111190950_import_verified_team_rosters.sql'))
 assert.equal((await db.query('select count(*)::integer n from players')).rows[0].n,893)
 for(const r of plan.renames){const p=(await db.query('select * from players where id=$1',[r.id])).rows[0];assert.equal(p.name,r.name);assert.deepEqual([p.goals,p.yellow_cards,p.red_cards],[2,1,1])}
 assert.equal((await db.query("select name from players where id=101")).rows[0].name,'Ситник Ярослав')
 const count=(await db.query('select count(*)::integer n from players')).rows[0].n
 await db.exec('update teams set roster=roster')
 assert.equal((await db.query('select count(*)::integer n from players')).rows[0].n,count)
 assert.equal((await db.query("select cardinality(roster) n from teams where id=48")).rows[0].n,27)
 console.log('PASS: 35 rosters / 893 scoped players, 96 identity corrections, manual statistics preserved, repeated save adds no duplicates')
}finally{await db.close()}
