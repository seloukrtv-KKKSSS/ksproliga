-- Run AFTER the player-statistics migration using an authorized database-owner
-- connection. No existing sports records or organizer profiles are modified.
-- All fixtures live in a subtransaction deliberately rolled back on success,
-- and an exception also rolls back that subtransaction. The outer ROLLBACK is
-- an additional safeguard. Generated player sequence values may have gaps.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';

do $$
declare
  fixture_suffix text := '__KS_STATS_SMOKE_' || txid_current()::text;
  fixture_id integer := -1000000000 - (txid_current() % 100000000)::integer;
  player_id integer; card_player_id integer;
  actual record; affected integer; admin_user uuid; organizer_user uuid;
  original_role text := current_user;
  passed boolean := false;
begin
  if to_regclass('public.players_championship_identity_key') is null then
    raise exception 'Player-statistics migration is not installed';
  end if;
  if exists (select 1 from pg_class where oid in ('public.players'::regclass, 'public.teams'::regclass,
      'public.match_goals'::regclass, 'public.match_cards'::regclass) and not relrowsecurity) then
    raise exception 'RLS is disabled on a statistics table';
  end if;
  if exists (select 1 from public.championships where id in (fixture_id, fixture_id - 1))
    or exists (select 1 from public.teams where id in (fixture_id, fixture_id - 1))
    or exists (select 1 from public.matches where id = fixture_id)
    or exists (select 1 from public.match_goals where id = fixture_id)
    or exists (select 1 from public.match_cards where id = fixture_id) then
    raise exception 'Smoke fixture ID collision; rerun in a new transaction';
  end if;

  begin
    insert into public.championships (id, name, season, is_active, tournament_type)
      values (fixture_id, fixture_suffix, 'smoke', false, 'league'),
        (fixture_id - 1, fixture_suffix || '_other', 'smoke', false, 'league');
    insert into public.teams (id, name, championship_id, roster)
      values (fixture_id, fixture_suffix, fixture_id,
        array['  Smoke   Player  ', 'smoke player', 'Card Player', '']),
        (fixture_id - 1, fixture_suffix, fixture_id - 1, array['Smoke Player']);
    select id into strict player_id from public.players
      where championship_id = fixture_id and team = fixture_suffix and name = 'Smoke Player';
    select id into strict card_player_id from public.players
      where championship_id = fixture_id and team = fixture_suffix and name = 'Card Player';
    if (select roster from public.teams where id = fixture_id) <> array['Smoke Player', 'Card Player'] then
      raise exception 'Roster normalization or duplicate removal failed';
    end if;
    if (select count(*) from public.players where championship_id = fixture_id) <> 2 then
      raise exception 'Roster did not create exactly two player profiles';
    end if;
    update public.players set goals = 7, yellow_cards = 2, red_cards = 1 where id = player_id;
    update public.teams set roster = array[' smoke player ', 'Card Player'] where id = fixture_id;
    select * into actual from public.players where id = player_id;
    if row(actual.goals, actual.yellow_cards, actual.red_cards) is distinct from row(7, 2, 1) then
      raise exception 'Roster save reset manual totals or replaced profile identity';
    end if;

    insert into public.matches (id, round, date, home_team, away_team, championship_id, is_finished)
      values (fixture_id, 1, current_date, fixture_suffix, fixture_suffix || '_opponent', fixture_id, true);
    insert into public.match_goals (id, match_id, player_name, team_name, goal_type)
      values (fixture_id, fixture_id, 'SMOKE  PLAYER', fixture_suffix, 'regular');
    insert into public.match_cards (id, match_id, player_name, team_name, card_type)
      values (fixture_id, fixture_id, 'Card Player', fixture_suffix, 'yellow_red');
    select * into actual from public.players where id = player_id;
    if row(actual.goals, actual.yellow_cards, actual.red_cards) is distinct from row(8, 2, 1) then
      raise exception 'Goal insertion did not update the existing player';
    end if;
    select * into actual from public.players where id = card_player_id;
    if row(actual.goals, actual.yellow_cards, actual.red_cards) is distinct from row(0, 1, 1) then
      raise exception 'Card-only player or second-yellow accounting failed';
    end if;
    if (select goals from public.players where championship_id = fixture_id - 1 and name = 'Smoke Player') <> 0 then
      raise exception 'Event statistics leaked into another tournament';
    end if;
    update public.match_goals set goal_type = 'own_goal' where id = fixture_id;
    if (select goals from public.players where id = player_id) <> 7 then
      raise exception 'Own goal was counted as a scoring goal';
    end if;
    update public.match_goals set goal_type = 'penalty' where id = fixture_id;
    delete from public.match_goals where id = fixture_id;
    delete from public.match_cards where id = fixture_id;
    select * into actual from public.players where id = player_id;
    if row(actual.goals, actual.yellow_cards, actual.red_cards) is distinct from row(7, 2, 1) then
      raise exception 'Event deletion changed manual baseline totals';
    end if;
    select * into actual from public.players where id = card_player_id;
    if row(actual.goals, actual.yellow_cards, actual.red_cards) is distinct from row(0, 0, 0) then
      raise exception 'Card deletion failed to remove both contributions';
    end if;

    -- Anonymous reads remain public; anonymous writes must be refused.
    execute 'set local role anon';
    select count(*) into affected from public.players where id = player_id;
    if affected <> 1 then raise exception 'Anonymous public player read failed'; end if;
    begin
      insert into public.players (name, team, championship_id, goals)
        values ('Forbidden Smoke Player', fixture_suffix, fixture_id, 0);
      raise exception 'Anonymous player insertion unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
    begin
      update public.players set goals = 999 where id = player_id;
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Anonymous player update unexpectedly succeeded'; end if;
    exception when insufficient_privilege then null;
    end;
    execute format('set local role %I', original_role);

    -- Exercise the real installed policies with an existing active admin.
    -- Only transaction-local JWT settings change; the profile stays untouched.
    select user_id into admin_user from public.organizer_profiles
      where is_active and role = 'admin' order by created_at, user_id limit 1;
    if admin_user is not null then
      perform set_config('request.jwt.claim.sub', admin_user::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', admin_user::text,
        'role', 'authenticated', 'app_metadata', json_build_object('role', 'admin'))::text, true);
      execute 'set local role authenticated';
      update public.teams set roster = array['Smoke Player', 'Card Player', 'RLS Player'] where id = fixture_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Authenticated admin could not save the fixture roster'; end if;
      insert into public.match_cards (id, match_id, player_name, team_name, card_type)
        values (fixture_id, fixture_id, 'RLS Player', fixture_suffix, 'yellow');
      if (select yellow_cards from public.players where championship_id = fixture_id and name = 'RLS Player') <> 1 then
        raise exception 'Invoker event trigger failed under authenticated admin RLS';
      end if;
      execute format('set local role %I', original_role);
    else
      raise notice 'Authenticated write smoke skipped: no active administrator profile is available';
    end if;

    select user_id into organizer_user from public.organizer_profiles
      where is_active and role = 'organizer'
        and not (fixture_id = any(coalesce(championship_ids, '{}'::integer[])))
      order by created_at, user_id limit 1;
    if organizer_user is not null then
      perform set_config('request.jwt.claim.sub', organizer_user::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', organizer_user::text,
        'role', 'authenticated', 'app_metadata', json_build_object('role', 'organizer'))::text, true);
      execute 'set local role authenticated';
      update public.teams set roster = array['Forbidden Smoke Player'] where id = fixture_id;
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Organizer could edit a tournament outside their scope'; end if;
      begin
        insert into public.match_cards (id, match_id, player_name, team_name, card_type)
          values (fixture_id - 1, fixture_id, 'Forbidden Smoke Player', fixture_suffix, 'yellow');
        raise exception 'Organizer could insert an event outside their tournament scope';
      exception when insufficient_privilege then null;
      end;
      execute format('set local role %I', original_role);
    else
      raise notice 'Organizer-boundary smoke skipped: no active scoped organizer profile is available';
    end if;

    -- This intentional exception discards every fixture even if the outer
    -- transaction is accidentally omitted by the SQL client.
    raise sqlstate 'PZ001' using message = 'Rollback smoke fixtures after successful checks';
  exception when sqlstate 'PZ001' then
    passed := true;
  end;

  if not passed then raise exception 'Production smoke checks did not finish'; end if;
  if exists (select 1 from public.championships where id in (fixture_id, fixture_id - 1))
    or exists (select 1 from public.players where championship_id in (fixture_id, fixture_id - 1)) then
    raise exception 'Smoke fixtures survived the rollback';
  end if;
  raise notice 'PASS: roster creation, manual totals, event statistics, tournament isolation and public RLS; every fixture rolled back';
end;
$$;
rollback;
