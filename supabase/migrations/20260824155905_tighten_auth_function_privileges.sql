-- Supabase may carry explicit anon/authenticated EXECUTE grants from default
-- privileges. Remove them before granting only the intentional callers.
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
