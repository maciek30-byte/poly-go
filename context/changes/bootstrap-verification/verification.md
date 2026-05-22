---
bootstrapped_at: 2026-05-19T13:10:55Z
starter_id: vite-react
starter_name: Vite + React
project_name: polygo
language_family: js
package_manager: pnpm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: pnpm audit --json (pm-aware substitute for the configured `npm audit --json`; the hand-off picked pnpm)
---

## Hand-off

Verbatim copy of `context/foundation/tech-stack.md`:

```yaml
starter_id: vite-react
package_manager: pnpm
project_name: polygo
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: true
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: true
  has_auth: true
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Solo, after-hours build of an invite-only directory + 1:1 messenger for the Polish plastics industry. The user explicitly chose React without an SSR meta-framework, so the standard `(web, js)` default (`10x-astro-starter`) was set aside in favor of a pure SPA shell via `vite-react`. Supabase covers the backend concerns the PRD demands — Postgres + auth + realtime + storage for ≤10 MB PDF attachments + RODO-compliant data handling — without a separate API starter. Deployment lands on Cloudflare Pages (the starter's default) with GitHub Actions auto-deploying on merge. `vite-react` fails the `convention_based` agent-friendly gate; the user accepted the override and bootstrapper will generate an extensive `CLAUDE.md` codifying routing, folder layout, data-fetching, and Supabase client conventions so an agent can navigate the project. All five self-check points came back true.

## Pre-scaffold verification

| Signal       | Value                                                | Severity | Notes                                                                          |
| ------------ | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| npm package  | `create-vite` v9.0.7 published 2026-05-11T07:12:52Z  | fresh    | resolved from `cmd_template` (`npm create vite@latest …`); 8 days old vs today |
| GitHub repo  | not run                                              | n/a      | card `docs_url` is `https://vitejs.dev/guide/`, not a GitHub URL — check skipped |
| `gh` CLI     | not available locally                                | n/a      | would have been moot anyway given the non-GitHub `docs_url`                    |

No staleness flag raised.

## Scaffold log

**Resolved invocation**: `npm create vite@latest .bootstrap-scaffold -- --template react-ts`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 11 (`.gitignore`, `README.md`, `eslint.config.js`, `index.html`, `package.json`, `tsconfig.app.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `public/`, `src/`)
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently (no pre-existing `.gitignore` in cwd)
**.bootstrap-scaffold cleanup**: deleted (empty after move-up)

Notes:
- The `vite-react` `cmd_template` contains no `{pm}` placeholder, so `package_manager: pnpm` was informational at scaffold time. Dependencies were installed afterwards via `pnpm install` (153 packages added; 184 total in the lockfile).
- cwd preconditions before scaffold: `.agents/`, `.claude/`, `.idea/`, `CLAUDE.md`, `context/`, `docs/`, `skills-lock.json`. None clashed with scaffold output. `context/` preservation rule never had to fire because the starter does not ship a `context/` directory.

## Post-scaffold audit

**Tool**: `pnpm audit --json` (the configured `audit_commands.js` is `npm audit --json`; substituted to the pnpm-native equivalent because the hand-off picked pnpm as the package manager and `pnpm install` produced a `pnpm-lock.yaml`, not a `package-lock.json`)
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: clean tree across both — no findings to attribute
**Total dependencies audited**: 184 (149 dev, 0 prod direct, 35 transitive)
**Audit tool exit code**: 0

Raw output:

```json
{
  "actions": [],
  "advisories": {},
  "muted": [],
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0
    },
    "dependencies": 184,
    "devDependencies": 0,
    "optionalDependencies": 0,
    "totalDependencies": 184
  }
}
```

## Hints recorded but not acted on

| Hint                          | Value                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| bootstrapper_confidence       | verified                                                                                    |
| quality_override              | true (vite-react failed the `convention_based` agent-friendly gate; user accepted override) |
| path_taken                    | custom                                                                                      |
| self_check_answers.typed                | true                                                                              |
| self_check_answers.from_official_starter | true                                                                             |
| self_check_answers.conventions          | true                                                                              |
| self_check_answers.docs_current         | true                                                                              |
| self_check_answers.can_judge_agent      | true                                                                              |
| team_size                     | solo                                                                                        |
| deployment_target             | cloudflare-pages                                                                            |
| ci_provider                   | github-actions                                                                              |
| ci_default_flow               | auto-deploy-on-merge                                                                        |
| has_auth                      | true                                                                                        |
| has_payments                  | false                                                                                       |
| has_realtime                  | true                                                                                        |
| has_ai                        | false                                                                                       |
| has_background_jobs           | false                                                                                       |

v1 surfaces these but takes no action. The `quality_override: true` flag — and the user's stated intent that bootstrapper would "generate an extensive `CLAUDE.md` codifying routing, folder layout, data-fetching, and Supabase client conventions" — is the explicit compensation deferred to the future M1L4 ("Memory Architecture") skill. This v1 run did not write `CLAUDE.md` or `AGENTS.md`.

## Next steps

Next: a future skill will set up agent context (`CLAUDE.md`, `AGENTS.md`). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep. *(None created in this run.)*
- Address audit findings per your project's risk tolerance — the full breakdown is in this log. *(No findings in this run.)*
- The hand-off names Supabase as the backend (auth + Postgres + realtime + storage). v1 of bootstrapper does not scaffold Supabase wiring; add `@supabase/supabase-js`, create a typed client module, and configure environment variables when you start the auth/messenger work.
- The hand-off names Cloudflare Pages + GitHub Actions auto-deploy-on-merge. v1 of bootstrapper does not write CI workflow files; add `.github/workflows/` and a Cloudflare Pages project (linked to the repo) when you are ready to deploy.
- Because `quality_override: true` and `vite-react` fails the `convention_based` gate, the future M1L4 skill's `CLAUDE.md` generation is load-bearing for agent friendliness on this project. Treat it as a near-term follow-up, not a nice-to-have.
