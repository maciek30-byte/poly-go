# Wizytówka firmy — braki w bazie po porcie z mockupu `co-ecoplas.html`

Data: 2026-07-09

Port `src/components/CompanyProfile.tsx` doprowadził widok do układu 1:1 z mockupem
`polyGo_mockup_v4/co-ecoplas.html` (warstwa „v4 MODERNIZATION"). Zgodnie z ustaleniem
**elementy mockupu bez pokrycia w bazie zostały pominięte** w renderze. Poniżej lista
tego, czego brakuje w modelu danych (`CompanyProfileData` w `src/lib/use-company-profile.ts`
oraz w schemacie Supabase) — do decyzji, czy dodawać.

## 1. Nagłówek firmy (hero)

| Element mockupu | Status | Czego brakuje |
| --- | --- | --- |
| Badge **„Zweryfikowana"** (zielony checkmark) | pominięty | Kolumna `verified: boolean` na `companies` (lub tabela weryfikacji z datą). |
| Badge **„Nowa w sieci"** | pominięty | Wyliczane z daty dołączenia do sieci — brak `joined_network_at` (patrz niżej). |
| Meta **„ok. 22 pracowników"** (szacunek) | częściowo | Renderujemy **realną** liczbę widocznych `users`. Mockup pokazuje szacunek deklarowany przez firmę — brak `employees_estimate: int`. |
| Meta **„w sieci od czerwiec 2026"** | pominięty | Brak `joined_network_at: timestamptz` na `companies`. |
| Przycisk **„Obserwuj"** | pominięty | Brak relacji obserwowania (followers) — to **inna** relacja niż „ulubione" (`useFavorite`). Wymaga tabeli `company_followers(user_id, company_id)`. |

## 2. Sekcja „O firmie" — KPI grid

Mockup pokazuje 4 KPI. Renderujemy tylko te z pokryciem: **Rok założenia**, **Pracownicy**
(liczba realnych `users`), **Lokalizacja** (`region`). Brakuje:

| KPI mockupu | Czego brakuje |
| --- | --- |
| **Obserwatorów** (`7`) | `followers_count` — pochodna tabeli followers z pkt 1. |
| **Kontakty w sieci** (`3`) | `network_contacts_count` — licznik nawiązanych kontaktów/relacji w sieci (brak tabeli relacji). |

## 3. Sekcja „Parametry techniczne"

| Element mockupu | Status | Czego brakuje |
| --- | --- | --- |
| `param-sub` — podpis pod wartością (np. „HDPE + PP + PET łącznie") | pominięty | Model ma tylko `value` + `definition.unit`. Brak pola `note`/`sub` na wartości parametru (`company_parameter_values.note: text`). |

## 4. Sekcja „Dokumenty do pobrania"

| Element mockupu | Status | Czego brakuje |
| --- | --- | --- |
| **„Aktualizacja: czerwiec 2025"** (data pliku) | pominięty | `company_media` ma `created_at`, ale nie eksponujemy „ostatniej aktualizacji"; brak wyraźnego `updated_at` per plik. |
| **Rozmiar pliku** („0,8 MB") | pominięty | Brak `file_size_bytes: bigint` na `company_media`. |

## 5. Tab „Pracownicy"

Mockup ma tabelę z kolumnami: awatar, imię+rola, **dział**, **„od {data}"**, akcja.
Renderujemy: awatar, imię, `job_title`, `phone`, „Napisz". Brakuje:

| Kolumna mockupu | Czego brakuje |
| --- | --- |
| **Dział** („Zarząd", „Jakość", „Zakupy") | Brak `department: text` na `users`. |
| **„od czerwca 2026"** (staż w firmie/sieci) | Brak `joined_at`/`since` na `users` (jest `created_at`, ale to data rekordu, nie deklarowany staż). |

## 6. Tab „Dane rejestrowe"

Włączyliśmy tab (poprzednio ukryty flagą `SHOW_REGISTRY=false`). Renderujemy pola, które
**są** w modelu: `name`, `nip`, `regon`, `krs`, `headquarters_address`, `plant_address`,
`region`, `website`. Mockup ma dodatkowo:

| Pole mockupu | Czego brakuje |
| --- | --- |
| **Forma prawna** („Spółka z o.o.") | Brak `legal_form: text` na `companies`. |
| **Kod pocztowy + miejscowość** jako osobne pola | Adres trzymamy jako pojedynczy `headquarters_address` (string). Rozbicie na `postal_code` / `city` wymagałoby zmiany schematu. |

---

## Rekomendacja (kolejność wg wartości)

1. **Followers** (tabela `company_followers`) → odblokowuje „Obserwuj", KPI „Obserwatorów",
   badge „Nowa w sieci" jest tanim dodatkiem obok.
2. `company_media.file_size_bytes` + ekspozycja daty aktualizacji → dokumenty wyglądają jak w mockupie małym kosztem.
3. `users.department` + `users.joined_at` → pełna tabela pracowników.
4. `companies.legal_form`, `employees_estimate`, `joined_network_at`, `verified` → pola „miękkie", niska pilność.
5. `company_parameter_values.note` → `param-sub` w parametrach.

Uwaga: każda zmiana schematu idzie przez migrację w `supabase/migrations/`,
regenerację `src/lib/database.types.ts` (`pnpm db:types`) i, jeśli dotyczy RLS,
asercję w `supabase/tests/rls.sql` — zgodnie z workflow w `CLAUDE.md`.
