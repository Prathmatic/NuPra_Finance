alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  drop constraint if exists profiles_phone_e164_check;
alter table public.profiles
  add constraint profiles_phone_e164_check
  check (
    phone is null
    or phone ~ '^\+49[1-9][0-9]{5,12}$'
    or phone ~ '^\+91[6-9][0-9]{9}$'
  );
create unique index if not exists profiles_phone_unique
  on public.profiles(phone) where phone is not null;

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
  v_phone text := (select u.phone from auth.users u where u.id = auth.uid());
  v_vault_id uuid;
  v_existing_vault_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_phone is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null
  ) then raise exception 'Verify your phone number before creating a vault'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.phone = v_phone) then
    raise exception 'Save your verified phone profile first';
  end if;
  select m.vault_id into v_existing_vault_id from public.vault_members m where m.user_id = v_user_id;
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
  insert into public.vault_members(vault_id, user_id, role) values (v_vault_id, v_user_id, 'owner');
  insert into public.vault_finance_state(vault_id, updated_by) values (v_vault_id, v_user_id);
  return v_vault_id;
end;
$$;

alter table public.vault_invites
  add column if not exists invited_phone text;
alter table public.vault_invites
  drop constraint if exists vault_invites_phone_e164_check;
alter table public.vault_invites
  add constraint vault_invites_phone_e164_check
  check (
    invited_phone is null
    or invited_phone ~ '^\+49[1-9][0-9]{5,12}$'
    or invited_phone ~ '^\+91[6-9][0-9]{9}$'
  );
create index if not exists vault_invites_phone_idx
  on public.vault_invites(invited_phone) where invited_phone is not null;

drop function if exists public.create_partner_invite(uuid, text);
create function public.create_partner_invite(p_vault_id uuid, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := trim(p_phone);
  v_invite_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null) then
    raise exception 'Verify your phone number before inviting a partner';
  end if;
  if v_phone is null or not (
    v_phone ~ '^\+49[1-9][0-9]{5,12}$' or v_phone ~ '^\+91[6-9][0-9]{9}$'
  ) then raise exception 'Partner number must be a valid +49 or +91 phone number'; end if;
  if v_phone = (select u.phone from auth.users u where u.id = v_user_id) then
    raise exception 'Use a different phone number for your partner';
  end if;
  perform 1 from public.couple_vaults v where v.id = p_vault_id for update;
  if not found or not private.is_vault_owner(p_vault_id) then
    raise exception 'Only the vault owner can invite a partner';
  end if;
  if (select count(*) from public.vault_members m where m.vault_id = p_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;
  if exists (select 1 from auth.users u join public.vault_members m on m.user_id = u.id where u.phone = v_phone) then
    raise exception 'This phone number already belongs to a couple vault';
  end if;
  if exists (select 1 from public.vault_invites i where i.vault_id = p_vault_id and i.accepted_at is null) then
    select i.id into v_invite_id from public.vault_invites i
    where i.vault_id = p_vault_id and i.accepted_at is null for update;
    if (select i.invited_phone from public.vault_invites i where i.id = v_invite_id) is distinct from v_phone then
      delete from public.vault_invites where id = v_invite_id;
    else
      return v_invite_id;
    end if;
  end if;
  insert into public.vault_invites(vault_id, invited_phone, invited_by)
  values (p_vault_id, v_phone, v_user_id) returning id into v_invite_id;
  return v_invite_id;
end;
$$;

drop function if exists public.get_my_pending_invites();
create function public.get_my_pending_invites()
returns table (
  invite_id uuid, vault_id uuid, vault_name text, inviter_id uuid,
  inviter_name text, inviter_phone text, inviter_avatar_url text, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.vault_id, v.name, p.id, p.display_name, p.phone, p.avatar_url, i.created_at
  from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  join public.profiles p on p.id = i.invited_by
  where i.accepted_at is null
    and i.invited_phone = (select u.phone from auth.users u where u.id = (select auth.uid()))
    and exists (select 1 from auth.users u where u.id = (select auth.uid()) and u.phone_confirmed_at is not null);
$$;

create or replace function public.accept_partner_invite(p_invite_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := (select u.phone from auth.users u where u.id = auth.uid());
  v_vault_id uuid;
begin
  if v_user_id is null or v_phone is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null
  ) then raise exception 'Verified phone sign-in required'; end if;
  select i.vault_id into v_vault_id from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  where i.id = p_invite_id and i.accepted_at is null and i.invited_phone = v_phone
  for update of i, v;
  if v_vault_id is null then raise exception 'Invitation not found for this phone number'; end if;
  if exists (select 1 from public.vault_members m where m.user_id = v_user_id) then
    raise exception 'This account is already linked to a vault';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.phone = v_phone) then
    raise exception 'Save your verified phone profile first';
  end if;
  if (select count(*) from public.vault_members m where m.vault_id = v_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;
  insert into public.vault_members(vault_id, user_id, role) values (v_vault_id, v_user_id, 'partner');
  update public.vault_invites set accepted_at = now() where id = p_invite_id;
  return v_vault_id;
end;
$$;

revoke all on function public.create_partner_invite(uuid, text) from public, anon;
revoke all on function public.get_my_pending_invites() from public, anon;
grant execute on function public.create_partner_invite(uuid, text) to authenticated;
grant execute on function public.get_my_pending_invites() to authenticated;

drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists vault_invites_select_recipient_or_owner on public.vault_invites;
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (
  id = (select auth.uid()) and phone = (select auth.jwt() ->> 'phone')
  and (select auth.jwt() ->> 'phone') ~ '^\+(49|91)'
);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid()) and phone = (select auth.jwt() ->> 'phone')
  and (select auth.jwt() ->> 'phone') ~ '^\+(49|91)'
);
create policy vault_invites_select_recipient_or_owner on public.vault_invites for select to authenticated
using (invited_phone = (select auth.jwt() ->> 'phone') or (select private.is_vault_owner(vault_id)));

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
  v_phone text := (select u.phone from auth.users u where u.id = auth.uid());
  v_vault_id uuid;
  v_existing_vault_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_phone is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null
  ) then raise exception 'Verify your phone number before creating a vault'; end if;
  if not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.phone = v_phone
  ) then raise exception 'Save your verified phone profile first'; end if;

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

drop function if exists public.create_partner_invite(uuid, text);
create function public.create_partner_invite(p_vault_id uuid, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := trim(p_phone);
  v_invite_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null
  ) then raise exception 'Verify your phone number before inviting a partner'; end if;
  if v_phone is null or not (
    v_phone ~ '^\+49[1-9][0-9]{5,12}$'
    or v_phone ~ '^\+91[6-9][0-9]{9}$'
  ) then raise exception 'Partner number must be a valid +49 or +91 phone number'; end if;
  if v_phone = (select u.phone from auth.users u where u.id = v_user_id) then
    raise exception 'Use a different phone number for your partner';
  end if;

  perform 1 from public.couple_vaults v where v.id = p_vault_id for update;
  if not found or not private.is_vault_owner(p_vault_id) then
    raise exception 'Only the vault owner can invite a partner';
  end if;
  if (select count(*) from public.vault_members m where m.vault_id = p_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;
  if exists (
    select 1 from auth.users u
    join public.vault_members m on m.user_id = u.id
    where u.phone = v_phone
  ) then raise exception 'This phone number already belongs to a couple vault'; end if;

  if exists (select 1 from public.vault_invites i where i.vault_id = p_vault_id and i.accepted_at is null) then
    select i.id into v_invite_id
    from public.vault_invites i
    where i.vault_id = p_vault_id and i.accepted_at is null
    for update;
    if (select i.invited_phone from public.vault_invites i where i.id = v_invite_id) is distinct from v_phone then
      delete from public.vault_invites where id = v_invite_id;
    else
      return v_invite_id;
    end if;
  end if;

  insert into public.vault_invites(vault_id, invited_phone, invited_by)
  values (p_vault_id, v_phone, v_user_id)
  returning id into v_invite_id;
  return v_invite_id;
end;
$$;

drop function if exists public.get_my_pending_invites();
create function public.get_my_pending_invites()
returns table (
  invite_id uuid,
  vault_id uuid,
  vault_name text,
  inviter_id uuid,
  inviter_name text,
  inviter_phone text,
  inviter_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.vault_id, v.name, p.id, p.display_name, p.phone, p.avatar_url, i.created_at
  from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  join public.profiles p on p.id = i.invited_by
  where i.accepted_at is null
    and i.invited_phone = (select u.phone from auth.users u where u.id = (select auth.uid()))
    and exists (
      select 1 from auth.users u
      where u.id = (select auth.uid()) and u.phone_confirmed_at is not null
    );
$$;

create or replace function public.accept_partner_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := (select u.phone from auth.users u where u.id = auth.uid());
  v_vault_id uuid;
begin
  if v_user_id is null or v_phone is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.phone_confirmed_at is not null
  ) then raise exception 'Verified phone sign-in required'; end if;

  select i.vault_id into v_vault_id
  from public.vault_invites i
  join public.couple_vaults v on v.id = i.vault_id
  where i.id = p_invite_id and i.accepted_at is null and i.invited_phone = v_phone
  for update of i, v;
  if v_vault_id is null then raise exception 'Invitation not found for this phone number'; end if;
  if exists (select 1 from public.vault_members m where m.user_id = v_user_id) then
    raise exception 'This account is already linked to a vault';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.phone = v_phone
  ) then raise exception 'Save your verified phone profile first'; end if;
  if (select count(*) from public.vault_members m where m.vault_id = v_vault_id) >= 2 then
    raise exception 'This vault already has two members';
  end if;

  insert into public.vault_members(vault_id, user_id, role)
  values (v_vault_id, v_user_id, 'partner');
  update public.vault_invites set accepted_at = now() where id = p_invite_id;
  return v_vault_id;
end;
$$;

revoke all on function public.create_partner_invite(uuid, text) from public, anon;
revoke all on function public.get_my_pending_invites() from public, anon;
grant execute on function public.create_partner_invite(uuid, text) to authenticated;
grant execute on function public.get_my_pending_invites() to authenticated;

drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists vault_invites_select_recipient_or_owner on public.vault_invites;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  id = (select auth.uid())
  and phone = (select auth.jwt() ->> 'phone')
  and (select auth.jwt() ->> 'phone') ~ '^\+(49|91)'
);
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and phone = (select auth.jwt() ->> 'phone')
  and (select auth.jwt() ->> 'phone') ~ '^\+(49|91)'
);
create policy vault_invites_select_recipient_or_owner on public.vault_invites
for select to authenticated
using (
  invited_phone = (select auth.jwt() ->> 'phone')
  or (select private.is_vault_owner(vault_id))
);
