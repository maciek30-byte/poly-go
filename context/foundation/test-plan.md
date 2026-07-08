# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-07-01 (§3 Phase 1 → change opened)

## 1. Strategy

Testy w tym projekcie kierują się trzema nienegocjowalnymi zasadami:

1. **Koszt × sygnał.** Wygrywa najtańszy test dający realny sygnał dla danego
   ryzyka. Nie promuj do e2e, bo e2e "wydaje się bezpieczniejsze". Nie
   nakładaj modelu wizyjnego na deterministyczny diff, który już łapie
   regresję.
2. **Obawy usera to dowód pierwszej klasy.** Ryzyka zakotwiczone w "zespół
   boi się X, a awaria wyszłaby gdzieś w obszarze <area>" mają tę samą wagę,
   co linie PRD czy dane hot-spot.
3. **Ryzyka to scenariusze, nie lokalizacje w kodzie.** Ten plan dokumentuje
   *co może się zepsuć* i *dlaczego uważamy to za prawdopodobne* — na
   podstawie dokumentów, wywiadu i *sygnału* z kodu (churn, struktura, baza
   testów). NIE twierdzi, że wie, która linia jest właścicielem awarii. Tę
   wiedzę produkuje `/10x-research` w każdej fazie rolloutu. Jeśli plan i
   research nie zgadzają się co do miejsca awarii, research jest źródłem
   prawdy.

Scope hot-spot użyty do ważenia likelihood: `src/routes/`, `src/components/`,
`src/lib/`, `supabase/`.

## 2. Risk Map

Najważniejsze scenariusze awarii, które ten projekt musi chronić, uporządkowane
wg ryzyka = impact × likelihood. Ryzyka to scenariusze awarii w kategoriach
użytkownika/biznesu, nie nazwy testów. Kolumna Source cytuje *dowód, który
wyniósł to ryzyko na wierzch* — nigdy konkretnego pliku jako "miejsca awarii"
(to zadanie researchu, patrz §1 zasada #3).

| # | Ryzyko (scenariusz awarii) | Impact | Likelihood | Source (dowód — nie anchor) |
|---|-----------------------------|--------|------------|------------------------------|
| 1 | Handlowiec firmy A odczytuje niepubliczne dane firmy B (wizytówka / wiersze) — błędna polityka RLS otwiera dostęp za szeroko | High | High | PRD NFR izolacji ("wyciek = krytyczny incydent"); interview Q1, Q3; hot-spot dir `supabase/` (migrations 8 + tests 5 commits/30d) |
| 2 | Firma A czyta cudzą rozmowę na czacie — `messages`/`conversations` nie egzekwują członkostwa (IDOR po znanym id konwersacji) | High | Medium | PRD NFR izolacji + US-04/US-05; roadmap S-04 (north star); abuse-lens (authorization/IDOR) |
| 3 | Pilotowa firma nie może się zalogować — OAuth callback pada na prodzie lub redirect prowadzi w złe miejsce | High | High | interview Q3; roadmap S-01 Risk (`getAuthRedirect()`); hot-spot dir `src/routes/` (32 commits/30d) |
| 4 | Prod nie odzwierciedla zamierzonego schematu — migracja nie dojechała, kolumny/polityki RLS rozjechane lokal↔prod | High | Medium | interview Q2 (realny incydent); hot-spot dir `supabase/migrations/` (8 commits/30d); CI mitigacja istnieje, ale nieweryfikowana |
| 5 | Zalogowany user firmy A edytuje/zapisuje wizytówkę firmy B — brak kontroli własności po stronie zapisu ("jestem zalogowany" ≠ "to moja firma") | High | Medium | PRD Access Control (konto → dokładnie 1 firma); US-07; hot-spot dir `src/components/` (28 commits/30d); abuse-lens (ownership) |
| 6 | Brak / wygasła sesja dociera do chronionego widoku — dane firmowe za publicznym URL, guard nie trzyma | Medium | Medium | PRD Access Control ("cała aplikacja za loginem"); roadmap F-04 (guard); hot-spot dir `src/routes/` (32 commits/30d) |

**Rubryka Impact × Likelihood.** Oba wymiary w skali High / Medium / Low.

| Rating | Impact | Likelihood |
|--------|--------|------------|
| High | user traci dostęp, dane lub pieniądze; awaria publicznie widoczna | obszar zmieniany tygodniowo lub już nas tu sparzyło |
| Medium | funkcja degraduje, istnieje obejście, dotyczy części userów | dotykany okazjonalnie, bywał źródłem bugów |
| Low | kosmetyka, łatwo cofnąć, brak wpływu na dane | stabilny kod, rzadko dotykany |

Chronimy najpierw High × High (R1, R3). R6 obniżony do Medium × Medium: guard
front-side to nie brama kryptograficzna — realną bramą izolacji jest RLS
(R1/R2/R5); zostaje, bo PRD wprost stawia "cała apka za loginem".

**Soczewka abuse / security.** Produkt ma auth i twardą izolację multi-tenant,
więc mapa zawiera scenariusze nadużyć, których happy-path wywiadu nie ujawnia:
R2 (IDOR na konwersacji — czy odczyt sprawdza członkostwo, nie tylko
zalogowanie?) i R5 (kontrola własności po stronie zapisu wizytówki). Oba
punktują na tych samych dwóch osiach; to nie osobny framework.

### Risk Response Guidance

| Risk | Co udowadnia ochronę | Musi zakwestionować | Kontekst do zgruntowania przez `/10x-research` | Najtańsza warstwa (hipoteza) | Anti-pattern do uniknięcia |
|------|-----------------------|----------------------|--------------------------------------------------|-------------------------------|-----------------------------|
| #1 | Zapytanie firmy A o niepubliczne pole/wiersz firmy B zwraca 0 wierszy / odmowę, nie dane | "zalogowany = uprawniony"; "SELECT zwraca dane = izolacja działa" | kształt polityk RLS, definicja pól publicznych vs prywatnych wizytówki, rola `authenticated`, kto jest właścicielem wiersza | integracja: rozszerzenie `supabase/tests/rls.sql` o asercje cross-tenant deny | oracle problem — asercja skopiowana z treści polityki zamiast z reguły biznesowej "A nie widzi B" |
| #2 | User spoza konwersacji nie odczyta jej wiadomości mimo znajomości `conversation_id` | "membership sprawdzony po froncie"; "realtime subscription = bezpieczny" | model członkostwa konwersacji, RLS na `messages`/`conversations`, jak realtime respektuje RLS | integracja RLS (deny na cudzej konwersacji) | happy-path only (test tylko własnej rozmowy); pominięcie ścieżki IDOR |
| #3 | Po OAuth callbacku user ląduje zalogowany na właściwym widoku; redirect nie gubi się na prod-URL | "działa lokalnie = działa na prod"; "HTTP 200 = user zalogowany" | użycie `getAuthRedirect()`, kształt callbacku, konfiguracja redirect URL w Supabase Auth, ścieżka błędu | integracja/component + ewentualnie e2e (happy + error path callbacku) | mirror implementacji; brak ścieżki błędu (user odrzuca zgodę Google) |
| #4 | Zaaplikowany schemat na prod odpowiada migracjom (kolumny + polityki obecne po deployu) | "CI zielony = migracje dojechały"; "lokalny `db reset` = stan prod" | co dokładnie robi CI deploy job, kolejność `db push` vs deploy frontu, jak wykryć drift | quality-gate: krok CI weryfikujący aplikację migracji / drift check przed deployem frontu | brak — to gate, nie test jednostkowy; nie mockować CI ani `db push` |
| #5 | User firmy A nie zapisze zmian w wizytówce firmy B (UPDATE odrzucony przez RLS/ownership) | "widzę = mogę edytować"; walidacja tylko po froncie | RLS na `UPDATE companies`, powiązanie user→company, gdzie egzekwowana jest własność | integracja RLS (UPDATE deny cross-tenant) | over-mock internals; test tylko własnej firmy (happy path) |
| #6 | Brak / wygasła sesja na chronionej trasie przekierowuje na `/login`, nie renderuje danych firmowych | "guard po froncie wystarcza jako zabezpieczenie danych"; "klient = źródło prawdy o sesji" | kształt guarda tras, gdzie żyje stan sesji (`use-auth`), co się dzieje przy wygaśnięciu | integracja komponentu guarda / smoke e2e | snapshot bez znaczenia; test tylko happy-path zalogowanego usera |

## 3. Phased Rollout

Każdy wiersz to odrębna faza rolloutu, która otworzy własny folder zmiany przez
`/10x-new`. Status przesuwa się od lewej do prawej; orkiestrator aktualizuje
Status w miarę pojawiania się artefaktów na dysku.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|----------------|------------|--------|----------------|
| 1 | RLS tenant isolation | Udowodnić, że A nie odczyta ani nie zapisze danych B (SELECT + UPDATE deny cross-tenant, w tym czat) | #1, #2, #5 | integration (RLS via `rls.sql` / pgTAP) | change opened | context/changes/testing-rls-tenant-isolation/ |
| 2 | Auth critical-path + runner bootstrap | Postawić runner i udowodnić, że OAuth callback i guard tras trzymają (login działa, sesja chroni trasy) | #3, #6 | unit + integration + (opcjonalnie) e2e | not started | — |
| 3 | Schema drift quality-gate | Zagwarantować, że prod zawsze odzwierciedla migracje — brama CI blokuje niezaplikowany schemat | #4 | gates | not started | — |

**Status vocabulary** (fixed — parser literals):

| Value | Meaning |
|-------|---------|
| `not started` | No change folder for this rollout phase yet. |
| `change opened` | `context/changes/<id>/` exists with `change.md`; research not done. |
| `researched` | `research.md` exists in the change folder. |
| `planned` | `plan.md` exists with a `## Progress` section. |
| `implementing` | Progress section has at least one `[x]` and at least one `[ ]`. |
| `complete` | Progress section is fully `[x]`. |

## 4. Stack

Klasyczna baza testów tego projektu. Narzędzia AI-native (jeśli są) niosą datę
`checked:`, żeby przyszły czytelnik widział, które linie wymagają
re-weryfikacji.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | none yet — see §3 Phase 2 | — | Brak runnera; 0 plików `*.test.*`. Faza 2 bootstrapuje Vitest (naturalny dla Vite). |
| RLS integration | `psql` + `supabase/tests/rls.sql` | Supabase CLI | Jedyny istniejący asset testowy; uruchamiany `pnpm db:test:rls`. Faza 1 rozszerza o asercje cross-tenant. |
| API mocking | none yet | — | SPA + Supabase BaaS; brak własnego API. Mock na krawędzi klienta Supabase decydowany per-faza w researchu. |
| e2e | none yet — see §3 Phase 2 | — | Kandydat: Playwright (MCP dostępny). Promować tylko gdy integracja nie pokrywa ścieżki OAuth/guard. |
| (optional) AI-native | Playwright MCP — checked: 2026-07-01 | n/a | Kiedy NIE używać: gdy deterministyczny test integracyjny już łapie regresję auth/guard; nie nakładać na to sterowania przeglądarką. |

**Stack grounding tools (current session):**
- Docs: none — Context7 / framework docs MCP niedostępny w tej sesji; grounding stacku oparty na lokalnym `package.json` i CLAUDE.md; checked: 2026-07-01
- Search: WebSearch/WebFetch dostępne jako fallback — nie użyte w tej fazie (stack jednoznaczny z manifestu); checked: 2026-07-01
- Runtime/browser: Playwright MCP — dostępny; możliwa warstwa e2e/weryfikacji dla Fazy 2 (OAuth happy+error), tylko gdy dodaje sygnał ponad integrację; checked: 2026-07-01
- Provider/platform: Supabase — brak dedykowanego MCP w sesji; operacje DB przez Supabase CLI (`db:*` skrypty w `package.json`); RLS testowany przez `psql`; checked: 2026-07-01

## 5. Quality Gates

Pełny zestaw bram, które muszą przejść zanim zmiana trafi na produkcję.
"Required after §3 Phase N" oznacza, że brama jest egzekwowana po wylądowaniu
tej fazy rolloutu; wcześniej brama jest `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck (`tsc`) | local + CI | required | dryf składni / typów; typy DB rozjechane ze schematem |
| RLS integration (`db:test:rls`) | local + CI | required after §3 Phase 1 | cross-tenant leak przez błędną politykę RLS |
| unit + integration | local + CI | required after §3 Phase 2 | regresje auth callback / guard tras |
| e2e on critical flows | CI on PR | optional after §3 Phase 2 | złamana ścieżka logowania OAuth end-to-end |
| schema-drift check | CI (before front deploy) | required after §3 Phase 3 | migracja nie zaaplikowana na prod przed deployem |
| pre-prod smoke | between merge + prod | optional | awarie środowiskowe (redirect URL, env) |

## 6. Cookbook Patterns

Jak dodawać nowe testy w tym projekcie. Każda podsekcja wypełnia się, gdy
odpowiednia faza rolloutu wyląduje; wcześniej czyta "TBD — see §3 Phase N".

### 6.1 Dodawanie testu jednostkowego

- TBD — see §3 Phase 2 (bootstrap runnera + pierwszy wzorzec unit).

### 6.2 Dodawanie testu integracyjnego (aplikacja)

- TBD — see §3 Phase 2 (wzorzec dla OAuth callback / guard tras).

### 6.3 Dodawanie testu integracyjnego RLS (izolacja tenant)

- TBD — see §3 Phase 1 (wzorzec cross-tenant deny: SELECT/UPDATE firmy A na danych firmy B → 0 wierszy/odmowa; rozszerzenie `supabase/tests/rls.sql`, uruchomienie `pnpm db:test:rls`).

### 6.4 Dodawanie testu e2e

- TBD — see §3 Phase 2 (tylko jeśli ścieżka OAuth/guard wymaga pełnego deployed shape; kandydat: Playwright).

### 6.5 Dodawanie bramy jakości (quality-gate)

- TBD — see §3 Phase 3 (wzorzec schema-drift check w CI przed deployem frontu).

### 6.6 Per-rollout-phase notes

(Opcjonalne. Po wylądowaniu każdej fazy `/10x-implement` dopisuje 2–3 linie z
tym, co faza nauczyła — np. gdzie żyją fixtures tenantów, jak seedować dwie
firmy do testu izolacji.)

## 7. What We Deliberately Don't Test

Wykluczenia uzgodnione podczas rolloutu (wywiad Faza 2, Q5). Przyszli
kontrybutorzy powinni ich przestrzegać, dopóki założenie się nie zmieni.

- **Wygenerowane typy TypeScript z Supabase** (`src/lib/database.types.ts`) — generator jest testem; `tsc` łapie dryf ze schematem. Re-evaluate, jeśli typy zaczną być ręcznie edytowane. (Source: wywiad Q5.)
- **Kosmetyka UI / CSS / snapshoty stron** — psują się ciągle, łapią mało; PRD nie stawia twardego NFR na wygląd/responsywność. Re-evaluate, jeśli pojawi się design system z kontraktem wizualnym. (Source: wywiad Q5; PRD §NFR.)
- **Seeding firm i kont przez Operatora** — proces offline poza aplikacją (per PRD Access Control); aplikacja tylko czyta zaseedowane dane. Re-evaluate, jeśli powstanie self-registration w UI. (Source: wywiad Q5; PRD Access Control.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-07-01
- Stack versions last verified: 2026-07-01
- AI-native tool references last verified: 2026-07-01

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
