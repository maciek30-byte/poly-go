/1# S-01: Login (email/hasło + Google OAuth) i wylogowanie — Plan Brief

> Full plan: `context/changes/login-and-signout/plan.md`

## What & Why

Podmienić placeholder `Login.tsx` na realny formularz logowania (email+hasło + Google OAuth) i dostarczyć cienkie wrappery Supabase w `src/lib/auth.ts`. Slice S-01 z roadmapy — pierwszy user-visible plaster, który zamyka pętlę uwierzytelniania zaczętą w F-01 (Supabase scaffold) i F-04 (router + shell). Bez S-01 żaden kolejny slice (edycja wizytówki, ulubieni, czat) nie ma punktu wejścia dla pilotowej firmy — to jest klamra otwierająca pilot.

## Starting Point

F-01 i F-04 dostarczyły kompletną infrastrukturę: Supabase Auth z włączonymi providerami email + Google, helper `getAuthRedirect()`, Zustand store z `onAuthStateChange` listenerem, `RequireAuth` guard z `?next=`, `AppShell` z avatarem + emailem + działającym przyciskiem "Wyloguj" w user menu, router z publicznymi trasami `/login` i `/auth/callback`. `Login.tsx` istnieje (38 linii) — czyta i waliduje `?next=`, ale body to placeholder `<p>Tu pojawi się formularz logowania — S-01.</p>`. `auth.ts` ma tylko `getAuthRedirect()`. Brak biblioteki formularzy i walidacji w deps.

## Desired End State

Wejście na deep link `localhost:5173/companies/abc` bez sesji → redirect na `/login?next=%2Fcompanies%2Fabc`. Formularz pokazuje email, hasło, przycisk "Zaloguj się", separator "lub" i przycisk "Zaloguj przez Google". Wpisanie dobrych danych albo udane Google OAuth → ląduję z powrotem na `/companies/abc`, w topbarze widzę swój email. Wylogowanie z user menu albo cross-tab signOut → natychmiastowy redirect na `/login`. Błędy (złe hasło, zły format, anulowany OAuth) pokazują się jako inline alert po polsku.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Source |
| --- | --- | --- | --- |
| Układ formularza | Jeden ekran, obie metody widoczne (email/hasło + separator + Google) | Pilotowe firmy dostały dane email+hasło offline; ukrywanie tej metody za zakładką to friction. Desktop-only PRD pozwala na rozbudowany layout. | Plan |
| Walidacja klient-side | `zod` + `react-hook-form` (świadomy override AGENTS.md) | Reusable pattern dla S-02 (wizytówka, ~10 pól) i S-05 (filtry, ~6 pól) — amortyzacja ~23kB bundle | Plan |
| Komunikaty błędów | Inline alert nad formularzem (`role="alert"`), inline errors pod polami | A11y + zero zależności + lokalizacja PL bez tłumaczenia natywnych komunikatów przeglądarki | Plan |
| Password reset | Poza zakresem MVP — manualny przez Operatora | PRD: ~10 firm pilotowych, brak self-registration; ręczny reset to 5 min/przypadek vs +2h kodu | Plan |
| Microsoft OAuth | Poza zakresem — odłożone do v2 | Roadmapa wprost: `roadmap.md:117`. Konfiguracja F-01 zostaje, kod nie woła `provider:'azure'`. | Roadmap |
| Sygnał loading | Spinner i `disabled` na przyciskach, redirect po sukcesie | Standardowy SaaS UX; sukces sygnalizowany przez avatar w topbarze (już istnieje), nie potrzeba toastu | Plan |
| `next` przez OAuth redirect | `sessionStorage` (`polygo:auth:next`), kasowane przy konsumpcji | Google nie zachowuje query stringów; sessionStorage czyści się przy zamknięciu karty (brak stale state) | Plan |
| OAuth error handling | AuthCallback czyta `?error=` i `#error=`, redirect na `/login?error=oauth_cancelled` | Pokrywa zarówno PKCE (query) jak implicit (hash) flow Supabase | Plan |
| Walidacja `safeNext` | Wyciągnięta z `Login.tsx` do `auth.ts`, importowana w obu konsumentach | DRY + open-redirect mitigation w jednym miejscu | Plan |

## Scope

**In scope:**
- `src/lib/auth.ts`: nowe wrappery `signInWithPassword`, `signInWithGoogleOAuth`, mapper `formatAuthError`, helper `errorCodeToMessage`, eksport `safeNext` (przeniesione z Login.tsx)
- `src/routes/Login.tsx`: realny formularz (zod schema + react-hook-form + inline errors + spinner + Google button + sessionStorage persist)
- `src/routes/Login.css`: styling wycentrowanej karty na bazie design tokens (light + dark)
- `src/routes/AuthCallback.tsx`: obsługa OAuth error w URL (query + hash), konsumpcja `polygo:auth:next` z sessionStorage
- `package.json`: dodanie `zod@^3` i `react-hook-form@^7`
- `src/styles/tokens.css`: ewentualne dodanie `--color-error-bg` / `--color-error` jeśli brakuje

**Out of scope:**
- "Zapomniałem hasła" / password reset (Operator → manual w MVP)
- Self-registration (PRD: seedowane offline)
- Microsoft OAuth w kodzie (v2)
- Toast / snackbar system
- Realna zawartość chronionych tras (S-02..S-05)
- Edycja `AppShell.tsx`, `RequireAuth.tsx`, `auth-store.ts`, `router.tsx` — wszystko działa z F-04
- Refaktor `CompanyProfile.tsx` (dead code)
- Test runner i testy automatyczne (Module 3)
- Responsive mobile (MVP desktop-only)

## Architecture / Approach

```
src/routes/Login.tsx
  ├─ useEffect: read ?error= → setSubmitError
  ├─ useEffect: status==='authenticated' → navigate(safeNext(next))
  ├─ <form> react-hook-form + zod(loginSchema)
  │    └─ onSubmit: signInWithPassword(...) → ok? listener redirects : setSubmitError
  └─ Google button
       └─ onClick: sessionStorage.set('polygo:auth:next', safeNext)
                   → signInWithGoogleOAuth() → browser redirects to Google

src/lib/auth.ts (rozszerzone)
  ├─ getAuthRedirect()              (już istnieje)
  ├─ signInWithPassword()           (NEW; supabase.auth.signInWithPassword + formatAuthError)
  ├─ signInWithGoogleOAuth()        (NEW; supabase.auth.signInWithOAuth + getAuthRedirect)
  ├─ formatAuthError(error)         (NEW; mapper na AuthErrorCode + PL message)
  ├─ errorCodeToMessage(code)       (NEW; mapper URL ?error= → PL message)
  └─ safeNext(value)                (NEW; przeniesione z Login.tsx)

src/routes/AuthCallback.tsx (rozszerzone)
  ├─ check ?error= + #error= → navigate('/login?error=oauth_cancelled')
  └─ status==='authenticated' → consume sessionStorage('polygo:auth:next')
                                → navigate(safeNext(stored) ?? '/')

[dziedziczone, BEZ ZMIAN]
src/lib/auth-store.ts         — Zustand + onAuthStateChange listener
src/components/RequireAuth.tsx — guard redirect na /login?next=...
src/components/AppShell.tsx    — topbar, avatar, email, Wyloguj
src/router.tsx                 — router config
```

## Phases at a Glance

| Phase | Co dostarcza | Kluczowe ryzyko |
| --- | --- | --- |
| 1. Wrappery + deps | `zod` + `react-hook-form` w deps; `signInWithPassword`, `signInWithGoogleOAuth`, `formatAuthError`, `safeNext`, `errorCodeToMessage` w `auth.ts` | Złe mapowanie error.code Supabase → wszystkie błędy lecą na `unknown`. Mitigation: test sanity w DevTools console przed fazą 2. |
| 2. Login form (UI + zod + alerty) | Realny formularz w `Login.tsx`, `Login.css`, inline errors, spinner, sessionStorage persist | Walidacja `safeNext` bypassed przez `?next=//evil.com`. Mitigation: `safeNext` jest single source of truth w `auth.ts`. |
| 3. AuthCallback edge cases + E2E | OAuth error parsing (query + hash), konsumpcja `next` z sessionStorage, 8-punktowy manualny test E2E (localhost + prod) | OAuth error w hash a nie query (zależy od PKCE vs implicit). Mitigation: sprawdzamy oba. Stale sessionStorage przy multi-tab login. Mitigation: kasujemy zaraz po odczycie. |

**Prerequisites:** F-01 (`auth-scaffold`) — implemented; F-04 (`routing-and-auth-shell`) — implemented; co najmniej jeden testowy user w `auth.users` (email+hasło) i konto Google dewelopera dla testów OAuth.

**Estimated effort:** ~1 sesja (3-4h) z manualną weryfikacją E2E. Faza 1 ~45 min (mapper błędów to większość pracy), Faza 2 ~1.5-2h (form + CSS + walidacja zod), Faza 3 ~45 min (AuthCallback + 8 testów manualnych).

## Open Risks & Assumptions

- **Google OAuth callback URL na prod**: zakładamy że F-01 dodał `https://polygo.pages.dev/auth/callback` do Supabase Redirect URLs allowlisty i jako Authorized redirect URI w Google Cloud Console OAuth Client. Jeśli nie — Google zwróci `redirect_uri_mismatch` i flow padnie na fazie 3. Weryfikacja w pierwszym manualnym teście Google.
- **`?error=` może mieć różne kody zależnie od providera/SDK**: mapujemy wszystkie nieznane na `oauth_cancelled` (najczęstszy przypadek user-facing). Jeśli pojawi się exotic error (np. `server_error`), użytkownik zobaczy generyczny "Logowanie przez Google zostało anulowane" — akceptowalne, bo i tak akcja to retry.
- **Override AGENTS.md "no library until concrete need"**: drugi taki override w projekcie (pierwszy: Zustand w F-04). Każdy kolejny powinien być uzasadniony reuse — tutaj S-02 i S-05 są tym uzasadnieniem; jeśli któryś z nich nie skorzysta, override staje się trudniejszy do obrony retrospektywnie.
- **`sessionStorage` w prywatnych trybach Safari**: w niektórych konfiguracjach `sessionStorage.setItem` rzuca `QuotaExceededError`. Mało prawdopodobne dla pilotowych firm B2B na desktopie, ale jeśli wystąpi — `next` zgubi się, user wyląduje na `/`. Nie krytyczne (user może deep linkować ponownie).
- **Brak testów automatycznych**: Module 3 dodaje test runner; do tego czasu regresje S-01 łapane są przez manualną weryfikację fazy 3. Pierwsza sesja `/10x-test-plan` powinna oznaczyć "login flow" jako jeden z top-3 risków do pokrycia automatycznie.

## Success Criteria (Summary)

- Pilotowa firma z email+hasło logujesie się z `/login` i ląduje na deep linku z którego wyszła (`/companies/abc`), widząc swój email w topbarze.
- Ten sam user może zalogować się przez Google (alternatywa — niektóre firmy preferują), z zachowaniem deep linka.
- Wylogowanie z user menu w jednej karcie → druga karta natychmiast redirectuje na `/login` (cross-tab consistency).
- Anulowanie OAuth na Google nie zostawia "wiszącej" UI — user wraca na `/login` z czytelnym alertem.
