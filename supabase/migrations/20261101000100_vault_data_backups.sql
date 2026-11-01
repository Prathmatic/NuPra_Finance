-- Migration: 20261101000100_vault_data_backups.sql
-- Description: Create vault_data_backups table for continuous data protection,
--              audit trails for deleted items, reset archives, and manual backups.

create table if not exists public.vault_data_backups (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.couple_vaults(id) on delete cascade,
  backup_type text not null check (backup_type in ('full_snapshot', 'deleted_items', 'reset_archive', 'manual_export')),
  title text not null default 'Vault Backup',
  date_range_start text,
  date_range_end text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- Indexes for fast query by vault and creation time
create index if not exists vault_data_backups_vault_id_idx on public.vault_data_backups(vault_id);
create index if not exists vault_data_backups_created_at_idx on public.vault_data_backups(created_at desc);
create index if not exists vault_data_backups_type_idx on public.vault_data_backups(vault_id, backup_type);

-- Enable Row Level Security
alter table public.vault_data_backups enable row level security;

-- Permissions
grant usage on schema public to authenticated;
grant select, insert, delete on public.vault_data_backups to authenticated;

-- Policies: Only members of the vault can view or insert backups
drop policy if exists vault_data_backups_select on public.vault_data_backups;
create policy vault_data_backups_select on public.vault_data_backups
  for select to authenticated
  using ((select private.is_vault_member(vault_id)));

drop policy if exists vault_data_backups_insert on public.vault_data_backups;
create policy vault_data_backups_insert on public.vault_data_backups
  for insert to authenticated
  with check (
    (select private.is_vault_member(vault_id))
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists vault_data_backups_delete on public.vault_data_backups;
create policy vault_data_backups_delete on public.vault_data_backups
  for delete to authenticated
  using ((select private.is_vault_member(vault_id)));
