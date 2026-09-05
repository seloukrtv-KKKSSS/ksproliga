-- Run after the team-name migration. All writes target a temporary table;
-- production teams and sequences are never modified.
begin;

create temporary table ksliga_team_scope_check
  (like public.teams including all) on commit drop;

insert into ksliga_team_scope_check (id, name, championship_id)
values (-1, 'KS scope regression', 1), (-2, 'KS scope regression', 2);

do $$
begin
  begin
    insert into ksliga_team_scope_check (id, name, championship_id)
    values (-3, 'KS scope regression', 2);
    raise exception 'FAIL: duplicate team accepted in the same tournament';
  exception when unique_violation then
    null;
  end;

  insert into ksliga_team_scope_check (id, name, championship_id)
  values (-4, 'KS other regression', 2);

  begin
    update ksliga_team_scope_check set name = 'KS scope regression' where id = -4;
    raise exception 'FAIL: rename created a duplicate in the same tournament';
  exception when unique_violation then
    null;
  end;

  update ksliga_team_scope_check set name = 'KS renamed regression' where id = -2;
  if (select name from ksliga_team_scope_check where id = -1) <> 'KS scope regression' then
    raise exception 'FAIL: the team in the other tournament changed';
  end if;
end;
$$;

rollback;
select 'PASS: same name across tournaments; duplicates and rename collisions blocked within a tournament' as result;
