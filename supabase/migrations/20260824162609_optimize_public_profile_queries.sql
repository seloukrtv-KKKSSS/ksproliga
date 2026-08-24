create index if not exists matches_championship_home_date_idx
  on public.matches (championship_id, home_team, date desc);

create index if not exists matches_championship_away_date_idx
  on public.matches (championship_id, away_team, date desc);

create index if not exists match_goals_player_created_idx
  on public.match_goals (player_name, created_at desc);

create index if not exists match_cards_player_created_idx
  on public.match_cards (player_name, created_at desc);
