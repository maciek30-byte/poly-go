# Auth Scaffold — Plan implementacji

## Overview

Konfiguracja Supabase Auth dla dwóch metod logowania w MVP (email/hasło, OAuth Google) plus dodanie helpera `getAuthRedirect()` w `src/lib/auth.ts`, który jednolicie zwraca docelowy callback URL dla wszystkich wywołań OAuth. Foundation F-01 z `context/foundation/roadmap.md` — odblokowuje S-01 (UI logowania), F-04 (router/guard sesji) i pośrednio każdą kolejną user-visible slice.

**Adaptacja w trakcie implementacji (2026-06-11)**: Microsoft/Azure provider odroczony do osobnej zmiany follow-up. Pilot rusza z email + Google. Site URL w Supabase: `https://da9d2456.polygo.pages.dev` (konkretny deploy hash, zgodne z `AGENTS.md:9-10`) — przy zmianie deploy hash trzeba zaktualizować Site URL w Supabase i w tym planie.

## Current State Analysis

- `src/lib/supabase.ts` istnieje i tworzy klient z `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (fail-fast jeśli brak env vars).
- `package.json` ma `@supabase/supabase-js@2.107.0` w dependencies; package manager to `pnpm` (`tech-stack.md:4`).
- `src/lib/auth.ts` **nie istnieje** — do utworzenia w tej zmianie.
- W aplikacji **nie ma route'a `/auth/callback`** i nie ma routera w ogóle (`react-router` nie jest w `package.json`). Route powstanie w F-04; do tego czasu `/auth/callback` jest URL-em, na który Cloudflare Pages auto-fallbackuje `index.html` (SPA-fallback z `infrastructure.md:26` — to świadomy mechanizm, nie bug).
- `AGENTS.md:19` już zawiera regułę "NEVER inline `redirectTo` w `signInWithOAuth` — używaj helpera `getAuthRedirect()` z `src/lib/auth.ts` (gdy zostanie utworzony)". Dokument formalizuje konwencję wyprzedzająco; ten plan wprowadza brakujący kod.
- Stan środowisk wg `AGENTS.md:5-8`: **jeden projekt Supabase `polygo-prod`** (project ID `yaejbsodwhixywjpqhau`, region `eu-central-1`), brak preview deploys (deploy.yml odpala się tylko na `push: main`). Lokalny dev i prod używają tych samych Supabase credentials.

### Key Discoveries:

- **Świadomy rozjazd z `roadmap.md:77`**: roadmapa zakłada weryfikację OAuth na staging Supabase (F-03), ale `deployment-plan-v2.md:18` i `AGENTS.md` świadomie odraczają staging do trigger-driven momentu (pierwszy zewnętrzny user / schema migration / incident). F-01 weryfikujemy bezpośrednio na prod — bezpieczne, bo nie ma jeszcze użytkowników pilotowych.
- **Tylko 2 środowiska**: localhost (`http://localhost:5173`, `pnpm dev`) + prod (`https://polygo.pages.dev`). Nie ma preview URL-i, więc `getAuthRedirect()` nie musi obsługiwać `*.polygo.pages.dev` jako odrębnego przypadku — `window.location.origin` rozróżnia dwa środowiska wystarczająco.
- **Microsoft Entra ID (dawne Azure AD)**: Supabase Auth ma natywny provider `azure` — `signInWithOAuth({ provider: 'azure' })`. Konfiguracja po stronie Microsoft to App registration w Entra ID portal (`entra.microsoft.com`), z multi-tenant audience (`common`), bo pilotowe firmy mają różne tenanty.

## Desired End State

Po zakończeniu zmiany:

1. **Supabase dashboard** dla `polygo-prod` ma włączone trzy providery: Email (z password sign-up enabled), Google (z Client ID + Secret), Azure (z Client ID + Secret, tenant `common`). Redirect URLs dla Google i Azure obejmują `https://polygo.pages.dev/auth/callback` i `http://localhost:5173/auth/callback`. Site URL w Supabase ustawiony na `https://polygo.pages.dev`.
2. **`src/lib/auth.ts`** istnieje i eksportuje funkcję `getAuthRedirect(): string`, która zwraca `${window.location.origin}/auth/callback`. Nic więcej.
3. **Smoke test** na prod wykonany z DevTools console: każdy z trzech providerów dochodzi do końca flow (Google redirect → wraca z sesją, Azure redirect → wraca z sesją, `signUp` mailowy tworzy rekord w `auth.users`). `supabase.auth.getSession()` po każdym z testów zwraca aktywną sesję dla konta testowego.
4. **Konto testowe** developera zostaje zarejestrowane w `auth.users` jako odróżnione od przyszłych kont pilotowych (zgodne z `AGENTS.md:22` "Pracuj w aplikacji na osobnym koncie testowym").
5. `change.md` ma `status: planned` po zapisie planu, `status: in-progress` w trakcie, docelowo `status: implemented` po Fazie 3.

## What We're NOT Doing

- **Brak UI logowania** — przyciski Google/Microsoft/email + form, callback handler component → to S-01 `login-and-signout`.
- **Brak routera i route'a `/auth/callback`** — `react-router` setup i guard sesji → to F-04 `routing-and-auth-shell`. URL `/auth/callback` w F-01 polega na SPA-fallback Cloudflare Pages.
- **Brak wrapperów `signInWithEmail` / `signInWithGoogle` / `signInWithAzure` / `signOut`** — projektowanie API surface auth wymaga konsumenta (UI z S-01), inaczej kształt nie pasuje. F-01 dostarcza tylko helper redirectu.
- **Brak `getSession()` / `onAuthStateChange` abstrakcji** — to wchodzi z F-04 razem z guardem.
- **Brak schematu users/companies** — to F-02 `multi-tenant-data-rls`.
- **Brak staging Supabase** — świadomie odroczone w `deployment-plan-v2.md`, nie odblokowywane przez tę zmianę.
- **Brak custom ESLint rule wymuszającej użycie helpera** — risk register `infrastructure.md:50` wymienia "lint rule lub grep w pre-commit"; jako że jedynym konsumentem helpera w MVP będzie S-01 (3 wywołania), grep wystarczy, regułę dorzucamy gdy konsumentów będzie więcej.

## Implementation Approach

Trzy fazy, sekwencyjnie:

1. **Konfiguracja paneli (poza kodem)** — Supabase + Google Cloud + Microsoft Entra ID. Brak commitów; weryfikacja przez Supabase dashboard.
2. **Kod helpera** — jeden plik (`src/lib/auth.ts`), commit z czystą warstwą `lib`. Automatyczna weryfikacja: typecheck + lint + build.
3. **Weryfikacja end-to-end na prod** — smoke test trzech providerów z DevTools console na `https://polygo.pages.dev`. Manualne, bez UI.

Fazy 1 i 2 są niezależne i mogą iść równolegle (faza 2 nie wymaga konkretnych Client ID), ale wykonujemy je sekwencyjnie dla klarowności progresu i prostoty commitu.

## Critical Implementation Details

- **Microsoft tenant configuration**: w Entra App registration ustaw **"Accounts in any organizational directory and personal Microsoft accounts"** (`common` audience). Pilotowe firmy mają różne tenanty — single-tenant ustawienie zablokuje 100% logowań spoza tenantu developera. Supabase provider key w dashboardzie to `azure`, nie `microsoft`.
- **Google OAuth consent screen**: dla pilotu wystarczy **External** + **Testing** mode z developerem jako test user. **Verification** (z domeną, polityką prywatności, etc.) jest wymagana dopiero gdy chcemy >100 użytkowników lub publish — odraczamy do v2/pilotu skali.
- **Site URL vs Redirect URLs w Supabase**: Site URL (jedna wartość) jest fallbackiem gdy `redirectTo` nie zostanie podany. Redirect URLs (lista) to allowlist akceptowanych wartości `redirectTo`. Oba muszą być ustawione — Site URL na `https://polygo.pages.dev`, Redirect URLs na obie ścieżki callbacku (localhost + prod).

## Phase 1: Konfiguracja providerów w panelach

### Overview

Konfiguracja Supabase Auth + Google Cloud + Microsoft Entra ID. Brak zmian w kodzie. Po fazie: dashboard pokazuje trzy providery jako enabled, Site URL i Redirect URLs ustawione, Client ID i Secret wprowadzone u obu OAuth providerów.

### Changes Required:

#### 1. Supabase Auth — email/hasło

**Konfiguracja**: Supabase dashboard `polygo-prod` → Authentication → Providers → Email

**Intent**: Włączyć email/hasło jako provider z password sign-up enabled. Domyślne ustawienia OK dla pilotu (no email confirmation required, można podnieść w v2 gdy publiczna rejestracja).

**Contract**: Provider `email` enabled = true; "Confirm email" możemy zostawić OFF na pilot scale (przyspiesza smoke test); "Secure email change" ON jako default.

#### 2. Supabase Auth — Site URL i Redirect URLs

**Konfiguracja**: Supabase dashboard `polygo-prod` → Authentication → URL Configuration

**Intent**: Ustawić Site URL na prod URL i dodać dwie ścieżki callback do allowlist Redirect URLs. To jest warunek konieczny żeby OAuth nie odbijał się od Supabase z błędem "Invalid Redirect URL".

**Contract**:
- Site URL: `https://polygo.pages.dev`
- Redirect URLs (allowlist):
  - `https://polygo.pages.dev/auth/callback`
  - `http://localhost:5173/auth/callback`

#### 3. Google Cloud — OAuth 2.0 Client

**Konfiguracja**: Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID

**Intent**: Zarejestrować PolyGo jako klienta OAuth Google, otrzymać Client ID + Client Secret do wklejenia w Supabase. OAuth consent screen w External + Testing mode (developer jako test user).

**Contract**:
- Application type: **Web application**
- Authorized redirect URI: `https://yaejbsodwhixywjpqhau.supabase.co/auth/v1/callback` (callback URL od strony Supabase, NIE aplikacji — Supabase obsługuje token exchange i dopiero potem przekierowuje na `redirectTo`)
- OAuth consent screen: User Type **External**, Publishing status **Testing**, dodać konto developera jako Test user

#### 4. Microsoft Entra ID — App registration

**Konfiguracja**: Microsoft Entra admin center (`entra.microsoft.com`) → Identity → Applications → App registrations → New registration

**Intent**: Zarejestrować PolyGo jako multi-tenant Entra app, otrzymać Application (client) ID + Client Secret do wklejenia w Supabase. Multi-tenant jest krytyczne — pilotowe firmy mają różne tenanty.

**Contract**:
- Name: `PolyGo` (lub podobne)
- Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (audience `common`)
- Redirect URI: Platform **Web**, URI `https://yaejbsodwhixywjpqhau.supabase.co/auth/v1/callback`
- Po utworzeniu: Certificates & secrets → New client secret (zapisać raz, nie widać ponownie); API permissions → domyślne `User.Read` wystarczy dla scope email/profile

#### 5. Supabase Auth — Google provider

**Konfiguracja**: Supabase dashboard → Authentication → Providers → Google

**Intent**: Włączyć Google jako provider z Client ID + Secret z kroku 3.

**Contract**: Provider `google` enabled = true; Client ID + Client Secret wklejone z Google Cloud Console.

#### 6. Supabase Auth — Azure provider

**Konfiguracja**: Supabase dashboard → Authentication → Providers → Azure

**Intent**: Włączyć Azure (Microsoft Entra) jako provider z Application ID + Secret z kroku 4. Azure Tenant ustawiony na `common` dla multi-tenant.

**Contract**: Provider `azure` enabled = true; Client ID + Secret wklejone z Entra; Azure Tenant URL = `common` (lub pole "Microsoft Tenant" = `common`, dokładna etykieta zależy od wersji dashboardu).

### Success Criteria:

#### Automated Verification:

(faza konfiguracyjna — brak automatycznych testów)

#### Manual Verification:

- Supabase dashboard → Authentication → Providers pokazuje email, google, azure wszystkie jako **enabled**.
- Supabase dashboard → Authentication → URL Configuration pokazuje Site URL `https://polygo.pages.dev` i dwa Redirect URLs (prod + localhost callback).
- Google Cloud Console → Credentials pokazuje aktywny OAuth 2.0 Client ID dla `PolyGo` z poprawnym redirect URI Supabase.
- Microsoft Entra App registration pokazuje `PolyGo` z audience `common` (Multitenant) i redirect URI Supabase.
- Client Secrets dla Google i Microsoft są zapisane w password managerze developera (NIE w repo, NIE w `.env`).

**Implementation Note**: Po zakończeniu Fazy 1 pauza na manual confirmation — sprawdź wszystkie 5 punktów wyżej w dashboardach zanim ruszysz dalej.

---

## Phase 2: Helper `getAuthRedirect()` w `src/lib/auth.ts`

### Overview

Dodanie jednego nowego pliku `src/lib/auth.ts` z eksportem funkcji `getAuthRedirect()`. Helper zwraca `${window.location.origin}/auth/callback`. Plik nie zawiera importów React ani Supabase — czysty `lib` module zgodnie z konwencją w `AGENTS.md:35`.

### Changes Required:

#### 1. Helper auth

**File**: `src/lib/auth.ts` (nowy)

**Intent**: Centralizować wybór callback URL dla OAuth, tak żeby każde wywołanie `signInWithOAuth` w przyszłej zmianie S-01 używało tego samego źródła prawdy zamiast inline-string. Mitigation Risk #3 z `infrastructure.md:50`.

**Contract**: Eksport `export function getAuthRedirect(): string` zwracający `\`${window.location.origin}/auth/callback\``. Brak innych eksportów.

#### 2. Commit

**Plik**: nowy `src/lib/auth.ts` + zmiana `context/changes/auth-scaffold/change.md` (`status: in-progress`)

**Intent**: Wprowadzić helper jako pojedynczy zwięzły commit, kt
óry zamyka kod F-01.

**Contract**: Wiadomość commit `feat(auth): add getAuthRedirect helper for OAuth callback URLs`; w treści krótka notka o tym, że callback route powstanie w F-04 a SPA fallback CF Pages obsługuje URL do tego czasu.

### Success Criteria:

#### Automated Verification:

- TypeScript typecheck przechodzi: `pnpm build` (wykonuje `tsc -b && vite build`).
- ESLint przechodzi: `pnpm lint`.
- Plik `src/lib/auth.ts` zawiera dokładnie jeden export `getAuthRedirect`.
- `git grep "redirectTo:" src/` nie znajduje żadnego inline-stringa z `'/auth/callback'` (helper jest jedynym źródłem) — w F-01 grep ma być pusty, bo konsumentów jeszcze nie ma.

#### Manual Verification:

- `pnpm dev` startuje bez błędów; w DevTools console `import('/src/lib/auth.ts').then(m => m.getAuthRedirect())` zwraca `http://localhost:5173/auth/callback`.

**Implementation Note**: Po fazie 2 pauza — potwierdź że automated verification przeszło i `pnpm dev` zwraca poprawny URL z konsoli, zanim deployujemy.

---

## Phase 3: Weryfikacja end-to-end na prod

### Overview

Po merge do `main` GitHub Actions deployuje na `https://polygo.pages.dev`. Smoke test z DevTools console na prod URL: każdy z trzech providerów dochodzi do końca flow, `getSession()` zwraca sesję.

### Changes Required:

#### 1. Smoke test email/hasło

**Krok manual**: w DevTools console na `https://polygo.pages.dev` wykonać sekwencję z `supabase` (helper Supabase klienta jest zaimportowany w `App.tsx` przez `CompanyProfile`, ale do konsoli trzeba go wystawić ad-hoc albo użyć `window.supabase` jeśli dodany — patrz Note niżej).

**Intent**: Zweryfikować że email/hasło provider działa i tworzy rekord w `auth.users`.

**Contract**:
1. Wywołać `supabase.auth.signUp({ email: '<test-email>', password: '<strong>' })`.
2. Oczekiwany rezultat: response zawiera `data.user` z `id`, nie zawiera błędu.
3. Wywołać `supabase.auth.getSession()` — zwraca aktywną sesję dla nowo utworzonego usera.
4. Zalogować do Supabase dashboard → Authentication → Users → potwierdzić obecność rekordu test-email.

**Note**: Żeby `supabase` był dostępny w konsoli prod, na czas smoke testu w `src/lib/supabase.ts` można tymczasowo dodać `if (import.meta.env.DEV || true) (globalThis as any).supabase = supabase` — **ALE** czystsze podejście: użyć DevTools Sources → wstawić breakpoint w jakimkolwiek module który importuje `supabase` i zaewaluować w jego scope. Decyzja w trakcie wykonania; preferowana opcja drugaopcja, bo nie wymaga commit.

#### 2. Smoke test Google OAuth

**Krok manual**: w DevTools console na `https://polygo.pages.dev` wywołać `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://polygo.pages.dev/auth/callback' } })`.

**Intent**: Zweryfikować że Google flow dochodzi do końca: redirect na consent screen → wybór konta test → powrót na `/auth/callback` (SPA fallback ładuje App.tsx) → Supabase obsłużył token exchange → `getSession()` zwraca sesję.

**Contract**:
1. Wywołanie przekierowuje na `accounts.google.com`.
2. Po wyborze konta test redirect wraca na `https://polygo.pages.dev/auth/callback#access_token=...` (lub query params, zależnie od flow).
3. Po wylądowaniu na callback URL: w nowej konsoli `supabase.auth.getSession()` → zwraca aktywną sesję z `user.app_metadata.provider === 'google'`.
4. Supabase dashboard → Authentication → Users pokazuje nowego usera z provider `google`.

#### 3. Smoke test Microsoft (Azure) OAuth

**Krok manual**: analogicznie do kroku 2, ale `provider: 'azure'`.

**Intent**: Zweryfikować że Microsoft flow działa dla konta z **innego tenantu** niż tenant developera (jeśli developer ma dostęp do drugiego konta MS) lub przynajmniej z personal Microsoft account — to weryfikuje że audience `common` jest poprawnie ustawiona.

**Contract**:
1. Wywołanie przekierowuje na `login.microsoftonline.com`.
2. Logowanie kontem MS przechodzi (organizational LUB personal — co jest dostępne).
3. Redirect wraca na `https://polygo.pages.dev/auth/callback`.
4. `supabase.auth.getSession()` zwraca sesję z `user.app_metadata.provider === 'azure'`.
5. Supabase dashboard → Authentication → Users pokazuje usera z provider `azure`.

#### 4. Cleanup konta testowego

**Krok manual**: Supabase dashboard → Authentication → Users → zaznaczyć trzy konta utworzone w smoke testach (email/hasło, google, azure) → albo zostawić oznaczone jako developer-test (zgodne z `AGENTS.md:22`), albo skasować jeśli planowane realne dane developer-test.

**Intent**: Świadomy stan `auth.users` po fazie 3 — albo dwa-trzy znane konta developera, albo czysta tabela.

**Contract**: Stan opisany w `## Progress` po fazie 3.

### Success Criteria:

#### Automated Verification:

(faza weryfikacyjna — brak automated testów)

#### Manual Verification:

- Email/hasło: `signUp` zwraca usera, dashboard pokazuje rekord.
- Google: cały flow (initiation → consent → callback → session) bez błędu, `getSession()` zwraca sesję z provider `google`.
- Microsoft: cały flow bez błędu, sesja z provider `azure`.
- `getAuthRedirect()` zwraca w prod `https://polygo.pages.dev/auth/callback` (sanity check z konsoli prod).
- Stan `auth.users` jest świadomy (dokumentowane: ile kont testowych, jakie email-e).

**Implementation Note**: Po fazie 3 zmiana jest gotowa do oznaczenia `status: implemented` w `change.md` — F-01 spełnione, S-01 odblokowane.

---

## Testing Strategy

### Unit Tests:

- Brak unit testów dla `getAuthRedirect()` — funkcja czyta `window.location.origin`, test wymagałby JSDOM mocka, koszt setup'u testowej infry > wartość dla jednolinijkowego helpera. Smoke test prod (Phase 3) weryfikuje rzeczywistą wartość.

### Integration Tests:

- Brak — F-01 nie ma user-visible behavior. Realny end-to-end test wchodzi z S-01 (UI logowania) i może być zautomatyzowany w v2 jeśli będzie sens.

### Manual Testing Steps:

Opisane szczegółowo w fazie 3 (smoke test trzech providerów z DevTools console na prod).

## Performance Considerations

Brak — helper to jedna operacja string-concatu, OAuth flow czas i tak dominują latencje providerów (Google ~200ms, Microsoft ~300ms, Supabase token exchange ~100ms).

## Migration Notes

Brak migracji danych. Pierwsze rekordy w `auth.users` powstają dopiero w fazie 3 (smoke test).

## References

- Roadmap entry: `context/foundation/roadmap.md:67-78` (F-01)
- Risk register: `context/foundation/infrastructure.md:50` (Risk #3 — OAuth callback fallback)
- Convention rule: `AGENTS.md:19` (NEVER inline redirectTo)
- Deployment context: `context/foundation/deployment-plan-v2.md:18` (świadoma decyzja o jednym Supabase)
- Supabase client: `src/lib/supabase.ts` (już istnieje, jest konsumentem helpera w przyszłej S-01)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Konfiguracja providerów w panelach

#### Manual

- [x] 1.1 Supabase dashboard → Providers pokazuje email, google jako enabled (azure odroczony)
- [x] 1.2 Supabase dashboard → URL Configuration ma Site URL `https://da9d2456.polygo.pages.dev` + dwa Redirect URLs (prod + localhost)
- [x] 1.3 Google Cloud Console → aktywny OAuth 2.0 Client ID dla PolyGo z poprawnym redirect URI Supabase
- [~] 1.4 Microsoft Entra App registration — ODROCZONE do osobnej zmiany (pilot rusza z email + Google)
- [x] 1.5 Client Secret Google zapisany w password managerze (nie w repo, nie w `.env`)

### Phase 2: Helper `getAuthRedirect()` w `src/lib/auth.ts`

#### Automated

- [x] 2.1 TypeScript typecheck przechodzi: `pnpm build` — 881a518
- [x] 2.2 ESLint przechodzi: `pnpm lint` — 881a518
- [x] 2.3 Plik `src/lib/auth.ts` zawiera dokładnie jeden export `getAuthRedirect` — 881a518
- [x] 2.4 `git grep "redirectTo:" src/` jest puste (brak inline stringów) — 881a518

#### Manual

- [x] 2.5 `pnpm dev` startuje bez błędów; DevTools console zwraca `http://localhost:<port>/auth/callback` z helpera (port 5175 — Vite fallback z 5173) — 881a518

### Phase 3: Weryfikacja end-to-end na prod

#### Manual

- [x] 3.1 Email/hasło: `signUp` zwraca usera, Supabase dashboard pokazuje rekord
- [x] 3.2 Google OAuth: pełny flow bez błędu, `getSession()` zwraca sesję z provider `google`
- [~] 3.3 Microsoft OAuth — ODROCZONE razem z 1.4 (follow-up change)
- [x] 3.4 `getAuthRedirect()` w prod zwraca `https://da9d2456.polygo.pages.dev/auth/callback`
- [x] 3.5 Stan `auth.users` po smoke testach jest świadomy (udokumentowany w commit message lub change.md)
