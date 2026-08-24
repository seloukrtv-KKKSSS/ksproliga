# Database scripts

Set `DATABASE_URL` in your local environment before running any JavaScript maintenance script. Start from `.env.example`; never commit a real connection string.

The numbered SQL files are imperative migrations. Apply new files in numeric order after reviewing them in the Supabase SQL editor or your normal migration workflow. `15-performance-indexes.sql` is idempotent and adds indexes for the site’s most frequent filters and sort orders.

The database password that previously appeared in this directory must be rotated because removing it from the current files does not remove it from Git history.
