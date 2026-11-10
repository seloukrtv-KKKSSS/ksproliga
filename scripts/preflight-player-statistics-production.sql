-- READ ONLY. Run before applying 20261110192206_player_statistics.sql.
-- Resolve any returned duplicate/overlong identities before the migration.
begin read only;
set local statement_timeout = '20s';

select required.name as required_table, to_regclass('public.' || required.name) is not null as present
from unnest(array['championships', 'teams', 'players', 'matches', 'match_goals', 'match_cards', 'voting_candidates']) as required(name);

with identities as (
  select id, championship_id, goals,
    lower(trim(regexp_replace(normalize(team, NFC), '[[:space:] ]+', ' ', 'g'))) as team_key,
    lower(trim(regexp_replace(normalize(name, NFC), '[[:space:] ]+', ' ', 'g'))) as player_key
  from public.players
)
select championship_id, team_key, player_key, array_agg(id order by id) as profile_ids,
  array_agg(goals order by id) as existing_goal_totals
from identities group by championship_id, team_key, player_key having count(*) > 1;

select championship_id,
  lower(trim(regexp_replace(normalize(name, NFC), '[[:space:] ]+', ' ', 'g'))) as team_key,
  array_agg(id order by id) as team_ids
from public.teams group by championship_id,
  lower(trim(regexp_replace(normalize(name, NFC), '[[:space:] ]+', ' ', 'g')))
having count(*) > 1;

select count(*) filter (where championship_id is null) as players_without_tournament,
  count(*) filter (where name is null or btrim(name) = '' or team is null or btrim(team) = '') as empty_player_identities,
  count(*) filter (where goals is null or goals < 0) as goal_totals_to_normalize
from public.players;

-- Existing non-internal triggers deserve review to avoid duplicate counting.
select table_class.relname as table_name, trigger.tgname as trigger_name,
  pg_get_triggerdef(trigger.oid) as definition
from pg_trigger trigger join pg_class table_class on table_class.oid = trigger.tgrelid
join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
where table_schema.nspname = 'public' and not trigger.tgisinternal
  and table_class.relname in ('teams', 'players', 'matches', 'match_goals', 'match_cards')
order by table_class.relname, trigger.tgname;

select table_name, column_name, data_type, is_nullable
from information_schema.columns where table_schema = 'public'
  and ((table_name = 'players' and column_name in ('goals', 'yellow_cards', 'red_cards'))
    or (table_name = 'teams' and column_name = 'roster'))
order by table_name, column_name;

-- This dynamic check also works before the optional roster column exists.
do $$ declare too_long integer; begin
  if exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'teams' and column_name = 'roster') then
    execute $query$select count(*) from public.teams team cross join lateral unnest(team.roster) as roster(name)
      where char_length(trim(regexp_replace(normalize(roster.name, NFC), '[[:space:] ]+', ' ', 'g'))) > 255$query$
      into too_long;
    if too_long > 0 then raise exception 'Preflight: % roster names exceed the 255-character player name limit', too_long; end if;
  end if;
end $$;
rollback;
