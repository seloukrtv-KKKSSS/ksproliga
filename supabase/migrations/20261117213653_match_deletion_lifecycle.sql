-- Explicit match cancellation keeps removed cup games from being recreated.
do $$ begin
  if to_regclass('private.player_name_aliases') is not null then
    create index if not exists player_name_aliases_player_id_idx on private.player_name_aliases(player_id);
  end if;
end $$;
alter table public.cup_fixtures add column excluded_legs smallint[] not null default '{}';
alter table public.cup_fixtures add constraint cup_fixtures_excluded_legs_check check (
  excluded_legs='{}'::smallint[] or excluded_legs=array[1]::smallint[] or
  (legs=2 and (excluded_legs=array[2]::smallint[] or excluded_legs=array[1,2]::smallint[]))
);

create or replace function public.get_match_deletion_plan(p_match integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target public.matches%rowtype; v_group text; v_ids integer[]; v_token text; v_dependents jsonb;
begin
  select * into target from public.matches where id=p_match;
  if not found then raise exception 'Матч уже видалено або його не знайдено.'; end if;
  perform private.assert_cup_manager(target.championship_id);
  select group_id into v_group from public.cup_fixtures where championship_id=target.championship_id and id=target.cup_fixture_id;
  with recursive branch(id) as (
    select f.id from public.cup_fixtures f where f.championship_id=target.championship_id and target.cup_fixture_id is not null
      and (f.home_source->>'fixtureId'=target.cup_fixture_id or f.away_source->>'fixtureId'=target.cup_fixture_id
        or (v_group is not null and (f.home_source->>'groupId'=v_group or f.away_source->>'groupId'=v_group)))
    union
    select f.id from public.cup_fixtures f join branch b on f.home_source->>'fixtureId'=b.id or f.away_source->>'fixtureId'=b.id
      where f.championship_id=target.championship_id
  ) select coalesce(array_agg(m.id order by m.id),'{}'::integer[]),coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb)
    into v_ids,v_dependents from public.matches m where m.championship_id=target.championship_id and m.cup_fixture_id in(select id from branch) and m.id<>p_match;
  v_ids:=array_append(v_ids,p_match);
  select md5(jsonb_build_object(
    'matches',(select jsonb_agg(to_jsonb(m) order by m.id) from public.matches m where m.id=any(v_ids)),
    'goals',(select jsonb_agg(to_jsonb(g) order by g.id) from public.match_goals g where g.match_id=any(v_ids)),
    'cards',(select jsonb_agg(to_jsonb(c) order by c.id) from public.match_cards c where c.match_id=any(v_ids)),
    'voting',(select jsonb_agg(to_jsonb(v) order by v.match_id) from public.match_votings v where v.match_id=any(v_ids)),
    'candidates',(select jsonb_agg(to_jsonb(c) order by c.id) from public.voting_candidates c where c.match_id=any(v_ids)),
    'revision',(select revision from public.cup_formats where championship_id=target.championship_id)
  )::text) into v_token;
  return jsonb_build_object('match',to_jsonb(target),'dependents',v_dependents,'token',v_token);
end $$;

create or replace function public.delete_tournament_match(p_match integer,p_token text,p_include_dependents boolean default false) returns integer
language plpgsql security definer set search_path = '' as $$
declare target public.matches%rowtype; plan jsonb; v_ids integer[];
begin
  select * into target from public.matches where id=p_match;
  if not found then raise exception 'Матч уже видалено або його не знайдено.'; end if;
  perform private.assert_cup_manager(target.championship_id);
  perform pg_advisory_xact_lock(71217,target.championship_id);
  plan:=public.get_match_deletion_plan(p_match);
  if p_token is null or p_token is distinct from plan->>'token' then raise exception 'Матчі або протоколи змінилися. Закрийте й відкрийте підтвердження видалення ще раз.'; end if;
  v_ids:=array[p_match];
  if coalesce(p_include_dependents,false) then
    select v_ids||coalesce(array_agg((value->>'id')::integer),'{}'::integer[]) into v_ids from jsonb_array_elements(plan->'dependents');
  end if;
  perform set_config('ksliga.cup_internal','on',true);
  with cancelled as (
    select m.cup_fixture_id,array_agg(distinct m.cup_leg order by m.cup_leg) legs from public.matches m
      where m.id=any(v_ids) and m.cup_fixture_id is not null and m.championship_id=target.championship_id group by m.cup_fixture_id
  ) update public.cup_fixtures f set excluded_legs=(select array_agg(distinct n order by n) from unnest(f.excluded_legs||c.legs)n)
    from cancelled c where f.championship_id=target.championship_id and f.id=c.cup_fixture_id;
  delete from public.matches where id=any(v_ids) and championship_id=target.championship_id;
  if target.cup_fixture_id is not null then perform private.sync_cup(target.championship_id); end if;
  perform set_config('ksliga.cup_internal','off',true);
  return p_match;
end $$;

create or replace function public.restore_cup_match(p_championship integer,p_fixture text,p_leg integer,p_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_cup_manager(p_championship);
  perform pg_advisory_xact_lock(71217,p_championship);
  if not exists(select 1 from public.cup_formats where championship_id=p_championship and revision=p_revision) then raise exception 'Сітка змінилася. Оновіть сторінку.'; end if;
  update public.cup_fixtures set excluded_legs=array_remove(excluded_legs,p_leg::smallint)
    where championship_id=p_championship and id=p_fixture and p_leg=any(excluded_legs);
  if not found then raise exception 'Скасований матч не знайдено.'; end if;
  update public.cup_formats set revision=revision+1 where championship_id=p_championship;
  perform private.sync_cup(p_championship);
end $$;

create or replace function public.reset_cup_format(p_championship integer,p_revision integer,p_match_ids integer[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_ids integer[];
begin
  perform private.assert_cup_manager(p_championship);
  perform pg_advisory_xact_lock(71217,p_championship);
  if not exists(select 1 from public.cup_formats where championship_id=p_championship and revision=p_revision) then raise exception 'Сітка змінилася. Оновіть сторінку.'; end if;
  select coalesce(array_agg(id order by id),'{}'::integer[]) into v_ids from public.matches where championship_id=p_championship and cup_fixture_id is not null;
  if v_ids is distinct from p_match_ids then raise exception 'Список матчів змінився. Відкрийте підтвердження ще раз.'; end if;
  perform set_config('ksliga.cup_internal','on',true);
  delete from public.matches where id=any(v_ids) and championship_id=p_championship;
  delete from public.cup_formats where championship_id=p_championship;
  perform set_config('ksliga.cup_internal','off',true);
end $$;

revoke all on function public.get_match_deletion_plan(integer),public.delete_tournament_match(integer,text,boolean),public.restore_cup_match(integer,text,integer,integer),public.reset_cup_format(integer,integer,integer[]) from public,anon;
grant execute on function public.get_match_deletion_plan(integer),public.delete_tournament_match(integer,text,boolean),public.restore_cup_match(integer,text,integer,integer),public.reset_cup_format(integer,integer,integer[]) to authenticated;

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
    if v_group is null or not exists (select 1 from public.cup_fixtures f where f.championship_id = p_championship and f.group_id = p_source->>'groupId' and not (1=any(f.excluded_legs))) or exists (
      select 1 from public.cup_fixtures f left join public.matches m on m.championship_id = f.championship_id and m.cup_fixture_id = f.id
      where f.championship_id = p_championship and f.group_id = p_source->>'groupId' and not (1=any(f.excluded_legs)) and (m.id is null or not m.is_finished or (not coalesce(m.is_technical_defeat,false) and (m.home_score is null or m.away_score is null)) or (m.is_technical_defeat and (m.technical_winner is null or m.technical_winner not in (m.home_team,m.away_team))))
    ) then return null; end if;
    with scores as (
      select m.home_team, m.away_team,
        case when m.is_technical_defeat then case when m.technical_winner = m.home_team then 3 else 0 end else m.home_score end h,
        case when m.is_technical_defeat then case when m.technical_winner = m.away_team then 3 else 0 end else m.away_score end a
      from public.matches m join public.cup_fixtures f on f.championship_id = m.championship_id and f.id = m.cup_fixture_id
      where f.championship_id = p_championship and f.group_id = p_source->>'groupId' and not (1=any(f.excluded_legs)) and m.is_finished
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
      if m.cup_leg=any(f.excluded_legs) or expected_h is null or expected_a is null or m.home_team<>expected_h or m.away_team<>expected_a then
        if private.cup_match_protected(m.id) then raise exception 'Спочатку виправте або очистіть результат і протокол наступного матчу: % — %. Попередній результат не змінено.',m.home_team,m.away_team; end if;
        delete from public.matches where id=m.id;
      end if;
    end loop;
    if cardinality(f.excluded_legs)=f.legs then
      decided := false;
    elsif h is not null and a is not null and (h=0 or a=0) then
      decided := true; winner := nullif(greatest(h,a),0);
    elsif hn is not null and an is not null then
      for leg in 1..f.legs loop
        if leg=any(f.excluded_legs) then continue; end if;
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
      if complete=f.legs-cardinality(f.excluded_legs) then
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

create or replace function public.set_cup_stage_legs(p_championship integer,p_stage integer,p_legs integer,p_revision integer,p_third_place boolean default false) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_revision integer; v_old_legs integer; v_round_delta integer; v_date_delta integer;
  v_old_end date; v_new_end date; v_key text;
begin
  perform private.assert_cup_manager(p_championship);
  perform pg_advisory_xact_lock(71217,p_championship);
  select revision into v_revision from public.cup_formats where championship_id=p_championship for update;
  if v_revision is distinct from p_revision then raise exception 'Налаштування змінилися. Оновіть кубок.'; end if;
  if p_legs is null or p_legs not in (1,2) or p_stage is null or p_stage not between 1 and 8 or p_third_place is null then raise exception 'Оберіть стадію та один або два матчі.'; end if;
  select max(legs),max(scheduled_date+(legs-1)*leg_gap_days),max(scheduled_date+(p_legs-1)*leg_gap_days)
    into v_old_legs,v_old_end,v_new_end from public.cup_fixtures
    where championship_id=p_championship and stage=p_stage and ((id='third-place')=p_third_place);
  if v_old_legs is null then raise exception 'Стадію не знайдено.'; end if;
  if exists(select 1 from public.matches m join public.cup_fixtures f on f.championship_id=m.championship_id and f.id=m.cup_fixture_id
    where f.championship_id=p_championship and ((f.stage=p_stage and ((f.id='third-place')=p_third_place)) or (not p_third_place and f.stage>p_stage)) and private.cup_match_protected(m.id)) then
    raise exception 'Стадія або наступні матчі вже мають рахунок, протокол, голосування чи трансляцію. Кількість матчів не змінено.';
  end if;
  v_round_delta:=p_legs-v_old_legs;
  v_date_delta:=v_new_end-v_old_end;
  perform set_config('ksliga.cup_internal','on',true);
  if p_legs=1 then
    delete from public.matches m using public.cup_fixtures f
      where f.championship_id=p_championship and f.stage=p_stage and ((f.id='third-place')=p_third_place)
        and m.championship_id=f.championship_id and m.cup_fixture_id=f.id and m.cup_leg=2;
  end if;
  update public.cup_fixtures set legs=p_legs,excluded_legs=case when p_legs=1 then array_remove(excluded_legs,2::smallint) else excluded_legs end where championship_id=p_championship and stage=p_stage and ((id='third-place')=p_third_place);
  if not p_third_place and v_round_delta<>0 then
    update public.cup_fixtures set round=round+v_round_delta,scheduled_date=scheduled_date+v_date_delta where championship_id=p_championship and stage>p_stage;
    update public.matches m set round=m.round+v_round_delta,date=m.date+v_date_delta from public.cup_fixtures f
      where f.championship_id=p_championship and f.stage>p_stage and m.championship_id=f.championship_id and m.cup_fixture_id=f.id;
  end if;
  v_key:=case when p_third_place then 'third-place' else p_stage::text end;
  update public.cup_formats set config=jsonb_set(config,'{stageLegs}',coalesce(config->'stageLegs','{}'::jsonb)||jsonb_build_object(v_key,p_legs)),revision=revision+1
    where championship_id=p_championship returning revision into v_revision;
  perform private.sync_cup(p_championship);
  return v_revision;
end $$;
