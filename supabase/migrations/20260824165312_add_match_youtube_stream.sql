alter table public.matches
  add column if not exists youtube_url text;

comment on column public.matches.youtube_url is
  'Canonical YouTube match broadcast URL in https://www.youtube.com/watch?v=VIDEO_ID format.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_youtube_url_format_check'
  ) then
    alter table public.matches
      add constraint matches_youtube_url_format_check
      check (
        youtube_url is null
        or youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'
      ) not valid;
  end if;
end
$$;

alter table public.matches
  validate constraint matches_youtube_url_format_check;

notify pgrst, 'reload schema';
