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

> **Single Supabase environment**: local dev, preview deploys, and production all hit `polygo-prod`. See `AGENTS.md` and `context/foundation/deployment-plan-v2.md` ("Świadomie odroczone ryzyka") for why and the trigger to add staging.

## Deployment

Push to `main` → GitHub Actions runs `pnpm build` → `wrangler pages deploy` to Cloudflare Pages production scope. Production URL: <https://polygo.pages.dev>.

PRs to `main` get preview deploys at `https://<branch>.polygo.pages.dev` (same Supabase as prod — do not share with non-developers).

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
