-- Add sort_order column to championships table
ALTER TABLE championships ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 1;

-- Initialize sort_order for existing championships based on id or creation
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY is_active DESC, created_at DESC) as new_order
  FROM championships
)
UPDATE championships
SET sort_order = ranked.new_order
FROM ranked
WHERE championships.id = ranked.id AND championships.sort_order IS NULL;
