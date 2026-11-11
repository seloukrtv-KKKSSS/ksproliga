import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.role() returns text language sql as 'select current_user::text';")
 for(const file of ['scripts/01-create-tables.sql','supabase/migrations/20260905090254_scope_team_names_to_championship.sql','scripts/11-add-match-cards.sql'])await db.exec(await fs.readFile(file,'utf8'))
 await db.exec('alter table teams add column roster text[];create table voting_candidates(id serial primary key,match_id integer references matches(id),player_name text,team_name text,votes integer,created_at timestamptz,is_hidden boolean);')
 const migration=await fs.readFile('supabase/migrations/20261111185431_merge_player_name_aliases.sql','utf8')
 const fixtureSql=migration.slice(migration.indexOf('create temp table merge_map'),migration.indexOf('do $$ begin'))
 await db.exec('begin;'+fixtureSql)
 const mappings=(await db.query('select * from merge_map')).rows
 await db.exec('rollback')
 for(const champ of new Set(mappings.map(m=>m.champ)))await db.query("insert into championships(id,name,season)values($1,$2,'2026/27')",[champ,`Fixture ${champ}`])
 const teams=new Map()
 for(const m of mappings){const k=m.champ+'|'+m.team;if(!teams.has(k))teams.set(k,{champ:m.champ,name:m.team,roster:[]});teams.get(k).roster.push(m.old_name)}
 for(const t of teams.values())await db.query('insert into teams(name,championship_id,roster)values($1,$2,$3)',[t.name,t.champ,t.roster])
 for(const m of mappings)await db.query('insert into players(id,name,team,championship_id,goals)values($1,$2,$3,$4,$5)',[m.old_id,m.old_name,m.team,m.champ,m.old_id===m.keep_id?2:1])
 await db.exec("select setval(pg_get_serial_sequence('players','id'),(select max(id) from players));")
 await db.exec(await fs.readFile('supabase/migrations/20261110192206_player_statistics.sql','utf8'))
 await db.exec(await fs.readFile('supabase/migrations/20261111185431_merge_player_name_aliases.sql','utf8'))
 assert.equal((await db.query('select count(*)::int n from players')).rows[0].n,33)
 const query=async sql=>(await db.query(sql)).rows
 assert.equal((await query("select goals from players where id=9"))[0].goals,2)
 assert.equal((await query("select count(*)::int n from players where id=322"))[0].n,0)
 await db.exec("update teams set roster=array['Борисевич','Роман Борисевич','Борисевич Роман'] where name='Вихор' and championship_id=6;")
 assert.equal((await query("select cardinality(roster) n from teams where name='Вихор' and championship_id=6"))[0].n,1)
 assert.equal((await query('select count(*)::int n from players'))[0]?.n,33)
 await db.exec("insert into matches(id,round,date,home_team,away_team,championship_id,is_finished) values(-555,1,current_date,'Вихор','Other',6,true);insert into match_goals(match_id,player_name,team_name,goal_type) values(-555,'Борисевич','Вихор','regular');")
 assert.equal((await query("select goals from players where id=9"))[0].goals,3)
 assert.equal((await query("select player_name from match_goals where match_id=-555"))[0].player_name,'Борисевич Роман')
 await db.exec("delete from match_goals where match_id=-555")
 assert.equal((await query('select goals from players where id=9'))[0].goals,2)
 console.log('PASS: 33 reviewed identities, preserved totals, canonical rosters, surname/reversed-name prevention, event increment and reversal')
}finally{await db.close()}

