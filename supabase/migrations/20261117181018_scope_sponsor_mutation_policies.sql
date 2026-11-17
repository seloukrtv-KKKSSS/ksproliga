-- Keep public SELECT independent of organizer authorization checks.
drop policy tournament_sponsors_manage on public.tournament_sponsors;
create policy tournament_sponsors_insert on public.tournament_sponsors for insert to authenticated
with check (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))));
create policy tournament_sponsors_update on public.tournament_sponsors for update to authenticated
using (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))))
with check (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))));
create policy tournament_sponsors_delete on public.tournament_sponsors for delete to authenticated
using (exists (select 1 from public.organizer_profiles p where p.user_id = (select auth.uid()) and p.is_active and (p.role = 'admin' or championship_id = any(p.championship_ids))));
