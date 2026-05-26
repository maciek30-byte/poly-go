# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: polyGo

Invite-only B2B directory + 1:1 messenger for the Polish plastics industry. Solo, after-hours build. Browser-only (no native mobile). Product surfaces are **Polish-language only** for end users; admin surfaces may be English. See `@docs/raw-idea.md`, `@context/foundation/prd.md`, `@context/foundation/tech-stack.md` for the source-of-truth product spec.

The codebase is currently the **stock `vite-react` scaffold** (`src/App.tsx` is the Vite/React landing page). No domain code, Supabase wiring, routing, or auth has been written yet.

## Commands

Package manager: **pnpm** (see `pnpm-lock.yaml`). Do not use npm/yarn.

- `pnpm dev` — Vite dev server with HMR
- `pnpm build` — typecheck (`tsc -b`) then `vite build`. The build script runs the typechecker as a gate; a TS error fails the build.
- `pnpm lint` — ESLint over the repo (flat config in `eslint.config.js`)
- `pnpm preview` — preview the built bundle

There is **no test runner installed yet**. Do not invent `pnpm test` — add Vitest (or whichever runner) explicitly when tests are introduced.

## Stack & target

- **Frontend**: React 19 + TypeScript + Vite 8 (SPA, no SSR meta-framework — the user explicitly chose React-without-Next/Astro)
- **Backend** (planned per `tech-stack.md`, not yet wired): **Supabase** for Postgres + auth + realtime + storage (PDF attachments ≤ 10 MB)
- **Deploy**: Cloudflare Pages, auto-deploy on merge via GitHub Actions
- **Realtime**: required (chat live-update SLA: < 2 s when both parties online — NFR in PRD)

`tech-stack.md` notes the `vite-react` starter **fails the `convention_based` agent-friendliness gate** — that's why this file exists. When you add subsystems (routing, data-fetching, Supabase client, feature folders), prefer one obvious pattern and document the choice here rather than improvising per-file.

## Deployment

Production: https://polygo.pages.dev (auto-deploy on push to `main` via `.github/workflows/deploy.yml`). Full procedure, env-var locations, rollback steps, and known failure modes live in **`docs/runbooks/deploy.md`** — read it before touching anything CI/CD-related, before rotating Supabase or Cloudflare credentials, or when a CI run goes red.

Two non-negotiables:

- **Service-role Supabase keys must never carry a `VITE_` prefix.** Vite inlines `VITE_*` into the client bundle; a leaked service-role key bypasses RLS. The CI bundle leak check (`grep -rE 'service_role|sb_secret_' dist/`) backstops this — do not disable it.
- **Wrangler v4 + Node 22+ in CI.** `cloudflare/wrangler-action@v3` defaults to its bundled Wrangler v3; we pin `wranglerVersion: "4.93.1"` explicitly and Node 22 (Wrangler 4 requires it). Don't downgrade either without re-validating the deploy.

## Load-bearing product rules (these are bugs if violated)

These come from the PRD's `Business Logic` and `Guardrails` and should shape any code touching directory, chat, profile, or auth surfaces:

1. **Verification gate.** A user must never see, search, or contact a company (or its employees) that is not in `activated` state. Applies in directory queries, profile-by-URL routes, chat inbox, and invitation acceptance. This is the product's whole moat — a leak here is the worst possible regression. (PRD: `FR-013`, `## Business Logic`.)
2. **Chat history outlives the individual.** When a Company Owner deactivates an Employee, the Employee can no longer log in, but the Owner retains read access to **all** chat threads that Employee participated in, including attachments. Deleting/orphaning chat history on deactivation is a bug. (PRD: `FR-022`, `FR-023`, `US-02`.)
3. **Phone-number reveal is gated.** Counterparty Employee phone numbers are visible **only after** a 1:1 chat has been opened with that specific Employee. Reveal events are logged for anti-harvest audit. The company profile employee-list view shows name + job title only. (PRD: `FR-010`, `FR-010a`.)
4. **NIP/KRS edits reset state.** Editing a company's NIP or KRS post-activation moves the company back to `pending` and re-triggers Platform Administrator verification. Other profile fields (address, materials, employees) are freely editable. (PRD: `FR-006`, `## Business Logic`.)
5. **Materials are a curated catalog, not free-text.** Companies pick polymers from a polyGo-curated dropdown (PE, PP, PVC, PET, …). New polymers go through a propose → admin-approve flow; until approved, the proposed material is visible only on the proposer's own profile. Do not add a free-text tag input. (PRD: `FR-007`, `FR-007a`.)
6. **No public/SEO surfaces.** Company profile pages must not be visible to unauthenticated visitors and must not be indexable by external search engines. (PRD: `## Non-Goals`.)
7. **Notifications: in-app badge + browser push only.** Email notifications are deliberately out of MVP scope (FR-019). Do not add email-on-new-message flows without an explicit PRD update.
8. **Attachments: PDF only, ≤ 10 MB.** Images, voice notes, and other file types are out of MVP scope. Reject > 10 MB with a clear user-facing error. (PRD: `FR-016`, `## Non-Goals`.)

## Three roles

`Platform Administrator` (polyGo team), `Company Owner` (one per company, invited by Admin), `Employee` (one or more per company, invited by Owner). Sign-up is **invitation-only at both tiers** — there is no public registration form. A locked or pending user that authenticates must land on an explicit "account locked / pending" state, not the app UI. (PRD: `## Access Control`.)

## TS config tripwires

`tsconfig.app.json` enables `verbatimModuleSyntax` and `erasableSyntaxOnly`:

- Type-only imports must use `import type { … }` — a plain `import { SomeType }` used only as a type will fail the build.
- Don't reach for TS-only runtime constructs (`enum`, parameter properties, `namespace` with runtime members) — `erasableSyntaxOnly` rejects them. Use `const` objects + union types instead of `enum`.

`noUnusedLocals` and `noUnusedParameters` are on — unused params must be prefixed with `_`.

## Context directory & this toolkit

`context/foundation/` holds the canonical product artifacts (`prd.md`, `tech-stack.md`, `shape-notes.md`). When you need to know "what does the product do / why", read those before guessing. `context/changes/` holds in-flight change packets; `context/archive/` is **immutable** — never write into it.

The `

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 1

Move from sprint-zero setup to project orchestration with the **roadmap chain**:

```
(Module 1 foundation docs) -> /10x-roadmap -> backlog-ready roadmap items
```

`/10x-roadmap` is the lesson focus. `/10x-new` is intentionally introduced in Module 2, Lesson 2, when a selected roadmap item becomes an implementation change folder.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Roadmap (lesson focus)** | |
| `/10x-roadmap` | You have `context/foundation/prd.md` and a scaffolded project baseline, and you need a vertical-first MVP roadmap. The skill reads the PRD, inspects the code baseline, uses available foundation docs such as `tech-stack.md`, `infrastructure.md`, and `deploy-plan.md`, then writes `context/foundation/roadmap.md`. Use it BEFORE creating per-change folders or implementation plans. |
| **Re-run upstream if needed** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Bundled from Module 1 so foundation contracts can be fixed before roadmap sequencing. If roadmap generation exposes a PRD gap, repair the PRD before pretending the backlog is ready. |

### How the chain hands off

- `/10x-roadmap` bridges product and implementation. It does not choose frameworks, design schemas, or write a per-change implementation plan.
- The output is `context/foundation/roadmap.md`: ordered milestones, vertical slices, bounded foundations, dependencies, unknowns, risk, and backlog handoff fields.
- Roadmap items should receive stable human-readable identifiers in backlog tools. The actual `context/changes/<change-id>/` folder is created in Lesson 2 with `/10x-new`.

### Roadmap boundaries

- Default to vertical slices: user-visible outcomes that cross UI, data, business logic, and integrations.
- Horizontal work is allowed only as a bounded enabler that names the downstream vertical milestone it unlocks.
- Avoid orphan horizontal work such as "build the whole database", "build all API endpoints", or "design the whole UI" before the first user-visible flow.
- Roadmap is not a calendar estimate. Do not invent dates, story points, or sprint velocity unless the user explicitly asks for a separate planning artifact.

### Foundation paths used by this lesson

- `context/foundation/prd.md` - input
- `context/foundation/tech-stack.md` - optional input
- `context/foundation/infrastructure.md` - optional input
- `context/deployment/deploy-plan.md` - optional input
- `context/foundation/roadmap.md` - output
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
