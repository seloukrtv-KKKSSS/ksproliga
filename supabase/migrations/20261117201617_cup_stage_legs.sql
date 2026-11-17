create or replace function private.valid_cup_stage_legs(p_config jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when not p_config ? 'stageLegs' then true
    when jsonb_typeof(p_config->'stageLegs') <> 'object' then false
    else not exists(select 1 from jsonb_each(p_config->'stageLegs') e where e.key !~ '^([1-8]|third-place)$' or e.value not in ('1'::jsonb,'2'::jsonb)) end
$$;
alter table public.cup_formats add constraint cup_formats_stage_legs_check check(private.valid_cup_stage_legs(config));
revoke all on function private.valid_cup_stage_legs(jsonb) from public,anon,authenticated;

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
  update public.cup_fixtures set legs=p_legs where championship_id=p_championship and stage=p_stage and ((id='third-place')=p_third_place);
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
revoke all on function public.set_cup_stage_legs(integer,integer,integer,integer,boolean) from public,anon;
grant execute on function public.set_cup_stage_legs(integer,integer,integer,integer,boolean) to authenticated;
