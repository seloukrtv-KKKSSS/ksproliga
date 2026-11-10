import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

// This integration check runs the actual migration in an isolated
// PostgreSQL WASM instance. It never connects to Supabase or changes live data.
const db = new PGlite()
const sqlFile = (path) => readFile(new URL(path, import.meta.url), "utf8")
const query = async (sql, parameters = []) => (await db.query(sql, parameters)).rows
const player = async (name, championship = 1, team = "Club") => {
  const result = await query(`select id, name, goals, yellow_cards, red_cards from public.players
    where championship_id = $1 and private.player_name_key(name) = private.player_name_key($2)
      and private.player_name_key(team) = private.player_name_key($3)`, [championship, name, team])
  assert.equal(result.length, 1, `one canonical identity for ${name} / ${team} / ${championship}`)
  return result[0]
}
const totals = async (name, expected, championship = 1, team = "Club") => {
  const row = await player(name, championship, team)
  assert.deepEqual([row.goals, row.yellow_cards, row.red_cards], expected, `statistics for ${name} / ${team} / ${championship}`)
  return row
}

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.role() returns text language sql stable as 'select current_user::text';
  `)
  await db.exec(await sqlFile("./01-create-tables.sql"))
  await db.exec(await sqlFile("../supabase/migrations/20260905090254_scope_team_names_to_championship.sql"))
  await db.exec(await sqlFile("./11-add-match-cards.sql"))
  await db.exec(`
    alter table public.teams add column roster text[];
    create table public.voting_candidates (
      id serial primary key, match_id integer references public.matches(id) on delete cascade,
      player_name text not null, team_name text not null, votes integer default 0
    );
    insert into public.championships (name, season) values ('League', '2026'), ('Cup', '2026');
    insert into public.teams (name, championship_id, roster) values
      ('Club', 1, array['  Alex   Player ', 'alex player', '', 'New Player', 'New Player']),
      ('Club', 2, array['Alex Player']);
    insert into public.players (name, team, championship_id, goals) values
      ('Alex Player', 'Club', 1, 7), ('Alex Player', 'Club', 2, 11);
    insert into public.matches (round, date, home_team, away_team, championship_id, is_finished) values
      (1, '2026-11-01', 'Club', 'Other', 1, true),
      (1, '2026-11-01', 'Club', 'Other', 2, true),
      (2, '2026-11-10', 'Club', 'Other', 1, false);
    insert into public.match_goals (match_id, player_name, team_name, goal_type) values
      (1, 'Alex Player', 'Club', 'regular'), (1, 'Alex Player', 'Club', 'penalty');
    insert into public.match_cards (match_id, player_name, team_name, card_type) values
      (1, 'Card Only', 'Club', 'yellow');
    insert into public.voting_candidates (match_id, player_name, team_name) values (1, 'Alex Player', 'Club');
  `)
  await db.exec(await sqlFile("../supabase/migrations/20261110192206_player_statistics.sql"))

  const original = await totals("Alex Player", [7, 0, 0])
  await totals("Alex Player", [11, 0, 0], 2)
  await totals("Card Only", [0, 1, 0])
  await totals("New Player", [0, 0, 0])
  assert.deepEqual((await query("select roster from public.teams where id = 1"))[0].roster, ["Alex Player", "New Player"])
  assert.equal((await query("select count(*)::integer as count from public.players"))[0].count, 4)
  await assert.rejects(db.query("delete from public.players where id = $1", [original.id]), /пов’язаний/)
  await assert.rejects(db.exec("delete from public.players where name = 'Card Only' and championship_id = 1"), /пов’язаний/)

  // Re-saving, expanding or removing the roster must keep IDs and manual totals.
  await db.exec(`update public.players set goals = 10, yellow_cards = 4, red_cards = 2 where id = ${original.id};
    update public.teams set roster = array['alex player', ' Alex  Player ', 'New Player', 'Another Player'] where id = 1;`)
  assert.equal((await totals("Alex Player", [10, 4, 2])).id, original.id)
  await totals("Another Player", [0, 0, 0])
  await db.exec("update public.teams set roster = '{}' where id = 1")
  await totals("Alex Player", [10, 4, 2])
  await db.exec("delete from public.players where name = 'Another Player' and championship_id = 1")
  assert.equal((await query("select count(*)::integer as count from public.players where name = 'Another Player'"))[0].count, 0)

  const [{ id: goalId }] = await query(`insert into public.match_goals (match_id, player_name, team_name)
    values (1, ' ALEX   Player ', 'Club') returning id`)
  await totals("Alex Player", [11, 4, 2])
  await db.query("update public.match_goals set player_name = 'New Player' where id = $1", [goalId])
  await totals("Alex Player", [10, 4, 2])
  await totals("New Player", [1, 0, 0])
  await db.exec("update public.players set goals = 0 where name = 'New Player' and championship_id = 1")
  await db.query("update public.match_goals set minute = 42, player_name = ' new  player ' where id = $1", [goalId])
  await totals("New Player", [0, 0, 0])
  await db.query("update public.match_goals set goal_type = 'penalty' where id = $1", [goalId])
  await totals("New Player", [0, 0, 0])
  const [{ id: anotherMatchId }] = await query(`insert into public.matches
    (round, date, home_team, away_team, championship_id, is_finished)
    values (3, '2026-11-10', 'Club', 'Other', 1, true) returning id`)
  await db.query("update public.match_goals set match_id = $1 where id = $2", [anotherMatchId, goalId])
  await totals("New Player", [0, 0, 0])
  await db.query("update public.match_goals set match_id = 1 where id = $1", [goalId])
  await totals("New Player", [0, 0, 0])
  await db.query("delete from public.matches where id = $1", [anotherMatchId])
  await db.exec("update public.players set goals = 1 where name = 'New Player' and championship_id = 1")
  await db.query("update public.match_goals set goal_type = 'own_goal' where id = $1", [goalId])
  await totals("New Player", [0, 0, 0])
  await db.query("delete from public.match_goals where id = $1", [goalId])
  await totals("New Player", [0, 0, 0])

  const [{ id: cardId }] = await query(`insert into public.match_cards (match_id, player_name, team_name, card_type)
    values (1, 'New Player', 'Club', 'yellow_red') returning id`)
  await totals("New Player", [0, 1, 1])
  await db.exec("update public.players set yellow_cards = 0, red_cards = 0 where name = 'New Player' and championship_id = 1")
  await db.query("update public.match_cards set minute = 42, player_name = ' new  player ' where id = $1", [cardId])
  await totals("New Player", [0, 0, 0])
  await db.query("update public.match_cards set card_type = 'yellow' where id = $1", [cardId])
  await totals("New Player", [0, 0, 0])
  await db.query("update public.match_cards set card_type = 'yellow_red' where id = $1", [cardId])
  await totals("New Player", [0, 0, 1])
  await db.exec("update public.players set yellow_cards = 1, red_cards = 1 where name = 'New Player' and championship_id = 1")
  await db.query("update public.match_cards set card_type = 'red' where id = $1", [cardId])
  await totals("New Player", [0, 0, 1])
  await db.query("delete from public.match_cards where id = $1", [cardId])
  await totals("New Player", [0, 0, 0])

  // NULL and false are the same technical-defeat state and must not recount.
  await db.exec("update public.matches set is_technical_defeat = null where id = 2")
  await db.exec("insert into public.match_goals (match_id, player_name, team_name) values (2, 'Alex Player', 'Club')")
  await db.exec("update public.players set goals = 0 where name = 'Alex Player' and championship_id = 2")
  await db.exec("update public.matches set is_technical_defeat = false where id = 2")
  await totals("Alex Player", [0, 0, 0], 2)
  await db.exec("update public.players set goals = 11 where name = 'Alex Player' and championship_id = 2")

  // Match lifecycle changes must add/remove each event once and retain manual adjustments.
  await db.exec(`
    insert into public.match_goals (match_id, player_name, team_name) values (3, 'Alex Player', 'Club');
    insert into public.match_cards (match_id, player_name, team_name, card_type) values (3, 'New Player', 'Club', 'yellow_red');
  `)
  await totals("Alex Player", [10, 4, 2])
  await totals("New Player", [0, 0, 0])
  await db.exec("update public.matches set is_finished = true where id = 3")
  await totals("Alex Player", [11, 4, 2])
  await totals("New Player", [0, 1, 1])
  await db.exec("update public.matches set is_finished = false where id = 3")
  await totals("Alex Player", [10, 4, 2])
  await totals("New Player", [0, 0, 0])
  await db.exec("update public.matches set is_finished = true where id = 3")
  await db.exec("update public.matches set is_technical_defeat = true where id = 3")
  await totals("Alex Player", [10, 4, 2])
  await totals("New Player", [0, 0, 0])
  await db.exec("update public.matches set is_technical_defeat = false where id = 3")
  await totals("Alex Player", [11, 4, 2])
  await db.exec("delete from public.matches where id = 3")
  await totals("Alex Player", [10, 4, 2])
  await totals("New Player", [0, 0, 0])

  // Renames update every dependent name without resetting or double-counting events.
  await db.exec("update public.teams set name = 'Renamed Club' where id = 1")
  assert.equal((await totals("Alex Player", [10, 4, 2], 1, "Renamed Club")).id, original.id)
  await totals("Card Only", [0, 1, 0], 1, "Renamed Club")
  for (const table of ["match_goals", "match_cards", "voting_candidates"]) {
    assert.ok((await query(`select team_name from public.${table} where match_id = 1`)).every((row) => row.team_name === "Renamed Club"))
  }
  assert.equal((await query("select home_team from public.matches where id = 1"))[0].home_team, "Renamed Club")
  await totals("Alex Player", [11, 0, 0], 2)
  await db.exec("delete from public.matches where id = 1")
  await totals("Alex Player", [8, 4, 2], 1, "Renamed Club")
  await totals("Card Only", [0, 0, 0], 1, "Renamed Club")

  // Exercise the invoker triggers with tournament-scoped RLS under actual roles.
  // Policies model the existing organizer permissions using a session tournament
  // so this isolated test needs no Supabase Auth service or credentials.
  await db.exec(`
    do $$ declare item record; begin
      for item in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
        execute format('drop policy %I on %I.%I', item.policyname, item.schemaname, item.tablename);
      end loop;
    end $$;
    grant usage on schema public, auth to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
  `)
  for (const table of ["championships", "teams", "matches", "players", "match_goals", "match_cards", "voting_candidates"]) {
    const scope = ["match_goals", "match_cards", "voting_candidates"].includes(table)
      ? `exists (select 1 from public.matches m where m.id = ${table}.match_id and m.championship_id = current_setting('test.championship')::integer)`
      : `${table === "championships" ? "id" : "championship_id"} = current_setting('test.championship')::integer`
    await db.exec(`alter table public.${table} enable row level security;
      create policy public_read on public.${table} for select to anon, authenticated using (true);
      create policy scoped_insert on public.${table} for insert to authenticated with check (${scope});
      create policy scoped_update on public.${table} for update to authenticated using (${scope}) with check (${scope});
      create policy scoped_delete on public.${table} for delete to authenticated using (${scope});`)
  }
  await db.exec("set role anon")
  assert.ok((await query("select id from public.players")).length > 0)
  await assert.rejects(db.exec("insert into public.players (name, team, championship_id) values ('Forbidden', 'Club', 1)"), /row-level security|permission denied/)
  assert.equal((await db.query("update public.players set goals = 999 where id = $1 returning id", [original.id])).rows.length, 0)
  await db.exec("reset role; set role authenticated; set test.championship = '2'")
  await db.exec("update public.teams set roster = array['Alex Player', 'Scoped Player'] where id = 2")
  await db.exec("insert into public.match_goals (match_id, player_name, team_name) values (2, 'Scoped Player', 'Club')")
  await db.exec("reset role")
  await totals("Scoped Player", [1, 0, 0], 2)
  await db.exec("set role authenticated")
  await assert.rejects(db.exec("insert into public.players (name, team, championship_id) values ('Forbidden', 'Renamed Club', 1)"), /row-level security/)
  assert.equal((await db.query("update public.teams set roster = array['Forbidden'] where id = 1 returning id")).rows.length, 0)
  await db.exec("reset role")
  await totals("Alex Player", [8, 4, 2], 1, "Renamed Club")
  assert.equal((await query("select count(*)::integer as count from public.players where name = 'Forbidden'"))[0].count, 0)

  await db.exec(`insert into public.championships (name, season) values ('Disposable Tournament', '2026');
    insert into public.teams (name, championship_id, roster) values ('Disposable Club', 3, array['Disposable Player']);
    delete from public.championships where id = 3;`)
  assert.equal((await query("select count(*)::integer as count from public.players where championship_id = 3"))[0].count, 0)

  console.log("Player statistics SQL checks passed: historical totals, normalized rosters, goal/card edits, match lifecycle, team renames and tournament-scoped RLS")
} finally {
  await db.close()
}
