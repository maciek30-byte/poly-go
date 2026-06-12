# Multi-tenant data layer + RLS — Implementation Plan

## Overview

Wdrożyć fundament danych PolyGo: schemat Postgres (companies, users, słowniki, pivot tables, media, favorites, conversations, messages) z politykami RLS, które gwarantują izolację danych między firmami i otwierają wszystkie kolejne plastry (S-02..S-05) na poprawnych założeniach bezpieczeństwa. Foundation F-02 jest NFR-critical — wyciek przez błędną politykę = krytyczny incydent (per PRD).

## Current State Analysis

- Stack: Vite + React + TS + Supabase (Postgres + Auth + Realtime + Storage). Klient Supabase istnieje (`src/lib/supabase.ts`), wpięte `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Brak `supabase/` w repo, brak migracji, brak typów TS, brak schematu w bazie.
- Supabase CLI 2.58.5 zainstalowane lokalnie (`/opt/homebrew/bin/supabase`).
- F-01 (auth-scaffold) zaimplementowany — `auth.users` jest gotowe do FK z naszego `users`.
- User dostarczył kompletny projekt schematu SQL (ERD + DDL). Schemat zawiera: `categories`, `certificates`, `companies` (z `technical_parameters JSONB` i triggerem `updated_at`), `users` (1:1 z `auth.users`), `company_categories`, `company_certificates`, `company_media` (z enum `media_type_enum`), `favorites`, `conversations` (user↔user 1:1), `messages` (z `read_at`). Polityki RLS w pliku są zakomentowane jako stub i wymagają korekt.
- Środowiska: localhost + pusty prod (preview deploys świadomie wyłączone — `roadmap.md` Baseline). Pusty prod = bezpieczna pierwsza migracja.

### Key Discoveries:

- Polityka stub `company_isolation` (companies — tylko własna firma) sprzeczna z PRD/roadmapą — wizytówki **muszą** być widoczne dla wszystkich zalogowanych (US-02, US-03, S-03). Plan odwraca: `SELECT` dla wszystkich `authenticated`, `UPDATE/INSERT/DELETE` tylko dla `users.company_id = auth.uid()`.
- Brak `region` na `companies` i brak słownika polimerów — `US-02` (`/wyszukiwarka po typie polimeru, profilu, regionie`) tego wymaga. Decyzja: `region TEXT` dodajemy w F-02, polimery zostają w `technical_parameters` JSONB.
- `conversations` w schemacie nie ma UNIQUE na parze participantów → dwóch userów może stworzyć dwie równoległe konwersacje, co rozwali historię w S-04. Dodajemy `UNIQUE INDEX (LEAST, GREATEST)`.
- `messages` muszą być immutable (audit trail per PRD) — w RLS jawnie pomijamy `UPDATE` i `DELETE` dla `authenticated`, dajemy tylko `SELECT` i `INSERT` z `WITH CHECK sender_id = auth.uid()`.
- Limit 5 plików per `media_type` zostaje w warstwie aplikacji (SQL ma to jako komentarz) — service_role i tak by go obszedł, a podstawowa walidacja UI to wystarczająca obrona dla MVP.
- Pre-seed słowników (`categories`, `certificates`) idzie do `supabase/seed.sql` żeby lokalna baza była od razu użyteczna; na prod Operator puszcza ten sam SQL ręcznie raz.

## Desired End State

Po zakończeniu wszystkich faz:
- W repo istnieje `supabase/` z dwoma wersjonowanymi migracjami (`0001_init_schema.sql`, `0002_enable_rls.sql`), `seed.sql` ze słownikami i `tests/rls.sql`.
- Lokalna baza (`supabase start`) ma pełny schemat + RLS + przykładowe dane słownikowe. `supabase db push` aplikuje to samo na pusty prod bez błędów.
- `src/lib/database.types.ts` jest wygenerowany z bazy, a `src/lib/supabase.ts` używa `createClient<Database>` (type-safe queries dla S-01..S-05 z dnia 1).
- `supabase/tests/rls.sql` przebiega bez błędów (`psql -f tests/rls.sql` zwraca `OK`), pokazując, że user firmy A nie widzi `favorites`/`messages` firmy B i nie może modyfikować jej wizytówki.
- `CLAUDE.md` ma sekcję o obowiązku regeneracji `database.types.ts` po każdej migracji.

Weryfikacja end-state: `pnpm typecheck` przechodzi (typy znajdują wszystkie tabele), `supabase db reset` na czystej bazie odtwarza całość deterministycznie, `psql ... -f supabase/tests/rls.sql` przechodzi.

## What We're NOT Doing

- **UI** — żadnego ekranu edycji wizytówki, karty firmy ani czatu (S-02, S-03, S-04).
- **Realtime subscriptions** — `messages` mają tabelę, ale nie włączamy `supabase_realtime` publication ani nie testujemy live changes (to S-04).
- **Tabela `audit_log` i SECURITY DEFINER funkcje** — PRD wymaga audytu, ale na MVP wystarczy CASCADE; audyt wraca w v2.
- **Soft-delete** (`deleted_at`) — komplikuje RLS i niespójne z RODO „prawo do bycia zapomnianym”.
- **Słownik `polymer_types` jako osobna tabela** — świadomie w JSONB, czekamy na pilot.
- **Trigger `enforce_media_limit`** — limit 5 plików jest w UI; zostawiamy w SQL jako komentarz.
- **Tabela `conversation_participants` (M:N)** — TODO w schemacie zostaje; refactor na grupy wraca w v2.
- **Migracje na prod z usuwaniem danych** — prod jest pusty, ale nawet tak `supabase db push` z `--dry-run` przed właściwym pushem.

## Implementation Approach

Pięć sekwencyjnych faz, każda z odrębnym commitem i osobnym deliverable, który da się zweryfikować lokalnie przed przejściem dalej:

1. **Faza 1** — postawić tooling (Supabase CLI, struktura katalogów, npm scripts) — wszystko poza schematem.
2. **Faza 2** — schemat tabel + indeksy + triggery + UNIQUE poprawka conversations, bez RLS, z seedem słowników.
3. **Faza 3** — włączyć RLS i napisać polityki dla każdej tabeli zgodnie z ustaloną macierzą widoczności.
4. **Faza 4** — skrypt testowy izolacji RLS + manualna checklista (proof of foundation correctness).
5. **Faza 5** — wygenerować i wpiąć typy TS, zaktualizować `src/lib/supabase.ts` i CLAUDE.md.

Granice fazowe są tam, gdzie naturalnie kończy się jednostka pracy weryfikowalna lokalnie (`supabase db reset` + ręczny test). Po Fazie 4 (passed RLS tests) F-02 jest funkcjonalnie zamknięty; Faza 5 to czysto deweloperska ergonomia, ale plan ją obejmuje, bo bez typów każdy slice musiałby je sam generować.

## Critical Implementation Details

- **Kolejność polityk RLS**: `ENABLE ROW LEVEL SECURITY` jest binarne — gdy tylko włączysz na tabeli, **bez polityki nikt (oprócz service_role) nic nie zobaczy**. Dlatego polityki idą w jednej migracji razem z `ENABLE` — nigdy w dwóch krokach.
- **`auth.uid()` wewnątrz RLS na `users`**: polityka `users` musi pozwolić każdemu `authenticated` `SELECT WHERE id = auth.uid()` — inaczej każde JOIN z `users` w pozostałych politykach zwróci NULL i izolacja zacznie „chronić wszystko” (nikt nic nie widzi). To częsta pułapka — bez tego nawet seedowany user nie odczyta swojego `company_id`.
- **`SECURITY DEFINER` helper `current_user_company_id()`**: żeby polityki nie powtarzały `SELECT company_id FROM users WHERE id = auth.uid()` i nie wpadały w rekurencyjne RLS-y na `users`, dodajemy funkcję `STABLE SECURITY DEFINER` zwracającą `company_id` zalogowanego usera. Funkcje SECURITY DEFINER omijają RLS — to celowe, kontrolujemy GRANT na `authenticated`.
- **`UNIQUE INDEX` LEAST/GREATEST**: `CREATE UNIQUE INDEX uniq_conversation_pair ON conversations (LEAST(participant_1_id, participant_2_id), GREATEST(participant_1_id, participant_2_id));`. Z aplikacji insertem przez `ON CONFLICT DO NOTHING` + `SELECT` zwracane id — to wzorzec, którego S-04 użyje.

## Phase 1: Setup Supabase CLI i baseline migracji

### Overview

Postawić strukturę katalogów `supabase/`, zainicjalizować projekt CLI, dodać npm scripts dla typowego workflow (reset / push / types gen / test izolacji). Po tej fazie repo ma narzędzia, ale schemat jeszcze pusty.

### Changes Required:

#### 1. Inicjalizacja Supabase CLI

**Files**: `supabase/config.toml` (generowany), `.gitignore` (update)

**Intent**: Uruchomić `supabase init` w katalogu projektu — tworzy `supabase/config.toml`, `supabase/seed.sql` (pusty), strukturę pod migracje. Zlinkować z istniejącym projektem prod (`supabase link --project-ref <ref>`).

**Contract**: Po fazie `supabase/` istnieje z `config.toml` zawierającym `[db]` i `[auth]` sekcje. `.gitignore` dopisuje `supabase/.branches`, `supabase/.temp`. `supabase/migrations/` istnieje (pusty). `supabase/seed.sql` istnieje (pusty).

#### 2. npm scripts w `package.json`

**File**: `package.json`

**Intent**: Dodać shortcuty żeby developer (i przyszłe slice'y) miały jeden idiom workflow bazodanowego. Bez tych skryptów każdy slice wymyśla swoje.

**Contract**: `scripts` ma:
- `"db:start": "supabase start"`
- `"db:stop": "supabase stop"`
- `"db:reset": "supabase db reset"` — drop + replay migracji + seed
- `"db:push": "supabase db push"` — push migracji na linked prod
- `"db:diff": "supabase db diff"` — sanity check przed push
- `"db:types": "supabase gen types typescript --local > src/lib/database.types.ts"` — regeneracja typów z lokalnej bazy
- `"db:test:rls": "psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/rls.sql"` — uruchomienie testów izolacji

#### 3. README sekcja dla bazy danych

**File**: `README.md` (lub `supabase/README.md` jeśli main README jest pusty)

**Intent**: Krótka instrukcja workflow: jak postawić lokalną bazę, jak puścić migracje, jak regenerować typy, jak puścić testy RLS. Bez tego solo developer za miesiąc nie pamięta kolejności.

**Contract**: Sekcja `## Database (Supabase)` z czterema komendami w kolejności: `pnpm db:start` → `pnpm db:reset` → `pnpm db:types` → `pnpm db:test:rls`.

### Success Criteria:

#### Automated Verification:

- `supabase --version` zwraca 2.58.5+
- `pnpm db:start` startuje stack lokalnie bez błędów (logi pokazują 5 kontenerów: db, auth, realtime, storage, kong)
- `pnpm db:reset` przechodzi bez błędów (na pustym schemacie nic nie aplikuje, ale nie crashuje)
- `git diff` pokazuje tylko `supabase/`, `.gitignore`, `package.json`, `README.md` — nic w `src/`

#### Manual Verification:

- Studio dostępne pod `http://127.0.0.1:54323` po `pnpm db:start`
- Projekt jest zlinkowany z prod (`supabase projects list` pokazuje linked status)
- `pnpm db:stop` czysto zamyka stack

**Implementation Note**: Po Fazie 1 pauza — przed Fazą 2 user potwierdza, że stack lokalny startuje na jego maszynie i że link do prod jest poprawny.

---

## Phase 2: Schemat tabel (bez RLS) + seed słowników

### Overview

Wdrożyć pełny schemat z briefu użytkownika, z trzema poprawkami w stosunku do dostarczonego SQL: `+ region TEXT` na `companies`, `+ UNIQUE INDEX LEAST/GREATEST` na `conversations`, `+ COMMENT ON COLUMN` na `technical_parameters` opisujący konwencję `polymer_types`. Włączamy ROW LEVEL SECURITY dopiero w Fazie 3 — w tej fazie schemat działa „otwarcie” żeby developer mógł go inspekcjonować.

### Changes Required:

#### 1. Migracja: init schema

**File**: `supabase/migrations/0001_init_schema.sql`

**Intent**: Pojedynczy plik migracji zawierający cały DDL — wszystkie tabele, indeksy, triggery, enum `media_type_enum`, funkcja `trigger_set_updated_at`. Bierzemy SQL od użytkownika 1:1 z trzema dodatkami opisanymi niżej.

**Contract**:
- Tabele w kolejności tworzenia (FK dependencies): `categories`, `certificates`, `companies`, `users` (FK do `auth.users`), `company_categories`, `company_certificates`, `company_media`, `favorites`, `conversations`, `messages`.
- Enum `media_type_enum` przed `company_media`.
- Funkcja `trigger_set_updated_at()` + trigger `set_companies_updated_at` (z briefu).
- **Dodatek 1 — region**: kolumna `region TEXT` na `companies` (po `description`). `COMMENT ON COLUMN companies.region IS 'Region / województwo firmy — używane w wyszukiwarce US-02';`
- **Dodatek 2 — UNIQUE conversations**: `CREATE UNIQUE INDEX uniq_conversation_pair ON conversations (LEAST(participant_1_id, participant_2_id), GREATEST(participant_1_id, participant_2_id));` (po `CREATE INDEX idx_conversations_p2`).
- **Dodatek 3 — konwencja JSONB**: rozszerzyć `COMMENT ON COLUMN companies.technical_parameters` o: `Klucz polymer_types: ARRAY<TEXT> — wartości słownikowe (PE-LD, PE-HD, PP, PET). Klucz machines: ARRAY<OBJECT{name,year}>. Schemat doprecyzowuje S-02 wraz z UI.`
- Indeksy: wszystkie z briefu (`idx_users_company_id`, `idx_company_categories_category`, `idx_company_certificates_cert`, `idx_company_media_company`, `idx_favorites_user`, `idx_favorites_company`, `idx_conversations_p1`, `idx_conversations_p2`, `idx_messages_conversation`, `idx_messages_sender`, `idx_messages_unread`).
- Trigger `enforce_media_limit` zostaje w pliku jako komentarz (zgodnie z briefem).
- BRAK `ENABLE ROW LEVEL SECURITY` — to Faza 3.

#### 2. Seed słowników

**File**: `supabase/seed.sql`

**Intent**: Wypełnić `categories` i `certificates` wartościami branżowymi, żeby lokalna baza była gotowa do testów S-02 bez kolejnego setupu.

**Contract**:
- `INSERT INTO categories (name) VALUES ('Producent'), ('Recykler'), ('Dystrybutor'), ('Trader'), ('Serwis') ON CONFLICT DO NOTHING;`
- `INSERT INTO certificates (name, icon_url) VALUES ('ISO 9001', NULL), ('ISO 14001', NULL), ('CE', NULL), ('REACH', NULL) ON CONFLICT DO NOTHING;`
- Plik **nie** seeduje `companies` ani `users` — to robota Operatora ręcznie per pilot, nie default.

### Success Criteria:

#### Automated Verification:

- `pnpm db:reset` aplikuje migrację bez błędów
- `psql ... -c "\dt"` pokazuje 10 tabel (categories, certificates, companies, users, company_categories, company_certificates, company_media, favorites, conversations, messages)
- `psql ... -c "SELECT count(*) FROM categories"` zwraca 5
- `psql ... -c "SELECT count(*) FROM certificates"` zwraca 4
- `psql ... -c "\d companies"` pokazuje kolumnę `region` typu `text`
- `psql ... -c "\di uniq_conversation_pair"` pokazuje UNIQUE indeks

#### Manual Verification:

- Studio (`http://127.0.0.1:54323`) pokazuje wszystkie tabele w schemacie `public`
- Komentarze tabel/kolumn są widoczne w Studio (zwłaszcza `technical_parameters` opis konwencji JSONB)
- `EXPLAIN` na przykładowym SELECT po `messages WHERE conversation_id = ? AND read_at IS NULL` używa `idx_messages_unread`

**Implementation Note**: Po Fazie 2 schemat jest „otwarty” — każdy authenticated widzi wszystko. To celowe; Faza 3 zamyka. Nie pchamy tej fazy samej na prod.

---

## Phase 3: Włączenie RLS i polityki dostępu

### Overview

Włączyć ROW LEVEL SECURITY na wszystkich tabelach z danymi firmowymi i zaimplementować polityki według ustalonej macierzy widoczności. Słowniki (`categories`, `certificates`) zostają bez RLS — są publiczne dla wszystkich `authenticated`.

### Changes Required:

#### 1. Helper funkcja i macierz RLS

**File**: `supabase/migrations/0002_enable_rls.sql`

**Intent**: W jednej migracji włączamy RLS i tworzymy wszystkie polityki, żeby nie było okna, w którym RLS jest aktywne bez polityk (=blokuje wszystko). Polityki są pisane wyłącznie dla roli `authenticated` — `service_role` bypassuje RLS automatycznie w Supabase.

**Contract**: Migracja zawiera w kolejności:

1. **Helper**: `CREATE FUNCTION current_user_company_id() RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT company_id FROM users WHERE id = auth.uid() $$;` — używana w politykach companies/company_media/users.
2. **categories, certificates** — `GRANT SELECT ON categories TO authenticated; GRANT SELECT ON certificates TO authenticated;` (bez RLS, bo to publiczne słowniki).
3. **companies** — `ENABLE RLS`; `policy companies_select_all`: `FOR SELECT TO authenticated USING (true)`; `policy companies_update_own`: `FOR UPDATE TO authenticated USING (id = current_user_company_id()) WITH CHECK (id = current_user_company_id())`; `policy companies_insert_blocked`: brak (insert tylko przez service_role); `policy companies_delete_blocked`: brak.
4. **users** — `ENABLE RLS`; `policy users_select_all`: `FOR SELECT TO authenticated USING (true)` (potrzebne żeby UI S-04 wyświetlał full_name/job_title nadawcy w czacie); `policy users_update_self`: `FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())`; insert/delete tylko service_role.
5. **company_categories, company_certificates** — `ENABLE RLS`; `policy ... _select_all`: `USING (true)`; `policy ... _modify_own`: `FOR ALL TO authenticated USING (company_id = current_user_company_id()) WITH CHECK (company_id = current_user_company_id())`.
6. **company_media** — `ENABLE RLS`; `policy media_select_all`: `FOR SELECT TO authenticated USING (true)`; `policy media_modify_own`: `FOR ALL TO authenticated USING (company_id = current_user_company_id()) WITH CHECK (company_id = current_user_company_id())`.
7. **favorites** — `ENABLE RLS`; `policy favorites_own`: `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
8. **conversations** — `ENABLE RLS`; `policy conv_participants_select`: `FOR SELECT TO authenticated USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid())`; `policy conv_insert_self`: `FOR INSERT TO authenticated WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid())`; brak UPDATE/DELETE (konwersacja immutable na MVP).
9. **messages** — `ENABLE RLS`; `policy msg_select_in_conv`: `FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())))`; `policy msg_insert_self`: `FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())))`; brak UPDATE/DELETE; **UPDATE read_at musi iść przez SECURITY DEFINER funkcję `mark_message_read(message_id UUID)`** — bo polityka UPDATE wymagała by edycji własnego pola obcego usera. Dodajemy tę funkcję z `WHERE id = message_id AND EXISTS (uczestnik konwersacji = auth.uid())`.

#### 2. Notatka w README

**File**: `README.md` (sekcja Database)

**Intent**: Krótka uwaga, że `service_role` bypassuje RLS i nie wolno go pchać do klienta.

**Contract**: Sekcja `### Service role i RLS` z dwoma zdaniami: (a) klient używa wyłącznie `VITE_SUPABASE_ANON_KEY`, (b) `SUPABASE_SERVICE_ROLE_KEY` żyje tylko w `.env.local` (lokalny seeding) i w secretach Cloudflare (gdy w przyszłości pojawi się background job).

### Success Criteria:

#### Automated Verification:

- `pnpm db:reset` aplikuje obie migracje bez błędów
- `psql ... -c "\d+ companies"` pokazuje `Policies` z `companies_select_all` i `companies_update_own`
- `psql ... -c "SELECT polname FROM pg_policy"` zwraca 12+ wpisów (pełen zestaw polityk)
- `psql ... -c "SELECT proname FROM pg_proc WHERE proname IN ('current_user_company_id', 'mark_message_read')"` zwraca dwa wpisy

#### Manual Verification:

- W Studio (Authentication → Policies) wszystkie tabele z danymi firmowymi mają RLS enabled i widoczne polityki
- `categories` i `certificates` widoczne bez RLS, ale `GRANT SELECT` na `authenticated` jest

**Implementation Note**: Po Fazie 3 nie pchamy jeszcze na prod — pchamy po Fazie 4 (gdy testy izolacji potwierdzą, że polityki działają).

---

## Phase 4: Weryfikacja izolacji RLS

### Overview

Napisać skrypt SQL, który symuluje dwie firmy z dwoma userami i asercja-mi pokazuje, że RLS faktycznie izoluje. Skrypt to pierwsza linia obrony przed regresją — każdy następny slice (S-02..S-05) może go uruchomić jako sanity check.

### Changes Required:

#### 1. Test izolacji

**File**: `supabase/tests/rls.sql`

**Intent**: Skrypt psql, który: (a) jako `service_role` setupuje dwie firmy A i B z jednym userem każda i sztucznymi danymi (favorites, conversation, message); (b) zmienia role na `authenticated` z claimsami usera A; (c) asercjami `RAISE EXCEPTION` sprawdza, że user A nie widzi danych B i nie może modyfikować wizytówki B; (d) symetrycznie dla usera B; (e) cleanup. Skrypt kończy się `RAISE NOTICE 'RLS isolation OK'` lub `RAISE EXCEPTION` przy pierwszym failu.

**Contract**: Skrypt sprawdza 8 asercji minimum:
1. `SELECT * FROM companies` jako user A — widzi obie firmy (test publicznego SELECT).
2. `UPDATE companies SET name = 'hack' WHERE id = <B>` jako user A — 0 rows affected (test UPDATE own).
3. `SELECT * FROM favorites` jako user A — widzi tylko swoje (favorites B niewidoczne).
4. `INSERT INTO favorites (user_id, company_id) VALUES (<B>, <A>)` jako user A — exception (próba podszycia).
5. `SELECT * FROM messages` jako user A — widzi tylko z conv, w której jest uczestnikiem.
6. `INSERT INTO messages (conversation_id, sender_id, content) VALUES (<B's conv>, auth.uid_a, 'x')` — exception (nie uczestnik).
7. `INSERT INTO messages (conversation_id, sender_id, content) VALUES (<A's conv>, auth.uid_b, 'x')` jako user A — exception (sender_id != auth.uid()).
8. `INSERT INTO company_media (company_id, ...) VALUES (<B>, ...)` jako user A — exception.

Skrypt używa `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub":"<uuid_a>", "role":"authenticated"}';` żeby symulować zalogowanego usera.

#### 2. Manualna checklista w plan-brief

**File**: `context/changes/multi-tenant-data-rls/plan-brief.md`

**Intent**: Brief już jest tworzony w Step 4.5 — checklist manualnych testów ląduje w sekcji „Success Criteria (Summary)” żeby implementator (i Operator przed pilotem) miał ją pod ręką.

**Contract**: Lista 5 manualnych kroków: (1) zaloguj się jako user firmy A w Studio Auth, (2) w SQL Editor wykonaj `SELECT * FROM favorites` — widzisz tylko swoje, (3) spróbuj `UPDATE companies SET description = 'hack' WHERE id = <B>` — 0 rows, (4) wpisz `INSERT INTO messages (...) VALUES (<B's conv>, ...)` — błąd RLS, (5) wyloguj się, jako service_role zobacz wszystko (kontrola, że bypass działa).

### Success Criteria:

#### Automated Verification:

- `pnpm db:reset && pnpm db:test:rls` przechodzi z `NOTICE: RLS isolation OK`
- Każdy z 8 testów ma osobny `RAISE NOTICE` z opisem, co testuje (czytelny log)

#### Manual Verification:

- Manualna checklista w plan-brief przechodzi (5/5) wykonana w Supabase Studio na lokalnej bazie
- Test ad-hoc: `service_role` token wykonujący te same query'sy zwraca wszystkie dane (potwierdzenie, że bypass działa zgodnie z założeniem)

**Implementation Note**: To jest gate przed `supabase db push` na prod. Jeśli którykolwiek test fail-uje, Faza 3 wraca do edycji.

---

## Phase 5: Typy TS i wpięcie do klienta

### Overview

Wygenerować typy TS z bazy, wpiąć w klienta Supabase i udokumentować obowiązek regeneracji. Bez tego każdy następny slice musi to robić sam.

### Changes Required:

#### 1. Wygenerować typy

**File**: `src/lib/database.types.ts` (nowy)

**Intent**: Plik wygenerowany przez `pnpm db:types` (`supabase gen types typescript --local`). Nie edytowany ręcznie.

**Contract**: Plik eksportuje `export type Database = { public: { Tables: { ... } } }` z definicjami dla wszystkich 10 tabel + 1 enum (`media_type_enum`). Plik jest commitowany do repo (nie generated/ignored).

#### 2. Wpiąć typy do klienta

**File**: `src/lib/supabase.ts`

**Intent**: Zaktualizować import i wywołanie `createClient` żeby było `createClient<Database>(url, anonKey)`. To zapewnia type-safe queries w S-01..S-05.

**Contract**: Plik po zmianie:
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(url, anonKey)
```

#### 3. Notatka w CLAUDE.md

**File**: `CLAUDE.md`

**Intent**: Dodać krótką regułę dla AI-asystentów (i przyszłego siebie): „po każdej migracji w `supabase/migrations/` regeneruj typy: `pnpm db:types` i commituj `src/lib/database.types.ts` razem z migracją.”

**Contract**: Nowa sekcja `## Database workflow` z dwoma zdaniami: (a) migracje przez Supabase CLI w `supabase/migrations/`, (b) po migracji obowiązkowo `pnpm db:types` + commit `database.types.ts`. Sekcja ląduje pod istniejącym task-routerem.

#### 4. Push na prod

**Intent**: Pierwsza migracja idzie na pusty prod. Najpierw `supabase db diff --linked` jako sanity check, potem `supabase db push`.

**Contract**: Po `db push` Supabase Dashboard pokazuje wszystkie tabele i polityki RLS. Slownik `categories`/`certificates` na prod **nie jest** wpięty automatycznie — Operator puszcza `seed.sql` ręcznie przez SQL Editor.

### Success Criteria:

#### Automated Verification:

- `pnpm db:types` generuje plik bez błędów (`>0 bytes`, zawiera `export type Database`)
- `pnpm typecheck` przechodzi (`tsc --noEmit`)
- `pnpm build` przechodzi (Vite buduje produkcyjny bundle)
- `pnpm lint` przechodzi
- `supabase db diff --linked` zwraca pustą listę zmian po `db push` (idempotency check)

#### Manual Verification:

- `await supabase.from('companies').select('*')` w devtools daje autocomplete na pola z `Database` (smoke test typów)
- Supabase Dashboard prod pokazuje wszystkie 10 tabel i polityki RLS
- Operator puszcza `seed.sql` na prod i widzi 5 categories + 4 certificates
- `CLAUDE.md` ma nową sekcję `## Database workflow`

**Implementation Note**: Po tej fazie F-02 jest gotowy do oznaczenia jako `implemented` w `change.md`, a F-04/S-01/S-02 mogą startować.

---

## Testing Strategy

### Unit Tests:

- Brak — F-02 nie zawiera kodu TS poza updatem `src/lib/supabase.ts` (jednolinijkowa zmiana typu).

### Integration Tests:

- `supabase/tests/rls.sql` (Faza 4) — pełnoprawny test izolacji na żywej Postgres-ie. Pełni rolę testów integracyjnych dla foundation.

### Manual Testing Steps:

1. `pnpm db:start` + `pnpm db:reset` + `pnpm db:types` — czysty lokalny stack.
2. W Studio (`http://127.0.0.1:54323`) → SQL Editor: utworzyć dwóch userów (Auth → Users → Add User) i przypisać im `companies` + `users` profile przez SQL.
3. Zalogować się jako user A (Auth → Magic link / impersonate) i wykonać manualną checklistę z plan-brief.
4. Powtórzyć jako user B.
5. Wykonać `pnpm db:test:rls` — assert „OK”.
6. `supabase db push` na linked prod, sprawdzić w Dashboard, że schemat się aplikował, RLS jest enabled.

## Performance Considerations

- F-02 jest schemowy, nie operacyjny — performance jest funkcją indeksów. Wszystkie indeksy z briefu są zachowane + UNIQUE LEAST/GREATEST + częściowy `idx_messages_unread` (filtr w WHERE) zostają.
- `messages` polityka RLS używa `EXISTS` z subquery na `conversations` — przy długiej historii czatu może być powolne. Mitigation: indeks `idx_messages_conversation` jest na `(conversation_id, created_at DESC)`, planner wykorzystuje go w subquery. Mierzymy realnie w S-04 (gdy będzie ruch).
- Funkcja `current_user_company_id()` jest `STABLE` — planner cache'uje wynik w obrębie statementa, więc nie ma N+1 lookup'u w bulk SELECT.

## Migration Notes

- Prod jest pusty (per `roadmap.md` Baseline). Pierwsza migracja idzie na czyste środowisko — zero ryzyka utraty danych.
- Future migrations dorzucają się jako `0003_*.sql`, `0004_*.sql` w `supabase/migrations/`. Sequential numbering jest konwencją Supabase CLI.
- Rollback: `supabase db reset` lokalnie zawsze działa; na prod — przy pustym prod robimy `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (manualnie w SQL Editor) i pchamy ponownie. Po pierwszym pilocie ta strategia przestaje działać — wtedy potrzebujemy `down` migrations, ale to nie jest scope F-02.

## References

- Roadmap: `context/foundation/roadmap.md` (F-02)
- PRD: `context/foundation/prd.md` (NFR izolacji, Access Control)
- Tech stack: `context/foundation/tech-stack.md`
- Brief schematu: dostarczony przez usera w trakcie planowania (skopiowany do tej rozmowy)
- F-01 zaimplementowany: `context/changes/auth-scaffold/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Setup Supabase CLI i baseline migracji

#### Automated

- [x] 1.1 supabase --version zwraca 2.58.5+ — d9e60e2
- [x] 1.2 pnpm db:start startuje stack lokalnie bez błędów — d9e60e2
- [x] 1.3 pnpm db:reset przechodzi bez błędów — d9e60e2
- [x] 1.4 git diff pokazuje tylko supabase/, .gitignore, package.json, README.md — d9e60e2

#### Manual

- [x] 1.5 Studio dostępne pod http://127.0.0.1:54323 — d9e60e2
- [x] 1.6 Projekt jest zlinkowany z prod — d9e60e2
- [x] 1.7 pnpm db:stop czysto zamyka stack — d9e60e2

### Phase 2: Schemat tabel (bez RLS) + seed słowników

#### Automated

- [x] 2.1 pnpm db:reset aplikuje migrację bez błędów — 638d948
- [x] 2.2 psql \dt pokazuje 10 tabel — 638d948
- [x] 2.3 SELECT count(*) FROM categories zwraca 5 — 638d948
- [x] 2.4 SELECT count(*) FROM certificates zwraca 4 — 638d948
- [x] 2.5 \d companies pokazuje kolumnę region typu text — 638d948
- [x] 2.6 \di uniq_conversation_pair pokazuje UNIQUE indeks — 638d948

#### Manual

- [x] 2.7 Studio pokazuje wszystkie tabele w schemacie public — 638d948
- [x] 2.8 Komentarze tabel/kolumn są widoczne w Studio — 638d948
- [x] 2.9 EXPLAIN na SELECT z messages WHERE read_at IS NULL używa idx_messages_unread — 638d948

### Phase 3: Włączenie RLS i polityki dostępu

#### Automated

- [x] 3.1 pnpm db:reset aplikuje obie migracje bez błędów — 555e781
- [x] 3.2 \d+ companies pokazuje Policies companies_select_all i companies_update_own — 555e781
- [x] 3.3 SELECT polname FROM pg_policy zwraca 12+ wpisów — 555e781
- [x] 3.4 pg_proc zawiera current_user_company_id i mark_message_read — 555e781

#### Manual

- [x] 3.5 Studio Policies pokazuje RLS enabled dla tabel z danymi firmowymi — 555e781
- [x] 3.6 categories i certificates bez RLS ale z GRANT SELECT na authenticated — 555e781

### Phase 4: Weryfikacja izolacji RLS

#### Automated

- [x] 4.1 pnpm db:reset && pnpm db:test:rls przechodzi z NOTICE: RLS isolation OK — 53fca58
- [x] 4.2 Każdy z 8 testów ma osobny RAISE NOTICE z opisem — 53fca58

#### Manual

- [x] 4.3 Manualna checklista (5/5) w Supabase Studio przechodzi — 53fca58
- [x] 4.4 service_role bypass potwierdzony ad-hoc — 53fca58

### Phase 5: Typy TS i wpięcie do klienta

#### Automated

- [x] 5.1 pnpm db:types generuje plik bez błędów — 11d4e9b
- [x] 5.2 pnpm typecheck przechodzi — 11d4e9b
- [x] 5.3 pnpm build przechodzi — 11d4e9b
- [x] 5.4 pnpm lint przechodzi — 11d4e9b
- [x] 5.5 supabase db diff --linked zwraca pustą listę po db push — 11d4e9b

#### Manual

- [x] 5.6 Autocomplete na supabase.from('companies').select() działa — 11d4e9b
- [x] 5.7 Supabase Dashboard prod pokazuje wszystkie 10 tabel i polityki RLS — 11d4e9b
- [x] 5.8 seed.sql ręcznie puszczony na prod (5 categories + 4 certificates) — 11d4e9b
- [x] 5.9 CLAUDE.md ma sekcję Database workflow — 11d4e9b
