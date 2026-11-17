-- AI Creative Studio — Milestone 3: Projects, Content Briefs, & AI Generation Jobs (Idempotent)
-- Tables: projects, content_briefs, ai_generation_jobs
-- Includes: indexes, triggers, helper functions, and multi-tenant RLS policies

-- 1. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  status text not null default 'draft' check (status in ('draft', 'planning', 'ready', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace_id on public.projects(workspace_id);
create index if not exists idx_projects_brand_id on public.projects(brand_id);
create index if not exists idx_projects_status on public.projects(status);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 2. Content Briefs
create table if not exists public.content_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  topic text not null check (char_length(trim(topic)) between 2 and 240),
  objective text not null default '',
  audience text not null default '',
  content_type text not null check (content_type in ('educational', 'promotional', 'listicle', 'storytelling', 'tips')),
  slide_count integer not null check (slide_count between 3 and 10),
  brief_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_briefs_project_id on public.content_briefs(project_id);

drop trigger if exists trg_content_briefs_updated_at on public.content_briefs;
create trigger trg_content_briefs_updated_at
  before update on public.content_briefs
  for each row execute function public.set_updated_at();

-- 3. AI Generation Jobs
create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  idempotency_key text,
  job_type text not null check (job_type in ('content_plan', 'copywriting', 'design_generation', 'slide_revision')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'validating', 'rendering', 'retrying', 'completed', 'failed')),
  provider text not null default 'gemini',
  model text not null default 'gemini-4-hydrogen',
  prompt_version text not null default 'v1',
  output_json jsonb not null default '{}'::jsonb,
  error_json jsonb not null default '{}'::jsonb,
  usage_json jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_generation_jobs_project_id on public.ai_generation_jobs(project_id);
create index if not exists idx_ai_generation_jobs_status on public.ai_generation_jobs(status);
create unique index if not exists uq_ai_generation_jobs_idempotency
  on public.ai_generation_jobs(project_id, idempotency_key)
  where idempotency_key is not null;

drop trigger if exists trg_ai_generation_jobs_updated_at on public.ai_generation_jobs;
create trigger trg_ai_generation_jobs_updated_at
  before update on public.ai_generation_jobs
  for each row execute function public.set_updated_at();

-- Helper functions for Project-level RLS via parent workspace
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = p_project_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(p_project_id uuid, p_allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = p_project_id
      and wm.user_id = auth.uid()
      and wm.role = any(p_allowed_roles)
  );
$$;

-- Enable Row Level Security
alter table public.projects enable row level security;
alter table public.content_briefs enable row level security;
alter table public.ai_generation_jobs enable row level security;

-- RLS Policies: projects
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
  on public.projects for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "projects_insert_creator" on public.projects;
create policy "projects_insert_creator"
  on public.projects for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'designer', 'content_creator'])
    and created_by = auth.uid()
  );

drop policy if exists "projects_update_creator" on public.projects;
create policy "projects_update_creator"
  on public.projects for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'designer', 'content_creator']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'designer', 'content_creator']));

drop policy if exists "projects_delete_admin_designer" on public.projects;
create policy "projects_delete_admin_designer"
  on public.projects for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'designer']));

-- RLS Policies: content_briefs
drop policy if exists "content_briefs_select_member" on public.content_briefs;
create policy "content_briefs_select_member"
  on public.content_briefs for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "content_briefs_insert_creator" on public.content_briefs;
create policy "content_briefs_insert_creator"
  on public.content_briefs for insert
  to authenticated
  with check (public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator']));

drop policy if exists "content_briefs_update_creator" on public.content_briefs;
create policy "content_briefs_update_creator"
  on public.content_briefs for update
  to authenticated
  using (public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator']))
  with check (public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator']));

drop policy if exists "content_briefs_delete_admin" on public.content_briefs;
create policy "content_briefs_delete_admin"
  on public.content_briefs for delete
  to authenticated
  using (public.has_project_role(project_id, array['owner', 'admin', 'designer']));

-- RLS Policies: ai_generation_jobs
drop policy if exists "ai_generation_jobs_select_member" on public.ai_generation_jobs;
create policy "ai_generation_jobs_select_member"
  on public.ai_generation_jobs for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "ai_generation_jobs_insert_creator" on public.ai_generation_jobs;
create policy "ai_generation_jobs_insert_creator"
  on public.ai_generation_jobs for insert
  to authenticated
  with check (
    public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator'])
    and created_by = auth.uid()
  );

drop policy if exists "ai_generation_jobs_update_creator" on public.ai_generation_jobs;
create policy "ai_generation_jobs_update_creator"
  on public.ai_generation_jobs for update
  to authenticated
  using (public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator']))
  with check (public.has_project_role(project_id, array['owner', 'admin', 'designer', 'content_creator']));

drop policy if exists "ai_generation_jobs_delete_admin" on public.ai_generation_jobs;
create policy "ai_generation_jobs_delete_admin"
  on public.ai_generation_jobs for delete
  to authenticated
  using (public.has_project_role(project_id, array['owner', 'admin']));
