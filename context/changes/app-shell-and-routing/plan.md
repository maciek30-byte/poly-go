# App Shell and Routing Implementation Plan

## Overview

F-01 is the foundation slice for polyGo's SPA. It replaces the stock vite-react landing page with a routed application shell that every later roadmap slice (F-02, S-01…S-12) builds on top of. Scope: install and wire the router, set up the Supabase client with safe env-var handling, build an `AuthContext` driven by Supabase session events, ship `ProtectedRoute` and the PRD-mandated "account locked / pending" terminal screens, lay down the Polish-language layout shell that anchors the NFR 3-click reach, scaffold i18n so the business app can pick up a second locale post-MVP, and codify the chosen conventions in `CLAUDE.md` so downstream slices inherit them.

## Current State Analysis

- `src/App.tsx:1-108` is the stock Vite/React demo page (hero image, counter button, Vite + React links). `src/main.tsx:11-15` mounts it under `<StrictMode>`. No router, no auth, no Supabase wiring, no layout shell.
- `@supabase/supabase-js@^2.106.1` is in `package.json:27` but never imported. Zero references to `import.meta.env` exist in `src/`.
- `package.json` exposes `pnpm dev / build / typecheck / lint / format / preview`. `build` runs `tsc -b && vite build` — TypeScript errors fail the build. There is **no test runner installed** yet; this plan deliberately does not add one (Vitest belongs to a future change when real assertable logic exists).
- `tsconfig.app.json` enables `verbatimModuleSyntax` (forces `import type`) and `erasableSyntaxOnly` (no `enum`, no parameter properties, no namespace runtime members). All status state machines below use `const` objects + union types.
- `tsconfig.app.json` also enables `noUnusedLocals` and `noUnusedParameters` — unused params must be `_`-prefixed.
- Deploy is auto-on-main to Cloudflare Pages (`.github/workflows/deploy.yml`, `docs/runbooks/deploy.md`). The bundle leak check greps for `service_role|sb_secret_` in `dist/` — only the Supabase **anon** key is allowed in the client bundle.
- `CLAUDE.md` already commits to: PL-only user-facing copy, no public/SEO surfaces, three roles (Platform Administrator / Company Owner / Employee), invitation-only signup, and "a locked or pending user that authenticates must land on an explicit 'account locked / pending' state, not the app UI."
- `context/changes/app-shell-and-routing/change.md` is the change identity (status: `new`, will be updated to `planned`). No `research.md` or `frame.md` was authored for this slice — the roadmap notes plus the PRD are the upstream context.

## Desired End State

After this plan ships:

- `pnpm dev` opens to a Polish-language polyGo shell, not the Vite demo. The shell renders an app bar + a left sidebar (desktop) / bottom tab bar (mobile-width viewport) with four capability links: Katalog, Wiadomości, Ulubione, Profil. Each link lands on a placeholder page.
- An unauthenticated user hitting any `/app/*` or `/admin/*` URL is redirected to `/login`; their intended URL is preserved and they would be sent back there after login (login UX itself belongs to S-01 — this slice only wires the seam).
- A user whose dev-fake-profile status is `locked` or `pending` lands on `/account-locked` or `/account-pending` (PL copy) with no navigation back into `/app`.
- Refreshing on any deep link (`/app/messages`, `/admin/queue`, etc.) does not 404 in production — Cloudflare Pages SPA fallback is configured.
- `index.html` carries `<meta name="robots" content="noindex,nofollow">` and `/public/robots.txt` blocks all crawlers — closing the PRD Non-Goal of "no SEO indexing."
- `CLAUDE.md` has new sections documenting: chosen router, folder layout, i18n approach, Supabase client location, and the dev-fake-profile env-var contract (with explicit warning that it must never be set in production).
- `pnpm build` passes (typecheck + vite build). `pnpm lint` passes. The Cloudflare deploy workflow remains green and the leak-check grep finds nothing.

### Key Discoveries:

- The Supabase **anon** key is safe to embed in the client bundle — RLS enforces all real authorization. The leak-check at `.github/workflows/deploy.yml` greps for `service_role|sb_secret_` strings, not the anon key. The plan uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only and adds an inline `CLAUDE.md` reminder.
- `react-router-dom@7` data routers (`createBrowserRouter` + `RouterProvider`) are the idiomatic post-2024 pattern. v6 `<BrowserRouter>` is being phased out in the docs but still in agent training data — the plan codifies v7 in `CLAUDE.md` so future agents don't regress to v6.
- React 19's `use()` hook can read context but does not change the AuthContext design here — `useContext` is still the appropriate consumer because the context value is computed in the provider, not awaited.
- `erasableSyntaxOnly` rules out `enum AccountStatus`. The plan uses `const ACCOUNT_STATUS = { LOADING: 'loading', ... } as const` plus a union type `AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS]`.
- The `feature folders + shared/` layout (`src/features/<feature>/`, `src/shared/{ui,lib,layout,routing,i18n}/`) maps 1:1 onto roadmap slice IDs — every S-XX becomes a feature folder. This is the convention this slice locks into `CLAUDE.md`.

## What We're NOT Doing

- **No login UI.** `/login` is a placeholder page that says "Wkrótce" — S-01 owns the real magic-link/invitation flow. This slice only wires the seam.
- **No real role/profile fetch.** Account status is read from a dev-only `VITE_DEV_FAKE_PROFILE` env var. F-02 ships the real `profile` table + RLS-backed fetch.
- **No Supabase database, RLS, or migrations.** Owned by F-02.
- **No UI component library** (no MUI, no shadcn, no Chakra). The shell uses hand-rolled CSS Modules / plain CSS. A UI library choice belongs to whichever slice first hits a component the shell can't supply trivially.
- **No data-fetching library** (no TanStack Query, no SWR). The auth subscription is bespoke. Data-fetching convention will be picked when S-04 needs real list queries.
- **No test runner.** Vitest gets added when a slice ships logic worth asserting on.
- **No analytics, Sentry, or PostHog.** The roadmap baseline explicitly notes observability is "absent" and slices will add it where they need it.
- **No service worker, no PWA manifest beyond the Vite default.** Browser push (S-08) will install the SW.
- **No admin app split.** Admin lives under `/admin/*` in the same SPA per CLAUDE.md's single-app posture; the Admin tree opts out of i18n and uses inline English strings.
- **No password reset, no email verification, no account creation form.** All gated behind invitations (S-01, S-03).

## Implementation Approach

Three sequential phases, each independently shippable and verifiable.

**Phase 1 — Plumbing & conventions.** Install runtime dependencies (`react-router-dom`, `i18next`, `react-i18next`). Scaffold the `src/features/` and `src/shared/` tree (empty folders + barrel files where useful). Create `src/shared/lib/supabaseClient.ts` reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, throwing at module load if either is missing. Wire i18n with `pl` as the default and only locale, exposing a typed `t()` for the business app; document that the `/admin/*` tree intentionally does not consume i18n. Update `CLAUDE.md` with the chosen conventions so the next slice inherits them.

**Phase 2 — AuthContext + ProtectedRoute.** Build `AuthProvider` that calls `supabase.auth.getSession()` on mount, subscribes to `supabase.auth.onAuthStateChange`, and exposes `{ session, user, status, signOut }` where `status: 'loading' | 'unauthenticated' | 'authenticated'`. Add a sibling `useFakeProfile()` hook that reads `VITE_DEV_FAKE_PROFILE` only when `import.meta.env.DEV === true` and throws otherwise — the seam F-02 will replace. Render a `<SessionGate>` at the app root that shows a full-screen polyGo splash while status is `loading`. Implement `ProtectedRoute` (redirect to `/login` preserving the original URL via `state.from`) and `AccountStatusGate` (a one-line wrapper that today returns children but in F-02 routes to `/account-locked` or `/account-pending` based on the real profile).

**Phase 3 — Routes + layout shell + terminal screens.** Replace `src/App.tsx`'s contents (deleting the Vite demo) with `createBrowserRouter` defining the topology: `/` (redirects authenticated users to `/app`, unauthenticated to `/login`), `/login` (placeholder), `/account-locked`, `/account-pending`, `/app/*` (`AppLayout` parent route with placeholder children `dashboard`, `directory`, `messages`, `favorites`, `profile`), `/admin/*` (`AdminLayout` parent — English copy, placeholder children), `*` (Polish 404). Build `AppLayout` (top app bar with logo + user menu + signOut, sidebar on desktop, bottom tab bar on mobile-width via a CSS media query). Add `<meta name="robots" content="noindex,nofollow">` to `index.html`, write `/public/robots.txt`, and write `/public/_redirects` (`/*    /index.html   200`) for Cloudflare SPA fallback.

## Critical Implementation Details

- **Dev-only env var must throw in prod — at module-load time.** `VITE_DEV_FAKE_PROFILE` is gated by `if (import.meta.env.PROD) throw new Error('Dev fake profile read in production')` placed at the **top level** of `useFakeProfile.ts` (module-evaluation time, outside the hook body), not inside the hook. Vite **does** inline `VITE_*` vars at build time, so if the secret ever leaks into a prod bundle the throw must fire on the very first import — surfacing the leak in the first browser request instead of after a user authenticates and the hook is called. Defense in depth: (1) `CLAUDE.md` documents that this var must never be set in the Cloudflare Pages environment; (2) the CI leak grep (extended in Phase 1 §4) fails the build if the value appears in `dist/`; (3) the module-load throw is the last-ditch runtime backstop if CI is bypassed.
- **`onAuthStateChange` subscription cleanup.** Must `unsubscribe()` on provider unmount, otherwise React Strict Mode's double-mount-in-dev creates leaked subscriptions that fire duplicate state updates. The cleanup goes in the same `useEffect` that opens the subscription.
- **`getSession()` vs `getUser()`.** Use `getSession()` for the initial fetch — it reads from the local storage cache and resolves immediately. `getUser()` round-trips to Supabase and would add ~200ms to the splash duration on every page load.
- **Deep-link preservation order.** When `ProtectedRoute` redirects, it must use `navigate('/login', { state: { from: location.pathname + location.search } })` (not `Navigate` with `replace`), so after S-01 ships login the user can be sent back to their intended URL. The pattern goes in `CLAUDE.md` now so S-01 inherits it.
- **Cloudflare `_redirects` ordering.** The catch-all `/*    /index.html   200` must be the **last** rule. If any later slice adds a redirect (e.g., a vanity URL), it must go above the catch-all.
- **i18n init must run before `RouterProvider` renders.** `i18next.init()` returns a Promise, but with no network backend and the `pl` resources supplied inline the work it does is fully synchronous; the promise resolves on the same tick. Setting `initAsync: false` (the i18next-v26 replacement for the older `initImmediate: false` flag — same semantics, renamed name) does not *make* init synchronous — the inline-resources + no-backend setup already does — it simply makes that contract explicit so consumers can rely on `t()` being callable on the line after `init()`. Call `init()` before importing the router module so the first render has translations available; otherwise the layout shell flashes English keys.
- **`feature folders + shared/` placement rule.** A module belongs in `src/features/<feature>/` if it is consumed by that feature only; the moment a second feature imports it, it moves to `src/shared/`. Document this in `CLAUDE.md` to prevent the slow erosion into a god `shared/` directory.

## Phase 1: Plumbing & Conventions

### Overview

Install dependencies, scaffold the folder tree, wire the Supabase client and i18n, and update `CLAUDE.md` so every subsequent slice inherits these conventions.

### Changes Required:

#### 1. Runtime dependencies

**File**: `package.json`

**Intent**: Add `react-router-dom`, `i18next`, `react-i18next` to `dependencies`. Install via `pnpm add`.

**Contract**: After install, `pnpm-lock.yaml` updates and `pnpm dev` still boots. No version pin overrides — accept whatever `pnpm add` resolves on the current registry. Confirm `react-router-dom@^7` (not `^6`) lands in `dependencies` and document the chosen major in `CLAUDE.md`.

#### 2. Folder skeleton

**Files**:
- `src/features/.gitkeep`
- `src/shared/.gitkeep`
- `src/shared/lib/.gitkeep`
- `src/shared/layout/.gitkeep`
- `src/shared/routing/.gitkeep`
- `src/shared/ui/.gitkeep`
- `src/shared/i18n/.gitkeep`

**Intent**: Create the directory structure the rest of this plan and every later slice writes into. `.gitkeep` files keep the empty folders in version control; they are deleted as soon as a real file lands in the folder.

**Contract**: `find src -type d` lists the new directories. No code references them yet.

#### 3. Supabase client

**File**: `src/shared/lib/supabaseClient.ts` (new)

**Intent**: Single module that creates and exports a singleton `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. Validates both env vars are present at module load and throws a clear error naming the missing variable. Re-exports `Session` and `User` types from `@supabase/supabase-js` for app-wide use (per `verbatimModuleSyntax`, consumers will `import type`).

**Contract**: Default export is the Supabase client. Named exports: `type Session`, `type User`. The validation throw runs at module evaluation time so a missing var fails fast on dev-server boot, not on first auth call.

#### 4. Env files

**Files**:
- `.env.example` (new) — committed.
- `.env.local` (new) — gitignored (verify `.gitignore` already covers `.env.local`; add it if not).
- `.github/workflows/deploy.yml` (existing) — extend the leak grep.

**Intent**: `.env.example` documents the three env vars this slice introduces: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_FAKE_PROFILE`. Each has a comment explaining its purpose and (for the fake-profile var) a giant warning that it must never be set in production. `.env.local` carries the user's actual dev values. Add `VITE_DEV_FAKE_PROFILE` to the leak-check grep in `.github/workflows/deploy.yml` (extending the existing `service_role|sb_secret_` pattern) so a value present in `dist/` fails the build before deploy — this is the first line of defense, paired with the module-load throw in Phase 2 §3.

**Contract**: `pnpm dev` reads from `.env.local`. The grep `grep -rE 'service_role|sb_secret_|VITE_DEV_FAKE_PROFILE' dist/` continues to find nothing post-build.

#### 5. i18n init

**Files**:
- `src/shared/i18n/index.ts` (new)
- `src/shared/i18n/pl.ts` (new) — Polish translation bundle.

**Intent**: Initialize `i18next` + `react-i18next` synchronously with `pl` as the only locale; export a typed `useTranslation` re-export and the initialized `i18n` instance. `pl.ts` is a `const` object holding all Polish strings introduced by this slice (splash text, layout nav labels, account-locked/pending copy, 404 copy). New slices add their own keys to this file.

**Contract**: Calling `i18n.t('layout.nav.directory')` returns `'Katalog'`. The init is synchronous (inline resource bundle, no HTTP load) so the first render has translations available. `useTranslation()` returns `{ t }` typed against the `pl` resource shape.

#### 5b. i18n TypeScript definitions

**File**: `src/shared/i18n/i18next.d.ts` (new)

**Intent**: Module augmentation that wires `t()` against the actual `pl` resource shape so translation-key typos become compile errors and IDE autocomplete works. Declares:

```ts
import type plResources from './pl';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof plResources;
  }
}
```

**Contract**: After this file lands, `t('layout.nav.directory')` autocompletes and `t('layout.nav.doesNotExist')` is a TypeScript error rather than silently typed as `string`. Reference: https://www.i18next.com/overview/typescript.

#### 6. Update `CLAUDE.md`

**File**: `CLAUDE.md`

**Intent**: Add a new top-level section "Conventions (locked by F-01)" documenting the choices this slice makes. Cover: router (react-router-dom v7 data routers, `createBrowserRouter` + `RouterProvider`); router import convention — **all react-router imports must use the top-level `react-router-dom` barrel; deep imports like `react-router/dom` or per-module subpaths are strictly forbidden** because they trip `eslint-plugin-import` module resolution in several common setups and produce inconsistent lint failures across slices; folder layout (`src/features/<feature>/`, `src/shared/{ui,lib,layout,routing,i18n}/`, promotion rule from feature to shared on second consumer); Supabase client location (`src/shared/lib/supabaseClient.ts`, anon key only, never service-role); i18n (i18next, business app only, `pl` default, Admin tree intentionally uses inline English); dev-fake-profile (`VITE_DEV_FAKE_PROFILE`, dev only, throws in prod at module-load time, gated by the CI leak grep, will be deleted by F-02); deep-link preservation pattern (`navigate('/login', { state: { from: ... } })`).

**Contract**: The section sits above "Three roles" and below "Load-bearing product rules". Each convention is a single short paragraph + one code reference. No prose explaining alternatives — that's what `plan.md` is for.

### Success Criteria:

#### Automated Verification:

- `pnpm install` completes cleanly: `pnpm install`
- TypeScript compiles: `pnpm typecheck`
- Lint passes: `pnpm lint`
- Build succeeds: `pnpm build`
- Bundle leak check finds nothing: `grep -rE 'service_role|sb_secret_' dist/`
- Folder structure exists: `test -d src/features && test -d src/shared/lib && test -d src/shared/i18n`

#### Manual Verification:

- `pnpm dev` boots without error and serves the page (still the old App for now — Phase 3 replaces it).
- Removing `VITE_SUPABASE_URL` from `.env.local` makes `pnpm dev` fail with the expected named error on first load.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: AuthContext + ProtectedRoute

### Overview

Build the session subscription, the loading splash, the `ProtectedRoute` redirect, and the dev-fake-profile seam that F-02 will later replace with a real DB-backed profile fetch.

### Changes Required:

#### 1. Account status enum and types

**File**: `src/shared/routing/accountStatus.ts` (new)

**Intent**: Define the status state machine without using `enum`. Exports `ACCOUNT_STATUS` (a `const` object with `LOADING`, `UNAUTHENTICATED`, `AUTHENTICATED`) and `PROFILE_STATUS` (`ACTIVATED`, `PENDING`, `LOCKED`). Exports the corresponding union types.

**Contract**: `type AuthStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS]`. `erasableSyntaxOnly` passes.

#### 2. `AuthProvider` and `useAuth`

**File**: `src/shared/routing/AuthContext.tsx` (new)

**Intent**: React context provider. On mount, calls `supabase.auth.getSession()` to seed state; subscribes to `supabase.auth.onAuthStateChange` to keep state in sync. Exposes `{ session, user, status, signOut }`. `signOut` calls `supabase.auth.signOut()` and clears local state. Cleans up the subscription on unmount.

**Contract**: Hook signature: `useAuth(): { session: Session | null; user: User | null; status: AuthStatus; signOut: () => Promise<void> }`. Provider props: `{ children: ReactNode }`. The subscription cleanup uses the `{ data: { subscription } }` shape returned by `onAuthStateChange` — calling `subscription.unsubscribe()` in the effect cleanup.

#### 3. Dev-only fake-profile hook

**File**: `src/shared/routing/useFakeProfile.ts` (new)

**Intent**: Reads `import.meta.env.VITE_DEV_FAKE_PROFILE` and parses it into `{ role: 'admin' | 'owner' | 'employee'; status: ProfileStatus } | null`. The `if (import.meta.env.PROD) throw new Error(...)` guard **must be placed at the top level of the file (module-evaluation time), outside the hook body** — not inside `useFakeProfile()`. Vite/Rollup statically eliminates the throw in dev builds (where `PROD === false`), but if the module is ever bundled into a production build the import itself crashes on first evaluation, surfacing the leak in the very first browser request instead of waiting for an authenticated user to render `AccountStatusGate`. Returns `null` if the env var is unset. This is the seam F-02 deletes when it ships the real profile fetch.

**Contract**: `useFakeProfile(): FakeProfile | null`. Inline `VITE_DEV_FAKE_PROFILE` format documented in `.env.example`: `<role>:<status>` (e.g., `owner:activated`, `employee:locked`). Invalid value → parse error with the offending string in the message.

#### 4. Session splash + narrowed-status sub-context

**Files**:
- `src/shared/layout/SessionGate.tsx` (new) + `src/shared/layout/SessionGate.module.css` (new)
- `src/shared/routing/ResolvedAuthContext.tsx` (new) — sub-context exposing the narrowed status.

**Intent**: `SessionGate` wraps the app root. While `useAuth().status === 'loading'`, it renders a full-viewport branded splash (centered polyGo wordmark + small spinner + `t('splash.loading')` = `'Ładowanie…'`). Once status is `unauthenticated` or `authenticated`, it does two things: (a) renders `children`, and (b) wraps them in a `ResolvedAuthContext.Provider` carrying a value typed as `{ ...rest of useAuth(): status: Exclude<AuthStatus, 'loading'> }`. The sub-context is the seam that lets TypeScript enforce the "downstream code never sees `loading`" contract instead of relying on a comment.

**Contract**: `SessionGate({ children }: { children: ReactNode }): JSX.Element`. The splash blocks all interaction (no router rendered behind it) so unauthenticated users never see a flash of `/app` content. A new hook `useResolvedAuth()` (exported alongside `ResolvedAuthContext`) returns the narrowed-status value and throws if called outside the provider. Downstream consumers (`ProtectedRoute`, `RootRedirect`) consume **`useResolvedAuth()`**, not `useAuth()`, so the type system rejects any code path that tries to handle `loading` below the gate.

#### 5. `ProtectedRoute`

**File**: `src/shared/routing/ProtectedRoute.tsx` (new)

**Intent**: Route guard. Reads `useResolvedAuth().status` (the narrowed sub-context from §4, **not** `useAuth()`). If `unauthenticated`, renders `<Navigate to="/login" state={{ from: location.pathname + location.search }} replace />`. If `authenticated`, renders `<Outlet />`. Because the consumed type is `Exclude<AuthStatus, 'loading'>`, TypeScript guarantees the switch is exhaustive without a `loading` branch — the upstream `SessionGate` is the only place the loading state exists.

**Contract**: Used as `element={<ProtectedRoute />}` on the `/app` and `/admin` parent routes. The `state.from` field is the contract S-01's login flow will consume to send users back to their intended URL. If a future slice introduces a third `AuthStatus` value, the `Exclude` narrowing automatically forces this file (and `RootRedirect`) to update — no silent regression.

#### 6. `AccountStatusGate` (stub for F-02)

**File**: `src/shared/routing/AccountStatusGate.tsx` (new)

**Intent**: Wraps `/app/*` (and later `/admin/*`) below `ProtectedRoute`. In F-01: reads `useFakeProfile()`, redirects to `/account-locked` if status is `locked`, `/account-pending` if `pending`, otherwise renders `<Outlet />`. The seam F-02 replaces with a real RLS-backed profile fetch — the public API (`<Outlet />` or redirect) stays identical.

**Contract**: `element={<AccountStatusGate />}` on the `/app` and `/admin` parent routes, nested inside `ProtectedRoute`. When `VITE_DEV_FAKE_PROFILE` is unset, behaves as a pass-through (renders children).

### Success Criteria:

#### Automated Verification:

- TypeScript compiles: `pnpm typecheck`
- Lint passes: `pnpm lint`
- Build succeeds: `pnpm build`
- Dev-fake-profile guard is present: `grep -n "import.meta.env.PROD" src/shared/routing/useFakeProfile.ts`

#### Manual Verification:

- With `VITE_DEV_FAKE_PROFILE` unset, the app behaves as a plain unauthenticated SPA (subject to Phase 3 routes existing).
- Setting `VITE_DEV_FAKE_PROFILE=owner:locked` and refreshing causes `AccountStatusGate` to redirect (testable end-to-end once Phase 3 is live).
- `console.log(useAuth())` from a component inside the provider returns the expected shape with `status` transitioning `loading → unauthenticated` on first load.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Routes + Layout Shell + Terminal Screens

### Overview

Wire `createBrowserRouter` with the full route topology, build the authenticated layout shell (top bar + sidebar/bottom-tab-bar), ship the account-locked / account-pending / 404 terminal screens in Polish, and close out the no-public-SEO posture with `robots` meta + `robots.txt` + Cloudflare SPA fallback.

### Changes Required:

#### 1. Router topology

**File**: `src/shared/routing/router.tsx` (new)

**Intent**: Define the full route tree via `createBrowserRouter`. Top-level routes: `/` (redirect by auth status), `/login` (placeholder), `/account-locked`, `/account-pending`, `/app/*` (under `ProtectedRoute` → `AccountStatusGate` → `AppLayout`, with placeholder children `dashboard`, `directory`, `messages`, `favorites`, `profile`), `/admin/*` (under `ProtectedRoute` → `AccountStatusGate` → `AdminLayout`, English copy, placeholder `queue`), `*` (Polish 404).

**Contract**: Exports `router` as a `Router` instance. The `/` redirect uses a tiny `RootRedirect` component that reads `useResolvedAuth()` (the narrowed sub-context from Phase 2 §4) and `<Navigate>`s to `/app/dashboard` (authenticated) or `/login` (unauthenticated). All `/app/*` children are placeholder components rendering `<h1>{t('placeholders.<feature>.title')}</h1>` — real screens land in later slices. Note: `dashboard` is the stable home view that `/` redirects to, but it is intentionally excluded from the sidebar navigation to strictly maintain the 4-item limit and preserve the 3-click NFR contract.

#### 2. App root rewrite

**File**: `src/App.tsx`

**Intent**: Replace the entire current contents (Vite demo) with the provider stack: `<I18nextProvider><AuthProvider><SessionGate><RouterProvider router={router} /></SessionGate></AuthProvider></I18nextProvider>`. Delete the imports of `reactLogo`, `viteLogo`, `heroImg`, and `App.css`.

**Contract**: `App` returns the provider tree wrapping `RouterProvider`. The Vite demo assets (`src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`, `src/App.css`, the `<svg>` icons in `public/icons.svg`) are deleted in change #5 below.

#### 3. App layout (top bar + sidebar / bottom tab bar)

**Files**:
- `src/shared/layout/AppLayout.tsx` (new)
- `src/shared/layout/AppLayout.module.css` (new)
- `src/shared/layout/AdminLayout.tsx` (new) — English copy, simpler chrome.

**Intent**: `AppLayout` renders a top app bar (left: polyGo wordmark linking to `/app/dashboard`; right: user menu with email + "Wyloguj" calling `useAuth().signOut`). Below the bar: on desktop (≥ 768px), a left sidebar with four `NavLink`s to the four capabilities (Katalog `/app/directory`, Wiadomości `/app/messages`, Ulubione `/app/favorites`, Profil `/app/profile`) and an `<Outlet />` to the right. On mobile (< 768px), the sidebar collapses and the four links render as a bottom fixed tab bar; `<Outlet />` fills the remaining viewport. `NavLink` `aria-current="page"` on the active route.

**Contract**: Layout is pure CSS — no UI library, no media-query JS. The desktop ↔ mobile switch is a CSS media query in `AppLayout.module.css`. The four nav labels come from `t('layout.nav.<key>')`. `AdminLayout` is a thinner shell: top bar with polyGo wordmark + "Admin" tag + signOut, no sidebar, plain `<Outlet />` below; all strings are inline English.

#### 4. Account-status terminal screens + 404

**Files**:
- `src/features/account-status/AccountLockedPage.tsx` (new)
- `src/features/account-status/AccountPendingPage.tsx` (new)
- `src/features/account-status/NotFoundPage.tsx` (new) — Polish 404.
- `src/features/auth/LoginPage.tsx` (new) — placeholder; S-01 will own the real flow.

**Intent**: Each terminal page is a centered card with: heading (`t('accountLocked.title')` / `t('accountPending.title')`), explanation paragraph in Polish, "Wyloguj" button calling `useAuth().signOut`, and a `mailto:` contact link for polyGo support. No nav back into `/app`. `NotFoundPage` shows `t('notFound.title')` ("Nie znaleziono strony"), a short paragraph, and a single link to `/`. `LoginPage` shows `t('login.placeholder')` ("Logowanie pojawi się wkrótce") and `useAuth().signOut`-equivalent affordance for the rare case a user with a stale session lands here.

**Contract**: Each page is a default export, no props. All Polish strings flow through the i18n bundle added in Phase 1. The four nav links inside the app shell do not appear on terminal screens.

#### 5. Delete Vite demo assets

**Files**:
- `src/App.css` — delete.
- `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` — delete.
- `src/assets/` — keep as a directory (later slices will use it); add `.gitkeep` if empty.
- `public/icons.svg` — delete if it only holds the Vite demo SVGs (verify content first; preserve if it has anything reusable).
- `public/favicon.svg` — **intentionally left in place.** This is still the stock Vite logo. Swapping it for the polyGo wordmark favicon is deferred to a future branding slice; addressing it here would pull a logo / asset-pipeline conversation into F-01 and bloat scope. The first-load browser tab will show the Vite mark until that slice lands — documented tradeoff.

**Intent**: The demo assets are unreachable after the rewrite and shouldn't ship in the bundle. Deleting them keeps the build clean and prevents accidental reintroduction. The favicon is the one exception, called out above.

**Contract**: `pnpm build` succeeds with no missing-asset errors. The `dist/` bundle size drops accordingly.

#### 6. SEO / robots posture

**Files**:
- `index.html`
- `public/robots.txt` (new)

**Intent**: Add `<meta name="robots" content="noindex,nofollow">` to `index.html` `<head>`, immediately after the `<meta name="viewport">` line. Create `public/robots.txt` with:

  ```
  User-agent: *
  Disallow: /
  ```

**Contract**: Closes the PRD Non-Goal "no public, non-logged-in company profile pages and no SEO indexing" at the platform-wide level.

#### 7. Cloudflare SPA fallback

**File**: `public/_redirects` (new)

**Intent**: Single line: `/*    /index.html   200`. Cloudflare Pages reads `_redirects` from the build output root and serves `index.html` for any path that doesn't match a static asset, so deep links like `/app/messages` resolve to the SPA instead of a 404.

**Contract**: After deploy, `curl -I https://polygo.pages.dev/app/dashboard` returns `HTTP/2 200` (not 404). The file must remain the **last** redirect rule — later slices that add vanity redirects must insert them above this line. **Important**: local `vite preview` is *not* a valid pre-deploy test for `_redirects`. Vite preview's deep-link behavior comes from its own generic SPA history-fallback middleware (default `appType: 'spa'`), which silently rewrites unknown paths to `index.html` regardless of whether `_redirects` exists or is correct. A broken `_redirects` would still appear green in preview. The only true end-to-end gate is the post-deploy `curl -I` against `polygo.pages.dev` (see Testing Strategy step 8).

#### 8. Update `CLAUDE.md` with the 3-click NFR check

**File**: `CLAUDE.md`

**Intent**: Add a short note under the "Conventions (locked by F-01)" section: "The four nav links in `AppLayout` are the contract for the PRD NFR 'three clicks from a stable home view.' Adding a fifth top-level capability requires re-validating the NFR and updating the layout."

**Contract**: One-paragraph note. Sits in the same section Phase 1 added.

### Success Criteria:

#### Automated Verification:

- TypeScript compiles: `pnpm typecheck`
- Lint passes: `pnpm lint`
- Build succeeds: `pnpm build`
- Bundle leak check: `grep -rE 'service_role|sb_secret_' dist/`
- Robots meta is present in the built HTML: `grep -q 'name="robots"' dist/index.html`
- Cloudflare SPA fallback is in the build output: `test -f dist/_redirects && grep -q '/\* */index.html *200' dist/_redirects`
- Vite demo assets are gone: `! test -f src/App.css && ! test -f src/assets/react.svg && ! test -f src/assets/hero.png`

#### Manual Verification:

- **Deep-link redirect:** with no session, visiting `http://localhost:5173/app/dashboard` redirects to `/login`; the network/router state retains `{ from: '/app/dashboard' }` so S-01 can later complete the round-trip.
- **Sign-out:** with `VITE_DEV_FAKE_PROFILE=owner:activated` set (simulating a logged-in user via the fake-profile seam **plus** a real Supabase magic link issued manually for the dev user — or, if no Supabase project is set up yet, this gate is satisfied by visually confirming the "Wyloguj" button renders in the top bar and is wired to `useAuth().signOut`).
- **Locked / pending screens:** setting `VITE_DEV_FAKE_PROFILE=owner:locked` and refreshing routes to `/account-locked` with correct Polish copy and no nav into `/app`; same for `pending` → `/account-pending`.
- **404:** visiting `/totally-made-up-path` renders the Polish 404, not a white screen or React error.
- **3-click reach** (NFR audit): from `/app/dashboard`, each of (a) Katalog, (b) Wiadomości, (c) Ulubione, (d) Profil is reachable in exactly one click. (Inside each placeholder page, marking a favorite / opening a chat etc. is owned by later slices, but the *home shell* gives the NFR its baseline.)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to commit + plan close-out.

---

## Testing Strategy

### Unit Tests:

- Not added in this slice. A test runner (Vitest) will be introduced by the first slice that ships logic worth asserting on (likely F-02 around RLS-related helpers or S-04 around search filter assembly). This is an explicit deferral, not an oversight.

### Integration Tests:

- Same deferral as above.

### Manual Testing Steps:

1. `pnpm dev` → app boots in Polish, shows the splash for a moment, then redirects `/` to `/login`.
2. From `/login`, manually navigate to `/totally-fake-path` → see Polish 404 (not white screen, not English).
3. With `VITE_DEV_FAKE_PROFILE=owner:locked` in `.env.local`, restart dev, navigate to `/app/dashboard` → see `/account-locked` in Polish with "Wyloguj" affordance, no app chrome.
4. Same with `pending` → `/account-pending`.
5. Clear `VITE_DEV_FAKE_PROFILE`, set up a real Supabase project with anon key in `.env.local`, sign in manually via Supabase Studio "send magic link" → returning to the app, status flips to `authenticated`, redirect lands on `/app/dashboard`, all four nav links are present and clickable.
6. Click "Wyloguj" → session clears, redirect lands on `/login`.
7. Run `pnpm build && pnpm preview`, visit `http://localhost:4173/app/messages` → SPA loads (not 404). Note: this confirms the app's client-side router resolves the deep link, but it does **not** verify the `_redirects` file works — Vite preview uses its own generic SPA history-fallback middleware that rewrites unknown paths to `index.html` regardless of whether `_redirects` exists. Treat this step as a smoke test only.
8. `curl -I https://polygo.pages.dev/account-locked` after deploy → `HTTP/2 200`. **This is the only true end-to-end verification gate for the `_redirects` file** — Cloudflare Pages is the runtime that actually parses and applies it, and a broken or missing `_redirects` will surface here as a 404 even though step 7 passed. Repeat for `/app/messages` and `/admin/queue` to cover both protected subtrees.

## Performance Considerations

- The splash duration is dominated by `supabase.auth.getSession()`, which reads from `localStorage` and resolves synchronously in practice (~5–20ms). The full-screen splash is sized to be invisible to most users.
- Initial bundle: adding `react-router-dom@7`, `i18next`, `react-i18next` and the inline `pl` resource bundle adds ~30–50 KB gzipped over the current Vite baseline. Acceptable; no code-splitting needed at this scale.
- Layout shell is pure CSS, no JS-driven media queries — the desktop/mobile switch is a CSS media query so there's no layout flash on resize.

## Migration Notes

- No data migration. The Vite demo state (`useState(count)`) is purely client-side and disappears with the rewrite.
- Users with the dev app cached in their browser: a hard refresh (`Cmd-Shift-R`) is sufficient — Vite's dev server fingerprints assets.
- No prod migration concerns: there's nothing in prod yet beyond the Vite landing page; the F-01 deploy replaces it cleanly.

## References

- Roadmap entry: `context/foundation/roadmap.md` (F-01, lines 72–83)
- PRD Access Control: `context/foundation/prd.md` (lines 159–169)
- PRD Non-Functional Requirements (3-click + PL + browser matrix): `context/foundation/prd.md` (lines 141–147)
- PRD Non-Goals (no SEO): `context/foundation/prd.md` (lines 171–180)
- PRD Business Logic (verification gate, identity continuity): `context/foundation/prd.md` (lines 149–157)
- Project conventions: `CLAUDE.md`
- Deploy runbook: `docs/runbooks/deploy.md`
- Bundle leak guard: `.github/workflows/deploy.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Plumbing & Conventions

#### Automated

- [x] 1.1 `pnpm install` completes cleanly — 92088dc
- [x] 1.2 TypeScript compiles — 92088dc
- [x] 1.3 Lint passes — 92088dc
- [x] 1.4 Build succeeds — 92088dc
- [x] 1.5 Bundle leak check finds nothing — 92088dc
- [x] 1.6 Folder structure exists — 92088dc

#### Manual

- [x] 1.7 `pnpm dev` boots without error — 92088dc
- [x] 1.8 Missing `VITE_SUPABASE_URL` fails fast with named error — 92088dc

### Phase 2: AuthContext + ProtectedRoute

#### Automated

- [x] 2.1 TypeScript compiles
- [x] 2.2 Lint passes
- [x] 2.3 Build succeeds
- [x] 2.4 Dev-fake-profile prod guard is present in source

#### Manual

- [x] 2.5 App behaves as unauthenticated SPA with `VITE_DEV_FAKE_PROFILE` unset
- [x] 2.6 `VITE_DEV_FAKE_PROFILE=owner:locked` triggers gate redirect
- [x] 2.7 `useAuth()` shape returns `{ session, user, status, signOut }` with correct transition

### Phase 3: Routes + Layout Shell + Terminal Screens

#### Automated

- [ ] 3.1 TypeScript compiles
- [ ] 3.2 Lint passes
- [ ] 3.3 Build succeeds
- [ ] 3.4 Bundle leak check
- [ ] 3.5 Robots meta present in built HTML
- [ ] 3.6 Cloudflare SPA fallback present in build output
- [ ] 3.7 Vite demo assets are gone

#### Manual

- [ ] 3.8 Deep-link redirect preserves intended URL in router state
- [ ] 3.9 Sign-out flow clears session and lands on `/login`
- [ ] 3.10 Locked / pending screens render correct Polish copy with no app chrome
- [ ] 3.11 Polish 404 renders for unknown paths
- [ ] 3.12 3-click NFR audit: four capabilities reachable in one click from `/app/dashboard`
