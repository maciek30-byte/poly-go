---
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
---

## Why this stack

Solo, after-hours build of an invite-only directory + 1:1 messenger for the Polish plastics industry. 
The user explicitly chose React without an SSR meta-framework, so the standard `(web, js)` default (`10x-astro-starter`) was set aside in favor of a pure SPA shell via `vite-react`. Supabase covers the backend concerns the PRD demands — Postgres + auth + realtime + storage for ≤10 MB PDF attachments + RODO-compliant data handling — without a separate API starter. Deployment lands on Cloudflare Pages (the starter's default) with GitHub Actions auto-deploying on merge. `vite-react` fails the `convention_based` agent-friendly gate; the user accepted the override and bootstrapper will generate an extensive `CLAUDE.md` codifying routing, folder layout, data-fetching, and Supabase client conventions so an agent can navigate the project. All five self-check points came back true.
