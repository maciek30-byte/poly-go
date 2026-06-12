# PolyGo

Closed B2B SaaS marketplace for the polymer industry. SPA on Cloudflare Pages, Supabase backend.

## Stack

- **Frontend**: Vite + React 19 + TypeScript, React Router DOM (SPA)
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Hosting**: Cloudflare Pages (Direct Upload)
- **CI/CD**: GitHub Actions → `wrangler pages deploy`
- **Package manager**: pnpm

See `context/foundation/tech-stack.md` and `context/foundation/infrastructure.md` for rationale.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc -b && vite build → dist/
pnpm lint
```

Local dev requires `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

> **Single Supabase environment**: local dev and production both hit `polygo-prod`. See `AGENTS.md` and `context/foundation/deployment-plan-v2.md` ("Świadomie odroczone ryzyka") for why and the trigger to add staging.

## Database (Supabase)

Schema, migrations and RLS policies live in `supabase/`. Migrations are versioned (`supabase/migrations/`) and applied via the Supabase CLI. Local dev runs a full Supabase stack in Docker (`supabase start`); prod is the linked `polygo-prod` project.

Typical workflow:

```bash
pnpm db:start      # boot local stack (Postgres + Auth + Storage + Studio)
pnpm db:reset      # drop + replay all migrations + seed.sql
pnpm db:types      # regenerate src/lib/database.types.ts from local schema
pnpm db:test:rls   # run supabase/tests/rls.sql isolation suite
pnpm db:diff       # sanity-check pending changes against linked prod
pnpm db:push       # apply pending migrations to linked prod
pnpm db:stop       # tear down local stack
```

After every migration in `supabase/migrations/`, regenerate TS types (`pnpm db:types`) and commit `src/lib/database.types.ts` together with the migration.

Studio is available at <http://127.0.0.1:54323> while the local stack is running.

### Service role and RLS

The browser client uses **only** `VITE_SUPABASE_ANON_KEY`; every query goes through Row Level Security policies. The `SUPABASE_SERVICE_ROLE_KEY` automatically bypasses RLS and is reserved for offline seeding (companies, pilot users) and future background jobs. It lives in `.env.local` (gitignored) and, when a Worker eventually needs it, in Cloudflare Pages secrets — **never in the browser bundle**.

## Deployment

Push to `main` → GitHub Actions runs `pnpm build` → `wrangler pages deploy` to Cloudflare Pages production scope. Production URL: <https://da9d2456.polygo.pages.dev>.

PR-based preview deploys are disabled — solo workflow pushes directly to `main`. If you want to test a code change without affecting prod, run an ad-hoc deploy to a throwaway branch name (see manual deploy below) or, better, run `pnpm dev` locally.

Emergency manual deploy:

```bash
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name=polygo --branch=main --commit-dirty=true
```

Rollback:

```bash
pnpm exec wrangler pages deployment list --project-name=polygo
pnpm exec wrangler rollback <deployment-id> --project-name=polygo
```

See `context/foundation/deployment-plan-v2.md` for full deployment runbook.

## Documentation map

- `context/foundation/shape-notes.md` — initial shaping conversation
- `context/foundation/prd.md` — product requirements
- `context/foundation/tech-stack.md` — stack rationale
- `context/foundation/infrastructure.md` — platform research (CF Pages choice)
- `context/foundation/deployment-plan-v2.md` — execution plan (active)
- `AGENTS.md` — rules for AI agents working in this repo
