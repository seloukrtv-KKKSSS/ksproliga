-- KS LIGA secure administrator authentication and least-privilege Data API access.
-- Public sports data remains readable, while every administrative mutation is
-- authorized against the signed-in user's organizer profile.

create table if not exists public.organizer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'organizer' check (role in ('admin', 'organizer')),
  championship_ids integer[] not null default '{}',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizer_profiles_role_active_idx
  on public.organizer_profiles (role, is_active);

alter table public.products
  add column if not exists author_user_id uuid references auth.users(id) on delete set null;

create index if not exists products_author_user_id_idx
  on public.products (author_user_id);

-- Keep one canonical high score per player and game before adding the unique key.
with ranked_scores as (
  select id,
         row_number() over (
           partition by lower(btrim(player_name)), game_type
           order by score desc, created_at asc, id asc
         ) as row_number
  from public.game_scores
)
delete from public.game_scores scores
using ranked_scores ranked
where scores.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists game_scores_player_game_uidx
  on public.game_scores (lower(btrim(player_name)), game_type);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_scores_game_type_check'
      and conrelid = 'public.game_scores'::regclass
  ) then
    alter table public.game_scores
      add constraint game_scores_game_type_check check (game_type in ('dino', 'snake'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'game_scores_score_check'
      and conrelid = 'public.game_scores'::regclass
  ) then
    alter table public.game_scores
      add constraint game_scores_score_check check (score between 1 and 100000000);
  end if;
end
$$;

-- Remove legacy permissive policies before enabling RLS everywhere.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'championships', 'teams', 'matches', 'players', 'match_goals',
        'match_cards', 'match_votings', 'voting_candidates', 'products',
        'organizers', 'organizer_profiles', 'organizer_logs',
        'user_analytics', 'game_scores'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

alter table public.championships enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.match_votings enable row level security;
alter table public.voting_candidates enable row level security;
alter table public.products enable row level security;
alter table public.organizer_profiles enable row level security;
alter table public.organizer_logs enable row level security;
alter table public.user_analytics enable row level security;
alter table public.game_scores enable row level security;

-- Profiles: users see themselves; only users carrying server-controlled admin
-- app_metadata can list all profiles. Mutations happen through a trusted Edge Function.
create policy organizer_profiles_select
on public.organizer_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

-- Championship public reads and scoped administration.
create policy championships_public_select
on public.championships for select to anon, authenticated using (true);

create policy championships_admin_insert
on public.championships for insert to authenticated
with check (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and profile.role = 'admin'
  )
);

create policy championships_scoped_update
on public.championships for update to authenticated
using (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and (profile.role = 'admin' or championships.id = any(profile.championship_ids))
  )
)
with check (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and (profile.role = 'admin' or championships.id = any(profile.championship_ids))
  )
);

create policy championships_admin_delete
on public.championships for delete to authenticated
using (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and profile.role = 'admin'
  )
);

-- Direct championship-owned tables.
create policy teams_public_select
on public.teams for select to anon, authenticated using (true);
create policy teams_scoped_insert
on public.teams for insert to authenticated
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or teams.championship_id = any(profile.championship_ids))
));
create policy teams_scoped_update
on public.teams for update to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or teams.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or teams.championship_id = any(profile.championship_ids))
));
create policy teams_scoped_delete
on public.teams for delete to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or teams.championship_id = any(profile.championship_ids))
));

create policy matches_public_select
on public.matches for select to anon, authenticated using (true);
create policy matches_scoped_insert
on public.matches for insert to authenticated
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or matches.championship_id = any(profile.championship_ids))
));
create policy matches_scoped_update
on public.matches for update to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or matches.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or matches.championship_id = any(profile.championship_ids))
));
create policy matches_scoped_delete
on public.matches for delete to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or matches.championship_id = any(profile.championship_ids))
));

create policy players_public_select
on public.players for select to anon, authenticated using (true);
create policy players_scoped_insert
on public.players for insert to authenticated
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or players.championship_id = any(profile.championship_ids))
));
create policy players_scoped_update
on public.players for update to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or players.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or players.championship_id = any(profile.championship_ids))
));
create policy players_scoped_delete
on public.players for delete to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or players.championship_id = any(profile.championship_ids))
));

-- Match-owned tables are authorized through the parent match championship.
create policy match_goals_public_select
on public.match_goals for select to anon, authenticated using (true);
create policy match_goals_scoped_insert
on public.match_goals for insert to authenticated
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_goals.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_goals_scoped_update
on public.match_goals for update to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_goals.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_goals.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_goals_scoped_delete
on public.match_goals for delete to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_goals.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));

create policy match_cards_public_select
on public.match_cards for select to anon, authenticated using (true);
create policy match_cards_scoped_insert
on public.match_cards for insert to authenticated
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_cards.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_cards_scoped_update
on public.match_cards for update to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_cards.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_cards.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_cards_scoped_delete
on public.match_cards for delete to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_cards.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));

create policy match_votings_public_select
on public.match_votings for select to anon, authenticated using (true);
create policy match_votings_scoped_insert
on public.match_votings for insert to authenticated
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_votings.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_votings_scoped_update
on public.match_votings for update to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_votings.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_votings.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy match_votings_scoped_delete
on public.match_votings for delete to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = match_votings.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));

create policy voting_candidates_public_select
on public.voting_candidates for select to anon, authenticated using (true);
create policy voting_candidates_scoped_insert
on public.voting_candidates for insert to authenticated
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = voting_candidates.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy voting_candidates_scoped_update
on public.voting_candidates for update to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = voting_candidates.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
))
with check (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = voting_candidates.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));
create policy voting_candidates_scoped_delete
on public.voting_candidates for delete to authenticated
using (exists (
  select 1
  from public.organizer_profiles profile
  join public.matches match on match.id = voting_candidates.match_id
  where profile.user_id = (select auth.uid()) and profile.is_active
    and (profile.role = 'admin' or match.championship_id = any(profile.championship_ids))
));

-- Shop: everyone sees approved listings; organizers can manage only their own
-- unapproved announcements; main admins can manage every item.
create policy products_anon_select
on public.products for select to anon using (is_approved is true);
create policy products_authenticated_select
on public.products for select to authenticated
using (
  is_approved is true
  or author_user_id = (select auth.uid())
  or exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active and profile.role = 'admin'
  )
);
create policy products_scoped_insert
on public.products for insert to authenticated
with check (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid()) and profile.is_active
      and (
        profile.role = 'admin'
        or (
          products.author_user_id = profile.user_id
          and products.author_name = profile.name
          and products.is_official is false
          and products.is_approved is false
        )
      )
  )
);
create policy products_scoped_update
on public.products for update to authenticated
using (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid()) and profile.is_active
      and (profile.role = 'admin' or products.author_user_id = profile.user_id)
  )
)
with check (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid()) and profile.is_active
      and (
        profile.role = 'admin'
        or (
          products.author_user_id = profile.user_id
          and products.author_name = profile.name
          and products.is_official is false
          and products.is_approved is false
        )
      )
  )
);
create policy products_scoped_delete
on public.products for delete to authenticated
using (
  exists (
    select 1 from public.organizer_profiles profile
    where profile.user_id = (select auth.uid()) and profile.is_active
      and (profile.role = 'admin' or products.author_user_id = profile.user_id)
  )
);

-- Audit data and analytics are private to the main administrator.
create policy organizer_logs_admin_select
on public.organizer_logs for select to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.is_active and profile.role = 'admin'
));
create policy organizer_logs_member_insert
on public.organizer_logs for insert to authenticated
with check (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid()) and profile.is_active
    and organizer_logs.organizer_name = profile.name
));
create policy organizer_logs_admin_delete
on public.organizer_logs for delete to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.is_active and profile.role = 'admin'
));

create policy user_analytics_admin_select
on public.user_analytics for select to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.is_active and profile.role = 'admin'
));
create policy user_analytics_admin_delete
on public.user_analytics for delete to authenticated
using (exists (
  select 1 from public.organizer_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.is_active and profile.role = 'admin'
));

create policy game_scores_public_select
on public.game_scores for select to anon, authenticated using (true);

-- Constrained public RPCs replace arbitrary table updates.
create or replace function public.cast_match_vote(candidate_id integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.voting_candidates candidate
  set votes = coalesce(candidate.votes, 0) + 1
  where candidate.id = candidate_id
    and candidate.is_hidden is not true
    and exists (
      select 1
      from public.match_votings voting
      where voting.match_id = candidate.match_id
        and voting.is_active is true
        and (voting.start_time is null or voting.start_time <= now())
        and (voting.end_time is null or voting.end_time >= now())
    );

  if not found then
    raise exception 'Voting is unavailable for this candidate';
  end if;
end;
$$;

create or replace function public.touch_organizer_login()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.organizer_profiles
  set last_login_at = now(), updated_at = now()
  where user_id = (select auth.uid())
    and is_active is true;
$$;

create or replace function public.record_user_analytics(
  analytics_session_id text,
  analytics_active_tab text,
  analytics_duration_seconds integer,
  analytics_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id bigint;
begin
  if char_length(analytics_session_id) not between 8 and 100
     or char_length(analytics_active_tab) not between 1 and 40 then
    raise exception 'Invalid analytics payload';
  end if;

  insert into public.user_analytics (
    session_id, active_tab, duration_seconds, user_agent
  ) values (
    left(analytics_session_id, 100),
    left(analytics_active_tab, 40),
    greatest(1, least(coalesce(analytics_duration_seconds, 1), 86400)),
    left(coalesce(analytics_user_agent, ''), 500)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.update_user_analytics_duration(
  analytics_id bigint,
  analytics_session_id text,
  analytics_duration_seconds integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_analytics
  set duration_seconds = greatest(1, least(coalesce(analytics_duration_seconds, 1), 86400))
  where id = analytics_id
    and session_id = analytics_session_id
    and created_at >= now() - interval '1 day';
$$;

create or replace function public.submit_game_score(
  score_player_name text,
  score_game_type text,
  score_value integer
)
returns public.game_scores
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := left(btrim(score_player_name), 30);
  score_row public.game_scores;
begin
  if char_length(clean_name) not between 2 and 30
     or score_game_type not in ('dino', 'snake')
     or score_value not between 1 and 100000000 then
    raise exception 'Invalid game score payload';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(clean_name) || ':' || score_game_type, 0));

  select * into score_row
  from public.game_scores
  where lower(btrim(player_name)) = lower(clean_name)
    and game_type = score_game_type
  limit 1;

  if score_row.id is null then
    insert into public.game_scores (player_name, game_type, score)
    values (clean_name, score_game_type, score_value)
    returning * into score_row;
  elsif score_value > score_row.score then
    update public.game_scores
    set player_name = clean_name,
        score = score_value,
        created_at = now()
    where id = score_row.id
    returning * into score_row;
  end if;

  return score_row;
end;
$$;

revoke all on function public.cast_match_vote(integer) from public, anon, authenticated;
revoke all on function public.touch_organizer_login() from public, anon, authenticated;
revoke all on function public.record_user_analytics(text, text, integer, text) from public, anon, authenticated;
revoke all on function public.update_user_analytics_duration(bigint, text, integer) from public, anon, authenticated;
revoke all on function public.submit_game_score(text, text, integer) from public, anon, authenticated;
grant execute on function public.cast_match_vote(integer) to anon, authenticated;
grant execute on function public.touch_organizer_login() to authenticated;
grant execute on function public.record_user_analytics(text, text, integer, text) to anon, authenticated;
grant execute on function public.update_user_analytics_duration(bigint, text, integer) to anon, authenticated;
grant execute on function public.submit_game_score(text, text, integer) to anon, authenticated;

-- Exact Data API privileges: public users read published content and call the
-- constrained RPCs; authenticated administrators receive DML that RLS scopes.
revoke all on table public.championships, public.teams, public.matches,
  public.players, public.match_goals, public.match_cards, public.match_votings,
  public.voting_candidates, public.products, public.organizer_profiles,
  public.organizer_logs, public.user_analytics, public.game_scores
from anon, authenticated;

grant select on table public.championships, public.teams, public.matches,
  public.players, public.match_goals, public.match_cards, public.match_votings,
  public.voting_candidates, public.products, public.game_scores
to anon, authenticated;

grant insert, update, delete on table public.championships, public.teams,
  public.matches, public.players, public.match_goals, public.match_cards,
  public.match_votings, public.voting_candidates, public.products
to authenticated;

grant select on table public.organizer_profiles to authenticated;
grant select, insert, delete on table public.organizer_logs to authenticated;
grant select, delete on table public.user_analytics to authenticated;

grant usage, select on all sequences in schema public to authenticated;
revoke all on all sequences in schema public from anon;

-- The legacy table stored plaintext passwords. It is intentionally removed
-- only after the new profile table and policies are ready.
drop table if exists public.organizers;

-- Fix the mutable search_path advisory on the existing league helper.
create or replace function public.calculate_league_table(championship_id_param integer)
returns table(
  name text,
  games integer,
  wins integer,
  draws integer,
  losses integer,
  gf integer,
  ga integer,
  pts integer
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with team_stats as (
    select
      team.name::text as team_name,
      count(match.id) as games_played,
      coalesce(sum(case
        when match.home_team = team.name and not match.is_technical_defeat then match.home_score
        when match.away_team = team.name and not match.is_technical_defeat then match.away_score
        else 0 end), 0) as goals_for,
      coalesce(sum(case
        when match.home_team = team.name and not match.is_technical_defeat then match.away_score
        when match.away_team = team.name and not match.is_technical_defeat then match.home_score
        else 0 end), 0) as goals_against,
      count(case when
        (match.home_team = team.name and match.home_score > match.away_score and not match.is_technical_defeat)
        or (match.away_team = team.name and match.away_score > match.home_score and not match.is_technical_defeat)
        or (match.is_technical_defeat and match.technical_winner = team.name)
        then 1 end) as team_wins,
      count(case when
        match.home_score = match.away_score and not match.is_technical_defeat
        and (match.home_team = team.name or match.away_team = team.name)
        then 1 end) as team_draws,
      count(case when
        (match.home_team = team.name and match.home_score < match.away_score and not match.is_technical_defeat)
        or (match.away_team = team.name and match.away_score < match.home_score and not match.is_technical_defeat)
        or (match.is_technical_defeat and match.technical_winner != team.name
            and (match.home_team = team.name or match.away_team = team.name))
        then 1 end) as team_losses
    from public.teams team
    left join public.matches match
      on (match.home_team = team.name or match.away_team = team.name)
      and match.is_finished = true
      and match.championship_id = championship_id_param
    where team.championship_id = championship_id_param
    group by team.name
  )
  select
    stats.team_name,
    stats.games_played::integer,
    stats.team_wins::integer,
    stats.team_draws::integer,
    stats.team_losses::integer,
    stats.goals_for::integer,
    stats.goals_against::integer,
    (stats.team_wins * 3 + stats.team_draws)::integer as points
  from team_stats stats
  order by points desc,
           (stats.goals_for - stats.goals_against) desc,
           stats.goals_for desc;
end;
$$;
