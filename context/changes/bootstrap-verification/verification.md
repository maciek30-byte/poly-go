---
bootstrapped_at: 2026-06-08T12:56:00Z
starter_id: vite-react
starter_name: Vite + React
project_name: poly-go
language_family: js
package_manager: pnpm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: pnpm audit --json
---

## Hand-off

Frontmatter from `context/foundation/tech-stack.md`:

```yaml
starter_id: vite-react
package_manager: npm
project_name: poly-go
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
    conventions: false
    docs_current: true
    can_judge_agent: true
  has_auth: true
  has_payments: true
  has_realtime: true
  has_ai: false
  has_background_jobs: true
```

Session-time corrections applied (file on disk unchanged):
- `package_manager`: `npm` → `pnpm`
- `has_payments`: `true` → `false`

### Why this stack (verbatim from hand-off)

Solo developer building a closed B2B SaaS marketplace for the polymer industry, with auth, realtime messaging, background email notifications, and a paid-plan model. The user explicitly rejected SSR and meta-framework complexity (Next/T3/Astro), choosing a clean client-side SPA paired with Supabase as the backend (Postgres + Auth + Realtime + Storage + Edge Functions) — a natural fit for the shape-notes preference for Supabase free tier on the ~10-company pilot. Vite + React + TypeScript + React Router DOM is the mainstream SPA combination, with the largest training-data footprint and the strongest documentation across the stack. The custom path was taken because the recommended default (10x-astro-starter) targets content-first sites, not SaaS apps. vite-react fails one of four agent-friendly gates (convention_based) — quality_override is true and recorded; the conventions gap is owned consciously and will be compensated via CLAUDE.md / AGENTS.md instructions that pin folder layout, routing pattern, and naming. Cloudflare Pages is the starter's default deployment target; GitHub Actions with auto-deploy-on-merge mirrors the solo workflow.

## Pre-scaffold verification

| Signal      | Value                                          | Severity | Notes                                                            |
| ----------- | ---------------------------------------------- | -------- | ---------------------------------------------------------------- |
| npm package | create-vite v9.0.7 published 2026-05-11        | fresh    | derived from cmd_template `npm create vite@latest`               |
| GitHub repo | not run                                        | n/a      | card `docs_url` is `https://vitejs.dev/guide/` (not a GitHub URL) |

## Scaffold log

**Resolved invocation**: `pnpm create vite@latest .bootstrap-scaffold --template react-ts`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 10 (`README.md`, `eslint.config.js`, `index.html`, `package.json`, `tsconfig.app.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `public/`, `src/`)
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: append-merged (cwd had `node_modules`; scaffold lines appended under a `# from vite-react` separator with that line de-duped)
**.bootstrap-scaffold cleanup**: deleted

Notes:
- Substitution adjustment: the card's `cmd_template` is `npm create vite@latest {name} -- --template react-ts`. With `{pm}` resolved to `pnpm`, the `--` flag separator was dropped because pnpm forwards CLI flags directly to the creator without it. The effective resolved command shown above is what was executed.
- `context/` carried no scaffold-side collisions to drop; cwd `context/` is intact and canonical.

## Post-scaffold audit

**Tool**: `pnpm audit --json` (substituted for `npm audit --json` from the config because the lockfile is `pnpm-lock.yaml`; functionally equivalent advisory output)
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/0/0 direct of total 0/0/0/0 — clean tree
**Total dependencies scanned**: 184

No advisories surfaced. Raw output:

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

| Hint                    | Value                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| bootstrapper_confidence | verified                                                                                                           |
| quality_override        | true                                                                                                               |
| path_taken              | custom                                                                                                             |
| self_check_answers      | typed=true, from_official_starter=true, conventions=false, docs_current=true, can_judge_agent=true                 |
| team_size               | solo                                                                                                               |
| deployment_target       | cloudflare-pages                                                                                                   |
| ci_provider             | github-actions                                                                                                     |
| ci_default_flow         | auto-deploy-on-merge                                                                                               |
| has_auth                | true                                                                                                               |
| has_payments            | false (session-time correction; file on disk still has `true`)                                                     |
| has_realtime            | true                                                                                                               |
| has_ai                  | false                                                                                                              |
| has_background_jobs     | true                                                                                                               |

`quality_override: true` reflects the `convention_based` gate failure for vite-react. v1 surfaces but does not compensate; CLAUDE.md / AGENTS.md (future M1L4 skill) is the intended compensation surface.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` already present in cwd — no action needed; the scaffold did not introduce any inherited history.
- No `.scaffold` siblings were created; nothing to reconcile.
- Address audit findings per your project's risk tolerance — the audit reported a clean tree.
- Reconcile the session-time corrections (`package_manager: pnpm`, `has_payments: false`) back into `context/foundation/tech-stack.md` if you want the file on disk to match this run.
