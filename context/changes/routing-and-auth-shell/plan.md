# F-04: Routing + auth-protected app shell — Implementation Plan

## Overview

Wprowadzić `react-router-dom` (Data Router) jako fundament nawigacji w SPA, dostarczyć strukturę tras zgodnie z roadmap (`/login`, `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile`, `/auth/callback`) oraz auth-protected app shell. Sesja użytkownika żyje w Zustand store (`src/lib/auth-store.ts`) subskrybującym `supabase.auth.onAuthStateChange`; layout-route `RequireAuth` opakowuje wszystkie chronione trasy i przekierowuje niezalogowanych na `/login?next=<pathname+search>`. Trasy nieobjęte jeszcze przez konkretne slice'y (`/`, `/favorites`, `/chat/:companyId`, `/profile`) renderują generyczny `<ComingSoon>`. F-04 dostarcza shell — nie dostarcza UI logowania ani realnej zawartości tras.

## Current State Analysis

- `src/App.tsx` renderuje pojedynczy `CompanyProfile` bez routera (`src/App.tsx:1-7`).
- Brak `react-router-dom` w `package.json` — trzeba dodać. `AGENTS.md:43` wyraźnie pin'uje React Router DOM jako wybrany state/routing standard.
- Konwencja `src/routes/` (z `AGENTS.md`) jeszcze nie istnieje — F-04 ją wprowadza.
- F-01 (`auth-scaffold`) jest **implemented**: `src/lib/supabase.ts` eksportuje typowany `supabase`; `src/lib/auth.ts` ma `getAuthRedirect()` zwracający `${origin}/auth/callback`.
- F-02 (`multi-tenant-data-rls`) jest **implemented**: schemat + RLS gotowe, ale w F-04 z DB nie korzystamy.
- `src/components/CompanyProfile.tsx` to 436-liniowy hardcoded prototype — F-04 go nie refaktoruje i nie montuje pod żadną trasą. Pozostanie nieużywany do czasu, gdy slice S-03 dostarczy prawdziwą stronę firmy.
- `wrangler.jsonc` ustawia `pages_build_output_dir: "./dist"`; `public/` zawiera tylko `favicon.svg` i `icons.svg`. Brak `_redirects`, brak `404.html` — zgodnie z mitigation z `infrastructure.md` Risk #2/#4. F-04 ten stan zachowuje.

### Key Discoveries

- `AGENTS.md:38-43` ustala konwencję: `src/routes/` (PascalCase.tsx, one file per route), `src/hooks/`, `src/lib/` (kebab-case). F-04 jest pierwszym change'em, który tę konwencję materializuje.
- `AGENTS.md:43` mówi "React Router DOM for routing; no Redux/Zustand until concrete need." — F-04 świadomie wprowadza Zustand jako narzędzie sesji (concrete need: sesja czytana też poza komponentami, np. przez fetchy do Supabase i przyszłe S-04 realtime). Decyzja udokumentowana w `plan-brief.md` i `change.md`.
- `infrastructure.md` Risk #2/#4 + `AGENTS.md:18`: NIE tworzyć `public/404.html` i NIE pisać `_redirects` z `/* /index.html 200` — SPA fallback działa bo Cloudflare Pages auto-serwuje `index.html` dla 404. F-04 polega na tym zachowaniu.
- `index.html:6-13` ładuje fonty Manrope z Google Fonts; `src/main.tsx:3-4` ładuje `styles/tokens.css` i `index.css` — design tokens już są, AppShell może na nich budować bez nowego CSS frameworka.
- `package.json` ma `@radix-ui/react-dialog`, `@radix-ui/react-avatar`, `@radix-ui/react-tooltip`, `@radix-ui/react-tabs` — dropdown user menu można zbudować prostym `<button>` + lokalny `useState`; nie ma `@radix-ui/react-dropdown-menu`, więc go nie używamy.

## Desired End State

Po zakończeniu planu:
1. `pnpm dev` → otwarcie `localhost:5173` przekierowuje niezalogowanego usera na `/login?next=/`. Otwarcie `localhost:5173/companies/abc` → `/login?next=/companies/abc`.
2. Zalogowany user (np. ręcznie zalogowany przez supabase devtools / OAuth) widzi app shell: topbar z logo "PolyGo", nawigacją (Wyszukaj / Ulubione / Profil), user menu po prawej (avatar inicjały / e-mail) z opcją "Wyloguj"; pod topbarem renderuje się trasa.
3. Chronione trasy `/`, `/favorites`, `/chat/:companyId`, `/profile`, `/companies/:id` renderują `<ComingSoon title="...">` w obrębie shellu.
4. Klik "Wyloguj" wywołuje `supabase.auth.signOut()`; `onAuthStateChange` zeruje store; guard automatycznie redirectuje na `/login`.
5. Wygaśnięcie sesji w innej zakładce (lub refresh token fail) propaguje przez `onAuthStateChange` → guard redirectuje na `/login?next=<current>` bez reload.
6. Deep link na `/companies/abc` przed loginem: redirect na `/login?next=/companies/abc`; po sukcesie login (S-01) — wraca na `/companies/abc`. W F-04 placeholder `Login.tsx` symuluje powrót: gdy store widzi `authenticated`, czyta `?next=` i nawiguje.
7. Test produkcyjny po deployu (manualnie po PR): otwarcie `https://<preview-url>/companies/foo` na świeżej karcie nie zwraca 404 — SPA fallback działa.

Weryfikowalność: `pnpm build` przechodzi bez błędów; `pnpm lint` przechodzi; ręczne kliki (sekcja Manual Verification w każdej fazie) potwierdzają flow.

## What We're NOT Doing

- **UI logowania** — Login.tsx to placeholder. S-01 `login-and-signout` doda formularz email/hasło + OAuth Google.
- **Realna zawartość tras** — `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile` renderują `<ComingSoon>`. Każdy S-NN podmieni swoją trasę.
- **Refaktor `src/components/CompanyProfile.tsx`** — pozostaje 436-liniowy prototype, nie podpinamy go pod żadną trasę. S-03 zdecyduje co z nim zrobić.
- **Mobile / responsive layout** — MVP desktop-only. Bottom tabs / drawer / hamburger wracają w v2.
- **UI strony `/auth/callback`** — minimalny komponent: `getSession()` w useEffect → `Navigate` na `/`. Bez specjalnego UI (zostaje "Logowanie...").
- **Toast / banner system** — wygaśnięcie sesji nie pokazuje powiadomienia (po prostu redirect). Toast wraca z S-NN gdy będzie pierwsze konkretne użycie.
- **Test runner / unit testy** — Module 3 wprowadzi testing. F-04 zostaje przy `tsc` + ESLint + manual verification.
- **Zmiany w `wrangler.jsonc`, `public/`, dodawanie `_redirects` lub `404.html`** — krytyczne, by SPA fallback nadal działał. F-04 explicit nie zmienia tych plików.

## Implementation Approach

Strategia: dodać dependencies → zbudować "kościec" tras z generycznym placeholderem → owinąć chronione trasy guardem w layout-route → spiąć z `App.tsx`. Każda faza jest niezależnie weryfikowalna (lint + build + ręczne kliki). Zustand store inicjalizujemy poza komponentami (`src/lib/auth-store.ts` ma module-level subskrypcję) — to gwarantuje, że sesja jest dostępna zanim React się zhydratuje i guard nie redirectuje przedwcześnie. Loading state w store rozróżnia "jeszcze nie wiem, czy zalogowany" (spinner) od "niezalogowany" (redirect).

## Critical Implementation Details

- **Hydracja sesji vs guard race condition**: `onAuthStateChange` strzela synchronicznie z `INITIAL_SESSION` event przy starcie; do tego czasu store musi mieć `status: 'loading'` i guard musi renderować spinner zamiast redirectu. Bez tego deep link z odświeżeniem strony zawsze pójdzie na `/login` zanim Supabase zdąży załadować sesję z localStorage.
- **Walidacja parametru `next`**: po stronie `Login.tsx` (placeholder) przyjmować tylko wartości zaczynające się od `/` i nie zaczynające się od `//` (otwarte przekierowanie open-redirect). Pusty / nieprawidłowy `next` → fallback na `/`.
- **Cleanup subskrypcji**: `supabase.auth.onAuthStateChange` zwraca `{ data: { subscription } }` — w module-level setup nie odsubskrybowujemy (store żyje przez cały czas trwania appki). Nie wywoływać `subscribe` w `useEffect` komponentu, bo StrictMode podwoi subskrypcję i obie będą strzelać.

## Phase 1: Dependencies + Zustand auth store

### Overview

Dodać `react-router-dom` i `zustand` do `package.json`. Stworzyć `src/lib/auth-store.ts` — Zustand store z polem `status: 'loading' | 'authenticated' | 'anonymous'`, `session`, `user`, akcją `signOut()`. Moduł na poziomie top-level subskrybuje `supabase.auth.onAuthStateChange` i aktualizuje store.

### Changes Required

#### 1. Dependencies (ręcznie przez właściciela projektu)

**File**: `package.json` (NIE edytowane przez agenta)

**Intent**: dodać `react-router-dom` (routing) i `zustand` (auth store). Zgodnie z `AGENTS.md` "Operacje wykonywane ręcznie przez właściciela projektu" — instalacje paczek robi user, nie agent.

**Polecenie do uruchomienia ręcznie**:
```
pnpm add react-router-dom@^7 zustand@^5
```

**Contract**: pole `dependencies` zawiera `react-router-dom` (^7) i `zustand` (^5). `pnpm install` przechodzi bez konfliktów peer-deps z React 19 + Vite 8.

#### 2. Auth store

**File**: `src/lib/auth-store.ts` (nowy)

**Intent**: jeden punkt prawdy o sesji użytkownika; subskrybuje `supabase.auth.onAuthStateChange` na poziomie modułu i aktualizuje store. Eksportuje hook `useAuthStore` oraz `signOut` action.

**Contract**:
- State: `{ status: 'loading' | 'authenticated' | 'anonymous', session: Session | null, user: User | null }`
- Initial state: `status: 'loading'`, `session: null`, `user: null`.
- Module-level: jednorazowy `supabase.auth.onAuthStateChange((_event, session) => set({...}))`. Gdy `session` istnieje → `status: 'authenticated'`; gdy `session === null` (po `INITIAL_SESSION` event lub `SIGNED_OUT`) → `status: 'anonymous'`.
- Action `signOut()`: `await supabase.auth.signOut()` — store aktualizuje się przez subskrypcję, akcja nie ustawia stanu ręcznie.

#### 3. Auth hook (cienki wrapper, kolokowany)

**File**: `src/lib/use-auth.ts` (nowy)

**Intent**: cienki re-export selectora ze store dla wygody komponentów (`const { status, user } = useAuth()`). Hook żyje obok `auth-store.ts` w `src/lib/` (kolokacja per slice, nie globalny `src/hooks/`) — zgodnie z `AGENTS.md` "Hooks live with the slice that owns them".

**Contract**: funkcja `useAuth()` zwracająca `{ status, session, user, signOut }` z `useAuthStore`.

### Success Criteria

#### Automated Verification

- `pnpm install` przechodzi bez błędów peer-deps
- `pnpm build` przechodzi (TypeScript widzi nowe zależności)
- `pnpm lint` przechodzi

#### Manual Verification

- W devtools (Network → WS) widać tylko jedną subskrypcję `supabase.auth` na pierwsze załadowanie (nie duplikuje przez StrictMode)
- Po `localStorage.clear()` i reload: store ma `status: 'anonymous'` po `INITIAL_SESSION`
- Po manualnym `supabase.auth.signInWithPassword(...)` w devtools: store przechodzi na `status: 'authenticated'`

**Implementation Note**: po przejściu fazy poczekaj na ręczne potwierdzenie zanim ruszysz Phase 2.

---

## Phase 2: Router config + trasy + placeholdery

### Overview

Stworzyć `src/routes/` z plikami per trasa, generyczny `<ComingSoon>`, oraz `src/router.tsx` budujący `createBrowserRouter` z nested layout-route (właściwy guard i shell dochodzą w Phase 3 — tu placeholder layout to po prostu `<Outlet/>`).

### Changes Required

#### 1. Generyczny placeholder

**File**: `src/components/ComingSoon.tsx` (nowy)

**Intent**: jeden komponent pokazywany na trasach, których slice S-NN jeszcze nie zaimplementował.

**Contract**: `function ComingSoon({ title }: { title: string }): JSX.Element` — renderuje centered `<h1>{title}</h1>` + tekst "Wkrótce". Bez własnego CSS file — Tailwind-less inline styling lub klasy z `index.css`/`tokens.css`.

#### 2. Pliki tras

**Files** (wszystkie nowe):
- `src/routes/Login.tsx`
- `src/routes/Home.tsx`
- `src/routes/Favorites.tsx`
- `src/routes/CompanyDetail.tsx`
- `src/routes/Chat.tsx`
- `src/routes/Profile.tsx`
- `src/routes/AuthCallback.tsx`
- `src/routes/NotFound.tsx`

**Intent**: jeden plik per trasa zgodnie z konwencją `AGENTS.md:38`. F-04 wypełnia je minimalnie: `Login.tsx` i `AuthCallback.tsx` mają swoją prostą logikę (patrz Phase 4), reszta renderuje `<ComingSoon title="Nazwa">`.

**Contract**:
- `Home.tsx`, `Favorites.tsx`, `Profile.tsx`: default export funkcja zwracająca `<ComingSoon title="Wyszukiwarka" | "Ulubione" | "Profil"/>`.
- `CompanyDetail.tsx`: `useParams<{ id: string }>()` → `<ComingSoon title={`Firma ${id}`}/>`. Wczytane `id` udowadnia, że params działają end-to-end.
- `Chat.tsx`: analogicznie z `companyId`.
- `NotFound.tsx`: `<ComingSoon title="404 — strona nie istnieje"/>` (bez linku do `/` — to dochodzi naturalnie w Phase 3, gdy NotFound montuje się pod layoutem chronionym).
- `Login.tsx` i `AuthCallback.tsx`: w tej fazie placeholder `<ComingSoon title="Logowanie">` / `<ComingSoon title="Łączenie..."/>`. Logikę dodaje Phase 4.

#### 3. Router config

**File**: `src/router.tsx` (nowy)

**Intent**: `createBrowserRouter` z drzewem tras: publiczna `/login`, publiczna `/auth/callback`, oraz layout-route owijająca wszystkie chronione trasy. W tej fazie layout-route to placeholder `<Outlet/>` — Phase 3 podmienia na `<RequireAuth><AppShell/></RequireAuth>`.

**Contract**: eksport `export const router = createBrowserRouter([...])` z:
- `{ path: '/login', element: <Login/> }`
- `{ path: '/auth/callback', element: <AuthCallback/> }`
- `{ element: <Outlet/>, children: [ {index, <Home/>}, {path: 'favorites', <Favorites/>}, {path: 'companies/:id', <CompanyDetail/>}, {path: 'chat/:companyId', <Chat/>}, {path: 'profile', <Profile/>} ] }`
- `{ path: '*', element: <NotFound/> }` (catch-all)

### Success Criteria

#### Automated Verification

- `pnpm build` przechodzi
- `pnpm lint` przechodzi
- `tsc` widzi `useParams<{ id: string }>` poprawnie (no implicit any)

#### Manual Verification

- Po podpięciu `RouterProvider` w temp App (lub po Phase 4) — wejście na `/companies/123` pokazuje "Firma 123"
- `/chat/abc` pokazuje "Wkrótce" pod tytułem `Chat abc`
- `/nonexistent-route` pokazuje "404 — strona nie istnieje"

**Implementation Note**: po fazie poczekaj na ręczne potwierdzenie. UWAGA: w tej fazie router nie jest jeszcze podpięty do `App.tsx` — kompiluje się jako moduł niewołany. To celowe, by lint/build sprawdziły same trasy.

---

## Phase 3: Guard + AppShell + sign-out

### Overview

Stworzyć `RequireAuth` (layout-route element) konsumujący `useAuth()` — `loading` → spinner; `anonymous` → `<Navigate to='/login?next=...'/>`; `authenticated` → render `<AppShell/>` (który ma `<Outlet/>`). Stworzyć `AppShell` z topbarem (logo, nav, user menu) i sign-outem. Podmienić layout-route z Phase 2 na `RequireAuth`.

### Changes Required

#### 1. Guard

**File**: `src/components/RequireAuth.tsx` (nowy)

**Intent**: komponent-strażnik czytający status sesji ze store i decydujący o render vs redirect.

**Contract**:
- `function RequireAuth({ children }: { children: ReactNode })`.
- `status === 'loading'` → minimalny spinner (`<div>Ładowanie…</div>` wystarczy — toast/skeleton w v2).
- `status === 'anonymous'` → `<Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace/>`. `useLocation()` daje `pathname` i `search`.
- `status === 'authenticated'` → `<>{children}</>`.

#### 2. App shell

**File**: `src/components/AppShell.tsx` (nowy)

**Intent**: layout dla zalogowanych — topbar + outlet.

**Contract**:
- Topbar: `<header>` z `<Link to='/'>` jako logo "PolyGo", `<nav>` z `NavLink` do `/` ("Wyszukaj"), `/favorites` ("Ulubione"), `/profile` ("Profil") — `NavLink` daje `aria-current="page"` po active.
- Po prawej: user menu — przycisk `<button>` pokazujący inicjały (z `user.email`) lub e-mail; klik otwiera lokalny `<div>` (state `useState`) z e-mailem i przyciskiem "Wyloguj". Bez Radix dropdown — prosty `useState` + zamknięcie na blur / klik poza (`onBlur` na containerze).
- Pod topbar: `<main><Outlet/></main>`.
- Akcja "Wyloguj": `await signOut()` z `useAuth()`; nie nawigujemy ręcznie — guard zrobi to przez `onAuthStateChange` → store → re-render → `<Navigate to='/login'/>`.

#### 3. App shell styles

**File**: `src/components/AppShell.css` (nowy) — opcjonalnie; jeśli wystarczy `tokens.css`, pomiń.

**Intent**: minimalne style topbara (flex layout, sticky top, podział lewa/prawa). Klasy z `tokens.css` (color tokens) jeśli istnieją.

**Contract**: klasy `.app-shell__header`, `.app-shell__nav`, `.app-shell__user-menu`, `.app-shell__main`. Bez framework CSS — czysty CSS.

#### 4. Podmiana layout-route w routerze

**File**: `src/router.tsx`

**Intent**: layout-route z Phase 2 (placeholder `<Outlet/>`) zastąpić elementem opakowującym `<RequireAuth><AppShell/></RequireAuth>`.

**Contract**: węzeł chroniony to teraz `{ element: <RequireAuth><AppShell/></RequireAuth>, children: [...] }`. Trasy `/login`, `/auth/callback`, `*` (NotFound) zostają poza tym węzłem — są publiczne. Decyzja: 404 (`*`) jest publiczne; jeśli niezalogowany trafi na zły URL widzi 404, nie redirect.

### Success Criteria

#### Automated Verification

- `pnpm build` przechodzi
- `pnpm lint` przechodzi
- `tsc` nie zgłasza błędów (m.in. `NavLink`, `Outlet`, `useLocation` z `react-router-dom`)

#### Manual Verification

- Po wylogowaniu (`supabase.auth.signOut()` w devtools) shell znika i URL leci na `/login?next=/` (lub bieżącą trasę)
- Po zalogowaniu (`signInWithPassword` w devtools) topbar pojawia się; e-mail w user menu zgadza się z zalogowanym kontem
- Klik "Wyloguj" w user menu → user wraca na `/login`, store ma `status: 'anonymous'`
- W drugiej zakładce: wywołanie `signOut()` propaguje — pierwsza zakładka też leci na `/login` bez reload (test cross-tab)

**Implementation Note**: po fazie poczekaj na ręczne potwierdzenie zanim ruszysz Phase 4. Test cross-tab jest kluczowy — bez niego nie wiemy, czy `onAuthStateChange` przepływa.

---

## Phase 4: Login placeholder z `?next=` + integracja w App

### Overview

`Login.tsx` (placeholder do podmiany przez S-01) czyta `?next=` i — jeśli store ma `status: 'authenticated'` — robi `<Navigate to={next}/>`. `AuthCallback.tsx` woła `supabase.auth.getSession()` w useEffect i nawiguje na `/`. `App.tsx` swap na `<RouterProvider router={router}/>`.

### Changes Required

#### 1. Login placeholder (z `?next=`)

**File**: `src/routes/Login.tsx`

**Intent**: placeholder — pokazuje "Logowanie" i tłumaczenie roli ("Tu pojawi się formularz logowania — S-01"). Kluczowe: jeśli sesja przyszła (np. zalogowany user wszedł ręcznie na `/login`), Login czyta `?next=` i nawiguje tam.

**Contract**:
- `useAuth()` daje `status`. `useSearchParams()` daje `next`.
- Walidacja `next`: musi być stringiem zaczynającym się od `/` i nie od `//` (open-redirect mitigation). Inaczej fallback na `/`.
- Jeśli `status === 'authenticated'` → `<Navigate to={safeNext} replace/>`.
- W przeciwnym razie: `<div>` z nagłówkiem "Logowanie" i tekstem placeholder.

#### 2. Auth callback

**File**: `src/routes/AuthCallback.tsx`

**Intent**: ekran przejściowy dla OAuth (Supabase ustawia sesję, callback wykrywa to przez `onAuthStateChange` → store → guard / Login). W F-04 minimalna logika: czeka aż store ma `status !== 'loading'`, potem nawiguje na `/`.

**Contract**:
- `useAuth()` → `status`.
- `useEffect` na zmianę `status`: gdy `'authenticated'` → `navigate('/', { replace: true })`. Gdy `'anonymous'` → `navigate('/login', { replace: true })` (znaczy OAuth się nie powiódł).
- Render: `<div>Łączenie…</div>` dopóki `status === 'loading'`.

#### 3. App.tsx ↔ RouterProvider

**File**: `src/App.tsx`

**Intent**: zastąpić render `CompanyProfile` przez `<RouterProvider router={router}/>`.

**Contract**: `App` importuje `router` z `src/router.tsx` i renderuje `<RouterProvider router={router}/>`. `CompanyProfile` przestaje być używany (nie usuwamy pliku — zostaje jako referencja dla S-03; ESLint może zgłosić unused import, dlatego import `CompanyProfile` znika).

#### 4. (opcjonalnie) main.tsx

**File**: `src/main.tsx`

**Intent**: tylko upewnić się, że `auth-store.ts` jest **zaimportowany** zanim `App` się zamontuje — żeby module-level subskrypcja `onAuthStateChange` ruszyła przed pierwszym renderem.

**Contract**: dodać `import './lib/auth-store'` (side-effect import, tylko jeśli nic z `auth-store` nie jest importowane wcześniej — w praktyce hooki w komponentach zaimportują moduł i tak; ten import to defensywny safeguard).

### Success Criteria

#### Automated Verification

- `pnpm build` przechodzi
- `pnpm lint` przechodzi
- `tsc` przechodzi
- `pnpm dev` startuje i otwiera localhost bez błędów konsoli

#### Manual Verification

- Wejście na `http://localhost:5173/` jako niezalogowany → URL zmienia się na `/login?next=%2F`
- Wejście na `http://localhost:5173/companies/abc` jako niezalogowany → URL `/login?next=%2Fcompanies%2Fabc`
- Po zalogowaniu w devtools (na ekranie `/login?next=/companies/abc`) → automatyczny redirect na `/companies/abc` (placeholder "Firma abc")
- Wejście na `/login?next=//evil.com` jako niezalogowany potem zalogowany → redirect na `/` (open-redirect zablokowany)
- Wejście na `/login?next=` (puste) → redirect na `/` po zalogowaniu
- `/auth/callback` jako już zalogowany → szybka nawigacja na `/`
- `pnpm build && pnpm preview` → preview działa, deep linki działają

**Implementation Note**: po tej fazie F-04 jest gotowe end-to-end. Przed mergem przetestuj deep link w środowisku Cloudflare Pages preview (`pnpm build` + deploy preview) — to jedyne miejsce, gdzie wyłapie się SPA-fallback breakage z `infrastructure.md` Risk #2.

---

## Testing Strategy

### Unit Tests

Module 3 dostarczy test runner. F-04 nie pisze unit testów (zostawiamy `tsc` + ESLint + manual).

### Integration Tests

Brak — j.w.

### Manual Testing Steps

1. `pnpm install && pnpm dev` — startuje bez błędów.
2. `localStorage.clear()` w devtools, reload `/` → URL `/login?next=%2F`, widać "Logowanie" placeholder.
3. W devtools: `await window.supabase.auth.signInWithPassword({email: '...', password: '...'})` (uwaga: trzeba wystawić `supabase` na `window` ad-hoc lub użyć już zalogowanego seeded usera) → widać shell + topbar; user menu pokazuje e-mail.
4. Wejście w pasek adresu na `/companies/abc` → "Firma abc" w obrębie shellu.
5. Klik "Wyloguj" → wraca na `/login` (bez `?next=`).
6. Otwórz nową kartę z `/companies/xyz` jako zalogowany → widać "Firma xyz".
7. Wyloguj w pierwszej karcie → druga karta po momencie leci na `/login?next=/companies/xyz` bez reload.
8. `pnpm build && pnpm preview` → deep link na `localhost:4173/profile` działa (SPA fallback).
9. Po PR: deploy preview na Cloudflare Pages — sprawdzić deep link `/<preview-url>/companies/foo` na świeżej karcie. Brak 404. Brak "Infinite loop detected" w build logach.

## Performance Considerations

- Brak code-splittingu w F-04 (wszystkie trasy bundlowane razem) — przy ~10 placeholderach bundle < 200 KB. Lazy loading per trasa wraca w v2 lub gdy pierwszy ciężki ekran pojawi się jako prawdziwy kod (np. S-04 Chat z realtime).
- Subskrypcja `onAuthStateChange` to jeden listener globalny — zero kosztu w runtime.

## Migration Notes

Brak migracji — to greenfield routing.

## References

- Roadmap: `context/foundation/roadmap.md` (§ F-04)
- PRD: `context/foundation/prd.md` (Access Control)
- Konwencje: `AGENTS.md:38-43`
- Risk #2/#4 (SPA fallback): `context/foundation/infrastructure.md:36, 62`
- F-01 baseline: `context/changes/auth-scaffold/plan.md`, `src/lib/auth.ts`, `src/lib/supabase.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dependencies + Zustand auth store

#### Automated

- [x] 1.1 `pnpm install` przechodzi bez błędów peer-deps
- [x] 1.2 `pnpm build` przechodzi (TypeScript widzi nowe zależności)
- [x] 1.3 `pnpm lint` przechodzi

#### Manual

- [ ] 1.4 W devtools (Network → WS) widać tylko jedną subskrypcję `supabase.auth` na pierwsze załadowanie (nie duplikuje przez StrictMode)
- [ ] 1.5 Po `localStorage.clear()` i reload: store ma `status: 'anonymous'` po `INITIAL_SESSION`
- [ ] 1.6 Po manualnym `supabase.auth.signInWithPassword(...)` w devtools: store przechodzi na `status: 'authenticated'`

### Phase 2: Router config + trasy + placeholdery

#### Automated

- [x] 2.1 `pnpm build` przechodzi
- [x] 2.2 `pnpm lint` przechodzi
- [x] 2.3 `tsc` widzi `useParams<{ id: string }>` poprawnie (no implicit any)

#### Manual

- [ ] 2.4 Po podpięciu `RouterProvider` w temp App (lub po Phase 4) — wejście na `/companies/123` pokazuje "Firma 123"
- [ ] 2.5 `/chat/abc` pokazuje "Wkrótce" pod tytułem `Chat abc`
- [ ] 2.6 `/nonexistent-route` pokazuje "404 — strona nie istnieje"

### Phase 3: Guard + AppShell + sign-out

#### Automated

- [x] 3.1 `pnpm build` przechodzi
- [x] 3.2 `pnpm lint` przechodzi
- [x] 3.3 `tsc` nie zgłasza błędów (m.in. `NavLink`, `Outlet`, `useLocation` z `react-router-dom`)

#### Manual

- [ ] 3.4 Po wylogowaniu (`supabase.auth.signOut()` w devtools) shell znika i URL leci na `/login?next=/` (lub bieżącą trasę)
- [ ] 3.5 Po zalogowaniu (`signInWithPassword` w devtools) topbar pojawia się; e-mail w user menu zgadza się z zalogowanym kontem
- [ ] 3.6 Klik "Wyloguj" w user menu → user wraca na `/login`, store ma `status: 'anonymous'`
- [ ] 3.7 W drugiej zakładce: wywołanie `signOut()` propaguje — pierwsza zakładka też leci na `/login` bez reload (test cross-tab)

### Phase 4: Login placeholder z `?next=` + integracja w App

#### Automated

- [x] 4.1 `pnpm build` przechodzi
- [x] 4.2 `pnpm lint` przechodzi
- [x] 4.3 `tsc` przechodzi
- [ ] 4.4 `pnpm dev` startuje i otwiera localhost bez błędów konsoli (manual)

#### Manual

- [ ] 4.5 Wejście na `http://localhost:5173/` jako niezalogowany → URL zmienia się na `/login?next=%2F`
- [ ] 4.6 Wejście na `http://localhost:5173/companies/abc` jako niezalogowany → URL `/login?next=%2Fcompanies%2Fabc`
- [ ] 4.7 Po zalogowaniu w devtools (na ekranie `/login?next=/companies/abc`) → automatyczny redirect na `/companies/abc` (placeholder "Firma abc")
- [ ] 4.8 Wejście na `/login?next=//evil.com` jako niezalogowany potem zalogowany → redirect na `/` (open-redirect zablokowany)
- [ ] 4.9 Wejście na `/login?next=` (puste) → redirect na `/` po zalogowaniu
- [ ] 4.10 `/auth/callback` jako już zalogowany → szybka nawigacja na `/`
- [ ] 4.11 `pnpm build && pnpm preview` → preview działa, deep linki działają
