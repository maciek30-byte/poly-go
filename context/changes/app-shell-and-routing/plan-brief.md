# App Shell and Routing — Plan Brief

> Full plan: `context/changes/app-shell-and-routing/plan.md`

## What & Why

Replace the stock Vite/React landing page with polyGo's real application shell: router, Supabase client, AuthContext, ProtectedRoute, account-locked / pending terminal screens, Polish layout shell, and i18n scaffolding. This is the foundation slice (F-01) — every later roadmap item (F-02, S-01…S-12) is blocked on it. It also locks in the conventions (router, folder layout, i18n, auth shape) that every subsequent slice inherits via `CLAUDE.md`.

## Starting Point

The codebase is the stock vite-react scaffold. `src/App.tsx` is the Vite demo (hero image, counter button); `@supabase/supabase-js` is in `package.json` but never imported; there's no router, no auth, no layout, no Polish copy anywhere. `tsconfig.app.json` enables `verbatimModuleSyntax` and `erasableSyntaxOnly` so this slice avoids `enum`s and must use `import type`. CI auto-deploys to `polygo.pages.dev` on every push to `main` with a leak-check grep that forbids `service_role|sb_secret_` in the bundle — this slice extends the grep to also forbid `VITE_DEV_FAKE_PROFILE`.

## Desired End State

`pnpm dev` opens to a Polish polyGo shell with a top app bar + sidebar (desktop) / bottom tab bar (mobile-width) exposing four nav links — Katalog, Wiadomości, Ulubione, Profil — that satisfy the PRD NFR "any of the four core capabilities within three clicks from a stable home view." Each link lands on a placeholder page. Unauthenticated users hitting `/app/*` are redirected to `/login` with their original URL preserved in router state. Users with a `locked` or `pending` account land on dedicated Polish terminal screens with no path back into `/app`. Deep links survive a hard refresh in production (Cloudflare SPA fallback wired). The build is indexed by no search engine.

## Key Decisions Made

| Decision                              | Choice                                                                                            | Why (1 sentence)                                                                                                                          | Source |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Router library                        | `react-router-dom@7` data routers (`createBrowserRouter` + `RouterProvider`)                      | Largest training-data footprint, declarative, idiomatic post-2024 React pattern; explicitly codified in `CLAUDE.md` to prevent v6 regressions. | Plan   |
| Folder layout                         | Feature folders + shared/ (`src/features/<feature>/`, `src/shared/{ui,lib,layout,routing,i18n}/`) | Maps 1:1 to roadmap slice IDs (each S-XX becomes a feature folder); colocation keeps related code together.                                | Plan   |
| Polish copy strategy                  | i18next + react-i18next in the business app; inline EN in Admin                                   | User wants the door open for a second business-app language (UA / EN) post-MVP; Admin stays inline EN per "no translations needed for admin." | Plan (user override) |
| AuthContext shape                     | `AuthProvider` with `getSession()` + `onAuthStateChange`; exposes `{session, user, status, signOut}` | Idiomatic React + Supabase pattern; ProtectedRoute and layout read from one context source.                                                | Plan   |
| Route topology                        | Public + protected + locked + 404, with placeholders for all four capabilities                    | Every later slice has a clear mount point; the role/state branching the PRD demands is already wired.                                       | Plan   |
| Env vars + SEO posture                | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anon only); `<meta name="robots" content="noindex,nofollow">` + `robots.txt` | RLS enforces real auth so the anon key is safe to bundle; the noindex posture closes the PRD Non-Goal of "no SEO indexing".                | Plan   |
| Loading UX                            | Full-screen polyGo splash with spinner during initial `getSession()`                              | Prevents flash-of-login / flash-of-app on every page load; renders ~5–20ms for most users.                                                  | Plan   |
| Role / account-status source for F-01 | Dev-only `VITE_DEV_FAKE_PROFILE` env var, guarded by three layers (CLAUDE.md prohibition + CI leak grep + module-load `import.meta.env.PROD` throw) | User chose hardcoded fake profile so locked/pending screens are clickable in F-01; defense-in-depth ensures the dev secret can never reach a prod bundle; F-02 deletes the seam when it ships the real DB-backed profile. | Plan (user override) |
| Manual verification scope             | 4 scenarios — deep-link redirect, signOut, locked/pending screens, 404                            | Covers every PRD Access Control branch; each scenario is 30 seconds.                                                                       | Plan   |

## Scope

**In scope:**

- React Router v7 install + topology (`/`, `/login`, `/account-locked`, `/account-pending`, `/app/*`, `/admin/*`, `*`).
- Supabase client wrapper (anon key only), env-var validation that throws fast.
- `AuthContext` with `onAuthStateChange` subscription, `signOut`, status state machine (`loading | unauthenticated | authenticated`).
- `ProtectedRoute` (redirect to `/login` with `state.from` preservation) and `AccountStatusGate` (today reads dev-fake-profile; F-02 swaps in real profile).
- Polish layout shell: top app bar + desktop sidebar / mobile bottom tab bar with 4 capability links.
- Polish terminal screens: `/account-locked`, `/account-pending`, 404; English Admin shell with placeholder `/admin/queue`.
- i18n init (i18next, `pl` default, inline resource bundle, business-app only).
- `<meta name="robots">` noindex + `public/robots.txt` + `public/_redirects` for Cloudflare SPA fallback.
- `CLAUDE.md` updates documenting every convention this slice locks in.
- Deletion of Vite demo assets (`src/App.css`, demo SVGs, hero image).

**Out of scope:**

- Real login UI / magic-link / invitation flow (S-01).
- Supabase schema, RLS, migrations, real profile fetch (F-02).
- UI component library, design system, theming beyond hand-rolled CSS.
- Data-fetching library (TanStack Query etc.).
- Test runner (Vitest); will be introduced by the first slice with logic worth asserting.
- Analytics, Sentry, PostHog, service worker, PWA manifest beyond Vite default.
- Browser push notifications (S-08), email notifications (explicitly out of MVP per PRD).
- Password reset, account creation form, public sign-up (PRD: invitation-only).

## Architecture / Approach

```
<I18nextProvider>
  <AuthProvider>                       // subscribes to supabase.auth.onAuthStateChange
    <SessionGate>                      // shows splash while status === 'loading'
      <RouterProvider router>          // react-router-dom v7 data router
        ├─ /                           → RootRedirect (by auth status)
        ├─ /login                      → LoginPage (placeholder, S-01)
        ├─ /account-locked             → Polish terminal screen
        ├─ /account-pending            → Polish terminal screen
        ├─ /app/* (ProtectedRoute → AccountStatusGate → AppLayout)
        │     ├─ dashboard | directory | messages | favorites | profile  (placeholders)
        ├─ /admin/* (ProtectedRoute → AccountStatusGate → AdminLayout, EN)
        │     └─ queue  (placeholder)
        └─ *                           → Polish 404
```

Single SPA. No SSR. No code-splitting (overkill at this size). Cloudflare Pages serves `index.html` for any unknown path so deep links resolve client-side.

## Phases at a Glance

| Phase                                          | What it delivers                                                                                       | Key risk                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1. Plumbing & conventions                      | Dependencies installed, folder skeleton, Supabase client, i18n init, `CLAUDE.md` conventions section.  | `CLAUDE.md` decisions are load-bearing for 12+ later slices — getting a convention wrong costs N slices of inheritance.   |
| 2. AuthContext + ProtectedRoute                | `AuthProvider`, `useAuth`, `SessionGate` splash, `ProtectedRoute`, `AccountStatusGate` stub.            | `VITE_DEV_FAKE_PROFILE` leaking to production — mitigated by three layers: `CLAUDE.md` prohibition, CI leak-grep extension, and a module-load (top-of-file) `import.meta.env.PROD` throw. |
| 3. Routes + layout shell + terminal screens    | Full router topology, app + admin layouts, locked/pending/404 screens, robots noindex, SPA fallback.   | Cloudflare `_redirects` ordering and presence — verified by a post-build automated check + a `curl -I` on the deployed URL. |

**Prerequisites:** none — this is the foundation slice; the only soft dependency is having a Supabase project provisioned so the dev `.env.local` can carry real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values for end-to-end manual verification.

**Estimated effort:** ~2–4 evening sessions across 3 phases for a solo dev. Phase 1 is the longest (decision-locking + i18n setup); Phase 2 is the smallest; Phase 3 carries the most surface area (layout CSS, placeholder pages).

## Open Risks & Assumptions

- Assumes Supabase project credentials are available for manual verification of Phase 2/3 — if not, the corresponding manual gates degrade to "verify the wiring exists" rather than "verify the round-trip works." Acceptable for F-01; F-02 makes round-trip mandatory.
- Assumes the four nav labels (Katalog, Wiadomości, Ulubione, Profil) are the final PRD product capabilities. Adding a fifth top-level capability later forces a layout revisit and an NFR re-validation — documented in `CLAUDE.md`.
- Cloudflare Pages `_redirects` file behavior is documented and stable, but unverified end-to-end on `polygo.pages.dev` for this app until Phase 3 ships. The build-output grep is the automated proxy; the manual `curl -I` after deploy is the real check.
- i18next at ~30–50 KB gzipped is acceptable today; if bundle size becomes a concern in a future MVP iteration, the dictionary can be hand-rolled (typed messages object) and i18next swapped out without changing component-level call sites if all string lookups go through a small `t()` wrapper.

## Success Criteria (Summary)

- Unauthenticated user hitting any `/app/*` URL lands on `/login` with their intended URL preserved.
- A locked or pending user sees only the Polish terminal screen, never the app chrome.
- All four PRD-mandated product capabilities (Katalog, Wiadomości, Ulubione, Profil) are reachable in exactly one click from `/app/dashboard` — anchoring the NFR 3-click guarantee.
