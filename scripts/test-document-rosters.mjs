import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.role()returns text language sql as 'select current_user::text';")
 for(const f of ['scripts/01-create-tables.sql','supabase/migrations/20260905090254_scope_team_names_to_championship.sql','scripts/11-add-match-cards.sql'])await db.exec(await fs.readFile(f,'utf8'))
 await db.exec('create table voting_candidates(id serial primary key,match_id integer,team_name text,player_name text);')
 await db.exec(await fs.readFile('supabase/migrations/20261110192206_player_statistics.sql','utf8'))
 await db.exec("alter table teams add column city text;create table private.player_dedup_backup(migration text primary key,payload jsonb);insert into championships(id,name,season)values(13,'Document tournament','2026/27');")
 const documents=JSON.parse(await fs.readFile('docs/rozhniv-document-rosters.json','utf8'))
 for(const d of documents)await db.query("insert into teams(id,name,city,championship_id)values($1,$2,'Original city',13)",[d.teamId,`Team ${d.teamId}`])
 await db.exec(await fs.readFile('supabase/migrations/20261112181922_import_rozhniv_document_rosters.sql','utf8'))
 assert.equal((await db.query('select count(*)::int n from players')).rows[0].n,128)
 assert.equal((await db.query("select count(*)::int n from teams where city='Original city'")).rows[0].n,8)
 assert.equal((await db.query("select count(*)::int n from players where name like 'Радиш Сергій%'or name like 'Стеф%Сергій%'")).rows[0].n,0)
 await db.exec('update teams set roster=roster')
 assert.equal((await db.query('select count(*)::int n from players')).rows[0].n,128)
 assert.ok(documents.every(d=>d.externalPhotoUrls.length===0))
 console.log('PASS: 128 players / eight document rosters; disputed player excluded; repeated saves preserve identities')
}finally{await db.close()}
