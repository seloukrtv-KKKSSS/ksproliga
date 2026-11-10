-- Player records are shared by rosters, manual totals and match events.
-- Existing manually entered totals are preserved during the backfill.
begin;
set local lock_timeout = '5s';

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.clean_player_name(value text)
returns text language sql immutable strict security invoker set search_path = ''
as $$ select trim(regexp_replace(normalize(value, NFC), '[[:space:] ]+', ' ', 'g')) $$;
create or replace function private.player_name_key(value text)
returns text language sql immutable strict security invoker set search_path = ''
as $$ select lower(private.clean_player_name(value)) $$;

alter table public.teams add column if not exists roster text[];
alter table public.players
  add column if not exists yellow_cards integer not null default 0,
  add column if not exists red_cards integer not null default 0;
update public.players set goals = greatest(coalesce(goals, 0), 0);
alter table public.players alter column goals set default 0;
alter table public.players alter column goals set not null;
alter table public.players add constraint players_nonnegative_statistics
  check (goals >= 0 and yellow_cards >= 0 and red_cards >= 0);

-- Fail rather than silently merge existing identities or discard profile IDs.
create unique index players_championship_identity_key on public.players
  (championship_id, private.player_name_key(team), private.player_name_key(name));
create index if not exists match_goals_player_match_idx
  on public.match_goals (player_name, team_name, match_id);
create index if not exists match_cards_player_match_idx
  on public.match_cards (player_name, team_name, match_id);

create or replace function private.apply_player_stat_delta(
  championship integer, player_name text, team_name text,
  goal_delta integer, yellow_delta integer, red_delta integer
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if championship is null or private.clean_player_name(player_name) = ''
    or private.clean_player_name(team_name) = '' then return; end if;
  if goal_delta > 0 or yellow_delta > 0 or red_delta > 0 then
    insert into public.players (name, team, championship_id, goals, yellow_cards, red_cards)
    values (private.clean_player_name(player_name), private.clean_player_name(team_name),
      championship, greatest(goal_delta, 0), greatest(yellow_delta, 0), greatest(red_delta, 0))
    on conflict (championship_id, (private.player_name_key(team)), (private.player_name_key(name)))
    do update set goals = greatest(0, public.players.goals + goal_delta),
      yellow_cards = greatest(0, public.players.yellow_cards + yellow_delta),
      red_cards = greatest(0, public.players.red_cards + red_delta);
  else
    update public.players set goals = greatest(0, goals + goal_delta),
      yellow_cards = greatest(0, yellow_cards + yellow_delta),
      red_cards = greatest(0, red_cards + red_delta)
    where championship_id = championship
      and private.player_name_key(name) = private.player_name_key(player_name)
      and private.player_name_key(team) = private.player_name_key(team_name);
  end if;
end;
$$;

create or replace function private.normalize_team_roster()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select coalesce(array_agg(item.name order by item.position), '{}'::text[]) into new.roster
  from (
    select distinct on (private.player_name_key(value)) private.clean_player_name(value) as name, position
    from unnest(new.roster) with ordinality as roster(value, position)
    where private.clean_player_name(value) <> ''
    order by private.player_name_key(value), position
  ) item;
  return new;
end;
$$;

create or replace function private.sync_team_players()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare previous_skip text;
begin
  if tg_op = 'UPDATE' and (old.name is distinct from new.name) then
    -- The team and its named events move together; this must not count events twice.
    previous_skip := current_setting('ksliga.skip_player_stat_sync', true);
    perform set_config('ksliga.skip_player_stat_sync', 'on', true);
    update public.players set team = new.name
      where championship_id = old.championship_id
        and private.player_name_key(team) = private.player_name_key(old.name);
    update public.match_goals event set team_name = new.name
      from public.matches match where event.match_id = match.id
        and match.championship_id = old.championship_id
        and private.player_name_key(event.team_name) = private.player_name_key(old.name);
    update public.match_cards event set team_name = new.name
      from public.matches match where event.match_id = match.id
        and match.championship_id = old.championship_id
        and private.player_name_key(event.team_name) = private.player_name_key(old.name);
    update public.voting_candidates event set team_name = new.name
      from public.matches match where event.match_id = match.id
        and match.championship_id = old.championship_id
        and private.player_name_key(event.team_name) = private.player_name_key(old.name);
    update public.matches set
      home_team = case when home_team = old.name then new.name else home_team end,
      away_team = case when away_team = old.name then new.name else away_team end,
      technical_winner = case when technical_winner = old.name then new.name else technical_winner end,
      penalty_winner = case when penalty_winner = old.name then new.name else penalty_winner end
      where championship_id = old.championship_id
        and (home_team = old.name or away_team = old.name or technical_winner = old.name or penalty_winner = old.name);
    perform set_config('ksliga.skip_player_stat_sync', coalesce(previous_skip, ''), true);
  end if;
  insert into public.players (name, team, championship_id, goals)
    select name, new.name, new.championship_id, 0 from unnest(new.roster) as roster(name)
  on conflict (championship_id, (private.player_name_key(team)), (private.player_name_key(name))) do nothing;
  -- Removed roster entries deliberately retain their profile and statistics.
  return new;
end;
$$;

create trigger teams_normalize_roster before insert or update of roster on public.teams
  for each row execute function private.normalize_team_roster();
create trigger teams_sync_players after insert or update of roster, name on public.teams
  for each row execute function private.sync_team_players();

-- Normalize and import existing rosters without resetting any player totals.
update public.teams set roster = roster;

-- Import event-only players, including players with cards and no goals.
insert into public.players (name, team, championship_id, goals)
select distinct on (match.championship_id, private.player_name_key(event.team_name), private.player_name_key(event.player_name))
  private.clean_player_name(event.player_name), private.clean_player_name(event.team_name), match.championship_id, 0
from (
  select match_id, player_name, team_name from public.match_goals
  union all select match_id, player_name, team_name from public.match_cards
) event join public.matches match on match.id = event.match_id
where private.clean_player_name(event.player_name) <> '' and private.clean_player_name(event.team_name) <> ''
on conflict (championship_id, (private.player_name_key(team)), (private.player_name_key(name))) do nothing;

with event_totals as (
  select match.championship_id, private.player_name_key(event.player_name) as player_key,
    private.player_name_key(event.team_name) as team_key,
    sum(event.goals)::integer as goals, sum(event.yellow)::integer as yellow, sum(event.red)::integer as red
  from (
    select match_id, player_name, team_name, case when goal_type = 'own_goal' then 0 else 1 end as goals, 0 as yellow, 0 as red
    from public.match_goals
    union all
    select match_id, player_name, team_name, 0,
      case when card_type in ('yellow', 'yellow_red') then 1 else 0 end,
      case when card_type in ('red', 'yellow_red') then 1 else 0 end from public.match_cards
  ) event join public.matches match on match.id = event.match_id
  where match.is_finished and not coalesce(match.is_technical_defeat, false)
  group by match.championship_id, private.player_name_key(event.player_name), private.player_name_key(event.team_name)
)
update public.players player set goals = greatest(player.goals, event.goals),
  yellow_cards = greatest(player.yellow_cards, event.yellow), red_cards = greatest(player.red_cards, event.red)
from event_totals event where player.championship_id = event.championship_id
  and private.player_name_key(player.name) = event.player_key and private.player_name_key(player.team) = event.team_key;

create or replace function private.sync_match_event_statistics()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  contribution record; match_record record;
  previous_match_id integer; next_match_id integer;
  previous_championship integer; next_championship integer;
  previous_name text; next_name text; previous_team text; next_team text;
  previous_goals integer := 0; next_goals integer := 0;
  previous_yellow integer := 0; next_yellow integer := 0;
  previous_red integer := 0; next_red integer := 0;
begin
  if current_setting('ksliga.skip_player_stat_sync', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op <> 'INSERT' then previous_match_id := old.match_id; end if;
  if tg_op <> 'DELETE' then next_match_id := new.match_id; end if;
  -- Serialize with match status changes and lock moved events in a stable order.
  perform 1 from public.matches where id = any(array[previous_match_id, next_match_id]) order by id for update;
  if tg_op <> 'INSERT' then
    select * into match_record from public.matches where id = previous_match_id;
    if found and match_record.is_finished and not coalesce(match_record.is_technical_defeat, false) then
      previous_championship := match_record.championship_id;
      previous_name := old.player_name; previous_team := old.team_name;
      if tg_table_name = 'match_cards' then
        previous_yellow := case when old.card_type in ('yellow', 'yellow_red') then -1 else 0 end;
        previous_red := case when old.card_type in ('red', 'yellow_red') then -1 else 0 end;
      else
        previous_goals := case when old.goal_type = 'own_goal' then 0 else -1 end;
      end if;
    end if;
  end if;
  if tg_op <> 'DELETE' then
    select * into match_record from public.matches where id = next_match_id;
    if found and match_record.is_finished and not coalesce(match_record.is_technical_defeat, false) then
      next_championship := match_record.championship_id;
      next_name := new.player_name; next_team := new.team_name;
      if tg_table_name = 'match_cards' then
        next_yellow := case when new.card_type in ('yellow', 'yellow_red') then 1 else 0 end;
        next_red := case when new.card_type in ('red', 'yellow_red') then 1 else 0 end;
      else
        next_goals := case when new.goal_type = 'own_goal' then 0 else 1 end;
      end if;
    end if;
  end if;
  -- Apply the NET contribution once per identity. Subtracting then adding would
  -- alter a manually corrected zero total even for a minute-only event edit.
  for contribution in
    select item.championship, min(item.player_name) as player_name, min(item.team_name) as team_name,
      sum(item.goals)::integer as goals, sum(item.yellow)::integer as yellow, sum(item.red)::integer as red
    from (values
      (previous_championship, previous_name, previous_team, previous_goals, previous_yellow, previous_red),
      (next_championship, next_name, next_team, next_goals, next_yellow, next_red)
    ) item(championship, player_name, team_name, goals, yellow, red)
    where item.championship is not null
    group by item.championship, private.player_name_key(item.player_name), private.player_name_key(item.team_name)
    having sum(item.goals) <> 0 or sum(item.yellow) <> 0 or sum(item.red) <> 0
    order by item.championship, private.player_name_key(item.team_name), private.player_name_key(item.player_name)
  loop
    perform private.apply_player_stat_delta(contribution.championship, contribution.player_name, contribution.team_name,
      contribution.goals, contribution.yellow, contribution.red);
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger match_goals_sync_statistics after insert or update or delete on public.match_goals
  for each row execute function private.sync_match_event_statistics();
create trigger match_cards_sync_statistics after insert or update or delete on public.match_cards
  for each row execute function private.sync_match_event_statistics();

create or replace function private.sync_match_statistics()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare event record; multiplier integer; championship integer; counts boolean;
begin
  if tg_op = 'UPDATE' and
    (coalesce(old.is_finished, false) and not coalesce(old.is_technical_defeat, false))
      = (coalesce(new.is_finished, false) and not coalesce(new.is_technical_defeat, false))
    and old.championship_id is not distinct from new.championship_id then return new; end if;
  for multiplier in select unnest(array[-1, 1]) loop
    if multiplier = 1 and tg_op = 'DELETE' then continue; end if;
    if multiplier = -1 then
      championship := old.championship_id;
      counts := old.is_finished and not coalesce(old.is_technical_defeat, false);
    else
      championship := new.championship_id;
      counts := new.is_finished and not coalesce(new.is_technical_defeat, false);
    end if;
    if not counts then continue; end if;
    for event in
      select player_name, team_name,
        sum(goals)::integer as goals, sum(yellow)::integer as yellow, sum(red)::integer as red
      from (
        select player_name, team_name, case when goal_type = 'own_goal' then 0 else 1 end as goals, 0 as yellow, 0 as red
        from public.match_goals where match_id = old.id
        union all select player_name, team_name, 0,
          case when card_type in ('yellow', 'yellow_red') then 1 else 0 end,
          case when card_type in ('red', 'yellow_red') then 1 else 0 end
        from public.match_cards where match_id = old.id
      ) events group by player_name, team_name order by team_name, player_name
    loop
      perform private.apply_player_stat_delta(championship, event.player_name, event.team_name,
        multiplier * event.goals, multiplier * event.yellow, multiplier * event.red);
    end loop;
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger matches_sync_statistics before update or delete on public.matches
  for each row execute function private.sync_match_statistics();

-- A profile that is still used by a roster or an event is edited, not deleted.
-- Serialize this rare destructive operation with roster saves and event writes.
create or replace function private.protect_linked_player()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- The parent row has already disappeared during ON DELETE CASCADE.
  if not exists (select 1 from public.championships where id = old.championship_id) then return old; end if;
  perform 1 from public.teams team where team.championship_id = old.championship_id
    and private.player_name_key(team.name) = private.player_name_key(old.team) order by team.id for update;
  perform 1 from public.matches match where match.championship_id = old.championship_id order by match.id for update;
  if exists (
    select 1 from public.teams team cross join lateral unnest(team.roster) as roster(name)
    where team.championship_id = old.championship_id
      and private.player_name_key(team.name) = private.player_name_key(old.team)
      and private.player_name_key(roster.name) = private.player_name_key(old.name)
  ) or exists (
    select 1 from public.match_goals event join public.matches match on match.id = event.match_id
    where match.championship_id = old.championship_id
      and private.player_name_key(event.team_name) = private.player_name_key(old.team)
      and private.player_name_key(event.player_name) = private.player_name_key(old.name)
  ) or exists (
    select 1 from public.match_cards event join public.matches match on match.id = event.match_id
    where match.championship_id = old.championship_id
      and private.player_name_key(event.team_name) = private.player_name_key(old.team)
      and private.player_name_key(event.player_name) = private.player_name_key(old.name)
  ) then
    raise exception using errcode = '23503', message = 'Гравець пов’язаний зі складом або подіями матчів. Спочатку приберіть ці зв’язки; для виправлення статистики редагуйте підсумки.';
  end if;
  return old;
end;
$$;
create trigger players_protect_linked before delete on public.players
  for each row execute function private.protect_linked_player();

-- Invoker functions retain the existing organizer/tournament RLS restrictions.
-- Helpers are in a non-exposed schema and cannot be called as public Data API RPCs.
revoke all on function private.clean_player_name(text), private.player_name_key(text),
  private.apply_player_stat_delta(integer, text, text, integer, integer, integer),
  private.normalize_team_roster(), private.sync_team_players(),
  private.sync_match_event_statistics(), private.sync_match_statistics(), private.protect_linked_player()
from public, anon, authenticated;
grant execute on function private.clean_player_name(text), private.player_name_key(text),
  private.apply_player_stat_delta(integer, text, text, integer, integer, integer),
  private.normalize_team_roster(), private.sync_team_players(),
  private.sync_match_event_statistics(), private.sync_match_statistics(), private.protect_linked_player()
to authenticated;

notify pgrst, 'reload schema';
commit;
