# Auth Scaffold — Plan Brief

> Full plan: `context/changes/auth-scaffold/plan.md`

## What & Why

Konfiguracja Supabase Auth dla trzech metod logowania (email/hasło, OAuth Google, OAuth Microsoft) plus helper `getAuthRedirect()` w `src/lib/auth.ts`, który centralizuje wybór callback URL dla wszystkich przyszłych wywołań OAuth. Foundation F-01 z roadmapy — bez tego scaffoldu żadna user-visible slice (S-01...S-05) nie ruszy, bo wszystkie zakładają zalogowanego usera.

## Starting Point

W repo istnieje już klient Supabase (`src/lib/supabase.ts`) z `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` i fail-fast walidacją. `@supabase/supabase-js@2.107.0` jest w dependencies. `AGENTS.md` formalizuje regułę "NEVER inline `redirectTo` w `signInWithOAuth`" wyprzedzająco — kod, który tę regułę honoruje, jeszcze nie istnieje. Środowisko: **jeden** projekt Supabase (`polygo-prod`), preview deploys wyłączone — tylko prod i localhost.

## Desired End State

Trzy providery włączone w Supabase dashboard z poprawnymi Client ID i Redirect URLs. Plik `src/lib/auth.ts` eksportuje `getAuthRedirect()` zwracający `${window.location.origin}/auth/callback`. Smoke test prod (DevTools console) potwierdza, że każdy z trzech flow logowania dochodzi do końca i `supabase.auth.getSession()` zwraca aktywną sesję. UI logowania jeszcze nie ma — to zadanie S-01.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Source |
| --- | --- | --- | --- |
| Liczba providerów w F-01 | Wszystkie 3 (email + Google + Microsoft) | Roadmapa wprost mówi, że pominięcie któregokolwiek = ryzyko, że pilotowa firma nie wejdzie | Plan |
| Co zwraca helper teraz | `${origin}/auth/callback` od razu | Kontrakt stabilny przez F-01 → F-04 → S-01; CF Pages SPA-fallback obsłuży URL do czasu F-04 | Plan |
| Weryfikacja bez staging | Smoke test bezpośrednio na prod | Brak userów pilotowych = bezpieczne; staging świadomie odroczony w `deployment-plan-v2.md` | Plan |
| Zakres `auth.ts` | Tylko `getAuthRedirect()` | Wrappery `signInWith*` projektujemy razem z konsumentem (S-01), nie w próżni | Plan |
| Sposób smoke testu | DevTools console na prod | Nie wymaga UI (nie ma S-01), nie wymaga "tymczasowych przycisków" | Plan |
| Microsoft audience | `common` (multi-tenant + personal accounts) | Pilotowe firmy mają różne tenanty MS; single-tenant zablokuje 100% logowań spoza tenantu dewelopera | Plan |

## Scope

**In scope:**
- Supabase Auth: providery email, google, azure włączone + Site URL + Redirect URLs (allowlist)
- Google Cloud OAuth Client ID + consent screen w Testing mode
- Microsoft Entra App registration (multi-tenant `common`)
- `src/lib/auth.ts` z `getAuthRedirect()`
- Smoke test trzech providerów z DevTools console na prod

**Out of scope:**
- UI logowania (S-01)
- React Router + `/auth/callback` route component + guard sesji (F-04)
- Wrappery auth (`signInWith*`, `signOut`, `onAuthStateChange`)
- Schemat users/companies (F-02)
- Drugi projekt Supabase (świadomie odroczone)
- ESLint custom rule wymuszająca użycie helpera (grep wystarczy przy 3 konsumentach z S-01)

## Architecture / Approach

Trzy fazy:

```
Faza 1 (panele)              Faza 2 (kod)            Faza 3 (verify)
──────────────              ────────────            ───────────────
Supabase: email/google/azure     src/lib/auth.ts        DevTools console
+ Site URL + Redirect URLs       export getAuthRedirect → smoke 3 providerów
Google Cloud OAuth Client                                na polygo.pages.dev
Entra App (multi-tenant)
```

Helper jest **jedynym** dotknięciem kodu w tej zmianie. Reszta to konfiguracja w dashboardach trzech serwisów (Supabase + Google Cloud + Microsoft Entra) i smoke test na prod.

## Phases at a Glance

| Phase | Co dostarcza | Kluczowe ryzyko |
| --- | --- | --- |
| 1. Konfiguracja paneli | Trzy providery enabled w Supabase, Client ID/Secret z Google i Microsoft wklejone, Redirect URLs allowlistowane | Wpisanie złych Redirect URLs lub single-tenant w Entra → callback failuje silent w fazie 3 |
| 2. Helper `getAuthRedirect()` | `src/lib/auth.ts` z jednym eksportem; typecheck + lint zielone | Trywialne (1 plik, ~10 linii) |
| 3. Smoke verify na prod | Potwierdzenie że trzy flow działają end-to-end; rekordy w `auth.users` | Brak UI = test z konsoli wymaga ad-hoc dostępu do klienta Supabase w runtime — opisane w planie |

**Prerequisites:**
- Dostęp do Supabase dashboard `polygo-prod` (Settings → Authentication, URL Configuration)
- Konto Google Cloud z prawami do tworzenia OAuth Client
- Dostęp do Microsoft Entra admin center (`entra.microsoft.com`) z prawami do App registration
- Konto testowe Microsoft (organizational lub personal) inne niż konto developera — dla weryfikacji multi-tenant w fazie 3

**Estimated effort:** ~1.5-2h (Faza 1: 45-60 min konfiguracji w 3 panelach; Faza 2: 10 min kodu + commit; Faza 3: 20-30 min smoke testów)

## Open Risks & Assumptions

- **Single-tenant trap w Entra**: jeśli przez pomyłkę zostanie wybrany "Accounts in this organizational directory only", logowania pilotowych firm spoza tenantu developera padną z `AADSTS50194` — wykrywane dopiero w fazie 3 lub przy pierwszej realnej firmie. Mitigation: explicit krok 1.4 w planie.
- **Google OAuth Testing mode limit**: 100 test users; pilot zaplanowany na ~10 firm (PRD), więc OK do MVP. Verification (publish) dopiero w v2.
- **Klient Supabase nie jest globalny w prod runtime** — smoke test z konsoli wymaga ad-hoc dostępu do instancji. Plan opisuje dwie ścieżki (tymczasowe `globalThis.supabase` albo breakpoint w DevTools); preferowana druga, decyzja w wykonaniu.
- **Konflikt z roadmap.md:77** (oryginalnie zalecano staging Supabase do weryfikacji) — świadomie ignorowany, bo `deployment-plan-v2.md` + `AGENTS.md` formalizują "jedno środowisko" jako aktualny stan; ryzyko jest akceptowane do czasu pierwszego pilotowego usera.

## Success Criteria (Summary)

- Trzy providery (email + google + azure) widoczne jako enabled w Supabase dashboard.
- `src/lib/auth.ts` eksportuje `getAuthRedirect()`; `pnpm build` + `pnpm lint` zielone; `git grep "redirectTo:" src/` puste.
- Smoke test prod: każdy z trzech flow dochodzi do końca, `supabase.auth.getSession()` zwraca sesję, dashboard pokazuje rekordy w `auth.users`.
