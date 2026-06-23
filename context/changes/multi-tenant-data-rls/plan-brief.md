# Multi-tenant data layer + RLS — Plan Brief

> Full plan: `context/changes/multi-tenant-data-rls/plan.md`
> Roadmap: `context/foundation/roadmap.md` (F-02)

## What & Why

Wdrożyć schemat Postgres + polityki RLS, które gwarantują izolację danych między firmami w PolyGo. To **najbardziej krytyczna warstwa MVP** — wyciek danych jednej firmy do drugiej jest klasyfikowany w PRD jako krytyczny incydent. Wszystkie kolejne plastry (S-02..S-05) operują na tych danych i muszą działać na poprawnych założeniach bezpieczeństwa od dnia pierwszego.

## Starting Point

Klient Supabase jest podpięty (`src/lib/supabase.ts`) z env varsami, F-01 (auth) zaimplementowany — `auth.users` gotowe do FK. Supabase CLI 2.58.5 zainstalowany lokalnie, ale **brak `supabase/` w repo, brak migracji, brak typów TS, brak schematu w bazie**. Prod jest pusty (preview deploys świadomie wyłączone — pierwsza migracja idzie na zero danych). User dostarczył kompletny projekt schematu SQL (companies, users, categories, certificates, pivot tables, company_media, favorites, conversations, messages), który plan adaptuje z trzema niezbędnymi poprawkami.

## Desired End State

W repo żyje wersjonowany schemat (`supabase/migrations/0001_init_schema.sql`, `0002_enable_rls.sql`), seed słowników (`supabase/seed.sql`), test izolacji (`supabase/tests/rls.sql`), wygenerowane typy TS wpięte do klienta (`src/lib/database.types.ts`) i workflow CLI dla solo developera (`pnpm db:reset`, `pnpm db:types`, `pnpm db:test:rls`). Lokalna baza i prod zawierają ten sam schemat z aktywnym RLS. F-04, S-01, S-02 mogą startować.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego (1 zdanie) | Źródło |
|---|---|---|---|
| RLS companies | SELECT all-authenticated; UPDATE tylko własna firma | PRD/roadmap wymagają widoczności obcych wizytówek dla US-02/03/S-03/S-04/S-05 | Plan |
| Service role | Domyślny bypass Supabase; seeding przez SQL z service_role key | Idiomatic Supabase, minimum kodu, klient i tak musi mieć service_role dla CI | Plan |
| Polimery | W `technical_parameters` JSONB (bez słownika) | Mniejszy scope F-02, JSONB elastyczny, kształt doprecyzowuje S-02 | Plan |
| Region | Nowe pole TEXT `region` na `companies` | US-02 wymaga filtra po regionie; pilot ~10 firm PL = wojew. wystarczy | Plan |
| Kontrakt JSONB | Elastyczny, komentarz w `COMMENT ON COLUMN` | Brak overengineeringu; kształt zna dopiero S-02 z UI | Plan |
| Model conversations | user↔user (bez zmian) + agregacja per-firma w UI | W pilocie typowo 1 user/firma; refactor na M:N to przedwczesna generalizacja | Plan |
| Unikalność konwersacji | `UNIQUE INDEX (LEAST, GREATEST)` na parze participantów | Standard pattern, wymusza jedną konwersację niezależnie od inicjatora | Plan |
| RLS messages | SELECT/INSERT dla uczestników, `sender_id = auth.uid()`, brak UPDATE/DELETE | Immutable czat = audit trail per PRD | Plan |
| Limit 5 mediów | Application-level (trigger zostaje zakomentowany) | Pełna obrona to UI; trigger przesada dla MVP | Plan |
| RLS company_media | SELECT all-authenticated, mutacje tylko własna firma | Spójne z 'cała wizytówka publiczna dla zalogowanych' (US-03) | Plan |
| RODO | Tylko ON DELETE CASCADE; audit log + delete-flow odłożone do v2 | NFR-RODO 'audyt dostępu' nie blokuje MVP; pierwsze żądanie obsłuży Operator | Plan |
| Migracje | Supabase CLI (`supabase/migrations/*.sql`) | Wersjonowane, repeatable, idiomatic; CLI już zainstalowany | Plan |
| Test izolacji | `supabase/tests/rls.sql` + manualna checklista | NFR-critical wymaga powtarzalnego pierwszego alarmu; solo dev + jeden skrypt | Plan |
| Typy TS | `supabase gen types typescript` + commit `database.types.ts` | Wszystkie nast. slice'y dostają type-safe queries z dnia 1 | Plan |

## Scope

**W zakresie:**
- 10 tabel: `categories`, `certificates`, `companies` (+ `region`), `users`, `company_categories`, `company_certificates`, `company_media`, `favorites`, `conversations`, `messages`
- Polityki RLS na wszystkich tabelach z danymi firmowymi + GRANT dla `authenticated` na słownikach
- Funkcje pomocnicze: `current_user_company_id()` (STABLE SECURITY DEFINER), `mark_message_read(uuid)`
- UNIQUE indeks deduplikujący konwersacje
- Seed słowników (`categories`, `certificates`)
- Skrypt testowy izolacji RLS
- Typy TS + wpięcie do klienta Supabase
- Notatka w CLAUDE.md o regeneracji typów po migracjach

**Poza zakresem:**
- UI (S-02, S-03, S-04)
- Realtime subscriptions (S-04)
- Audit log, soft-delete, `polymer_types` jako słownik (do v2)
- Trigger `enforce_media_limit` (limit w UI)
- Refactor `conversations` na `conversation_participants` M:N
- Seedowanie firm/userów pilotowych (poza-aplikacyjna robota Operatora)

## Architecture / Approach

Pojedyncza Postgres baza w Supabase, dwie sekwencyjne migracje (schema → RLS). Polityki RLS pisane wyłącznie dla roli `authenticated` (service_role bypassuje). Centralna funkcja `current_user_company_id() STABLE SECURITY DEFINER` zwraca firmę zalogowanego usera — używana w politykach, żeby nie powtarzać subquery i nie wpadać w rekurencję RLS. Klient SPA używa anon key + `createClient<Database>` z wygenerowanych typów. Wszystko jest wersjonowane w `supabase/migrations/` i odtwarzalne przez `pnpm db:reset`.

## Phases at a Glance

| Phase | Co dostarcza | Główne ryzyko |
|---|---|---|
| 1. Setup CLI | `supabase/` z config + npm scripts (`db:reset`, `db:types`, `db:test:rls`) | Docker Desktop musi działać dla lokalnego stacka |
| 2. Schema | Migracja `0001_init_schema.sql` z 10 tabelami + region + UNIQUE conv + seed słowników | Tabele jeszcze otwarte (bez RLS) — nie pchać na prod |
| 3. RLS | Migracja `0002_enable_rls.sql` z politykami + helper functions | Pułapka: ENABLE bez polityki blokuje wszystko — robimy w jednej transakcji |
| 4. Test izolacji | `supabase/tests/rls.sql` z 8 asercjami | Skrypt to gate przed prod push — fail = wracamy do Fazy 3 |
| 5. Typy TS + push | `database.types.ts`, `createClient<Database>`, push na prod, CLAUDE.md update | Operator musi puścić `seed.sql` na prod ręcznie po pushu |

**Prerequisites:** F-01 (auth-scaffold) zaimplementowany ✅ ; Docker Desktop działa lokalnie; `supabase link` do projektu prod możliwe.
**Estimated effort:** ~1-2 sesje, w sumie 5 commitów (jeden per faza).

## Open Risks & Assumptions

- **Założenie**: prod Supabase jest pusty i może przyjąć pierwszą migrację bez `down`/rollback strategy. Jeśli prod ma już jakieś tabele po F-01, `supabase db diff --linked` to wyłapie przed pushem.
- **Założenie**: w pilocie typowo 1 user/firma → model user↔user dla conversations wystarczy. Jeśli pierwsza pilotowa firma ma 2+ użytkowników z aktywnym czatem, agregacja per-firma w UI (zaplanowana w S-04) musi to obsłużyć — F-02 tego nie blokuje.
- **Ryzyko**: limit 5 mediów w aplikacji można obejść z `service_role`. Akceptowalne — service_role używa wyłącznie Operator, nigdy klient.
- **Ryzyko**: `messages` polityka RLS używa `EXISTS` z subquery — przy długiej historii czatu może spowolnić. Mierzymy realnie w S-04, mitigation gotowa (materialized join lub denormalizacja `company_id` na `messages`).
- **Wiedza Operatora**: po pierwszym `db push` na prod, `seed.sql` (categories, certificates) trzeba puścić ręcznie w SQL Editor — to nie jest automatyczne.

## Success Criteria (Summary)

- `pnpm db:reset && pnpm db:test:rls` przechodzi z `NOTICE: RLS isolation OK` na lokalnej bazie
- Manualna checklista izolacji w Supabase Studio (5 kroków) przechodzi 5/5:
  1. Zaloguj się jako user firmy A → `SELECT * FROM favorites` zwraca tylko swoje
  2. `UPDATE companies SET description = 'hack' WHERE id = <B>` → 0 rows affected
  3. `INSERT INTO messages (...) VALUES (<B's conv>, ...)` → błąd RLS
  4. Powtórz jako user firmy B → symetryczna izolacja
  5. Jako service_role widzisz wszystko (potwierdzenie bypass)
- `supabase db push` aplikuje schemat na prod, Dashboard pokazuje 10 tabel + RLS enabled
- `pnpm typecheck` przechodzi z `createClient<Database>` w `src/lib/supabase.ts`
- F-04/S-01/S-02 mogą startować na tej podstawie
