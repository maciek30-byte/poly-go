---
project: polygo
researched_at: 2026-05-20
recommended_platform: Cloudflare Pages
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: React 19 (Vite 8 SPA, no SSR)
  runtime: Browser (static assets); Supabase for Postgres + Auth + Realtime + Storage
---

## Recommendation

**Deploy on Cloudflare Pages.**

Cloudflare Pages is the only candidate that costs **$0/month at MVP traffic** while passing all five agent-friendly criteria — and it places an edge POP inside Poland (Warsaw), which the realistic-single-region user base directly benefits from. The user's existing Cloudflare familiarity (interview Q3) breaks the 5/5 tie with Netlify, and Cloudflare's free tier has no commercial-use restriction (in sharp contrast to Vercel Hobby, which disqualifies polyGo on ToS grounds). The serve-static-assets workload is the simplest thing Cloudflare's edge does — paying container PaaS overhead (Fly.io, Railway) for the same workload would be paying for capabilities the project does not use.

## Platform Comparison

Scored Pass / Partial / Fail against the five criteria in `references/agent-friendly-criteria.md`. Five passes = 5; one partial = 4.5; one fail = drops a point. Cost ranking applied as a soft weight from interview Q2 (minimize cost).

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Score | MVP cost |
|---|---|---|---|---|---|---|---|
| **Cloudflare Pages** | Pass | Pass | Pass | Pass | Pass | **5/5** | **$0** |
| **Netlify**          | Pass | Pass | Pass | Pass | Pass | **5/5** | **$0** (300-credit hard cap ≈ 150 GB) |
| **Vercel**           | Pass | Pass | Pass | Pass | Partial (MCP beta) | 4.5/5 | $20/mo Pro min (Hobby bans commercial use) |
| **Render**           | Partial (rollback dashboard/API, less prominent in CLI) | Pass | Pass | Pass | Partial (docs MCP experimental) | 4/5 | $0 (100 GB free; static sites permanently free) |
| **Railway**          | Pass | Partial (every workload is 24/7 container; no edge CDN; only EU region = Amsterdam) | Partial (no `llms.txt`) | Pass | Partial (MCP "work in progress") | 3.5/5 | ~$5/mo Hobby min |
| **Fly.io**           | Pass | Fail (static SPA via Dockerfile + nginx; `waw` Warsaw deprecated) | Pass | Pass | Pass | 3/5 | ~$2+/mo (no static-fit free tier) |

### Shortlisted Platforms

#### 1. Cloudflare Pages (Recommended)

Wins on a strict cost-sensitive interpretation of the interview answers. Free tier covers a static SPA at orders of magnitude beyond the polyGo MVP ceiling (≤100 companies, low QPS) with no overage cliff and no commercial-use clause. Cloudflare's MCP server lineup (Docs MCP publicly available without auth; Workers Observability MCP and ~13 first-party servers in beta) gives an agent structured access to the platform alongside the `wrangler` CLI. Warsaw edge POP is a latency win for the single-region Polish user base. The interview Q3 familiarity answer breaks the tie with Netlify; the cost-tied passes on every criterion are why this platform won the candidate pool, not just the tie-breaker.

#### 2. Netlify

Tied 5/5 with Cloudflare on capabilities, with arguably better MCP polish (`@netlify/mcp` shipped 2025-06-03, no beta label; first-party `netlify logs` CLI added 2026-05-01). Netlify is an official Vite deployment partner (since 2025) with the `@netlify/vite-plugin`, and the Starter free tier explicitly allows commercial use. The 300-credit/month hard cap (no auto-recharge) is a *feature* for solo cost control — a viral spike means a downed site, not a surprise bill. Loses to Cloudflare on (a) no Warsaw POP (global CDN edges only), and (b) interview-driven familiarity weight. A clean fallback if anything about Cloudflare turns out to be a non-starter.

#### 3. Render

Cleanest dedicated "Static Site" abstraction of the three. Permanently free static-site tier, 100 GB included bandwidth, $0.10/GB overage. The much-discussed Render cold-start applies only to free *Web Services*; static sites never spin down. Loses points for CLI rollback being a dashboard/REST-API operation (not first-class CLI), and the documentation MCP being experimental while the infra MCP is GA. Picked third over Vercel because Vercel's Hobby commercial-use clause disqualifies polyGo (commercial B2B product) — Render has no equivalent restriction.

## Anti-Bias Cross-Check: Cloudflare Pages

### Devil's Advocate — Weaknesses

1. **Pages is a sunset-track product.** Cloudflare's 2026 guidance steers *new* projects to Workers Static Assets. Pages still works and the migration is promised as zero-breakage, but feature-investment has visibly shifted away. Every regression you hit will be answered with "use Workers"; the eventual forced-migration timing is not under your control.
2. **`@cloudflare/vite-plugin` v1.13.8+ breaks Vite's `base` option** (workers-sdk #11857). The plugin path is where active development is happening — and active development carries regressions. If you ever need to host the SPA at a sub-path, expect to work around this.
3. **Fork-PR previews don't exist.** For an invite-only B2B project this almost never matters (no outside contributors), but a contractor or auditor working from a fork branch cannot get an automatic preview URL.
4. **Cloudflare Access is the only way to gate preview URLs.** Free for ≤50 users, but it's another product surface to learn and maintain. A leaked preview URL of an invite-only directory is a credibility incident even if the contents are mock data.
5. **MCP servers outside the Docs MCP are beta-grade.** Workers Observability MCP is explicitly "still a work in progress" per Cloudflare's docs. Agent-driven log analysis works through `wrangler tail` from the CLI today; structured tool-use via MCP is real but immature.

### Pre-Mortem — How This Could Fail

It's November 2026. polyGo onboarded 30 companies in beta. The day after a Polish trade press article goes out, Cloudflare quietly schedules the Pages → Workers Static Assets migration window for `polygo.pages.dev`. The maintainer (solo, after-hours) misses the email. The auto-migration succeeds at the asset level, but the build pipeline still calls `wrangler pages deploy ./dist --project-name=polygo`; the deprecated command surfaces a warning that nobody reads. Three weeks later, a routine Supabase URL rotation requires a fresh build — and the env var was set in the *Pages* dashboard, which the migration didn't carry forward to the Workers project. The build deploys with an empty `VITE_SUPABASE_URL`. The SPA loads, but every Supabase call 404s; the chat goes silent. The maintainer spends a Saturday evening tracing the regression to the Pages-to-Workers env-var divergence, learns the post-migration commands by reading three GitHub issues, and posts an apology to the company-owners group chat. The decision wasn't wrong — the autopilot was.

### Unknown Unknowns

- **Pages `directory` field is ignored when using `@cloudflare/vite-plugin`** — mixed-mode setups (both Vite's `build.outDir` *and* the plugin's `directory`) silently produce confusing 404s. Pick one approach and stick with it.
- **Wrangler v4 changed `wrangler pages deploy` argument shape** vs Wrangler v3. The majority of search results and Stack Overflow answers from 2024 reference v3. Always verify against `wrangler --help` or the live docs page, not blog tutorials.
- **`cloudflare/pages-action@v1` is deprecated** — most GitHub Actions tutorials still reference it. Use `cloudflare/wrangler-action@v3`. Mixing the two in one workflow produces confusing failures because the auth env-var expectations differ.
- **Cloudflare Access pricing tier transitions are silent.** Free for ≤50 users — there's no automatic warning before billing engages at user 51. polyGo targets ≤100 companies × small teams; you may cross the threshold without noticing.
- **`pages.dev` is a discoverable subdomain.** Anyone enumerating Cloudflare Pages subdomains can find `polygo.pages.dev`. The verification-gate lives at the application layer (Supabase RLS + role checks), but URL discoverability is real. Cloudflare Access in front of production is the only structural mitigation. Map a custom domain early to break the `*.pages.dev` enumeration pattern.

## Operational Story

- **Preview deploys**: Every push to a non-default branch and every PR from the same repo gets a unique `<hash>.<project>.pages.dev` URL plus a branch alias. PRs from forks do *not* generate previews. Previews are public by default — gate them with Cloudflare Access (free for ≤50 users) if any preview will contain or simulate real user data.
- **Secrets**: Build-time `VITE_*` env vars (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set under Project → Settings → Environment variables → Production / Preview, or via `wrangler pages secret put`. The Supabase **anon key** is safe to expose (it's RLS-protected). The Supabase **service-role key** must never carry the `VITE_` prefix — anything `VITE_*` is inlined into the shipped JS bundle. Rotation: update the value, retrigger a build (push to `main` or click "Retry deployment").
- **Rollback**: `wrangler pages deployment list --project-name=polygo` shows recent deployments; `wrangler pages deployment rollback <DEPLOYMENT_ID>` (or the equivalent dashboard action) reverts. Rollback is seconds — it's a routing-layer change. **Caveat**: a rollback does not roll back Supabase migrations; if the failing deploy ran a migration, you handle that separately on the Supabase side.
- **Approval**: An agent may perform `wrangler pages deploy`, `wrangler tail`, `wrangler pages deployment list`, and rollback unattended. A human approves: (a) DNS / custom-domain changes, (b) Cloudflare Access policy edits, (c) rotation of the Cloudflare API token used by GitHub Actions, (d) any Supabase service-role key rotation, (e) initial Pages-to-Workers migration when Cloudflare schedules it.
- **Logs**: Read-only via `wrangler pages deployment tail --project-name=polygo` (live tail of edge access + function logs) or `wrangler tail` if/when the app moves to Workers Static Assets. The Docs MCP server at `https://docs.mcp.cloudflare.com/mcp` is publicly accessible (no auth) for documentation lookups during agent runs.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Pages → Workers Static Assets auto-migration breaks env var or build invocation | Devil's Advocate / Pre-Mortem | M | H | Subscribe to the Cloudflare changelog RSS; before any planned ramp, dry-run the equivalent `wrangler deploy` (Workers) path in a preview project. Document both invocations in `CLAUDE.md`. |
| `polygo.pages.dev` discoverable; preview URLs shareable | Devil's Advocate / Unknown Unknowns | M | M | Map custom domain `app.polygo.pl` (or similar) before public beta. Put Cloudflare Access (free) in front of production *and* previews for the duration of closed beta. |
| Service-role Supabase key accidentally prefixed with `VITE_` and inlined into client bundle | Unknown Unknowns | L | Critical | Document the convention in `CLAUDE.md` (already a load-bearing rule in `tsconfig.app.json` tripwires section): anon key only on client. CI lint: grep the built `dist/` for the service-role key shape — fail the build on match. |
| Cloudflare Access user count crosses 50 → silent billing tier transition | Unknown Unknowns | L (until beta scales) | L (small monthly fee) | Set a calendar reminder once 30+ Company Owners are activated to review the Access user list and confirm tier expectations. |
| Wrangler v3-era tutorials lead to wrong CLI invocations | Unknown Unknowns | M | L (caught quickly) | Pin `wrangler` major version in `package.json` devDependencies once added. Always run `wrangler --help` before copying a command from a blog. |
| `@cloudflare/vite-plugin` `base`-option regression bites if you ever sub-path host | Devil's Advocate | L | L | Don't reach for the plugin unless you have a concrete reason. The plain `wrangler pages deploy ./dist` path skips the plugin entirely and stays compatible with stock Vite. |
| `cloudflare/pages-action@v1` referenced in copied tutorials | Unknown Unknowns | M | L | Standardize on `cloudflare/wrangler-action@v3` in `.github/workflows/`. Document in `CLAUDE.md` once CI lands. |
| Fork-PR previews unavailable | Devil's Advocate | L (no outside contributors expected) | L | If a contractor ever needs a preview, push their branch to the main repo as a topic branch instead of merging from a fork. |
| Edge cache invalidation on a fast-iterating UI confuses early testers | Research finding | L | L | Cloudflare Pages purges automatically per deploy; if a user reports stale assets, `wrangler pages deployment list` confirms the latest deploy ID and a hard refresh resolves it. |
| Pre-mortem composite (deferred-migration + missed-email + silent build break) | Pre-Mortem | L | H | Combination of the first three mitigations above: changelog subscription + lint check on client bundle + documented post-migration env-var handoff in `CLAUDE.md`. |

## Getting Started

These commands assume the **already-scaffolded** project state on disk (Vite 8, React 19, TS 6, `@vitejs/plugin-react` 6, pnpm 9; see `package.json` and `pnpm-lock.yaml`). No need to install `@cloudflare/vite-plugin` — the plain `wrangler pages deploy ./dist` path works against the standard Vite output without an adapter, and *not* using the plugin sidesteps the `base`-option regression captured in Unknown Unknowns.

1. **Install Wrangler v4 as a devDependency** (pinned in repo, not global):
   ```
   pnpm add -D wrangler@^4
   ```

2. **Authenticate Wrangler once** (browser OAuth):
   ```
   pnpm exec wrangler login
   ```

3. **Create the Pages project** (one-time; can also be done via dashboard):
   ```
   pnpm exec wrangler pages project create polygo --production-branch main
   ```

4. **Deploy a first preview** to confirm the pipeline:
   ```
   pnpm build && pnpm exec wrangler pages deploy ./dist --project-name=polygo --branch=preview
   ```

5. **Wire GitHub Actions for auto-deploy on merge** to `main`. Create `.github/workflows/deploy.yml` using `cloudflare/wrangler-action@v3` (NOT the deprecated `cloudflare/pages-action`). Auth via `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repository secrets. Build step uses `pnpm install --frozen-lockfile && pnpm build`; deploy step runs `wrangler pages deploy ./dist --project-name=polygo`.

6. **Configure environment variables** for Production and Preview environments in the Pages dashboard (Project → Settings → Environment variables): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. **Never** add a `VITE_`-prefixed service-role key — anon key only on the client.

7. **Enable Cloudflare Access** in front of the production deployment (and previews) for the closed-beta period. Free for ≤50 users; pair with magic-link or Google SSO depending on Company Owner habits.

8. **Map a custom domain** before opening the beta (e.g., `app.polygo.pl`) to break the `*.pages.dev` enumeration pattern.

## Out of Scope

The following were not evaluated in this research and remain for separate decisions:

- Docker image configuration (not applicable — Pages serves static assets, no container).
- CI/CD pipeline implementation details (workflow YAML, secret rotation runbook).
- Production-scale architecture (multi-region failover, dedicated DR plan, formal SLA commitments).
- Supabase region selection and RLS policy authoring (Supabase decision lives in `tech-stack.md`; the operational/RODO details belong to whichever skill takes the Supabase setup work next).
- Email-on-new-message flows (PRD `FR-019` explicitly excludes email notifications from MVP).
- Native mobile clients (PRD non-goal).
