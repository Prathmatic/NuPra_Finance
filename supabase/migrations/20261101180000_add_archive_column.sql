-- Add archive column for soft-deleted items (transactions, goals, stocks, bills).
-- Items in the archive expire after 365 days (enforced client-side).
alter table public.vault_finance_state
  add column if not exists archive jsonb not null default '{"transactions":[],"goals":[],"stocks":[],"bills":[]}'::jsonb;
