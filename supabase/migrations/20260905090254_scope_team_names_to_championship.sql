-- A club can participate in several tournaments, but only once in each one.
-- Add the replacement before removing the old constraint, so duplicates remain
-- protected throughout the migration. Do not cascade into dependent objects.
set lock_timeout = '5s';

alter table public.teams
  add constraint teams_championship_id_name_key unique (championship_id, name);

alter table public.teams drop constraint teams_name_key;

-- The unique constraint supplies the same championship/name lookup index.
drop index if exists public.teams_championship_name_idx;

reset lock_timeout;
