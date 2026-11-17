-- Tournament-owned sponsorship and a persistent, result-driven cup bracket.
alter table public.matches alter column cup_stage type text;
create table public.tournament_sponsors (
  id bigint generated always as identity primary key,
  championship_id integer not null references public.championships(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  logo_url text not null check (char_length(logo_url) <= 4096 and logo_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  website_url text check (website_url is null or (char_length(website_url) <= 4096 and website_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
  placements text[] not null default '{}' check (placements <@ array['overview','table','cup','calendar','results','scorers','lion','shop','games','match','team','player','posters']::text[]),
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  is_active boolean not null default true
);
create index tournament_sponsors_championship_idx on public.tournament_sponsors(championship_id, sort_order, id);
alter table public.tournament_sponsors enable row level security;
create policy tournament_sponsors_read on public.tournament_sponsors for select to anon, authenticated using (true);
create policy tournament_sponsors_manage on public.tournament_sponsors for all to authenticated
using (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))))
with check (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))));
revoke all on public.tournament_sponsors from anon, authenticated;
grant select on public.tournament_sponsors to anon, authenticated;
grant insert, update, delete on public.tournament_sponsors to authenticated;
revoke all on sequence public.tournament_sponsors_id_seq from anon, authenticated;
grant usage, select on sequence public.tournament_sponsors_id_seq to authenticated;

create table public.cup_formats (
  championship_id integer primary key references public.championships(id) on delete cascade,
  config jsonb not null check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 131072),
  revision integer not null default 1 check (revision > 0)
);
create table public.cup_fixtures (
  championship_id integer not null references public.cup_formats(championship_id) on delete cascade,
  id text not null check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  stage integer not null check (stage between 0 and 8),
  position integer not null check (position between 0 and 1000000),
  round integer not null check (round between 1 and 1000),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  group_id text,
  home_source jsonb not null check (jsonb_typeof(home_source) = 'object'),
  away_source jsonb not null check (jsonb_typeof(away_source) = 'object'),
  legs smallint not null check (legs in (1,2)),
  scheduled_date date not null,
  scheduled_time time,
  leg_gap_days integer not null check (leg_gap_days between 0 and 60),
  resolved boolean not null default false,
  winner_team_id integer references public.teams(id) on delete set null,
  loser_team_id integer references public.teams(id) on delete set null,
  primary key (championship_id, id),
  unique (championship_id, stage, position)
);
create index cup_fixtures_winner_idx on public.cup_fixtures(winner_team_id) where winner_team_id is not null;
create index cup_fixtures_loser_idx on public.cup_fixtures(loser_team_id) where loser_team_id is not null;
alter table public.cup_formats enable row level security;
alter table public.cup_fixtures enable row level security;
create policy cup_formats_read on public.cup_formats for select to anon, authenticated using (true);
create policy cup_fixtures_read on public.cup_fixtures for select to anon, authenticated using (true);
revoke all on public.cup_formats, public.cup_fixtures from anon, authenticated;
grant select on public.cup_formats, public.cup_fixtures to anon, authenticated;

alter table public.matches add column cup_fixture_id text, add column cup_leg smallint;
alter table public.matches add constraint matches_cup_fixture_fk foreign key (championship_id, cup_fixture_id)
  references public.cup_fixtures(championship_id, id);
alter table public.matches add constraint matches_cup_leg_check check ((cup_fixture_id is null and cup_leg is null) or (cup_fixture_id is not null and cup_leg in (1,2)));
create unique index matches_cup_fixture_leg_idx on public.matches(championship_id, cup_fixture_id, cup_leg) where cup_fixture_id is not null;

create schema if not exists private;
create or replace function private.assert_cup_manager(p_championship integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or p_championship = any(p.championship_ids))) then
    raise exception 'Немає доступу до керування цим турніром.' using errcode = '42501';
  end if;
end $$;

create or replace function private.cup_match_protected(p_match integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches m where m.id = p_match and (m.is_finished or m.home_score is not null or m.away_score is not null or m.penalty_home is not null or m.penalty_away is not null or m.youtube_url is not null))
    or exists (select 1 from public.match_goals where match_id = p_match)
    or exists (select 1 from public.match_cards where match_id = p_match)
    or exists (select 1 from public.match_votings where match_id = p_match)
    or exists (select 1 from public.voting_candidates where match_id = p_match)
$$;

-- NULL = not decided, zero = an explicit bye, positive = a real team in this cup.
create or replace function private.cup_source_team(p_championship integer, p_source jsonb) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_group jsonb; v_config jsonb; v_id integer; v_resolved boolean;
begin
  case p_source->>'kind'
  when 'bye' then return 0;
  when 'team' then return (p_source->>'teamId')::integer;
  when 'winner', 'loser' then
    select f.resolved, case when p_source->>'kind' = 'winner' then f.winner_team_id else f.loser_team_id end
      into v_resolved, v_id from public.cup_fixtures f where f.championship_id = p_championship and f.id = p_source->>'fixtureId';
    return case when v_resolved then coalesce(v_id,0) else null end;
  when 'group' then
    select config into v_config from public.cup_formats where championship_id = p_championship;
    select g into v_group from jsonb_array_elements(v_config->'groups') g where g->>'id' = p_source->>'groupId';
    if v_group is null or not exists (select 1 from public.cup_fixtures f where f.championship_id = p_championship and f.group_id = p_source->>'groupId') or exists (
      select 1 from public.cup_fixtures f left join public.matches m on m.championship_id = f.championship_id and m.cup_fixture_id = f.id
      where f.championship_id = p_championship and f.group_id = p_source->>'groupId' and (m.id is null or not m.is_finished or (not coalesce(m.is_technical_defeat,false) and (m.home_score is null or m.away_score is null)) or (m.is_technical_defeat and (m.technical_winner is null or m.technical_winner not in (m.home_team,m.away_team))))
    ) then return null; end if;
    with scores as (
      select m.home_team, m.away_team,
        case when m.is_technical_defeat then case when m.technical_winner = m.home_team then 3 else 0 end else m.home_score end h,
        case when m.is_technical_defeat then case when m.technical_winner = m.away_team then 3 else 0 end else m.away_score end a
      from public.matches m join public.cup_fixtures f on f.championship_id = m.championship_id and f.id = m.cup_fixture_id
      where f.championship_id = p_championship and f.group_id = p_source->>'groupId' and m.is_finished
    ), stats as (
      select t.id, ids.ordinality seed,
        coalesce(sum(case when (s.home_team=t.name and s.h>s.a) or (s.away_team=t.name and s.a>s.h) then (v_config->'points'->>'win')::integer when s.h=s.a then (v_config->'points'->>'draw')::integer else (v_config->'points'->>'loss')::integer end) filter(where s.home_team is not null),0) pts,
        count(*) filter(where (s.home_team=t.name and s.h>s.a) or (s.away_team=t.name and s.a>s.h)) wins,
        coalesce(sum(case when s.home_team=t.name then s.h-s.a else s.a-s.h end),0) diff,
        coalesce(sum(case when s.home_team=t.name then s.h else s.a end),0) gf
      from jsonb_array_elements_text(v_group->'teamIds') with ordinality ids(id,ordinality)
      join public.teams t on t.id=ids.id::integer and t.championship_id=p_championship
      left join scores s on t.name in (s.home_team,s.away_team) group by t.id,ids.ordinality
    ) select id into v_id from stats order by pts desc,
      case when v_config->>'tieBreak'='wins' then wins else diff end desc,
      case when v_config->>'tieBreak'='wins' then diff else wins end desc, gf desc, seed
      offset ((p_source->>'rank')::integer-1) limit 1;
    return v_id;
  else raise exception 'Невідоме джерело учасника кубка.';
  end case;
end $$;

create or replace function private.sync_cup(p_championship integer) returns void
language plpgsql security definer set search_path = '' as $$
declare f record; m record; h integer; a integer; hn text; an text; expected_h text; expected_a text;
  leg integer; total_h integer; total_a integer; complete integer; winner integer; loser integer; decided boolean; last_match record;
begin
  perform pg_advisory_xact_lock(71217,p_championship);
  perform set_config('ksliga.cup_internal','on',true);
  for f in select * from public.cup_fixtures where championship_id=p_championship order by stage,position loop
    h := private.cup_source_team(p_championship,f.home_source);
    a := private.cup_source_team(p_championship,f.away_source);
    hn := null; an := null; winner := null; loser := null; decided := false;
    select name into hn from public.teams where id=h and championship_id=p_championship;
    select name into an from public.teams where id=a and championship_id=p_championship;
    if h > 0 and a > 0 and h=a then raise exception 'Команда не може грати сама з собою (%).', f.label; end if;
    -- Retracting a result can only retract untouched downstream games.
    for m in select * from public.matches where championship_id=p_championship and cup_fixture_id=f.id order by cup_leg loop
      expected_h := case when m.cup_leg=2 then an else hn end;
      expected_a := case when m.cup_leg=2 then hn else an end;
      if expected_h is null or expected_a is null or m.home_team<>expected_h or m.away_team<>expected_a then
        if private.cup_match_protected(m.id) then raise exception 'Спочатку виправте або очистіть результат і протокол наступного матчу: % — %. Попередній результат не змінено.',m.home_team,m.away_team; end if;
        delete from public.matches where id=m.id;
      end if;
    end loop;
    if h is not null and a is not null and (h=0 or a=0) then
      decided := true; winner := nullif(greatest(h,a),0);
    elsif hn is not null and an is not null then
      for leg in 1..f.legs loop
        if not exists (select 1 from public.matches where championship_id=p_championship and cup_fixture_id=f.id and cup_leg=leg) then
          insert into public.matches(championship_id,round,date,match_time,home_team,away_team,is_finished,cup_stage,cup_fixture_id,cup_leg)
          values(p_championship,f.round+leg-1,f.scheduled_date+(leg-1)*f.leg_gap_days,f.scheduled_time,
            case when leg=2 then an else hn end,case when leg=2 then hn else an end,false,f.label,f.id,leg);
        end if;
      end loop;
      select count(*) filter(where is_finished and ((home_score is not null and away_score is not null) or (is_technical_defeat and technical_winner in (home_team,away_team)))),
        sum(case when is_technical_defeat then case when technical_winner=hn then 3 else 0 end when home_team=hn then home_score else away_score end),
        sum(case when is_technical_defeat then case when technical_winner=an then 3 else 0 end when home_team=an then home_score else away_score end)
      into complete,total_h,total_a from public.matches where championship_id=p_championship and cup_fixture_id=f.id;
      if complete=f.legs then
        decided := true;
        if total_h>total_a then winner:=h; loser:=a;
        elsif total_a>total_h then winner:=a; loser:=h;
        elsif f.group_id is null then
          select * into last_match from public.matches where championship_id=p_championship and cup_fixture_id=f.id order by cup_leg desc limit 1;
          if last_match.penalty_home is not null and last_match.penalty_away is not null and last_match.penalty_home<>last_match.penalty_away then
            expected_h:=case when last_match.penalty_home>last_match.penalty_away then last_match.home_team else last_match.away_team end;
            winner:=case when expected_h=hn then h else a end; loser:=case when winner=h then a else h end;
          else decided:=false; end if;
        end if;
      end if;
    end if;
    update public.cup_fixtures set resolved=decided,winner_team_id=winner,loser_team_id=loser where championship_id=p_championship and id=f.id and (resolved,winner_team_id,loser_team_id) is distinct from (decided,winner,loser);
  end loop;
  perform set_config('ksliga.cup_internal','off',true);
end $$;

create or replace function private.cup_match_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_setting('ksliga.cup_internal',true)='on' then return case when tg_op='DELETE' then old else new end; end if;
  if tg_op='DELETE' then
    if old.cup_fixture_id is not null and exists(select 1 from public.championships where id=old.championship_id) then raise exception 'Матч належить кубковій сітці. Керуйте структурою в конструкторі кубка.'; end if;
    return old;
  end if;
  if tg_op='INSERT' and new.cup_fixture_id is not null then raise exception 'Кубкові матчі створюються конструктором.'; end if;
  if tg_op='UPDATE' and (old.cup_fixture_id is not null or new.cup_fixture_id is not null) then
    if (old.championship_id,old.cup_fixture_id,old.cup_leg,old.home_team,old.away_team,old.round,old.cup_stage) is distinct from (new.championship_id,new.cup_fixture_id,new.cup_leg,new.home_team,new.away_team,new.round,new.cup_stage) then raise exception 'Учасників і стадію кубкового матчу змінюйте в конструкторі.'; end if;
  end if;
  return new;
end $$;
create trigger cup_match_guard before insert or update or delete on public.matches for each row execute function private.cup_match_guard();

create or replace function private.cup_result_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cup_fixture_id is not null and current_setting('ksliga.cup_internal',true) is distinct from 'on' then perform private.sync_cup(new.championship_id); end if;
  return new;
end $$;
create trigger cup_result_changed after update of is_finished,home_score,away_score,is_technical_defeat,technical_winner,penalty_home,penalty_away,penalty_winner on public.matches
  for each row execute function private.cup_result_changed();

-- Existing team editing cascades names in several requests. Rename managed
-- fixtures atomically first so a partially renamed group cannot change seeding.
create or replace function private.cup_team_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.cup_formats where championship_id=old.championship_id and config->'teamIds' @> jsonb_build_array(old.id)) then return case when tg_op='DELETE' then old else new end; end if;
  if not exists(select 1 from public.championships where id=old.championship_id) then return old; end if;
  if tg_op='DELETE' then raise exception 'Команда бере участь у кубковій сітці. Спочатку змініть склад учасників у конструкторі.'; end if;
  if old.championship_id<>new.championship_id then raise exception 'Учасника кубка не можна перенести в інший турнір.'; end if;
  if old.name is distinct from new.name then
    perform pg_advisory_xact_lock(71217,old.championship_id);
    perform set_config('ksliga.cup_internal','on',true);
    update public.matches set
      home_team=case when home_team=old.name then new.name else home_team end,
      away_team=case when away_team=old.name then new.name else away_team end,
      technical_winner=case when technical_winner=old.name then new.name else technical_winner end,
      penalty_winner=case when penalty_winner=old.name then new.name else penalty_winner end
      where championship_id=old.championship_id and cup_fixture_id is not null and (home_team=old.name or away_team=old.name);
    perform set_config('ksliga.cup_internal','off',true);
    perform private.sync_cup(old.championship_id);
  end if;
  return new;
end $$;
create trigger cup_team_rename after update of name,championship_id on public.teams for each row execute function private.cup_team_changed();
create trigger cup_team_delete before delete on public.teams for each row execute function private.cup_team_changed();

create or replace function public.publish_cup_format(p_championship integer,p_config jsonb,p_fixtures jsonb,p_revision integer default 0) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_revision integer; f jsonb; s jsonb; v_group jsonb; team_id integer; ids integer[]; group_ids integer[]; source_keys text[]:='{}'; key text;
begin
  perform private.assert_cup_manager(p_championship);
  perform pg_advisory_xact_lock(71217,p_championship);
  if not exists(select 1 from public.championships where id=p_championship and tournament_type='cup') then raise exception 'Конструктор доступний для кубкового турніру.'; end if;
  select revision into v_revision from public.cup_formats where championship_id=p_championship for update;
  if coalesce(v_revision,0)<>p_revision then raise exception 'Інший адміністратор уже змінив кубок. Оновіть сторінку.'; end if;
  if jsonb_typeof(p_config)<>'object' or octet_length(p_config::text)>131072 or p_config->>'version'<>'1' or p_config->>'mode' not in ('knockout','groups_knockout','groups') or jsonb_typeof(p_config->'teamIds')<>'array' or jsonb_typeof(p_config->'groups')<>'array' or jsonb_typeof(p_fixtures)<>'array' or jsonb_array_length(p_fixtures) not between 1 and 2048 then raise exception 'Некоректна конфігурація кубка.'; end if;
  select array_agg(value::integer) into ids from jsonb_array_elements_text(p_config->'teamIds');
  if cardinality(ids) not between 2 and 128 or cardinality(ids)<>(select count(distinct x) from unnest(ids)x) or exists(select 1 from unnest(ids)x where not exists(select 1 from public.teams t where t.id=x and t.championship_id=p_championship)) then raise exception 'У кубку можуть брати участь лише різні команди цього турніру.'; end if;
  if jsonb_array_length(p_config->'groups')>32 or p_config->>'tieBreak' not in ('difference','wins') or (p_config->>'groupLegs')::integer not in (1,2) or (p_config->>'knockoutLegs')::integer not in (1,2) or (p_config->>'finalLegs')::integer not in (1,2) then raise exception 'Перевірте правила кубка.'; end if;
  for key in select unnest(array['win','draw','loss']) loop if (p_config->'points'->>key)::integer not between 0 and 10 or p_config->'points'->>key is null then raise exception 'Перевірте очки за результат.'; end if; end loop;
  if p_config->>'mode'<>'knockout' then
    group_ids:='{}';
    if jsonb_array_length(p_config->'groups')=0 then raise exception 'Додайте групи.'; end if;
    for v_group in select value from jsonb_array_elements(p_config->'groups') loop
      if v_group->>'id' !~ '^[a-zA-Z0-9_-]{1,32}$' or char_length(btrim(v_group->>'name')) not between 1 and 80 or jsonb_array_length(v_group->'teamIds')<2 then raise exception 'Перевірте назви та склад груп.'; end if;
      for team_id in select value::integer from jsonb_array_elements_text(v_group->'teamIds') loop group_ids:=array_append(group_ids,team_id); end loop;
    end loop;
    if cardinality(group_ids)<>cardinality(ids) or cardinality(group_ids)<>(select count(distinct x) from unnest(group_ids)x) or not group_ids<@ids or (select count(distinct g->>'id') from jsonb_array_elements(p_config->'groups')g)<>jsonb_array_length(p_config->'groups') then raise exception 'Кожна команда повинна входити рівно в одну групу.'; end if;
  end if;
  for f in select value from jsonb_array_elements(p_fixtures) loop
    if ((f->>'stage')::integer=0 and (f->>'group_id' is null or (f->>'legs')::integer<>1 or f->'home_source'->>'kind'<>'team' or f->'away_source'->>'kind'<>'team')) or ((f->>'stage')::integer>0 and f->>'group_id' is not null) then raise exception 'Перевірте тип групових матчів і пар плейоф.'; end if;
    if (f->>'stage')::integer=0 and not exists(select 1 from jsonb_array_elements(p_config->'groups')g where g->>'id'=f->>'group_id') then raise exception 'Невідома група матчу.'; end if;
    for s in select unnest(array[f->'home_source',f->'away_source']) loop
      if s->>'kind'='team' then
        if (f->>'stage')::integer>0 and p_config->>'mode'<>'knockout' then raise exception 'Після групового етапу оберіть місця груп у посіві.'; end if;
        if not (s->>'teamId')::integer=any(ids) then raise exception 'Команда не належить кубку.'; end if;
        if f->>'group_id' is not null and not exists(select 1 from jsonb_array_elements(p_config->'groups')g where g->>'id'=f->>'group_id' and (g->'teamIds') @> jsonb_build_array((s->>'teamId')::integer)) then raise exception 'Команда не належить групі.'; end if;
      elsif s->>'kind' in ('winner','loser') then
        if not exists(select 1 from jsonb_array_elements(p_fixtures)x where x->>'id'=s->>'fixtureId' and (x->>'stage')::integer>0 and (x->>'stage')::integer<(f->>'stage')::integer) then raise exception 'Сітка повинна посилатися на попередні раунди.'; end if;
      elsif s->>'kind'='group' then
        if not exists(select 1 from jsonb_array_elements(p_config->'groups')g where g->>'id'=s->>'groupId' and (s->>'rank')::integer between 1 and jsonb_array_length(g->'teamIds')) then raise exception 'Невірне місце групи.'; end if;
      elsif s->>'kind'<>'bye' or s->>'kind' is null then raise exception 'Невідомий учасник сітки.'; end if;
      if (f->>'stage')::integer=1 and s->>'kind'<>'bye' then
        key:=s::text; if key=any(source_keys) then raise exception 'Учасник повторюється в посіві.'; end if; source_keys:=array_append(source_keys,key);
      end if;
    end loop;
  end loop;
  if exists(select 1 from public.matches m where m.championship_id=p_championship and m.cup_fixture_id is not null and private.cup_match_protected(m.id)) then raise exception 'Структуру вже розпочатого кубка перебудовувати не можна. Дати матчів можна редагувати окремо.'; end if;
  perform set_config('ksliga.cup_internal','on',true);
  delete from public.matches where championship_id=p_championship and cup_fixture_id is not null;
  delete from public.cup_fixtures where championship_id=p_championship;
  insert into public.cup_formats(championship_id,config,revision) values(p_championship,p_config,1)
    on conflict(championship_id) do update set config=excluded.config,revision=public.cup_formats.revision+1 returning revision into v_revision;
  insert into public.cup_fixtures(championship_id,id,stage,position,round,label,group_id,home_source,away_source,legs,scheduled_date,scheduled_time,leg_gap_days)
    select p_championship,x.id,x.stage,x.position,x.round,x.label,x.group_id,x.home_source,x.away_source,x.legs,x.scheduled_date,x.scheduled_time,x.leg_gap_days
    from jsonb_to_recordset(p_fixtures) as x(id text,stage integer,position integer,round integer,label text,group_id text,home_source jsonb,away_source jsonb,legs smallint,scheduled_date date,scheduled_time time,leg_gap_days integer);
  perform private.sync_cup(p_championship);
  return v_revision;
end $$;

create or replace function public.schedule_cup_fixture(p_championship integer,p_fixture text,p_date date,p_time time,p_gap integer,p_label text,p_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_revision integer;
begin
  perform private.assert_cup_manager(p_championship);
  perform pg_advisory_xact_lock(71217,p_championship);
  select revision into v_revision from public.cup_formats where championship_id=p_championship for update;
  if v_revision is distinct from p_revision then raise exception 'Налаштування змінилися. Оновіть кубок.'; end if;
  if p_gap not between 0 and 60 or p_date is null or char_length(btrim(p_label)) not between 1 and 80 then raise exception 'Перевірте дату, інтервал і назву стадії.'; end if;
  update public.cup_fixtures set scheduled_date=p_date,scheduled_time=p_time,leg_gap_days=p_gap,label=btrim(p_label) where championship_id=p_championship and id=p_fixture;
  if not found then raise exception 'Пару не знайдено.'; end if;
  perform set_config('ksliga.cup_internal','on',true);
  update public.matches set date=p_date+(cup_leg-1)*p_gap,match_time=p_time,cup_stage=btrim(p_label) where championship_id=p_championship and cup_fixture_id=p_fixture;
  perform set_config('ksliga.cup_internal','off',true);
  update public.cup_formats set revision=revision+1 where championship_id=p_championship returning revision into v_revision;
  return v_revision;
end $$;

revoke all on function public.publish_cup_format(integer,jsonb,jsonb,integer), public.schedule_cup_fixture(integer,text,date,time,integer,text,integer) from public,anon;
grant execute on function public.publish_cup_format(integer,jsonb,jsonb,integer), public.schedule_cup_fixture(integer,text,date,time,integer,text,integer) to authenticated;
revoke all on function private.assert_cup_manager(integer),private.cup_match_protected(integer),private.cup_source_team(integer,jsonb),private.sync_cup(integer),private.cup_match_guard(),private.cup_result_changed(),private.cup_team_changed() from public,anon,authenticated;
