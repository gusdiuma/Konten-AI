-- AI Creative Studio — Milestone 2: Private Supabase Storage Buckets & Policies (Idempotent)
-- Buckets: brand-assets, generated-assets, design-exports
-- Path convention: <workspace_id>/<brand_id>/<filename>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'brand-assets',
    'brand-assets',
    false,
    10485760,
    array[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'font/woff2',
      'font/ttf',
      'font/otf',
      'application/font-woff2',
      'application/octet-stream'
    ]
  ),
  (
    'generated-assets',
    'generated-assets',
    false,
    15728640,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'design-exports',
    'design-exports',
    false,
    52428800,
    array['image/png', 'image/jpeg', 'application/pdf', 'application/zip']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Helper: extract leading workspace UUID safely from object path
create or replace function public.storage_workspace_id(p_object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_first text;
begin
  v_first := (storage.foldername(p_object_name))[1];
  if v_first is null or v_first !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_first::uuid;
end;
$$;

-- Storage Policies: brand-assets
drop policy if exists "brand_assets_storage_select" on storage.objects;
create policy "brand_assets_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.storage_workspace_id(name) is not null
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

drop policy if exists "brand_assets_storage_insert" on storage.objects;
create policy "brand_assets_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin'])
  );

drop policy if exists "brand_assets_storage_update" on storage.objects;
create policy "brand_assets_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin'])
  );

drop policy if exists "brand_assets_storage_delete" on storage.objects;
create policy "brand_assets_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin'])
  );

-- Storage Policies: generated-assets
drop policy if exists "generated_assets_storage_select" on storage.objects;
create policy "generated_assets_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'generated-assets'
    and public.storage_workspace_id(name) is not null
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

drop policy if exists "generated_assets_storage_insert" on storage.objects;
create policy "generated_assets_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'generated-assets'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin', 'designer'])
  );

drop policy if exists "generated_assets_storage_delete" on storage.objects;
create policy "generated_assets_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'generated-assets'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin', 'designer'])
  );

-- Storage Policies: design-exports
drop policy if exists "design_exports_storage_select" on storage.objects;
create policy "design_exports_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'design-exports'
    and public.storage_workspace_id(name) is not null
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

drop policy if exists "design_exports_storage_insert" on storage.objects;
create policy "design_exports_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'design-exports'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin', 'designer'])
  );

drop policy if exists "design_exports_storage_delete" on storage.objects;
create policy "design_exports_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'design-exports'
    and public.storage_workspace_id(name) is not null
    and public.has_workspace_role(public.storage_workspace_id(name), array['owner', 'admin', 'designer'])
  );
