# F-04: Routing + auth-protected app shell — Plan Brief

> Full plan: `context/changes/routing-and-auth-shell/plan.md`

## What & Why

Wprowadzić `react-router-dom` (Data Router), strukturę tras zgodną z roadmap i auth-protected app shell — niezalogowany użytkownik trafia na `/login?next=<gdzie szedł>`, zalogowany widzi topbar z nawigacją i może się wylogować. F-04 jest fundamentem, którego potrzebują wszystkie kolejne user-visible slice'y (S-01..S-07) — bez routera nie ma deep linkingu, bez guarda nie ma ochrony PRD "cała aplikacja za loginem".

## Starting Point

`src/App.tsx` renderuje pojedynczy `CompanyProfile` bez routera. F-01 (`auth-scaffold`) dostarczył `supabase` klienta z typami i helper `getAuthRedirect()`; F-02 (`multi-tenant-data-rls`) dostarczył schemat DB i RLS. `AGENTS.md` pin'uje `react-router-dom` i konwencje `src/routes/` + `src/hooks/`, ale żaden z tych folderów jeszcze nie istnieje — F-04 je materializuje.

## Desired End State

Świeże wejście na `localhost:5173/companies/abc` przekierowuje na `/login?next=/companies/abc`; po zalogowaniu user widzi topbar (logo PolyGo, nav: Wyszukaj / Ulubione / Profil, user menu z "Wyloguj") i placeholder "Firma abc" w obrębie shellu. Wylogowanie z jednej karty propaguje cross-tab przez `onAuthStateChange`. Deep linki działają w prod (Cloudflare Pages auto-fallback do `index.html` bez `_redirects`).

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Router API | Data Router (`createBrowserRouter`) | Idiomatyczny dla nested layouts, naturalnie obsługuje layout-route guard, gotowy na loaders/actions w v2 | Plan |
| Session state | Zustand store + module-level `onAuthStateChange` | Sesja potrzebna też poza komponentami (fetchy, przyszłe S-04 realtime); świadomy override AGENTS.md "no Zustand until concrete need" | Plan |
| Guard strategy | Layout-route z `<RequireAuth><AppShell/></RequireAuth>` | DRY — jeden punkt definiujący chronione trasy; nowa trasa = jedna linia w router config | Plan |
| Deep-link po loginie | Redirect na `/login?next=<pathname+search>`, walidowany | User nie traci kontekstu po loginie (deep link z maila/Slacka) | Plan |
| App shell scope | Topbar + nav + user menu (e-mail + Wyloguj) + `<Outlet/>` | Pełny shell gotowy pod S-01 — login wyląduje w nim; naturalne miejsce na user identity z PRD | Plan |
| Mobile nav | **Brak — MVP desktop-only** | Świadoma decyzja; responsive wraca w v2 | Plan |
| Sesja expire / cross-tab | `onAuthStateChange` → store → guard auto-redirect na `/login?next=<current>` | Jedna ścieżka kodu obsługuje signOut, token expire, signOut z innej tab | Plan |
| Niepokryte trasy | Jeden generyczny `<ComingSoon title>` montowany w router config | Minimum kodu w F-04; każdy S-NN podmienia element trasy gdy dostarcza prawdziwy ekran | Plan |
| Sign-out | Akcja w user menu → `supabase.auth.signOut()` → redirect przez guard | Jedno miejsce, ten sam mechanizm co session-expire | Plan |
| Scope F-04 | Router + guard + shell + placeholdery + sign-out action | UI loginu (S-01), realna zawartość tras (S-02..S-04), mobile, UI `/auth/callback` — wszystko poza zakresem | Plan |

## Scope

**In scope:**
- Dodanie `react-router-dom` i `zustand` do `package.json` — **ręcznie przez właściciela** (`pnpm add react-router-dom@^7 zustand@^5`)
- `src/lib/auth-store.ts` — Zustand store z `onAuthStateChange` subskrypcją + `signOut()` akcja
- `src/lib/use-auth.ts` — cienki wrapper selectora (kolokowany z auth-store, nie globalny `src/hooks/`)
- `src/components/ComingSoon.tsx` — generyczny placeholder
- `src/components/RequireAuth.tsx` — layout-route guard
- `src/components/AppShell.tsx` (+ ewentualnie `.css`) — topbar, nav, user menu, `<Outlet/>`
- `src/router.tsx` — `createBrowserRouter` config
- `src/routes/{Login,Home,Favorites,CompanyDetail,Chat,Profile,AuthCallback,NotFound}.tsx`
- `src/App.tsx` — swap na `<RouterProvider>`
- Walidacja parametru `?next=` (open-redirect mitigation)

**Out of scope:**
- UI formularza logowania (S-01)
- Realna zawartość tras: wyszukiwarka, ulubione, czat, profil, profil firmy (S-02..S-07)
- Responsive mobile layout — MVP desktop-only
- Toast / banner system
- Test runner i unit/integration testy — Module 3
- Refaktor `src/components/CompanyProfile.tsx` (pozostaje nieużywany)
- Zmiany w `wrangler.jsonc`, `public/404.html`, `_redirects` — krytyczne by SPA fallback dalej działał

## Architecture / Approach

```
main.tsx
  └ <StrictMode>
      └ <App>
          └ <RouterProvider router={router}>
              ├ /login              → Login.tsx (placeholder; reads ?next=)
              ├ /auth/callback     → AuthCallback.tsx
              ├ <RequireAuth>      ──┐ guard reads useAuthStore()
              │  └ <AppShell>       ─┤   loading → spinner
              │      └ <Outlet/>    ─┘   anonymous → <Navigate to=/login?next=...>
              │          ├ /                  → ComingSoon
              │          ├ /favorites         → ComingSoon
              │          ├ /companies/:id     → ComingSoon(id)
              │          ├ /chat/:companyId   → ComingSoon(companyId)
              │          └ /profile           → ComingSoon
              └ *                  → NotFound.tsx
```

Sesja: `auth-store.ts` ma module-level `supabase.auth.onAuthStateChange(...)` zasilający store; komponenty czytają przez `useAuth()`. Store inicjalizuje się ze `status: 'loading'`, przechodzi w `authenticated` lub `anonymous` po `INITIAL_SESSION` event — to gwarantuje, że guard nie redirectuje przedwcześnie podczas hydracji.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Dependencies + Zustand auth store | `react-router-dom` + `zustand`, `src/lib/auth-store.ts`, `src/hooks/use-auth.ts` | Podwójna subskrypcja przez StrictMode jeśli initu nie zrobimy module-level |
| 2. Router config + trasy + placeholdery | `src/routes/*.tsx`, `src/components/ComingSoon.tsx`, `src/router.tsx` (z placeholder layout-route) | Konwencja `src/routes/` pierwszy raz materializowana — łatwo o pomyłki w nazwach plików vs paths |
| 3. Guard + AppShell + sign-out | `RequireAuth.tsx`, `AppShell.tsx` (topbar/nav/user menu), podmiana layout-route w routerze | Race condition `loading` vs redirect; cross-tab signOut propagation |
| 4. Login placeholder z `?next=` + integracja w App | `Login.tsx` redirect-jak-zalogowany, `AuthCallback.tsx`, `App.tsx` → `<RouterProvider>` | Open-redirect przez `next=//evil.com`; deep link breakage na Cloudflare Pages prod |

**Prerequisites:** F-01 (auth-scaffold) — zaimplementowane. F-02 niepotrzebne dla samego F-04, ale jest zaimplementowane.
**Estimated effort:** ~1 sesja (3-4h) z weryfikacją manualną; krytyczny check to deep-link test na preview deploy Cloudflare Pages.

## Open Risks & Assumptions

- **Open-redirect przez `?next=`** — mitigowane walidacją (musi zaczynać się od `/`, nie `//`). Jeśli S-01 zmodyfikuje login flow, walidacja musi tam wrócić.
- **Hydracja sesji vs early redirect** — store musi mieć `status: 'loading'` jako initial; guard renderuje spinner zamiast redirectu w tym stanie. Bez tego deep link z odświeżeniem strony pójdzie na `/login` zanim Supabase załaduje sesję z localStorage.
- **Cloudflare Pages SPA fallback** — F-04 polega na auto-fallback do `index.html`. Jeśli ktokolwiek doda `public/404.html` lub `_redirects` z `/* /index.html 200`, deep linki silently się złamią na prod. Udokumentowane w `AGENTS.md:18`.
- **`CompanyProfile.tsx` (436 linii)** — F-04 go nie tyka. Jeśli S-03 zdecyduje, że to baza dla `/companies/:id`, trzeba będzie zaadaptować — ale to decyzja S-03, nie F-04.

## Success Criteria (Summary)

- Niezalogowany user trafia na `/login?next=<original>` z dowolnego deep linka.
- Zalogowany user widzi shell (topbar + nav + user menu) i może swobodnie nawigować między placeholderowymi trasami.
- Klik "Wyloguj" w user menu i wygaśnięcie sesji w innej karcie kończą się tym samym efektem — redirect na `/login` bez reload.
