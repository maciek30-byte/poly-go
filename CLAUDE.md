# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: polyGo

Invite-only B2B directory + 1:1 messenger for the Polish plastics industry. Solo, after-hours build. Browser-only (no native mobile). Product surfaces are **Polish-language only** for end users; admin surfaces may be English. See `@docs/raw-idea.md`, `@context/foundation/prd.md`, `@context/foundation/tech-stack.md` for the source-of-truth product spec.

The application shell, router, Supabase client, AuthContext, i18n, and Polish layout were landed by the F-01 slice (`context/changes/app-shell-and-routing/`). See "Conventions (locked by F-01)" below for the patterns every later slice must inherit.

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

- **Service-role Supabase keys must never carry a `VITE_` prefix.** Vite inlines `VITE_*` into the client bundle; a leaked service-role key bypasses RLS. The CI bundle leak check (`grep -rE 'service_role|sb_secret_|VITE_DEV_FAKE_PROFILE' dist/`) backstops this — do not disable it. The `VITE_DEV_FAKE_PROFILE` term is part of the same grep because that variable is dev-only (see Conventions below).
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

## Conventions (locked by F-01)

These choices were made by the `app-shell-and-routing` slice and every subsequent slice inherits them. Don't drift; if a slice has a strong reason to break one, update this section in the same PR.

- **Router: `react-router-dom@^7` data routers.** Use `createBrowserRouter` + `<RouterProvider>` (`src/App.tsx`, `src/shared/routing/router.tsx`). Do not regress to v6's `<BrowserRouter>` — the v7 data-router APIs are the locked pattern. **All imports must come from the top-level `react-router-dom` barrel.** Deep imports like `react-router/dom` or per-module subpaths are strictly forbidden — they trip `eslint-plugin-import` module resolution in several common setups and produce inconsistent lint failures across slices.
- **Folder layout: feature folders + shared/.** Co-locate everything a single feature owns under `src/features/<feature>/` (e.g., `src/features/account-status/`). Cross-feature primitives live in `src/shared/{ui,lib,layout,routing,i18n}/`. **Promotion rule:** a module belongs in `src/features/<feature>/` while exactly one feature consumes it. The moment a second feature imports it, move it to the appropriate `src/shared/*` subdir. This prevents both god-`shared/` erosion and cross-feature import spaghetti.
- **Supabase client: `src/shared/lib/supabaseClient.ts`.** Single module, default-exports the client built with **anon key only** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). Service-role keys are never imported anywhere in `src/`. Env-var validation throws at module-load time so a missing var fails on dev-boot, not on first auth call.
- **i18n: i18next, business app only, `pl` default.** Init in `src/shared/i18n/index.ts` with an inline resource bundle in `src/shared/i18n/pl.ts`; types are augmented in `src/shared/i18n/i18next.d.ts` so `t('…')` autocompletes and typos are TS errors. New slices add their keys to `pl.ts`. The `/admin/*` tree **intentionally does not consume i18n** — admin strings are inline English. If a second locale is added post-MVP, only the business app is in scope.
- **Dev-fake-profile: `VITE_DEV_FAKE_PROFILE`.** Dev-only seam at `src/shared/routing/useFakeProfile.ts` that previews locked/pending screens without a real profile fetch. Three-layer defense: (1) this rule documents that the variable **must never be set in the Cloudflare Pages environment**; (2) the CI leak grep (above) fails the build if the variable name appears in `dist/`; (3) the file's top-level `import.meta.env.PROD` throw crashes the module at load time if it ever ships to prod. The whole seam is deleted by F-02 when the real DB-backed profile fetch lands.
- **Deep-link preservation on auth redirects.** `ProtectedRoute` redirects unauthenticated users with `navigate('/login', { state: { from: location.pathname + location.search } })`. S-01's login flow will read `state.from` to send users back to their intended URL — preserve this exact field name.
- **Status type narrowing below `SessionGate`.** `useAuth()` returns `status: 'loading' | 'unauthenticated' | 'authenticated'`. Inside `SessionGate` the `loading` branch is handled, and children are wrapped in `ResolvedAuthContext` whose hook `useResolvedAuth()` exposes a status narrowed to `Exclude<AuthStatus, 'loading'>`. **Downstream of `SessionGate` (`ProtectedRoute`, `RootRedirect`, etc.) consume `useResolvedAuth()`, not `useAuth()`** — that way TypeScript rejects any code path that tries to handle `loading` below the gate.

## Three roles

`Platform Administrator` (polyGo team), `Company Owner` (one per company, invited by Admin), `Employee` (one or more per company, invited by Owner). Sign-up is **invitation-only at both tiers** — there is no public registration form. A locked or pending user that authenticates must land on an explicit "account locked / pending" state, not the app UI. (PRD: `## Access Control`.)

## TS config tripwires

`tsconfig.app.json` enables `verbatimModuleSyntax` and `erasableSyntaxOnly`:

- Type-only imports must use `import type { … }` — a plain `import { SomeType }` used only as a type will fail the build.
- Don't reach for TS-only runtime constructs (`enum`, parameter properties, `namespace` with runtime members) — `erasableSyntaxOnly` rejects them. Use `const` objects + union types instead of `enum`.

`noUnusedLocals` and `noUnusedParameters` are on — unused params must be prefixed with `_`.

## Context directory & this toolkit

`context/foundation/` holds the canonical product artifacts (`prd.md`, `tech-stack.md`, `shape-notes.md`). When you need to know "what does the product do / why", read those before guessing. `context/changes/` holds in-flight change packets; `context/archive/` is **immutable** — never write into it.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 2

Turn one roadmap item into the first implementation cycle with the **change planning chain**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review`, and `/10x-implement` are the lesson focus. `/10x-frame` and `/10x-research` are not required rituals here; they are escalation paths introduced in the next lesson.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Change setup (lesson focus)** | |
| `/10x-new <change-id>` | You selected a roadmap item and need a stable change folder. Creates `context/changes/<change-id>/change.md` so planning, implementation, progress, commits, and later review all share one identity. Use AFTER roadmap selection, BEFORE `/10x-plan`. |
| **Planning (lesson focus)** | |
| `/10x-plan <change-id>` | You have a change folder and need a reviewable implementation plan. Reads roadmap context, foundation docs, codebase evidence, and any existing change notes; writes `plan.md` and `plan-brief.md` with phases, file contracts, success criteria, and `## Progress`. |
| **Plan readiness (lesson focus)** | |
| `/10x-plan-review <change-id>` | You have `plan.md` and need a light pre-code readiness check. Use it to catch missing end state, weak contracts, malformed progress, scope drift, or blind spots before code changes begin. |
| **Implementation (lesson focus)** | |
| `/10x-implement <change-id> phase <n>` | You have an approved plan and want to execute one phase with verification, manual gate, commit ritual, and SHA write-back to `## Progress`. |
| **Lifecycle closure** | |
| `/10x-archive <change-id>` | A change is merged or intentionally closed. Move it out of active `context/changes/` into archive state. |

### How the chain hands off

- `/10x-new` creates the durable change identity.
- `/10x-plan` turns that identity into an implementation contract.
- `/10x-plan-review` checks the plan before the agent mutates code.
- `/10x-implement` executes one planned phase, verifies, asks for manual confirmation when needed, commits, and records progress.

### Lesson boundaries

- Plan is the default router after roadmap selection. Start with `/10x-plan` unless the problem is unclear or external evidence is blocking.
- Do not run `/10x-frame + /10x-research` as ceremony for every change.
- Do not turn this lesson into a full end-to-end product build. A checkpoint with a planned and partially or fully implemented stream is valid.
- Code review of the implemented diff belongs to Lesson 3 via `/10x-impl-review`.
- Lifecycle closure via `/10x-archive` after a change is merged or intentionally closed.

### Paths used by this lesson

- `context/foundation/roadmap.md` - upstream roadmap
- `context/changes/<change-id>/change.md` - change identity
- `context/changes/<change-id>/plan.md` - implementation contract
- `context/changes/<change-id>/plan-brief.md` - compressed handoff
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
