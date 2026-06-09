---
starter_id: vite-react
package_manager: pnpm
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
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: true
---

## Why this stack

Solo developer building a closed B2B SaaS marketplace for the polymer industry, with auth, realtime messaging, background email notifications, and a paid-plan model. The user explicitly rejected SSR and meta-framework complexity (Next/T3/Astro), choosing a clean client-side SPA paired with Supabase as the backend (Postgres + Auth + Realtime + Storage + Edge Functions) — a natural fit for the shape-notes preference for Supabase free tier on the ~10-company pilot. Vite + React + TypeScript + React Router DOM is the mainstream SPA combination, with the largest training-data footprint and the strongest documentation across the stack. The custom path was taken because the recommended default (10x-astro-starter) targets content-first sites, not SaaS apps. vite-react fails one of four agent-friendly gates (convention_based) — quality_override is true and recorded; the conventions gap is owned consciously and will be compensated via CLAUDE.md / AGENTS.md instructions that pin folder layout, routing pattern, and naming. Cloudflare Pages is the starter's default deployment target; GitHub Actions with auto-deploy-on-merge mirrors the solo workflow.
