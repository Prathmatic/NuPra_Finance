create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.couple_vaults (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  currency text not null default 'INR' check (currency in ('INR', 'EUR')),
  monthly_budget numeric not null default 0 check (monthly_budget >= 0),
  created_at timestamptz not null default now()
);

create table public.vault_members (
  vault_id uuid not null references public.couple_vaults(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  created_at timestamptz not null default now(),
  primary key (vault_id, user_id),
  unique (user_id, role)
);
create unique index one_vault_per_user on public.vault_members(user_id);
create index vault_members_user_id_idx on public.vault_members(user_id);

create table public.vault_invites (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.couple_vaults(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint vault_invites_email_lower check (invited_email = lower(invited_email))
);
create unique index one_pending_invite_per_vault
  on public.vault_invites(vault_id) where accepted_at is null;
create index vault_invites_email_idx on public.vault_invites(invited_email);

create table public.vault_finance_state (
  vault_id uuid primary key references public.couple_vaults(id) on delete cascade,
  transactions jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  stocks jsonb not null default '[]'::jsonb,
  bills jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  currency text not null default 'INR' check (currency in ('INR', 'EUR')),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id)
);

create or replace function private.is_vault_member(p_vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vault_members m
    where m.vault_id = p_vault_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_vault_owner(p_vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vault_members m
    where m.vault_id = p_vault_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

create or replace function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = (select auth.uid()) or exists (
    select 1
    from public.vault_members mine
    join public.vault_members theirs on theirs.vault_id = mine.vault_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_profile_id
  );
$$;

revoke all on schema private from public, anon;
revoke all on function private.is_vault_member(uuid) from public, anon;
revoke all on function private.is_vault_owner(uuid) from public, anon;
revoke all on function private.can_view_profile(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_vault_member(uuid) to authenticated;
grant execute on function private.is_vault_owner(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

create or replace function public.create_couple_vault(
  p_name text,
  p_currency text default 'INR',
  p_monthly_budget numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_vault_id uuid;
  v_existing_vault_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then raise exception 'Verify your email before creating a vault'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Create your profile first';
  end if;
  select m.vault_id into v_existing_vault_id
  from public.vault_members m where m.user_id = v_user_id;
  if v_existing_vault_id is not null then
    if exists (select 1 from public.vault_members m where m.vault_id = v_existing_vault_id and m.role = 'owner') then
      return v_existing_vault_id;
    end if;
    raise exception 'This account is already linked to a partner vault';
  end if;
    if p_currency is null or p_currency not in ('INR', 'EUR')
      or p_monthly_budget is null or p_monthly_budget < 0 then
    raise exception 'Invalid vault settings';
  end if;

  insert into public.couple_vaults(name, created_by, currency, monthly_budget)
  values (coalesce(nullif(trim(p_name), ''), 'Couple Vault'), v_user_id, p_currency, p_monthly_budget)
  returning id into v_vault_id;

  insert into public.vault_members(vault_id, user_id, role)
  values (v_vault_id, v_user_id, 'owner');
  insert into public.vault_finance_state(vault_id, updated_by)
  values (v_vault_id, v_user_id);
  return v_vault_id;
end;
$$;

create or replace function public.create_partner_invite(p_vault_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_invite_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then raise exception 'Verify your email before inviting a partner'; end if;
  perform 1 from public.couple_vaults v where v.id = p_vault_id for update;
  if not found or not private.is_vault_owner(p_vault_id) then
    raise exception 'Only the vault owner can invite a partner';
  end if;
    if v_email is null or v_email = ''
      or v_email = lower((select u.email from auth.users u where u.id = v_user_id)) then
    raise exception 'Enter a different partner email';
  end if;
  if (select count(*) from public.vault_members m where m.vault_id = p_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;
  if exists (
    select 1 from auth.users u
    join public.vault_members m on m.user_id = u.id
    where lower(u.email) = v_email
  ) then
    raise exception 'This email already belongs to a couple vault';
  end if;
  if exists (select 1 from public.vault_invites i where i.vault_id = p_vault_id and i.accepted_at is null) then
    select i.id into v_invite_id
    from public.vault_invites i
    where i.vault_id = p_vault_id and i.accepted_at is null
    for update;
    if (select i.invited_email from public.vault_invites i where i.id = v_invite_id) <> v_email then
      delete from public.vault_invites where id = v_invite_id;
    else
      return v_invite_id;
    end if;
  end if;

  insert into public.vault_invites(vault_id, invited_email, invited_by)
  values (p_vault_id, v_email, v_user_id)
  returning id into v_invite_id;
  return v_invite_id;
end;
$$;

create or replace function public.get_my_pending_invites()
returns table (
  invite_id uuid,
  vault_id uuid,
  vault_name text,
  inviter_id uuid,
  inviter_name text,
  inviter_email text,
  inviter_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.vault_id, v.name, p.id, p.display_name, p.email, p.avatar_url, i.created_at
  from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  join public.profiles p on p.id = i.invited_by
  where i.accepted_at is null
    and i.invited_email = lower((
      select u.email from auth.users u where u.id = (select auth.uid())
    ));
$$;

create or replace function public.accept_partner_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower((
    select u.email from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
  ));
  v_vault_id uuid;
begin
  if v_user_id is null or v_email is null then raise exception 'Verified email login required'; end if;

  select i.vault_id into v_vault_id
  from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  where i.id = p_invite_id
    and i.accepted_at is null
    and i.invited_email = v_email
  for update of i, v;
  if v_vault_id is null then raise exception 'Invitation not found for this email'; end if;
  if exists (select 1 from public.vault_members m where m.user_id = v_user_id) then
    raise exception 'This account is already linked to a vault';
  end if;
  if (select count(*) from public.vault_members m where m.vault_id = v_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;

  insert into public.vault_members(vault_id, user_id, role)
  values (v_vault_id, v_user_id, 'partner');
  update public.vault_invites set accepted_at = now() where id = p_invite_id;
  return v_vault_id;
end;
$$;

revoke all on function public.create_couple_vault(text, text, numeric) from public, anon;
revoke all on function public.create_partner_invite(uuid, text) from public, anon;
revoke all on function public.accept_partner_invite(uuid) from public, anon;
revoke all on function public.get_my_pending_invites() from public, anon;
grant execute on function public.create_couple_vault(text, text, numeric) to authenticated;
grant execute on function public.create_partner_invite(uuid, text) to authenticated;
grant execute on function public.accept_partner_invite(uuid) to authenticated;
grant execute on function public.get_my_pending_invites() to authenticated;

create or replace function private.enforce_two_vault_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.couple_vaults v where v.id = new.vault_id for update;
  if (select count(*) from public.vault_members m where m.vault_id = new.vault_id) >= 2 then
    raise exception 'A couple vault can have only two members';
  end if;
  return new;
end;
$$;
create trigger enforce_two_vault_members
before insert on public.vault_members
for each row execute function private.enforce_two_vault_members();
revoke all on function private.enforce_two_vault_members() from public, anon, authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();
revoke all on function private.touch_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.couple_vaults enable row level security;
alter table public.vault_members enable row level security;
alter table public.vault_invites enable row level security;
alter table public.vault_finance_state enable row level security;

revoke all on public.profiles, public.couple_vaults, public.vault_members, public.vault_invites, public.vault_finance_state from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.couple_vaults, public.vault_members, public.vault_invites to authenticated;
grant select, insert, update on public.vault_finance_state to authenticated;

drop policy if exists profiles_select_self_or_partner on public.profiles;
create policy profiles_select_self_or_partner on public.profiles
for select to authenticated
using ((select private.can_view_profile(id)));
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  id = (select auth.uid())
  and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy couple_vaults_select_members on public.couple_vaults
for select to authenticated
using ((select private.is_vault_member(id)));

create policy vault_members_select_members on public.vault_members
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_vault_member(vault_id)));

create policy vault_invites_select_recipient_or_owner on public.vault_invites
for select to authenticated
using (
  invited_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or (select private.is_vault_owner(vault_id))
);

create policy vault_finance_state_select_members on public.vault_finance_state
for select to authenticated
using ((select private.is_vault_member(vault_id)));
create policy vault_finance_state_insert_members on public.vault_finance_state
for insert to authenticated
with check (
  (select private.is_vault_member(vault_id))
  and updated_by = (select auth.uid())
);
create policy vault_finance_state_update_members on public.vault_finance_state
for update to authenticated
using ((select private.is_vault_member(vault_id)))
with check (
  (select private.is_vault_member(vault_id))
  and updated_by = (select auth.uid())
);

-- Enable Postgres Changes for finance and member-visible profile updates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vault_finance_state'
  ) then
    execute 'alter publication supabase_realtime add table public.vault_finance_state';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end $$;
