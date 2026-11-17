-- AI Creative Studio — Milestone 1: Foundation (Idempotent)
-- Tables: profiles, workspaces, workspace_members, workspace_invitations
-- Includes: indexes, triggers, RLS helper functions, strict multi-tenant RLS policies

create extension if not exists "pgcrypto";

-- Shared updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Profiles (1-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 2. Workspaces (multi-tenant organization boundary)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- 3. Workspace Members (RBAC membership)
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'designer', 'content_creator', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);

drop trigger if exists trg_workspace_members_updated_at on public.workspace_members;
create trigger trg_workspace_members_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

-- 4. Workspace Invitations
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'designer', 'content_creator', 'client')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_workspace_invitations_workspace_id on public.workspace_invitations(workspace_id);
create index if not exists idx_workspace_invitations_email on public.workspace_invitations(lower(email));
create unique index if not exists uq_workspace_invitations_pending
  on public.workspace_invitations(workspace_id, lower(email))
  where status = 'pending';

drop trigger if exists trg_workspace_invitations_updated_at on public.workspace_invitations;
create trigger trg_workspace_invitations_updated_at
  before update on public.workspace_invitations
  for each row execute function public.set_updated_at();

-- Trigger: auto-create profile on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when public.profiles.full_name = '' then excluded.full_name
          else public.profiles.full_name
        end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any auth.users created before migration ran
insert into public.profiles (id, full_name, avatar_url, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url',
  u.email
from auth.users u
on conflict (id) do nothing;

-- Trigger: auto-add owner to workspace_members when workspace is created
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- RLS Helper Functions
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(p_allowed_roles)
  );
$$;

-- Safe RPC for accepting a pending workspace invitation
create or replace function public.accept_workspace_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.workspace_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_inv
  from public.workspace_invitations
  where id = p_invitation_id
    and status = 'pending'
    and expires_at > now();

  if not found then
    raise exception 'Invitation not found or expired';
  end if;

  if lower(v_inv.email) <> v_email then
    raise exception 'Invitation email mismatch';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, auth.uid(), v_inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set status = 'accepted'
  where id = v_inv.id;

  return v_inv.workspace_id;
end;
$$;

-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

-- Policies: profiles
drop policy if exists "profiles_select_self_or_teammate" on public.profiles;
create policy "profiles_select_self_or_teammate"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members wm_self
      join public.workspace_members wm_other
        on wm_self.workspace_id = wm_other.workspace_id
      where wm_self.user_id = auth.uid()
        and wm_other.user_id = profiles.id
    )
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Policies: workspaces
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (owner_id = auth.uid() or public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner"
  on public.workspaces for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_owner_or_admin" on public.workspaces;
create policy "workspaces_update_owner_or_admin"
  on public.workspaces for update
  to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));

drop policy if exists "workspaces_delete_owner_only" on public.workspaces;
create policy "workspaces_delete_owner_only"
  on public.workspaces for delete
  to authenticated
  using (public.has_workspace_role(id, array['owner']));

-- Policies: workspace_members
drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and role <> 'owner'
  );

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin"
  on public.workspace_members for update
  to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and role <> 'owner'
  )
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and role <> 'owner'
  );

drop policy if exists "workspace_members_delete_admin_or_self" on public.workspace_members;
create policy "workspace_members_delete_admin_or_self"
  on public.workspace_members for delete
  to authenticated
  using (
    (public.has_workspace_role(workspace_id, array['owner', 'admin']) and role <> 'owner')
    or (user_id = auth.uid() and role <> 'owner')
  );

-- Policies: workspace_invitations
drop policy if exists "workspace_invitations_select_admin_or_invitee" on public.workspace_invitations;
create policy "workspace_invitations_select_admin_or_invitee"
  on public.workspace_invitations for select
  to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "workspace_invitations_insert_admin" on public.workspace_invitations;
create policy "workspace_invitations_insert_admin"
  on public.workspace_invitations for insert
  to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "workspace_invitations_update_admin" on public.workspace_invitations;
create policy "workspace_invitations_update_admin"
  on public.workspace_invitations for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "workspace_invitations_delete_admin" on public.workspace_invitations;
create policy "workspace_invitations_delete_admin"
  on public.workspace_invitations for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));
