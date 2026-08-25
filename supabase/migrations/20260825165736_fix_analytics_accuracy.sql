-- Exact, RLS-aware analytics aggregation. The previous client-side summary
-- sampled only the newest 1,000 rows, so unique sessions and section totals
-- became approximate as traffic grew.

create index if not exists user_analytics_created_at_id_cover_idx
  on public.user_analytics (created_at desc, id desc)
  include (session_id, active_tab, duration_seconds);

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
  set duration_seconds = greatest(
    coalesce(duration_seconds, 1),
    greatest(1, least(coalesce(analytics_duration_seconds, 1), 86400))
  )
  where id = analytics_id
    and session_id = analytics_session_id
    and created_at >= now() - interval '1 day';
$$;

create or replace function public.get_user_analytics_summary(
  analytics_since timestamptz
)
returns table (
  total_page_views bigint,
  unique_sessions bigint,
  avg_duration_seconds integer,
  total_active_seconds bigint,
  tab_breakdown jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      session_id,
      active_tab,
      greatest(0, coalesce(duration_seconds, 0))::bigint as duration_seconds
    from public.user_analytics
    where created_at >= coalesce(analytics_since, now() - interval '24 hours')
      and created_at <= now()
      and active_tab <> 'admin'
  ),
  totals as (
    select
      count(*)::bigint as total_page_views,
      count(distinct session_id)::bigint as unique_sessions,
      coalesce(round(avg(duration_seconds)), 0)::integer as avg_duration_seconds,
      coalesce(sum(duration_seconds), 0)::bigint as total_active_seconds
    from filtered
  ),
  per_tab as (
    select
      active_tab as tab,
      count(*)::bigint as views,
      count(distinct session_id)::bigint as unique_sessions,
      coalesce(sum(duration_seconds), 0)::bigint as total_time,
      coalesce(round(avg(duration_seconds)), 0)::integer as avg_duration_seconds
    from filtered
    group by active_tab
  )
  select
    totals.total_page_views,
    totals.unique_sessions,
    totals.avg_duration_seconds,
    totals.total_active_seconds,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'tab', per_tab.tab,
            'views', per_tab.views,
            'uniqueSessions', per_tab.unique_sessions,
            'totalTime', per_tab.total_time,
            'avgDurationSeconds', per_tab.avg_duration_seconds
          )
          order by per_tab.views desc, per_tab.tab
        )
        from per_tab
      ),
      '[]'::jsonb
    ) as tab_breakdown
  from totals;
$$;

revoke all on function public.get_user_analytics_summary(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_user_analytics_summary(timestamptz)
  to authenticated;

-- Preserve the tightly scoped public heartbeat RPC. GREATEST() above makes
-- out-of-order network responses unable to reduce an already recorded time.
revoke all on function public.update_user_analytics_duration(bigint, text, integer)
  from public, anon, authenticated;
grant execute on function public.update_user_analytics_duration(bigint, text, integer)
  to anon, authenticated;

comment on function public.get_user_analytics_summary(timestamptz) is
  'Returns exact RLS-scoped section analytics since the requested timestamp.';
