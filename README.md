# AI Creative Studio

Multi-tenant SaaS platform for generating Instagram carousel designs (3–10 slides) anchored in each brand's Brand DNA, with an editable React Konva canvas and PNG/JPG/PDF export.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **Backend & Security**: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **AI Runtime**: Server-side Gemini API provider adapter (Milestone 3+)
- **Canvas & Design Model**: JSON Scene Graph + React Konva (Milestone 4–5)
- **Hosting**: Vercel

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable/anon key (safe for client with RLS enabled)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only service role key (never expose to client)
- `AI_PROVIDER` — Default `gemini`
- `GEMINI_API_KEY` — Server-side Gemini API key
- `GEMINI_MODEL` — e.g. `gemini-2.5-flash`
- `APP_URL` — Application base URL

## Supabase Setup & Migrations

1. Create a Supabase project.
2. Run the SQL migrations in `supabase/migrations/` in order via Supabase CLI (`supabase db push`) or the Supabase SQL Editor:
   - `supabase/migrations/0001_milestone1_foundation.sql` — Creates `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`, helper functions (`is_workspace_member`, `has_workspace_role`, `accept_workspace_invitation`), triggers, indexes, and multi-tenant RLS policies.
   - `supabase/migrations/0002_milestone2_brands.sql` — Creates `brands`, `brand_guidelines`, `brand_colors`, `brand_fonts`, `brand_assets`, `brand_references`, brand helper functions (`is_brand_member`, `has_brand_role`), triggers, indexes, and RLS policies.
   - `supabase/migrations/0003_milestone2_storage.sql` — Provisions private Supabase Storage buckets (`brand-assets`, `generated-assets`, `design-exports`) and workspace-scoped `storage.objects` RLS policies.
3. In Supabase Authentication settings, configure Site URL and Redirect URLs to include `<APP_URL>/auth/callback`.

## Local Development

```bash
npm install
npm run dev
```

## Verification Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Milestone Progress

- **Milestone 1 (Complete)**: Next.js App Router scaffold, Supabase Auth (`/login`, `/signup`, `/auth/callback`, `/auth/reset-password`), profiles, workspaces, members & invitations, RBAC & RLS policies, dashboard shell (`/dashboard`, `/workspace/settings`).
- **Milestone 2 (Complete)**: Brand Manager (`/brands`, `/brands/new`, `/brands/[id]`), Brand DNA (`brand_guidelines`), color palette (`brand_colors`), typography (`brand_fonts`), asset uploads (`brand_assets` + `brand-assets` private bucket), visual references (`brand_references`), and Storage RLS policies.
- **Milestone 3 (Pending)**: Project & brief flow, Gemini provider adapter, content plan & copywriting generation.
- **Milestone 4 (Pending)**: Scene graph schema, layout archetypes, renderer, design generation, quality checks.
- **Milestone 5 (Pending)**: Editable React Konva canvas, autosave, versions, single-slide revision.
- **Milestone 6 (Pending)**: PNG/JPG/PDF export, async job status, tests, Vercel readiness.
