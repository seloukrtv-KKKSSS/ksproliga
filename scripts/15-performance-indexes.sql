-- Hot-path indexes for the public site, voting, analytics, and maintenance operations.
-- Safe to run repeatedly. Apply through a reviewed Supabase migration/SQL workflow.

BEGIN;

CREATE INDEX IF NOT EXISTS championships_active_idx
  ON public.championships (sort_order, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS teams_championship_name_idx
  ON public.teams (championship_id, name);

CREATE INDEX IF NOT EXISTS matches_championship_round_date_idx
  ON public.matches (championship_id, round, date);

CREATE INDEX IF NOT EXISTS matches_championship_finished_date_idx
  ON public.matches (championship_id, is_finished, date DESC);

CREATE INDEX IF NOT EXISTS players_championship_goals_idx
  ON public.players (championship_id, goals DESC, name);

CREATE INDEX IF NOT EXISTS match_goals_match_minute_idx
  ON public.match_goals (match_id, minute);

CREATE INDEX IF NOT EXISTS match_cards_match_minute_idx
  ON public.match_cards (match_id, minute);

CREATE INDEX IF NOT EXISTS voting_candidates_match_votes_idx
  ON public.voting_candidates (match_id, votes DESC);

CREATE INDEX IF NOT EXISTS products_sort_order_idx
  ON public.products (sort_order, id);

DO $$
BEGIN
  IF to_regclass('public.user_analytics') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_index AS index_info
      JOIN pg_attribute AS indexed_column
        ON indexed_column.attrelid = index_info.indrelid
       AND indexed_column.attnum = index_info.indkey[0]
      WHERE index_info.indrelid = 'public.user_analytics'::regclass
        AND index_info.indisvalid
        AND indexed_column.attname = 'created_at'
    ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS user_analytics_created_at_idx ON public.user_analytics (created_at DESC)';
  END IF;

  IF to_regclass('public.organizer_logs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS organizer_logs_created_at_idx ON public.organizer_logs (created_at DESC)';
  END IF;

  IF to_regclass('public.game_scores') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS game_scores_leaderboard_idx ON public.game_scores (game_type, score DESC, created_at, id)';
  END IF;
END
$$;

COMMIT;
