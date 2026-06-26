# Strona profilu firmy + edycja własnej wizytówki (S-03 + S-02) — Implementation Plan

## Overview

Zalogowany użytkownik ogląda profil dowolnej firmy (`/companies/:id`) jako jedną
scrollowaną stronę ze sticky nawigacją kotwiczną i "jednym spojrzeniem" ocenia,
czy to dobry partner, a następnie dodaje firmę do ulubionych lub klika "Napisz".
Owner edytuje własną wizytówkę na osobnej trasie `/profile`. Parametry techniczne
są **data-driven** (słownik definicji), więc firmy z różnych branż (od wtryskarek
po farby, oleje, polimery, motoryzację) mają sensowny, przeszukiwalny schemat bez
sztywnego modelu. Seed tworzy 2 firmy (Twoja + Grzegorza) dowiązane do realnych
kont `auth.users`, żeby od razu było co oglądać i edytować.

Realtime czat (S-04) jest poza zakresem — CTA "Napisz" otwiera drawer-placeholder.

## Current State Analysis

- **Prototyp UI istnieje, ale jest atrapą.** `src/components/CompanyProfile.tsx`
  (436 linii) to dopracowany polski UI z całą strukturą sekcji (hero, tagi, certy,
  Top-5, parametry jako "karta katalogowa", galeria, dokumenty, dane rejestrowe,
  karty pracowników z "Napisz"). Ale: (1) dane są **zahardkodowane** (`const company = {...}`),
  (2) używa `@radix-ui/react-tabs` — **sprzeczne z briefem** ("bez zakładek"),
  (3) **nie jest podpięty** do żadnej trasy.
- **Trasy to placeholdery.** `src/routes/CompanyDetail.tsx` (`/companies/:id`) i
  `src/routes/Profile.tsx` (`/profile`) renderują `<ComingSoon />`.
- **Warstwa danych gotowa.** Schemat (`companies`, `company_categories`,
  `company_certificates`, `company_media`, `users`, `favorites`, słowniki
  `categories`/`certificates`) + RLS w `0001`/`0002`. `companies`/`users`/media/pivoty
  to **SELECT all-authenticated**; `favorites` **prywatne per user** (`user_id = auth.uid()`);
  `companies` UPDATE tylko własna firma (`id = current_user_company_id()`).
- **Luki vs brief:** brak kolumn rejestrowych (`nip/regon/krs/headquarters_address/
  plant_address/website/display_name/founding_year` — `founding_year` JEST), brak
  tabeli `highlights`, brak słownika parametrów (`parameter_definitions` +
  `company_parameter_values`) — obecnie tylko JSONB `technical_parameters`, brak pól
  pracownika (`phone`, `is_visible_on_profile`), brak seeda firm.
- **Konwencje:** Vite + React 19 + react-router 7, `createClient<Database>`
  (`src/lib/supabase.ts`), zustand auth-store (`useAuthStore`, `useAuth`), `sonner`
  toasts, `react-hook-form` + `zod` (dodane w S-01), helper `current_user_company_id()`.
  Workflow DB: migracja → `pnpm db:types` w tym samym commicie → asercja w
  `supabase/tests/rls.sql`.

### Key Discoveries:

- `src/components/CompanyProfile.tsx:22-150` — kształt mock-danych = de facto
  kontrakt UI; przepisujemy źródło, zachowujemy strukturę sekcji.
- `src/components/CompanyProfile.tsx:273-432` — `Tabs.Root/List/Content` do usunięcia
  na rzecz pojedynczego scrolla + sticky kotwic (kotwice już są: linie 264-270).
- `supabase/migrations/0002_enable_rls.sql:58-69` — `companies_select_all` +
  `companies_update_own` pokrywają read profilu i edycję własnej firmy bez nowych polityk
  na `companies`.
- `supabase/migrations/0002_enable_rls.sql:166-171` — `favorites_own` pokrywa toggle ulubionych.
- `src/lib/auth-store.ts:42-65` — wzorzec fetcha z `seq` token (ochrona przed wyścigiem)
  do naśladowania przy ładowaniu profilu.
- `src/components/AppShell.tsx` — nav ma już `/profile`; edycja tam pasuje bez zmian w shellu.
- `supabase/seed.sql` — seeduje tylko słowniki; firmy/userzy to "per-pilot Operator work".

## Desired End State

- `/companies/:id` renderuje realny profil firmy z Supabase: hero (logo, nazwa, rok,
  kategorie-tagi, certy-ikony, CTA Napisz + Ulubione), sekcje w stałej kolejności
  (Top-5, O firmie, Parametry, Galeria, Pliki, Pracownicy; Dane rejestrowe ukryte w demo),
  sticky kotwice, ukrywanie pustych sekcji, skeleton podczas ładowania, widok
  "nie znaleziono" dla złego/nieistniejącego `:id`.
- Gwiazdka "Ulubione" zapisuje/usuwa wiersz w `favorites` z optimistic UI.
- "Napisz" otwiera drawer-placeholder (bez realtime).
- `/profile` pozwala ownerowi edytować własną wizytówkę: dane tekstowe, nazwa
  wyświetlana, rok, kategorie (M:N), certyfikaty (M:N), parametry (wg słownika),
  Top-5, dane rejestrowe; **upload mediów** (logo/galeria/PDF) i **edycja pracowników**
  w późniejszych fazach.
- Parametry renderowane generycznie ze słownika — to samo UI dla wtryskarek i dla farb.
- Seed: 2 firmy dowiązane do kont Ty + Grzegorz po e-mailu; jedna bogata, jedna chuda
  (test empty-state).
- Weryfikacja: `pnpm build` (tsc) zielony, `pnpm db:test:rls` zielony, profile oglądalne
  i edytowalne lokalnie po `pnpm db:reset`.

## What We're NOT Doing

- **Realtime czat / historia / wysyłanie wiadomości** (S-04) — "Napisz" to drawer-placeholder.
- **Integracja GUS/KRS** — dane rejestrowe ręczne; kolumny istnieją (API-ready).
- **Self-registration / zapraszanie pracowników przez UI** — pracownicy seedowani;
  faza 7 edytuje tylko istniejących.
- **Wyszukiwarka (S-05)** — słownik parametrów ją przygotowuje, ale filtrów nie budujemy.
- **Zmiana istniejących polityk RLS na `companies`/`favorites`/`users`** — wystarczają.

## Implementation Approach

Siedem faz, od warstwy danych w górę. Fazy 1-2 (migracja + seed) dają testowalny
grunt. Faza 3 przepisuje istniejący komponent z mocka na real data i z tabs na
single-page. Fazy 4-5 dokładają ulubione i edycję. Fazy 6-7 (Storage, pracownicy)
to cięższe, świadomie odłożone kawałki — rdzeń jest dowieziony bez nich. Każda nowa
tabela dostaje RLS + asercję w `supabase/tests/rls.sql`; po każdej migracji
`pnpm db:types` w tym samym commicie.

## Critical Implementation Details

- **Typy po migracji — twardy gate.** `src/lib/supabase.ts` używa `createClient<Database>`,
  więc dopóki nie odświeżysz `database.types.ts` (`pnpm db:types`), każdy dostęp do
  nowych kolumn/tabel wywali się w `tsc`. Regeneracja typów MUSI być w tym samym
  commicie co migracja (CLAUDE.md).
- **Seed dowiązuje konta po e-mailu, nie po UUID.** Konta `auth.users` muszą istnieć
  PRZED seedem (zaloguj się raz jako Ty i jako Grzegorz). Seed robi
  `SELECT id FROM auth.users WHERE email = ...` i wstawia `public.users` + `companies`.
  Jeśli któreś konto nie istnieje, seed musi jasno zasygnalizować (RAISE NOTICE),
  a nie wstawić NULL.
- **Render parametrów jest industry-agnostic.** UI nie zna branż — bierze
  `parameter_definitions` dla kategorii firmy + `company_parameter_values` i renderuje
  `label: value [unit]`. Nigdzie nie wolno hardkodować kluczy parametrów per branża.
- **Optimistic ulubione muszą się cofać przy błędzie RLS/sieci.** Toggle aktualizuje
  stan natychmiast, ale przy błędzie zapisu wraca do poprzedniego stanu + `sonner` toast.

---

## Phase 1: Migracja schematu (rejestrowe + highlights + słownik parametrów + pola pracownika)

### Overview

Dołożenie wszystkich kolumn/tabel z briefu w jednej migracji `0004`, API-ready, z RLS
dla nowych tabel i regeneracją typów.

### Changes Required:

#### 1. Kolumny rejestrowe + display na `companies`

**File**: `supabase/migrations/0004_company_profile_fields.sql`

**Intent**: Dołożyć pola rejestrowe i prezentacyjne wymagane przez brief, zachowując
schemat API-ready pod przyszłą integrację GUS/KRS.

**Contract**: `ALTER TABLE companies ADD COLUMN` dla: `display_name TEXT`, `nip TEXT UNIQUE`
(klucz unikalności wg briefu, nullable w pilocie), `regon TEXT`, `krs TEXT`,
`headquarters_address TEXT`, `plant_address TEXT`, `website TEXT`. `founding_year` już
istnieje. Brak nowych polityk — `companies_select_all` / `companies_update_own` pokrywają.

#### 2. Tabela `highlights` (Top-5)

**File**: `supabase/migrations/0004_company_profile_fields.sql`

**Intent**: Curated Top-5 "Czym się zajmujemy", edytowalne per pozycja, z kolejnością.

**Contract**: `highlights(id UUID PK, company_id UUID FK→companies ON DELETE CASCADE,
title TEXT NOT NULL, description TEXT, sort_order INT NOT NULL DEFAULT 0, created_at)`.
Index na `company_id`. RLS: SELECT all-authenticated; ALL (mutacje) `company_id =
current_user_company_id()`. Limit 5 egzekwowany w UI (jak `company_media`).

#### 3. Słownik `parameter_definitions` + wartości `company_parameter_values`

**File**: `supabase/migrations/0004_company_profile_fields.sql`

**Intent**: Data-driven parametry — definicje per kategoria w słowniku, wartości firmy
osobno; nowa branża = seed definicji, zero zmian kodu. (memory: param-definitions-data-not-code)

**Contract**:
- `parameter_definitions(id SERIAL PK, category_id INT FK→categories ON DELETE CASCADE,
  key TEXT NOT NULL, label TEXT NOT NULL, unit TEXT, value_type TEXT NOT NULL,
  sort_order INT DEFAULT 0, UNIQUE(category_id, key))`. `value_type` ograniczony
  CHECK do `('text','number','enum','array')`.
- `company_parameter_values(company_id UUID FK→companies ON DELETE CASCADE,
  definition_id INT FK→parameter_definitions ON DELETE CASCADE, value TEXT NOT NULL,
  PRIMARY KEY(company_id, definition_id))`. Index na `definition_id` (pod przyszłe filtry S-05).
- RLS: `parameter_definitions` → SELECT all-authenticated, mutacje service_role (słownik).
  `company_parameter_values` → SELECT all-authenticated; ALL `company_id = current_user_company_id()`.
- Istniejąca kolumna `companies.technical_parameters` (JSONB) zostaje nieużywana przez
  ten widok; nie usuwamy jej w tej migracji (brak ryzyka, decyzja czyszczenia osobno).

#### 4. Pola pracownika na `users`

**File**: `supabase/migrations/0004_company_profile_fields.sql`

**Intent**: Telefon (opcjonalny) i flaga widoczności pracownika na profilu firmy.

**Contract**: `ALTER TABLE users ADD COLUMN phone TEXT`, `ADD COLUMN
is_visible_on_profile BOOLEAN NOT NULL DEFAULT true`. Istniejące `users_select_all` /
`users_update_self` pokrywają odczyt na profilu i edycję własnego wpisu.

#### 5. Regeneracja typów

**File**: `src/lib/database.types.ts`

**Intent**: Zsynchronizować typy z nowym schematem; bez tego `tsc` się wywali.

**Contract**: Wynik `pnpm db:types` (po `pnpm db:reset` z nową migracją). Commit razem z migracją.

### Success Criteria:

#### Automated Verification:

- Migracja aplikuje się czysto: `pnpm db:reset`
- Typy zregenerowane i bez błędów: `pnpm db:types` + `pnpm build`
- RLS testy przechodzą: `pnpm db:test:rls`
- Lint czysty: `pnpm lint`

#### Manual Verification:

- W Supabase Studio widać nowe kolumny/tabele i polityki RLS
- `companies.nip` ma constraint UNIQUE

**Implementation Note**: Po tej fazie pauza na potwierdzenie manualne przed Fazą 2.

---

## Phase 2: Seed — definicje parametrów + 2 firmy dowiązane do realnych kont

### Overview

Wypełnić słownik definicji dla kilku branż i utworzyć 2 firmy (Twoja + Grzegorza)
dowiązane po e-mailu do istniejących kont `auth.users`, z danymi pozwalającymi
przetestować pełny profil i empty-state.

### Changes Required:

#### 1. Definicje parametrów dla kilku branż

**File**: `supabase/seed.sql`

**Intent**: Pokazać, że schemat obsługuje różne branże przez dane — definicje dla
np. wtryskarni/produkcji, recyklingu, farb/olejów, motoryzacji.

**Contract**: `INSERT INTO parameter_definitions (category_id, key, label, unit, value_type, sort_order)`
po `category_id` ze słownika `categories` (Producent/Recykler/Dystrybutor/Trader/Serwis).
`ON CONFLICT (category_id, key) DO NOTHING`. Wartości ilustracyjne pokrywające różne
`value_type` (number z `unit`, text, array).

#### 2. Dwie firmy + dowiązanie kont po e-mailu

**File**: `supabase/seed.sql`

**Intent**: Utworzyć Twoją firmę (bogata) i firmę Grzegorza (chuda — test empty-state),
dowiązać realne konta jako ownerów.

**Contract**: Blok PL/pgSQL `DO $$` który: (1) `SELECT id INTO` z `auth.users` po
e-mailu (Twój: `maciek29.opozda@gmail.com`; Grzegorza: **DO POTWIERDZENIA — placeholder
`grzegorz@example.com`**), (2) jeśli NULL → `RAISE NOTICE` i pomiń (seed idempotentny,
nie wstawia sierot), (3) `INSERT INTO companies ... RETURNING id`, (4) `INSERT INTO users
(id, company_id, full_name, job_title, phone, is_visible_on_profile)` dla owner-konta,
(5) wpisy `company_categories`, `company_certificates`, `company_parameter_values`,
`highlights` dla firmy bogatej; minimalne dla chudej. Wszystko `ON CONFLICT DO NOTHING`
/ idempotentne, bo seed leci przy każdym `db:reset`.

**Contract (uwaga)**: `users.id` = ten sam UUID co `auth.users.id` (FK 1:1) — wstawiamy
pobrane `id`, nie generujemy nowego.

### Success Criteria:

#### Automated Verification:

- Seed wykonuje się bez błędu w ramach `pnpm db:reset`
- `pnpm db:test:rls` nadal zielony

#### Manual Verification:

- Po `pnpm db:reset` (przy zalogowanych wcześniej kontach) w bazie są 2 firmy z ownerami
- Logując się jako Ty widzisz powiązanie z własną firmą; analogicznie Grzegorz
- Firma chuda ma puste sekcje (do testu ukrywania w Fazie 3)

**Implementation Note**: Wymaga potwierdzenia e-maila konta Grzegorza. Pauza na
potwierdzenie manualne przed Fazą 3.

---

## Phase 3: Strona profilu (read) — real data + single-page + sticky kotwice

### Overview

Przepisać `CompanyProfile.tsx` ze źródła mock na fetch z Supabase po `:id`, usunąć
zakładki na rzecz pojedynczego scrolla ze sticky kotwicami, renderować parametry
generycznie ze słownika, ukrywać puste sekcje, dodać skeleton i widok "nie znaleziono",
podpiąć pod `/companies/:id`.

### Changes Required:

#### 1. Hook ładowania profilu firmy

**File**: `src/lib/use-company-profile.ts` (nowy)

**Intent**: Pobrać firmę + kategorie + certyfikaty + parametry (z definicjami) + media
+ widocznych pracowników + highlights jednym spójnym ładowaniem, ze stanami
loading/notFound/error.

**Contract**: `useCompanyProfile(companyId: string)` zwraca
`{ status: 'loading'|'ready'|'notFound'|'error', data }`. Pojedyncze zapytanie z
zagnieżdżonym selectem PostgREST (`companies` z `company_categories(categories(*))`,
`company_certificates(certificates(*))`, `company_parameter_values(value,
parameter_definitions(*))`, `company_media(*)`, `highlights(*)`, `users(*)` filtr
`is_visible_on_profile`). Brak wiersza → `notFound`. Wzorzec `seq`-token ochrony przed
wyścigiem jak w `auth-store.ts:42-65`.

#### 2. Przepisanie komponentu profilu na real data + single-page

**File**: `src/components/CompanyProfile.tsx`

**Intent**: Usunąć mock i tabs; renderować realne dane jako jedną scrollowaną stronę
ze sticky kotwicami; ukrywać puste sekcje (poza nagłówek/O firmie/Pracownicy);
generyczny render parametrów; CTA "Napisz" = otwarcie drawera-placeholdera.

**Contract**: Komponent przyjmuje `data` z hooka (prop, nie mock). Usunięcie
`Tabs.Root/List/Trigger/Content` (linie 273-432) — sekcje renderowane sekwencyjnie
pod hero. Sticky kotwice (`cp-anchors`) zostają i odpowiadają realnym, niepustym
sekcjom. Dane rejestrowe ukryte w demo (flaga `SHOW_REGISTRY = false`). Parametry:
grupy po kategorii/definicjach, render `label: value [unit]`. Pusta sekcja = nie
renderowana. Galeria/pliki z `company_media` (PHOTO/DOCUMENT).

#### 3. Drawer-placeholder "Napisz"

**File**: `src/components/MessageDrawerPlaceholder.tsx` (nowy)

**Intent**: CTA "Napisz" (hero i karta pracownika) otwiera panel boczny informujący,
że komunikator pojawi się wkrótce — bez utraty pozycji na profilu.

**Contract**: `@radix-ui/react-dialog` w wariancie drawer (już w deps). Przyjmuje
docelowego pracownika (imię, stanowisko). Brak logiki wysyłania. Stan otwarcia trzymany
w `CompanyProfile`.

#### 4. Podpięcie pod trasę

**File**: `src/routes/CompanyDetail.tsx`

**Intent**: Zastąpić `<ComingSoon />` realnym profilem; obsłużyć loading/notFound.

**Contract**: `useParams<{id}>()` → `useCompanyProfile(id)` → skeleton / `<CompanyProfile data/>`
/ widok "Nie znaleziono firmy". Brak zmian w `router.tsx` (trasa już istnieje).

### Success Criteria:

#### Automated Verification:

- `pnpm build` (tsc) zielony
- `pnpm lint` czysty

#### Manual Verification:

- `/companies/<id-firmy-bogatej>` pokazuje pełny profil z realnych danych, single-page, sticky kotwice działają (skok do sekcji)
- `/companies/<id-firmy-chudej>` ukrywa puste sekcje (pokazuje tylko wymagane)
- Zły `:id` → widok "nie znaleziono", brak crasha; podczas ładowania widać skeleton
- Parametry obu firm renderują się generycznie (różne branże, ten sam UI)
- "Napisz" otwiera drawer-placeholder, pozycja scrolla zachowana

**Implementation Note**: Pauza na potwierdzenie manualne przed Fazą 4.

---

## Phase 4: Ulubione — toggle z optimistic UI

### Overview

Gwiazdka w hero zapisuje/usuwa wiersz w `favorites` z natychmiastową reakcją UI i
cofnięciem przy błędzie.

### Changes Required:

#### 1. Logika ulubionych

**File**: `src/lib/use-favorite.ts` (nowy)

**Intent**: Sprawdzić, czy bieżący user ma firmę w ulubionych, i przełączać stan.

**Contract**: `useFavorite(companyId)` zwraca `{ isFavorite, toggle, pending }`.
Initial: SELECT z `favorites` po `company_id` (RLS sam ogranicza do `user_id=auth.uid()`).
`toggle`: optimistic flip → INSERT (`ON CONFLICT DO NOTHING`) lub DELETE → przy błędzie
rollback + `sonner` toast.

#### 2. Podpięcie w hero

**File**: `src/components/CompanyProfile.tsx`

**Intent**: Zastąpić lokalny `useState(favorite)` realnym hookiem.

**Contract**: Gwiazdka woła `toggle`; etykieta "Dodaj do ulubionych" / "W ulubionych";
`aria-pressed` jak teraz.

### Success Criteria:

#### Automated Verification:

- `pnpm build` zielony, `pnpm lint` czysty
- `pnpm db:test:rls` zielony (asercja: user nie widzi/edytuje cudzych favorites — jeśli brak, dodać)

#### Manual Verification:

- Klik gwiazdki dodaje/usuwa ulubione; stan przeżywa odświeżenie strony
- Drugi zalogowany user ma niezależną listę ulubionych
- Symulowany błąd zapisu cofa stan i pokazuje toast

**Implementation Note**: Pauza na potwierdzenie manualne przed Fazą 5.

---

## Phase 5: Edycja własnej wizytówki na `/profile` (tekst + tagi + parametry + rejestrowe + Top-5)

### Overview

Formularz na `/profile` (rhf + zod) pozwala ownerowi edytować dane swojej firmy.
RLS (`companies_update_own`, pivoty `_modify_own`, `company_parameter_values`,
`highlights`) gwarantuje, że zapisuje tylko własną firmę.

### Changes Required:

#### 1. Hook danych własnej firmy

**File**: `src/lib/use-own-company.ts` (nowy)

**Intent**: Pobrać `company_id` zalogowanego usera i dane jego firmy do edycji.

**Contract**: Czyta `users` po `auth.uid()` → `company_id` → te same relacje co
`use-company-profile`, ale w kształcie pod formularz (edytowalne pola).

#### 2. Formularz edycji

**File**: `src/routes/Profile.tsx`

**Intent**: Zastąpić `<ComingSoon />` formularzem edycji sekcji wizytówki.

**Contract**: `react-hook-form` + `zod` schema (opis ≤600 znaków — zgodnie z CHECK w bazie,
`founding_year` zakres, nip/regon/krs format luźny). Sekcje: dane podstawowe + rejestrowe
(`companies` UPDATE), kategorie/certyfikaty (delete+insert w pivotach), parametry
(`company_parameter_values` upsert wg definicji dla wybranych kategorii), Top-5
(`highlights` insert/update/delete, max 5). Zapis per sekcja lub całość; `sonner` toast
sukcesu/błędu. Media i pracownicy — w fazach 6-7 (na razie widoczne jako "wkrótce").

#### 3. Mapowanie parametrów do edycji

**File**: `src/lib/use-own-company.ts`

**Intent**: Pokazać do edycji tylko definicje pasujące do kategorii firmy.

**Contract**: Dla każdej kategorii firmy pobrać `parameter_definitions`; pola formularza
generowane z definicji (`value_type` steruje inputem: number/text/enum/array). Render
data-driven — zero hardkodu kluczy.

### Success Criteria:

#### Automated Verification:

- `pnpm build` zielony, `pnpm lint` czysty
- `pnpm db:test:rls` zielony (asercja: user NIE może zUPDATE-ować cudzej firmy / cudzych parametrów / highlights — dodać do `tests/rls.sql`)

#### Manual Verification:

- Owner edytuje opis/rejestrowe/kategorie/parametry/Top-5 swojej firmy; zmiany widać na `/companies/:id`
- Próba edycji cudzej firmy niemożliwa (brak UI + RLS blokuje)
- Walidacja: opis >600 znaków odrzucony, błędny rok odrzucony
- Zmiana kategorii zmienia zestaw dostępnych parametrów

**Implementation Note**: Pauza na potwierdzenie manualne przed Fazą 6.

---

## Phase 6: Upload mediów do Supabase Storage (logo, galeria, PDF)

### Overview

Konfiguracja bucketa Storage + polityk + upload z walidacją; podpięcie do edycji
i wyświetlania mediów. Cięższa, świadomie osobna faza.

### Changes Required:

#### 1. Bucket + polityki Storage

**File**: `supabase/migrations/0005_storage_company_media.sql`

**Intent**: Prywatny/publiczny bucket na media firm z izolacją zapisu per firma.

**Contract**: Utworzenie bucketa `company-media` + polityki `storage.objects`:
SELECT all-authenticated; INSERT/UPDATE/DELETE tylko gdy ścieżka pliku należy do
`current_user_company_id()` (konwencja prefiksu ścieżki `"{company_id}/..."`). Limit
rozmiaru/typu egzekwowany też po stronie klienta.

#### 2. Upload w formularzu

**File**: `src/routes/Profile.tsx` + `src/lib/use-company-media.ts` (nowy)

**Intent**: Owner wgrywa logo, ≤5 zdjęć, ≤5 PDF (≤10MB), wpis do `company_media`.

**Contract**: `supabase.storage.from('company-media').upload(...)` ze ścieżką
`{company_id}/...`; po sukcesie INSERT do `company_media` (PHOTO/DOCUMENT) + `companies.logo_url`.
Walidacja: typ (image/* dla galerii, application/pdf dla dokumentów), rozmiar ≤10MB,
limit 5 per typ. Błąd → `sonner` toast.

### Success Criteria:

#### Automated Verification:

- Migracja aplikuje się: `pnpm db:reset`
- `pnpm build` zielony, `pnpm db:test:rls` zielony

#### Manual Verification:

- Owner wgrywa logo/zdjęcia/PDF; widoczne na `/companies/:id`
- Plik >10MB lub zły typ odrzucony z komunikatem
- Próba wgrania do cudzego company prefiksu zablokowana przez politykę Storage
- Pobieranie PDF działa (nazwa, rozmiar)

**Implementation Note**: Pauza na potwierdzenie manualne przed Fazą 7.

---

## Phase 7: Pracownicy — edycja widoczności / telefonu / stanowiska

### Overview

Owner zarządza danymi pracowników widocznych na profilu (cel CTA "Napisz").
Najlżejszy możliwy zakres — bez zapraszania/tworzenia kont (auth).

### Changes Required:

#### 1. Lista pracowników firmy do edycji

**File**: `src/lib/use-company-employees.ts` (nowy)

**Intent**: Pobrać pracowników własnej firmy do zarządzania.

**Contract**: SELECT `users` po `company_id = current_user_company_id()` (RLS
`users_select_all` pozwala czytać; edycja przez `users_update_self` ogranicza zapis
do własnego wiersza — **uwaga niżej**).

#### 2. Edycja pracownika

**File**: `src/routes/Profile.tsx`

**Intent**: Edycja `job_title`, `phone`, `is_visible_on_profile`.

**Contract**: Formularz per pracownik. **Ograniczenie RLS:** `users_update_self`
pozwala edytować TYLKO własny wiersz (`id = auth.uid()`). Owner edytujący innych
pracowników wymaga albo (a) nowej polityki `users_update_own_company` (UPDATE gdy
`company_id = current_user_company_id()`), albo (b) zawężenia tej fazy do edycji
własnego wpisu. **Decyzja: dodać politykę `users_update_own_company`** w migracji
`0006`, z asercją RLS. To jedyna zmiana polityki w całej zmianie.

#### 3. Polityka RLS dla edycji pracowników firmy

**File**: `supabase/migrations/0006_users_update_own_company.sql`

**Intent**: Pozwolić ownerowi edytować pracowników własnej firmy.

**Contract**: `CREATE POLICY users_update_own_company ON users FOR UPDATE TO authenticated
USING (company_id = current_user_company_id()) WITH CHECK (company_id = current_user_company_id())`.
Współistnieje z `users_update_self`. Regeneracja typów niepotrzebna (brak zmian kolumn).

### Success Criteria:

#### Automated Verification:

- Migracja aplikuje się: `pnpm db:reset`
- `pnpm build` zielony, `pnpm lint` czysty
- `pnpm db:test:rls` zielony (asercja: owner edytuje pracownika własnej firmy; NIE edytuje pracownika obcej firmy)

#### Manual Verification:

- Owner zmienia stanowisko/telefon/widoczność pracownika; zmiany widać na `/companies/:id`
- Niewidoczny pracownik znika z sekcji Pracownicy
- Edycja pracownika obcej firmy niemożliwa

**Implementation Note**: Po tej fazie cała zmiana gotowa do `/10x-impl-review` / archiwizacji.

---

## Testing Strategy

### Unit Tests:

- (Brak frameworku testów jednostkowych w projekcie na teraz — weryfikacja przez `tsc` + manualnie. Test plan modułu 3 wprowadzi testy; nie blokuje tej zmiany.)

### Integration Tests (RLS):

- `supabase/tests/rls.sql` rozszerzony o asercje: favorites prywatne per user;
  user nie UPDATE-uje cudzej firmy/parametrów/highlights; owner edytuje pracowników
  własnej firmy, nie obcej; Storage write tylko własny prefiks.

### Manual Testing Steps:

1. `pnpm db:reset` (po jednorazowym zalogowaniu obu kont) → seed tworzy 2 firmy.
2. Zaloguj jako Ty → otwórz `/companies/<firma-Grzegorza>` → oceń profil, dodaj do ulubionych.
3. Otwórz `/profile` → edytuj opis/parametry/Top-5 własnej firmy → sprawdź na `/companies/<własna>`.
4. Zaloguj jako Grzegorz → sprawdź niezależne ulubione, edycję własnej firmy.
5. Sprawdź empty-state na firmie chudej (ukryte sekcje), skeleton i "nie znaleziono".
6. (Fazy 6-7) upload mediów + edycja pracowników.

## Performance Considerations

Profil ładowany jednym zagnieżdżonym zapytaniem PostgREST (bez N+1). Skala pilotu
(10-20 firm) nie wymaga paginacji ani cache. Index na `company_parameter_values.definition_id`
przygotowuje pod filtry S-05.

## Migration Notes

`companies.technical_parameters` (JSONB) zostaje w schemacie nieużywany przez nowy
widok — nie usuwamy w tej zmianie (brak danych prod, decyzja czyszczenia osobno).
Seed jest idempotentny i bezpieczny do wielokrotnego `db:reset`.

## References

- Brief użytkownika: w `change.md` (Notes) tej zmiany
- Roadmap: `context/foundation/roadmap.md` (S-02 linie 120-131, S-03 linie 133-144)
- Prototyp UI: `src/components/CompanyProfile.tsx:22-432`
- RLS baseline: `supabase/migrations/0002_enable_rls.sql:30-272`
- Wzorzec fetch + seq: `src/lib/auth-store.ts:42-65`
- Decyzja parametrów: memory `param-definitions-data-not-code`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Migracja schematu

#### Automated

- [x] 1.1 Migracja aplikuje się czysto: `pnpm db:reset` — a7de292
- [x] 1.2 Typy zregenerowane i bez błędów: `pnpm db:types` + `pnpm build` — a7de292
- [x] 1.3 RLS testy przechodzą: `pnpm db:test:rls` — a7de292
- [x] 1.4 Lint czysty: `pnpm lint` (28 błędów pre-existing `explicit-function-return-type` w nietkniętych plikach; nowy kod tej zmiany regułę spełnia — decyzja użytkownika) — a7de292

#### Manual

- [x] 1.5 Nowe kolumny/tabele i polityki RLS widoczne w Supabase Studio — a7de292
- [x] 1.6 `companies.nip` ma constraint UNIQUE — a7de292

### Phase 2: Seed

#### Automated

- [x] 2.1 Seed wykonuje się bez błędu w `pnpm db:reset` — 19eaae0
- [x] 2.2 `pnpm db:test:rls` nadal zielony — 19eaae0

#### Manual

- [x] 2.3 Po resecie w bazie 2 firmy z ownerami (konta dowiązane po e-mailu) — 19eaae0
- [x] 2.4 Logując się jako Ty/Grzegorz widać powiązanie z własną firmą — 19eaae0
- [x] 2.5 Firma chuda ma puste sekcje (do testu ukrywania) — 19eaae0

### Phase 3: Strona profilu (read)

#### Automated

- [x] 3.1 `pnpm build` (tsc) zielony
- [x] 3.2 `pnpm lint` czysty

#### Manual

- [x] 3.3 Profil firmy bogatej: pełny, single-page, sticky kotwice działają
- [x] 3.4 Profil firmy chudej: puste sekcje ukryte (tylko wymagane)
- [x] 3.5 Zły `:id` → "nie znaleziono"; ładowanie → skeleton
- [x] 3.6 Parametry obu firm renderują się generycznie (różne branże, ten sam UI)
- [x] 3.7 "Napisz" otwiera drawer-placeholder, pozycja scrolla zachowana

### Phase 4: Ulubione

#### Automated

- [ ] 4.1 `pnpm build` zielony, `pnpm lint` czysty
- [ ] 4.2 `pnpm db:test:rls` zielony (favorites prywatne per user)

#### Manual

- [ ] 4.3 Toggle gwiazdki dodaje/usuwa; stan przeżywa odświeżenie
- [ ] 4.4 Drugi user ma niezależną listę ulubionych
- [ ] 4.5 Błąd zapisu cofa stan + toast

### Phase 5: Edycja wizytówki

#### Automated

- [ ] 5.1 `pnpm build` zielony, `pnpm lint` czysty
- [ ] 5.2 `pnpm db:test:rls` zielony (brak edycji cudzej firmy/parametrów/highlights)

#### Manual

- [ ] 5.3 Owner edytuje opis/rejestrowe/kategorie/parametry/Top-5; widać na `/companies/:id`
- [ ] 5.4 Edycja cudzej firmy niemożliwa (UI + RLS)
- [ ] 5.5 Walidacja: opis >600 znaków i błędny rok odrzucone
- [ ] 5.6 Zmiana kategorii zmienia zestaw parametrów

### Phase 6: Upload mediów (Storage)

#### Automated

- [ ] 6.1 Migracja aplikuje się: `pnpm db:reset`
- [ ] 6.2 `pnpm build` zielony, `pnpm db:test:rls` zielony

#### Manual

- [ ] 6.3 Owner wgrywa logo/zdjęcia/PDF; widoczne na `/companies/:id`
- [ ] 6.4 Plik >10MB / zły typ odrzucony
- [ ] 6.5 Upload do cudzego prefiksu zablokowany przez politykę Storage
- [ ] 6.6 Pobieranie PDF działa (nazwa, rozmiar)

### Phase 7: Pracownicy

#### Automated

- [ ] 7.1 Migracja aplikuje się: `pnpm db:reset`
- [ ] 7.2 `pnpm build` zielony, `pnpm lint` czysty
- [ ] 7.3 `pnpm db:test:rls` zielony (owner edytuje pracownika własnej firmy, nie obcej)

#### Manual

- [ ] 7.4 Owner zmienia stanowisko/telefon/widoczność pracownika; widać na `/companies/:id`
- [ ] 7.5 Niewidoczny pracownik znika z sekcji Pracownicy
- [ ] 7.6 Edycja pracownika obcej firmy niemożliwa
