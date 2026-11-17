-- AI Creative Studio — Milestone 2: Brand Manager & Brand DNA (Idempotent)
-- Tables: brands, brand_guidelines, brand_colors, brand_fonts, brand_assets, brand_references
-- Includes: indexes, triggers, helper functions, and multi-tenant RLS policies

-- 1. Brands
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  industry text not null default '',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brands_workspace_id on public.brands(workspace_id);
create index if not exists idx_brands_status on public.brands(status);

drop trigger if exists trg_brands_updated_at on public.brands;
create trigger trg_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- 2. Brand Guidelines (Brand DNA)
create table if not exists public.brand_guidelines (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null unique references public.brands(id) on delete cascade,
  personality text not null default '',
  positioning text not null default '',
  audience text not null default '',
  tone text not null default '',
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_guidelines_brand_id on public.brand_guidelines(brand_id);

drop trigger if exists trg_brand_guidelines_updated_at on public.brand_guidelines;
create trigger trg_brand_guidelines_updated_at
  before update on public.brand_guidelines
  for each row execute function public.set_updated_at();

-- 3. Brand Colors
create table if not exists public.brand_colors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  hex text not null check (hex ~* '^#([0-9a-f]{6}|[0-9a-f]{3})$'),
  role text not null check (role in ('primary', 'secondary', 'accent', 'background', 'text', 'neutral')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_colors_brand_id on public.brand_colors(brand_id);

drop trigger if exists trg_brand_colors_updated_at on public.brand_colors;
create trigger trg_brand_colors_updated_at
  before update on public.brand_colors
  for each row execute function public.set_updated_at();

-- 4. Brand Fonts
create table if not exists public.brand_fonts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  family text not null check (char_length(trim(family)) between 1 and 80),
  role text not null check (role in ('heading', 'body', 'accent')),
  storage_path text,
  weights_json jsonb not null default '["400","600","700"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_fonts_brand_id on public.brand_fonts(brand_id);

drop trigger if exists trg_brand_fonts_updated_at on public.brand_fonts;
create trigger trg_brand_fonts_updated_at
  before update on public.brand_fonts
  for each row execute function public.set_updated_at();

-- 5. Brand Assets (files stored in Supabase Storage; path + metadata stored here)
create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  asset_type text not null check (asset_type in ('logo', 'photo', 'pattern', 'icon', 'font')),
  storage_path text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_assets_brand_id on public.brand_assets(brand_id);

drop trigger if exists trg_brand_assets_updated_at on public.brand_assets;
create trigger trg_brand_assets_updated_at
  before update on public.brand_assets
  for each row execute function public.set_updated_at();

-- 6. Brand References (liked / disliked / mandatory visual references)
create table if not exists public.brand_references (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  asset_id uuid references public.brand_assets(id) on delete set null,
  reference_type text not null check (reference_type in ('liked', 'disliked', 'mandatory')),
  notes text not null default '',
  analysis_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_references_brand_id on public.brand_references(brand_id);
create index if not exists idx_brand_references_asset_id on public.brand_references(asset_id);

drop trigger if exists trg_brand_references_updated_at on public.brand_references;
create trigger trg_brand_references_updated_at
  before update on public.brand_references
  for each row execute function public.set_updated_at();

-- Helper functions for Brand-level RLS via parent workspace
create or replace function public.is_brand_member(p_brand_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.brands b
    join public.workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = p_brand_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_brand_role(p_brand_id uuid, p_allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.brands b
    join public.workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = p_brand_id
      and wm.user_id = auth.uid()
      and wm.role = any(p_allowed_roles)
  );
$$;

-- Enable Row Level Security
alter table public.brands enable row level security;
alter table public.brand_guidelines enable row level security;
alter table public.brand_colors enable row level security;
alter table public.brand_fonts enable row level security;
alter table public.brand_assets enable row level security;
alter table public.brand_references enable row level security;

-- RLS Policies: brands
drop policy if exists "brands_select_member" on public.brands;
create policy "brands_select_member"
  on public.brands for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "brands_insert_admin" on public.brands;
create policy "brands_insert_admin"
  on public.brands for insert
  to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "brands_update_admin" on public.brands;
create policy "brands_update_admin"
  on public.brands for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "brands_delete_admin" on public.brands;
create policy "brands_delete_admin"
  on public.brands for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- RLS Policies: brand_guidelines
drop policy if exists "brand_guidelines_select_member" on public.brand_guidelines;
create policy "brand_guidelines_select_member"
  on public.brand_guidelines for select
  to authenticated
  using (public.is_brand_member(brand_id));

drop policy if exists "brand_guidelines_insert_admin" on public.brand_guidelines;
create policy "brand_guidelines_insert_admin"
  on public.brand_guidelines for insert
  to authenticated
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_guidelines_update_admin" on public.brand_guidelines;
create policy "brand_guidelines_update_admin"
  on public.brand_guidelines for update
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']))
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_guidelines_delete_admin" on public.brand_guidelines;
create policy "brand_guidelines_delete_admin"
  on public.brand_guidelines for delete
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']));

-- RLS Policies: brand_colors
drop policy if exists "brand_colors_select_member" on public.brand_colors;
create policy "brand_colors_select_member"
  on public.brand_colors for select
  to authenticated
  using (public.is_brand_member(brand_id));

drop policy if exists "brand_colors_insert_admin" on public.brand_colors;
create policy "brand_colors_insert_admin"
  on public.brand_colors for insert
  to authenticated
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_colors_update_admin" on public.brand_colors;
create policy "brand_colors_update_admin"
  on public.brand_colors for update
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']))
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_colors_delete_admin" on public.brand_colors;
create policy "brand_colors_delete_admin"
  on public.brand_colors for delete
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']));

-- RLS Policies: brand_fonts
drop policy if exists "brand_fonts_select_member" on public.brand_fonts;
create policy "brand_fonts_select_member"
  on public.brand_fonts for select
  to authenticated
  using (public.is_brand_member(brand_id));

drop policy if exists "brand_fonts_insert_admin" on public.brand_fonts;
create policy "brand_fonts_insert_admin"
  on public.brand_fonts for insert
  to authenticated
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_fonts_update_admin" on public.brand_fonts;
create policy "brand_fonts_update_admin"
  on public.brand_fonts for update
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']))
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_fonts_delete_admin" on public.brand_fonts;
create policy "brand_fonts_delete_admin"
  on public.brand_fonts for delete
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']));

-- RLS Policies: brand_assets
drop policy if exists "brand_assets_select_member" on public.brand_assets;
create policy "brand_assets_select_member"
  on public.brand_assets for select
  to authenticated
  using (public.is_brand_member(brand_id));

drop policy if exists "brand_assets_insert_admin" on public.brand_assets;
create policy "brand_assets_insert_admin"
  on public.brand_assets for insert
  to authenticated
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_assets_update_admin" on public.brand_assets;
create policy "brand_assets_update_admin"
  on public.brand_assets for update
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']))
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_assets_delete_admin" on public.brand_assets;
create policy "brand_assets_delete_admin"
  on public.brand_assets for delete
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']));

-- RLS Policies: brand_references
drop policy if exists "brand_references_select_member" on public.brand_references;
create policy "brand_references_select_member"
  on public.brand_references for select
  to authenticated
  using (public.is_brand_member(brand_id));

drop policy if exists "brand_references_insert_admin" on public.brand_references;
create policy "brand_references_insert_admin"
  on public.brand_references for insert
  to authenticated
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_references_update_admin" on public.brand_references;
create policy "brand_references_update_admin"
  on public.brand_references for update
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']))
  with check (public.has_brand_role(brand_id, array['owner', 'admin']));

drop policy if exists "brand_references_delete_admin" on public.brand_references;
create policy "brand_references_delete_admin"
  on public.brand_references for delete
  to authenticated
  using (public.has_brand_role(brand_id, array['owner', 'admin']));
