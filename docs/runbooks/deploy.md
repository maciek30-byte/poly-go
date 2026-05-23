# Deployment runbook — polyGo

Authoritative procedure for deploying polyGo to Cloudflare Pages. Companion to `context/deployment/deployment-plan.md` (audit trail of the initial setup) and `context/foundation/infrastructure.md` (platform decision + risk register).

## Where things live

| Concern | Location |
| --- | --- |
| CI workflow | `.github/workflows/deploy.yml` |
| Production URL | https://polygo.pages.dev |
| Preview branch URL | https://preview.polygo.pages.dev |
| Cloudflare project | `polygo` (Pages, production branch = `main`) |
| Cloudflare account ID | `d4b17a1e5dc9730e5a8a24a8b683e677` |
| Supabase project region | `eu-central-1` (Frankfurt) |
| Wrangler version pin | `wrangler@^4` in `devDependencies` (workflow pins `4.93.1` for action) |
| Node version in CI | 22 (Wrangler 4 requires ≥ 22) |

## Auto-deploy flow

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. checkout → pnpm/setup-pnpm@v4 → setup-node@v4 (Node 22, pnpm cache)
2. `pnpm install --frozen-lockfile`
3. `pnpm build` (runs `tsc -b && vite build`)
4. **Bundle leak check** — `grep -rE 'service_role|sb_secret_' dist/` must return nothing (build fails otherwise)
5. `cloudflare/wrangler-action@v3` with `wranglerVersion: "4.93.1"` → `pages deploy ./dist --project-name=polygo --branch=main`

Pushes to non-main branches → preview deploy at `<branch>.polygo.pages.dev`.

## Environment variables

**Cloudflare Pages env vars** (set per-environment via `wrangler pages secret put` or in the Cloudflare dashboard):

| Variable | Where set | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Pages Production + Preview | Bundled at build time (Vite inlines `VITE_*`) |
| `VITE_SUPABASE_ANON_KEY` | Pages Production + Preview | Public anon key (RLS-protected) |

**GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped token: `Account · Cloudflare Pages · Edit` on `Maciek29.opozda@gmail.com's Account` |
| `CLOUDFLARE_ACCOUNT_ID` | `d4b17a1e5dc9730e5a8a24a8b683e677` |

**Local dev:** `.env.local` (gitignored via `*.local`) holds the same two `VITE_SUPABASE_*` values. `.env.local.example` is the committable scaffold.

### Service-role key — DO NOT prefix with `VITE_`

The Supabase service-role key bypasses RLS and grants full DB access. **Never** add it to `.env.local`, Cloudflare Pages env, or anywhere with a `VITE_` prefix — Vite inlines `VITE_*` into the client bundle and the key would leak to every visitor.

If a server-side context ever needs the service-role key, it lives in:
- Cloudflare **Workers** secrets (not Pages env), or
- A Supabase Edge Function secret, or
- A separate `SUPABASE_SERVICE_ROLE_KEY` (no `VITE_` prefix) consumed only by server runtimes.

The CI bundle leak check (`grep -rE 'service_role|sb_secret_' dist/`) is the last line of defense — it fails the deploy if a service-role pattern lands in the client bundle. Don't bypass it.

## Manual deploy (escape hatch)

If CI is broken or you need to deploy from your machine:

```sh
# Production (overwrites whatever CI last deployed)
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name=polygo --branch=main --commit-dirty=true

# Preview branch (safer — doesn't touch production)
pnpm exec wrangler pages deploy ./dist --project-name=polygo --branch=preview --commit-dirty=true
```

`--commit-dirty=true` silences the warning when the working tree is dirty.

## Rollback

```sh
# List recent deployments (newest first)
pnpm exec wrangler pages deployment list --project-name=polygo

# Roll production back to a specific deployment ID
pnpm exec wrangler pages deployment rollback <DEPLOYMENT_ID> --project-name=polygo
```

**Important:** rollback only reverts the static assets served by Pages. It does **not** undo:
- Supabase schema migrations
- Supabase RLS policy changes
- Auth provider config changes
- Data created/modified by users since the deploy

If a deploy broke prod *because* of a coupled Supabase change, you need to roll back both: Pages first (fast, restores UI), then Supabase via the dashboard or a compensating migration.

## Verification after deploy

```sh
curl -I https://polygo.pages.dev/                     # expect HTTP/2 200
pnpm exec wrangler pages deployment list --project-name=polygo | head -10
pnpm exec wrangler pages deployment tail --project-name=polygo  # stream live logs while you hit URL
grep -rE 'service_role|sb_secret_' dist/ && echo LEAK || echo OK
```

## Future migration: Pages → Workers Static Assets

Cloudflare has signalled Pages will eventually be consolidated into Workers Static Assets. Migration is **not** drop-in:

- Different CLI command shape — Pages uses `wrangler pages deploy <dir>`; Workers uses `wrangler deploy` driven by `wrangler.toml` with an `[assets]` block.
- Env vars do **not** auto-migrate — Pages secrets must be re-bound as Workers secrets.
- Custom domains may need re-attaching.

**When the migration window opens:** check current Wrangler docs at https://developers.cloudflare.com/workers/static-assets/ before running anything — do NOT rely on blog tutorials or this runbook's hypothetical commands, as the Wrangler v3 → v4 → vN argument shape has changed before.

Subscribe to the Cloudflare changelog (https://developers.cloudflare.com/changelog/) to avoid missing the migration window.

## Deferred (not yet active)

| Item | Status | Trigger |
| --- | --- | --- |
| Cloudflare Access (auth wall) | Deferred | Before closed beta |
| Custom domain (`app.polygo.pl`) | Deferred | Before closed beta |
| `VITE_SUPABASE_*` rotation procedure | Not documented | First time keys leak or quarterly review |

## Common failure modes (observed)

| Symptom | Root cause | Fix |
| --- | --- | --- |
| `Authentication error [code: 10000]` in CI | API token has wrong permissions (e.g. Zone-level instead of Account-level Pages) | Recreate token with `Account · Cloudflare Pages · Edit` only |
| `Wrangler requires at least Node.js v22.0.0` | Workflow pins Node < 22 | Bump `actions/setup-node` `node-version` to 22+ |
| CI uses unexpected Wrangler version | `cloudflare/wrangler-action@v3` defaults to its bundled wrangler | Pass `wranglerVersion: "4.93.1"` explicitly |
| `fatal: ambiguous argument 'HEAD'` warning | Wrangler probes git for a commit hash, repo has no commits yet | Harmless; resolves after first commit |
