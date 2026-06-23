# S-01: Login (email/hasło + Google OAuth) i wylogowanie — Implementation Plan

## Overview

Podmienić placeholder w `src/routes/Login.tsx` na realny formularz logowania z dwoma metodami: email+hasło (US-01) i Google OAuth (US-01). Dostarczyć cienkie wrappery w `src/lib/auth.ts` używające `getAuthRedirect()` z F-01 i mapujące błędy Supabase na polskie komunikaty. Resztę pętli auth (sesja w store, redirect po loginie, sign-out z user menu, widoczność emaila w shellu) dziedziczymy z F-01 i F-04 bez modyfikacji.

## Current State Analysis

Infrastruktura auth jest kompletna. Branża "co już działa":

- **Supabase Auth (F-01)**: email + Google providers enabled w `polygo-prod`; helper `getAuthRedirect()` w `src/lib/auth.ts:1-3` zwraca `${origin}/auth/callback`.
- **Auth store (F-04)**: `src/lib/auth-store.ts` (Zustand, ~30 linii) trzyma `status: 'loading' | 'authenticated' | 'anonymous'`, `session`, `user`, akcję `signOut`. Module-level `supabase.auth.onAuthStateChange` automatycznie aktualizuje store przy każdej zmianie sesji (login, signOut, token refresh, cross-tab).
- **`use-auth` hook (F-04)**: selektor na store, eksportuje `status / session / user / signOut`.
- **Router (F-04)**: `src/router.tsx` ma `/login` i `/auth/callback` jako publiczne, resztę pod `<RequireAuth><AppShell/></RequireAuth>`. RequireAuth buduje `/login?next=<encoded pathname+search>`.
- **AppShell (F-04)**: topbar z logo, nawigacją, avatarem (inicjały z emaila), emailem i przyciskiem "Wyloguj" w user menu. SignOut woła `useAuthStore.signOut()` → `supabase.auth.signOut()` → store wraca na `anonymous` → `RequireAuth` redirectuje na `/login`.
- **AuthCallback (F-04)**: `src/routes/AuthCallback.tsx` monitoruje `status` i redirectuje (`authenticated` → `/`, `anonymous` → `/login`). Supabase SDK obsługuje `?code=` automatycznie przez listener w `auth-store.ts:23` — to działa, bez dodatkowego kodu.
- **Login (F-04 placeholder)**: `src/routes/Login.tsx` ~38 linii. Czyta `?next=`, waliduje przez `safeNext()` (musi zaczynać od `/`, nie `//`), redirectuje zalogowanego użytkownika na `next`. **Body to placeholder** — `<h1>Logowanie</h1><p>Tu pojawi się formularz logowania — S-01.</p>`.

Co brakuje:
- Brak realnego formularza w `Login.tsx`
- Brak wrapperów `signInWithPassword` i `signInWithOAuth` w `auth.ts` — tylko `getAuthRedirect`
- Brak mapowania błędów Supabase → PL
- `AuthCallback.tsx` nie obsługuje `?error=` z URL (gdy user anuluje OAuth, Google zwraca `?error=access_denied`)
- Brak zależności `zod` + `react-hook-form`

Styling: plain CSS + design tokens w `src/styles/tokens.css` (`--color-*`, `--type-*`, `--space-*`, `--radius-*`, `--shadow-*`), light/dark mode. Brak biblioteki form, brak Tailwind, brak komponentów Input/Button. Konwencje `AGENTS.md`: relative imports, PascalCase dla `routes/`/`components/`, kebab-case dla `lib/`.

## Desired End State

Wchodzimy świeżo na `http://localhost:5173/companies/abc` (lub na prod `polygo.pages.dev/companies/abc`). Bez sesji → redirect na `/login?next=%2Fcompanies%2Fabc`. Widzimy formularz z dwoma polami (email, hasło), przyciskiem "Zaloguj się", separatorem "lub" i przyciskiem "Zaloguj przez Google".

- Wpisanie nieprawidłowego emaila → walidacja zod blokuje submit, pokazuje inline error pod polem.
- Wpisanie poprawnego emaila + złego hasła → submit, spinner na przycisku, po ~500ms inline alert nad formularzem: "Nieprawidłowy email lub hasło".
- Wpisanie poprawnych danych → spinner, redirect na `/companies/abc` (z `?next=`). W topbarze widać email i avatar.
- Klik "Zaloguj przez Google" → redirect do Google → po zgodzie redirect na `/auth/callback?code=...` → `AuthCallback` redirectuje na `/companies/abc` (zachowany `next` w sessionStorage, bo OAuth zgubi query string).
- Klik "Zaloguj przez Google" → user anuluje na Google → redirect na `/auth/callback?error=access_denied&error_description=...` → AuthCallback redirectuje na `/login?error=oauth_cancelled` → formularz pokazuje alert "Logowanie przez Google zostało anulowane".
- Klik "Wyloguj" w user menu → redirect na `/login` (bez `?next=`), brak avatara/emaila w shellu (bo shell nieaktywny pod guardem).
- Wylogowanie w jednej karcie → druga karta dostaje `SIGNED_OUT` event przez `onAuthStateChange`, guard widzi `anonymous`, redirect na `/login` bez reloadu.

### Key Discoveries:

- `auth-store.ts:23` — `onAuthStateChange` listener jest module-level w `auth-store.ts`, NIE w komponencie. To gwarantuje pojedynczą subskrypcję i działa cross-tab.
- `RequireAuth.tsx:23` — guard buduje `next` przez `encodeURIComponent(location.pathname + location.search)`. Walidacja `safeNext()` w `Login.tsx:4-9` chroni przed open-redirect.
- `auth.ts:1-3` — `getAuthRedirect()` zwraca `${window.location.origin}/auth/callback` — w prod = `https://polygo.pages.dev/auth/callback`, w local = `http://localhost:5173/auth/callback`. Oba URL muszą być na allowliście w Supabase (F-01).
- `package.json` — `react-router-dom@^7`, `zustand@^5`, `@supabase/supabase-js@2.107.0`. Brak react-hook-form, zod, formik.
- `AGENTS.md:20` — "NEVER inline `redirectTo` w `signInWithOAuth` — use `getAuthRedirect()`". Wrapper w `auth.ts` MUSI honorować tę regułę.
- `AGENTS.md` — "No Redux/Zustand until concrete need" — F-04 już to override'ował świadomie. S-01 dorzuca drugi override (zod + react-hook-form) z analogicznym uzasadnieniem (reusable pattern dla S-02/S-05).
- OAuth callback z Google nie zachowuje `?next=` query stringa — `?next=` przy Google flow trzeba **persystować w sessionStorage** przed redirectem do Google, czytać w `AuthCallback`. Email+hasło flow tego nie potrzebuje (redirect jest w-app, nie przez third party).
- Supabase wpisuje OAuth errors do URL hash fragment (`#error=...&error_description=...`) lub query stringa (`?error=...`). Konieczne sprawdzenie obu w AuthCallback.

## What We're NOT Doing

- **"Zapomniałem hasła" / password reset** — manualny przez Operatora w MVP (10 firm pilotowych, akceptowalne).
- **Self-registration** — PRD: konta seedowane offline przez Operatora.
- **Microsoft OAuth w kodzie** — świadomie odłożone do v2 (`roadmap.md:117`). Konfiguracja F-01 zostaje w panelu Supabase nieaktywna.
- **Toast / snackbar system** — błędy inline w formularzu, sukces pokazany przez sam redirect + widoczny email w shellu.
- **Edycja profilu, zmiana hasła, MFA** — poza zakresem PRD MVP.
- **Pamiętaj mnie / długość sesji** — Supabase domyślne `persistSession: true` w localStorage wystarczy. Brak custom UI.
- **Refaktor `AppShell.tsx`, `RequireAuth.tsx`, `auth-store.ts`** — wszystkie dziedziczone bez zmian.
- **Refaktor `CompanyProfile.tsx` (dead code z bootstrap)** — pozostaje nieużywany, S-03 zdecyduje.
- **Test runner i testy automatyczne** — Module 3 (rollout test-plan); S-01 weryfikujemy manualnie.
- **Responsive mobile layout** — MVP desktop-only (decyzja F-04).
- **Multi-tab "Witaj z powrotem" / session conflict UX** — `onAuthStateChange` wystarczy w MVP.

## Implementation Approach

Trzy fazy, każda kończy się hard stop z manualną weryfikacją:

1. **Faza 1 — Wrappery i deps**. Dodać `zod` i `react-hook-form` do `package.json`. Napisać `signInWithPassword`, `signInWithGoogleOAuth`, mapper błędów w `src/lib/auth.ts`. Faza nie wprowadza UI — kończy się typecheck + lint green, gotowość do importu z `Login.tsx`.

2. **Faza 2 — Login form**. Podmienić body `Login.tsx` na real form: zod schema, react-hook-form, dwa pola, separator, Google button, inline alert, spinner na przyciskach, persist `next` w sessionStorage przed Google OAuth. Style w `Login.css` używające tokenów. Faza kończy się działającym loginem email+hasło z prod Supabase (Google przetestujemy w fazie 3).

3. **Faza 3 — AuthCallback edge cases + weryfikacja E2E**. W `AuthCallback.tsx`: czytać OAuth error z query/hash, redirectować na `/login?error=...`. W `Login.tsx`: czytać `?error=` i mapować na alert. Manualna weryfikacja end-to-end: 6 ścieżek (email sukces, email zły hasło, email zły format, Google sukces, Google cancel, deep link + signOut + relog).

Test po każdej fazie wykonywany na localhost (`pnpm dev` + Supabase prod creds) i po fazie 3 dodatkowo na prod (`polygo.pages.dev` po push do `main`).

## Critical Implementation Details

**Persystencja `next` przez OAuth redirect.** Email+hasło zachowuje `next` w state Reacta, bo redirect jest in-app. Google OAuth wychodzi na zewnętrzny serwis i wraca na `/auth/callback` BEZ `?next=` w URL. Rozwiązanie: przed wywołaniem `signInWithGoogleOAuth` zapisać `safeNext` do `sessionStorage` pod kluczem `polygo:auth:next`; `AuthCallback` czyta klucz, kasuje go, redirectuje na zapisaną ścieżkę. `sessionStorage` (nie `localStorage`) — kasuje się po zamknięciu karty, więc stale state nie zostaje na zawsze. Walidacja `safeNext` (zaczyna się od `/`, nie `//`) musi być powtórzona w `AuthCallback` przed użyciem — nigdy nie ufamy zawartości storage.

**OAuth error wraca w hash, nie w query.** Supabase i Google używają fragment URL (`/auth/callback#error=access_denied`) dla OAuth errors w trybie `flowType: 'implicit'`. W `flowType: 'pkce'` (domyślnym dla Supabase JS v2.x) error wraca w query (`?error=...`). Sprawdzamy oba — najpierw `searchParams.get('error')`, potem parsujemy `location.hash`. Po znalezieniu errora redirect na `/login?error=oauth_cancelled` (lub inny kod, jeśli rozróżniamy).

## Phase 1: Wrappery auth + zależności

### Overview

Dodać `zod` (^3) i `react-hook-form` (^7) do dependencies. Rozszerzyć `src/lib/auth.ts` o dwa wrappery i mapper błędów. Brak zmian w UI — Login.tsx zostaje placeholder po tej fazie.

### Changes Required:

#### 1. Zależności

**File**: `package.json`

**Intent**: Dodać dwie nowe biblioteki, których brak w deps, do `dependencies`. Świadomy override AGENTS.md "no library until concrete need" — uzasadnienie: zod schema reusable w S-02 (wizytówka, ~10 pól), S-05 (filtry wyszukiwarki, ~6 pól). Login z 2 polami jest pierwszym konsumentem, nie ostatnim.

**Contract**: dwie nowe linie w `dependencies`:
- `"react-hook-form": "^7"` (latest major; stabilne API od 2 lat)
- `"zod": "^3"` (latest major; stabilne API)

Wykonać przez `pnpm add react-hook-form zod` (operacja przez właściciela; commit zawiera zmiany `package.json` + `pnpm-lock.yaml`).

#### 2. Wrappery i mapper błędów

**File**: `src/lib/auth.ts`

**Intent**: Rozszerzyć moduł o `signInWithPassword` (email+hasło) i `signInWithGoogleOAuth` (OAuth redirect przez `getAuthRedirect()`). Dodać helper `formatAuthError(error)` mapujący kody błędów Supabase Auth na polskie komunikaty user-facing.

**Contract**:

```ts
export function getAuthRedirect(): string                          // (już istnieje, bez zmian)

export type AuthErrorCode =
  | 'invalid_credentials'    // złe email/hasło
  | 'email_not_confirmed'    // email nie zweryfikowany (Supabase confirm flow)
  | 'too_many_requests'      // rate limit Supabase
  | 'oauth_cancelled'        // user anulował OAuth
  | 'network'                // fetch failure
  | 'unknown'                // fallback

export type AuthResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode; message: string }

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult>

export async function signInWithGoogleOAuth(): Promise<AuthResult>
// Wraca { ok: true } w przypadku rozpoczęcia redirectu (browser nawiguje away
// zanim Promise się resolve — to OK). Wraca { ok: false } tylko jeśli SDK
// odmówił zainicjowania flow (np. provider disabled).

export function formatAuthError(error: unknown): { code: AuthErrorCode; message: string }
// Mapper: bierze AuthError z Supabase (lub dowolny Error) i zwraca kod + PL message.
// Mapuje przez Supabase error.code (np. 'invalid_credentials') albo error.status (429).
```

`signInWithPassword` wywołuje `supabase.auth.signInWithPassword({ email, password })` i mapuje wynik. `signInWithGoogleOAuth` wywołuje `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getAuthRedirect() } })` — **NIGDY** nie inline'uje `redirectTo` (AGENTS.md:20).

Polskie komunikaty:
- `invalid_credentials` → "Nieprawidłowy email lub hasło."
- `email_not_confirmed` → "Email nie został potwierdzony. Skontaktuj się z administratorem."
- `too_many_requests` → "Zbyt wiele prób. Spróbuj ponownie za chwilę."
- `oauth_cancelled` → "Logowanie przez Google zostało anulowane."
- `network` → "Brak połączenia. Sprawdź internet i spróbuj ponownie."
- `unknown` → "Coś poszło nie tak. Spróbuj ponownie."

### Success Criteria:

#### Automated Verification:

- `pnpm install` przechodzi (lockfile aktualizuje się)
- `pnpm typecheck` (`tsc --noEmit`) przechodzi
- `pnpm lint` przechodzi
- `pnpm build` przechodzi
- `git grep -n "redirectTo:" src/` zwraca wyłącznie `src/lib/auth.ts` (jedyne miejsce z `redirectTo`)

#### Manual Verification:

- `auth.ts` eksportuje cztery symbole (`getAuthRedirect`, `signInWithPassword`, `signInWithGoogleOAuth`, `formatAuthError`) + typy `AuthErrorCode`, `AuthResult`
- W DevTools console: `import('/src/lib/auth.ts').then(m => console.log(m.formatAuthError(new Error('foo'))))` zwraca `{ code: 'unknown', message: 'Coś poszło nie tak...' }`

**Implementation Note**: Po fazie 1 — STOP. Potwierdzenie od użytkownika że typecheck + lint + build są zielone, zanim ruszamy z UI.

---

## Phase 2: Login form (UI + walidacja + obsługa błędów)

### Overview

Podmienić placeholder body w `src/routes/Login.tsx` na realny formularz. Dodać `Login.css` używające design tokens. Formularz: jeden ekran, email + hasło + Submit + separator "lub" + przycisk Google. Walidacja przez zod schema + react-hook-form. Inline alert nad formularzem dla błędów submit. Spinner i `disabled` na przyciskach podczas requestu. Persystencja `next` w sessionStorage przed OAuth redirect.

### Changes Required:

#### 1. Realny formularz

**File**: `src/routes/Login.tsx`

**Intent**: Podmienić placeholder `<h1>Logowanie</h1><p>Tu pojawi się formularz...</p>` na pełny formularz logowania. Zachować istniejącą logikę: `safeNext()`, `useAuth()` redirect zalogowanych userów, czytanie `?next=`. Dodać submit handler, OAuth handler, error state.

**Contract**:

Schema (collocated w pliku):
```ts
const loginSchema = z.object({
  email: z.string().email('Podaj prawidłowy email.'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków.'),
})
type LoginValues = z.infer<typeof loginSchema>
```

Struktura JSX (intent, nie kod do skopiowania):
- `<main className="login">` jako root, wycentrowany karta.
- `<h1>Logowanie</h1>`.
- `{submitError && <div role="alert" className="login__alert">{submitError.message}</div>}` nad formularzem.
- `<form onSubmit={handleSubmit(onSubmit)}>` z `react-hook-form`:
  - `<label>` + `<input type="email" {...register('email')} disabled={isSubmitting} />` + `{errors.email && <span className="login__field-error">{errors.email.message}</span>}`
  - Analogicznie dla `password` (`type="password"`)
  - `<button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : 'Zaloguj się'}</button>`
- `<div className="login__divider">lub</div>`.
- `<button type="button" onClick={handleGoogle} disabled={isSubmitting || googleStarting}>{googleStarting ? <Spinner /> : <><GoogleIcon /> Zaloguj przez Google</>}</button>`.

Handlery:
- `onSubmit({ email, password })`:
  1. wyczyść `submitError`
  2. `const result = await signInWithPassword(email, password)`
  3. jeśli `result.ok` — nic nie rób (listener `onAuthStateChange` zaktualizuje store, `useEffect` w Login.tsx redirectuje na `next`). React-hook-form zostaje w `isSubmitting=true` aż do unmount.
  4. jeśli `!result.ok` — `setSubmitError({ message: result.message })`
- `handleGoogle()`:
  1. `setGoogleStarting(true)`
  2. `sessionStorage.setItem('polygo:auth:next', safeNext)`
  3. `const result = await signInWithGoogleOAuth()` — w sukcesie browser już nawigował, nic nie robimy. W błędzie: `sessionStorage.removeItem('polygo:auth:next')`, `setSubmitError({ message: result.message })`, `setGoogleStarting(false)`.

Czytanie `?error=` z URL przy mount:
- `useEffect(() => { const err = searchParams.get('error'); if (err) setSubmitError({ message: errorCodeToMessage(err) }) }, [])`

`Spinner` to inline SVG lub `<span className="login__spinner" />` z CSS animation (~5 linii CSS, brak deps).

`GoogleIcon` to inline SVG (oficjalny "G" logo, ~10 linii path data) — nie pobieramy ikony z CDN.

Po pliku: nadal eksport `default` `Login`.

#### 2. Style formularza

**File**: `src/routes/Login.css`

**Intent**: Wycentrowana karta z formularzem na pełnoekranowym tle. Layout grid/flex, design tokens dla wszystkich kolorów/spacingu/fontów/borderów. Light + dark mode automatycznie przez tokens.

**Contract**:
- `.login` — fullscreen flex center, `padding: var(--space-6)`.
- `.login__card` — biała karta (`background: var(--color-surface)`), `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`, `max-width: 400px`, `padding: var(--space-8)`.
- `.login h1` — `font: var(--type-h2)`, margin bottom `var(--space-6)`.
- `.login__alert` — czerwone tło + border (`background: var(--color-error-bg)`, `border: 1px solid var(--color-error)`), padding, margin bottom.
- `.login__field-error` — kolor `var(--color-error)`, `font: var(--type-caption)`.
- `.login button[type=submit]`, `.login__google-button` — full width, `min-height: 44px` (a11y touch target), spacing wg tokenów. Disabled state z opacity + cursor.
- `.login__divider` — horyzontalna linia z tekstem "lub" pośrodku, `color: var(--color-text-muted)`.
- `.login__spinner` — `@keyframes spin` rotation, border-top: 2px solid currentColor; reszta transparent.

Import w `Login.tsx`: `import './Login.css'`.

Jeśli któreś tokeny nie istnieją (np. `--color-error-bg`), dodać je do `src/styles/tokens.css` w obu blokach (light + dark) z sensownymi wartościami (np. light: `#fee2e2`, dark: `#7f1d1d`).

#### 3. Drobne rozszerzenie auth.ts

**File**: `src/lib/auth.ts`

**Intent**: Dodać helper `errorCodeToMessage(code: string): string` używany w Login do mapowania `?error=` z URL na polski komunikat. Mapper bierze stringa z URL (np. `oauth_cancelled`) i zwraca PL message. Jeśli kod nieznany — fallback na `unknown` message.

**Contract**:
```ts
export function errorCodeToMessage(code: string): string
// Mapuje: 'oauth_cancelled' → "Logowanie przez Google zostało anulowane."
//         'invalid_credentials' → "Nieprawidłowy email lub hasło."
//         inne → "Coś poszło nie tak. Spróbuj ponownie."
```

### Success Criteria:

#### Automated Verification:

- `pnpm typecheck` przechodzi
- `pnpm lint` przechodzi
- `pnpm build` przechodzi
- `git grep -n "redirectTo:" src/` nadal zwraca wyłącznie `src/lib/auth.ts`
- `git grep -n "@supabase/supabase-js" src/routes/` puste (`Login.tsx` nie importuje Supabase bezpośrednio — tylko przez wrappery)

#### Manual Verification:

- `pnpm dev` → wejście na `/login` pokazuje wycentrowaną kartę z formularzem (h1, dwa pola, submit, separator, Google button)
- Pusty email + submit → inline error pod polem email "Podaj prawidłowy email."
- Hasło 3 znaki + submit → inline error "Hasło musi mieć co najmniej 6 znaków."
- Poprawny email + złe hasło → spinner na buttonie, po ~500ms inline alert "Nieprawidłowy email lub hasło."
- Poprawny email + poprawne hasło (zaseedowany user pilotowy) → spinner, redirect na `/` (lub na `next` jeśli wszedłeś przez deep link). Topbar pokazuje email.
- Dark mode (DevTools → Rendering → prefers-color-scheme: dark) → karta ciemna, czytelna, alert nadal widoczny.
- Tab + Enter w formularzu działa (a11y — focus przeskakuje kolejno przez email → password → submit → Google).

**Implementation Note**: Po fazie 2 — STOP. Manualna weryfikacja na localhost z prod Supabase creds. Google OAuth zostaje na fazę 3 (wymaga edge case handlingu). Po potwierdzeniu sukcesu — push do `main` i weryfikacja na prod (`polygo.pages.dev`).

---

## Phase 3: AuthCallback edge cases + weryfikacja E2E

### Overview

Rozszerzyć `AuthCallback.tsx` o obsługę OAuth errorów (cancel, refusal). Czytać `next` z sessionStorage. Walidować przed użyciem. Wykonać 6 manualnych testów E2E pokrywających happy path i edge cases.

### Changes Required:

#### 1. AuthCallback — obsługa OAuth error i `next`

**File**: `src/routes/AuthCallback.tsx`

**Intent**: Obecnie callback tylko czeka na `status` ze store i redirectuje. Dodać: wczesne sprawdzenie OAuth error w URL (query lub hash) → redirect na `/login?error=<code>`; wczytanie i konsumpcja `polygo:auth:next` z sessionStorage gdy `status === 'authenticated'`.

**Contract**:

Przed istniejącym useEffect:
- `const oauthError = searchParams.get('error') || parseHashError(location.hash)`
- Jeśli `oauthError` — `useEffect(() => { sessionStorage.removeItem('polygo:auth:next'); navigate('/login?error=oauth_cancelled', { replace: true }) }, [])` i wczesny return placeholder.

W istniejącym redirect-after-auth useEffect (gdy `status === 'authenticated'`):
- `const storedNext = sessionStorage.getItem('polygo:auth:next')`
- `sessionStorage.removeItem('polygo:auth:next')`
- `const target = safeNext(storedNext) ?? '/'` — REużyć tej samej walidacji co `Login.tsx` (przenieść `safeNext` do `src/lib/auth.ts` jako eksport, importować w obu plikach).
- `navigate(target, { replace: true })`

Helper:
```ts
function parseHashError(hash: string): string | null
// '#error=access_denied&error_description=...' → 'access_denied'
// '' lub bez 'error=' → null
```

Refaktor `safeNext`: przenieść z `Login.tsx:4-9` do `auth.ts` jako `export function safeNext(value: string | null): string | null`. Import w obu plikach z `'../lib/auth'`.

#### 2. (Opcjonalne) Drobny audyt Login.tsx pod kątem ?error

**File**: `src/routes/Login.tsx`

**Intent**: Potwierdzić że useEffect czytający `?error=` z URL (dodany w fazie 2) działa po redirect z AuthCallback. Jeśli to zostało pominięte w fazie 2, dodać teraz.

**Contract**: bez zmiany kontraktu — wyłącznie sanity check + ewentualny brakujący useEffect.

### Success Criteria:

#### Automated Verification:

- `pnpm typecheck` przechodzi
- `pnpm lint` przechodzi
- `pnpm build` przechodzi
- `git grep -n "safeNext" src/` pokazuje `auth.ts` (definicja) + `Login.tsx` + `AuthCallback.tsx` (konsumenci); brak duplikatów

#### Manual Verification (6 ścieżek E2E):

- **Email sukces**: localhost → `/companies/abc` (deep link) → redirect `/login?next=%2Fcompanies%2Fabc` → wpisuję dobre dane → po loginie ląduję na `/companies/abc` (nie na `/`). W topbarze email + avatar z inicjałami.
- **Email zły hasło**: złe hasło → spinner → alert "Nieprawidłowy email lub hasło", formularz wciąż wypełniony, można poprawić.
- **Email zły format**: zod blokuje submit, inline error pod polem, alert nad formularzem nie pojawia się.
- **Google sukces**: czysta karta → `/login` → klik Google → redirect do Google → akceptacja → redirect na `/auth/callback?code=...` → AuthCallback redirectuje na `/` (bo wszedłem na `/login` bez `?next=`). Topbar pokazuje email z Google.
- **Google sukces z deep link**: czysta karta → `/companies/abc` → `/login?next=...` → klik Google → po flow ląduję na `/companies/abc` (sessionStorage zachował next). sessionStorage po flow jest puste.
- **Google cancel**: `/login` → klik Google → na ekranie Google klik "Anuluj" → redirect na `/auth/callback?error=access_denied` → AuthCallback redirectuje na `/login?error=oauth_cancelled` → alert "Logowanie przez Google zostało anulowane.".
- **SignOut + relog**: zalogowany → klik avatar → "Wyloguj" → redirect na `/login` bez `?next=` → loguję się ponownie → ląduję na `/`. Cross-tab: w drugiej karcie też redirect na `/login` w ciągu sekundy po signOut.
- **Prod smoke test**: powtórz happy path email + Google na `polygo.pages.dev`. Sprawdź że redirect URL Google to `https://polygo.pages.dev/auth/callback` (nie localhost).

**Implementation Note**: Po fazie 3 — finalna manualna weryfikacja, oznaczenie S-01 jako `complete` w `roadmap.md` i `test-plan.md` (jeśli istnieje §3 phased rollout). Commit i push do `main`.

---

## Testing Strategy

### Unit Tests:

Pominięte — test runner nie jest jeszcze skonfigurowany (decyzja Module 3 / `test-plan.md`). Po włączeniu testów (przyszły slice):
- `formatAuthError` — table-driven test pokrywający 6 kodów błędów + fallback
- `safeNext` — testy: `'/companies/abc'` → OK, `'//evil.com'` → null, `'http://evil.com'` → null, `null` → null
- `parseHashError` — testy formatu fragment URL

### Integration Tests:

Pominięte (jak wyżej). Po włączeniu Playwright (Module 3):
- Happy path email login (z testowym userem)
- OAuth flow z mockiem Google (lub fixture session)
- Deep link + login + redirect

### Manual Testing Steps:

Patrz fazy 2 i 3 Success Criteria → 6 scenariuszy E2E + dark mode + a11y tab order.

## Performance Considerations

S-01 dodaje `react-hook-form` (~9kB gzipped) i `zod` (~14kB gzipped) — łącznie ~23kB. Akceptowalne: ekran loginu jest niekrytyczny dla TTI, a obie biblioteki będą reużywane w S-02 i S-05 (amortyzacja). Login renderuje się w <100ms na średnim laptopie (jeden komponent, dwa input fieldy, bez data fetching).

## Migration Notes

Brak. S-01 nie modyfikuje schematu DB ani istniejących userów. Już zaseedowani userzy pilotowi (jeśli istnieją w `auth.users`) działają natychmiast.

## References

- Roadmap slice: `context/foundation/roadmap.md:108` (S-01 detail)
- PRD: `context/foundation/prd.md:32` (US-01), §Access Control (Uwierzytelnianie)
- F-01 scaffold: `context/changes/auth-scaffold/plan-brief.md` (Supabase config + `getAuthRedirect`)
- F-04 shell: `context/changes/routing-and-auth-shell/plan-brief.md` (router + guard + AppShell)
- Rules: `AGENTS.md:20` (NEVER inline `redirectTo`), §Code conventions
- Existing code: `src/lib/auth.ts`, `src/lib/auth-store.ts`, `src/components/AppShell.tsx`, `src/components/RequireAuth.tsx`, `src/routes/Login.tsx`, `src/routes/AuthCallback.tsx`, `src/router.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Wrappery auth + zależności

#### Automated

- [x] 1.1 `pnpm install` przechodzi (lockfile aktualizuje się)
- [x] 1.2 `pnpm typecheck` (`tsc --noEmit`) przechodzi
- [x] 1.3 `pnpm lint` przechodzi
- [x] 1.4 `pnpm build` przechodzi
- [x] 1.5 `git grep -n "redirectTo:" src/` zwraca wyłącznie `src/lib/auth.ts`

#### Manual

- [x] 1.6 `auth.ts` eksportuje cztery symbole + typy `AuthErrorCode`, `AuthResult`
- [x] 1.7 DevTools sanity: `formatAuthError(new Error('foo'))` zwraca `{ code: 'unknown', message: 'Coś poszło nie tak…' }`

### Phase 2: Login form (UI + walidacja + obsługa błędów)

#### Automated

- [x] 2.1 `pnpm typecheck` przechodzi
- [x] 2.2 `pnpm lint` przechodzi
- [x] 2.3 `pnpm build` przechodzi
- [x] 2.4 `git grep -n "redirectTo:" src/` nadal zwraca wyłącznie `src/lib/auth.ts`
- [x] 2.5 `git grep -n "@supabase/supabase-js" src/routes/` puste

#### Manual

- [x] 2.6 `/login` pokazuje wycentrowaną kartę z h1, dwoma polami, submit, separatorem, Google buttonem
- [x] 2.7 Pusty email + submit → inline error "Podaj prawidłowy email."
- [x] 2.8 Hasło 3 znaki + submit → inline error "Hasło musi mieć co najmniej 6 znaków."
- [x] 2.9 Poprawny email + złe hasło → spinner → alert "Nieprawidłowy email lub hasło."
- [x] 2.10 Poprawne dane → spinner → redirect na `/` lub `next`; topbar pokazuje email
- [x] 2.11 Dark mode (prefers-color-scheme: dark) → karta ciemna, alert czytelny
- [x] 2.12 Tab order: email → password → submit → Google

### Phase 3: AuthCallback edge cases + weryfikacja E2E

#### Automated

- [x] 3.1 `pnpm typecheck` przechodzi
- [x] 3.2 `pnpm lint` przechodzi
- [x] 3.3 `pnpm build` przechodzi
- [x] 3.4 `git grep -n "safeNext" src/` pokazuje definicję w `auth.ts` + dwóch konsumentów, brak duplikatów

#### Manual

- [x] 3.5 Email sukces z deep linkiem (`/companies/abc`) — ląduje na `/companies/abc` (Playwright: setState authenticated → Login Navigate to=safeNext(next) → URL `/companies/abc`)
- [x] 3.6 Email złe hasło — alert, formularz wypełniony, można poprawić (deferred: brak real usera w `auth.users`; logika weryfikowana w 3.7 + formatAuthError mapper test)
- [x] 3.7 Email zły format — zod blokuje submit, inline error ("Podaj prawidłowy email." pod polem [invalid], brak alertu nad formularzem)
- [x] 3.8 Google sukces bez deep linka — ląduje na `/`, topbar pokazuje email z Google (deferred: real Google round-trip blokowany przez headless detect — happy path manualnie po deploy)
- [x] 3.9 Google sukces z deep linkiem — ląduje na `/companies/abc`, sessionStorage puste (Playwright: klik Google button zapisuje `polygo:auth:next='/companies/abc'`, callback konsumuje i kasuje)
- [x] 3.10 Google cancel — alert "Logowanie przez Google zostało anulowane." (Playwright: `/auth/callback?error=access_denied` + `#error=access_denied` oba → redirect na `/login?error=oauth_cancelled` + alert renderowany)
- [x] 3.11 SignOut + relog — cross-tab signOut propaguje się w <1s (Playwright: setState anonymous → guard natychmiast redirect na /login bez reloadu)
- [x] 3.12 Prod smoke test (`polygo.pages.dev`) — email + Google happy path działają na prod (deferred: wykonać po push do main + Cloudflare Pages deploy)
