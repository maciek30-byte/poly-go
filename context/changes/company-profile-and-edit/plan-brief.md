# Strona profilu firmy + edycja własnej wizytówki (S-03 + S-02) — Plan Brief

> Pełny plan: `context/changes/company-profile-and-edit/plan.md`

## What & Why

Zalogowany użytkownik ogląda profil dowolnej firmy (`/companies/:id`) jako jedną
scrollowaną stronę ze sticky kotwicami i "jednym spojrzeniem" ocenia, czy to dobry
partner — po czym dodaje firmę do ulubionych albo klika "Napisz". Owner edytuje
własną wizytówkę na `/profile`. To rdzeń pilotu: firmy muszą widzieć się nawzajem
i czuć, że profil "to ich miejsce".

## Starting Point

Istnieje dopracowany prototyp UI (`src/components/CompanyProfile.tsx`), ale z
zahardkodowanymi danymi i na zakładkach (`@radix-ui/react-tabs`) — sprzecznych z
briefem. Trasy `/companies/:id` i `/profile` to placeholdery `<ComingSoon />`.
Warstwa danych (schemat + RLS dla companies/users/favorites/media) jest gotowa;
brakuje kolumn rejestrowych, słownika parametrów, highlights i seeda firm.

## Desired End State

Profil renderuje realne dane z Supabase jako single-page z ukrywaniem pustych sekcji,
skeletonem i widokiem "nie znaleziono". Gwiazdka "Ulubione" działa (optimistic UI).
Owner edytuje wizytówkę na `/profile`. Parametry techniczne są data-driven (słownik),
więc działają tak samo dla wtryskarni i dla producenta farb. Seed tworzy 2 firmy
(Ty + Grzegorz) dowiązane do realnych kont, gotowe do oglądania i edycji.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Tożsamość zmiany | S-03 (profil+ulubione) + S-02 (edycja) razem | Brief pokrywa oba; user chce jednej zmiany | Plan |
| Czat | Poza zakresem; "Napisz" = drawer-placeholder | S-04 to north star z własnym researchem | Plan |
| Model danych | Dołożony teraz, API-ready (nip/regon/krs/adresy) | Schemat gotowy, S-02 nie rusza struktury | Plan |
| Parametry techniczne | Słownik `parameter_definitions` + wartości (data-driven) | Firmy z różnych branż; sztywny schemat = JSONB bez sensu | Plan |
| Top-5 | Tabela `highlights` | Edytowalne per pozycja, kolejność, czyste RLS | Plan |
| Konta Ty + Grzegorz | Realne z `auth.users`, seed dowiązuje po e-mailu | "Tak jakbyśmy byli właścicielami firm" | Plan |
| Edycja | Osobna trasa `/profile` (rhf + zod) | Czysty podział read/write | Plan |
| UI | tabs → single-page + sticky kotwice | Brief: "bez zakładek" | Plan |

## Scope

**In scope:** profil firmy (read), ulubione, edycja wizytówki (tekst/tagi/parametry/
rejestrowe/Top-5), upload mediów do Storage, edycja pracowników, seed 2 firm.

**Out of scope:** realtime czat (S-04), integracja GUS/KRS, self-registration,
wyszukiwarka (S-05), zmiana istniejących polityk RLS poza jedną (edycja pracowników).

## Architecture / Approach

Siedem faz od warstwy danych w górę: (1) migracja schematu, (2) seed, (3) profil read
+ przepisanie komponentu, (4) ulubione, (5) edycja, (6) Storage, (7) pracownicy.
Profil ładowany jednym zagnieżdżonym zapytaniem PostgREST. Render parametrów
industry-agnostic ze słownika. RLS z `0001`/`0002` pokrywa prawie wszystko; jedyna
nowa polityka to edycja pracowników firmy (faza 7).

## Phases at a Glance

| Faza | Dostarcza | Główne ryzyko |
| --- | --- | --- |
| 1. Migracja | rejestrowe + highlights + słownik param. + pola pracownika | typy muszą iść w tym samym commicie (`tsc` gate) |
| 2. Seed | 2 firmy dowiązane do realnych kont | konta muszą istnieć w auth przed seedem; e-mail Grzegorza |
| 3. Profil (read) | real data, single-page, sticky kotwice, stany | przepisanie z tabs + mock bez regresji |
| 4. Ulubione | toggle optimistic UI | rollback przy błędzie RLS/sieci |
| 5. Edycja | formularz `/profile` (tekst/tagi/param/rejestrowe/Top-5) | parametry data-driven w formularzu |
| 6. Storage | upload logo/galeria/PDF | bucket + polityki + walidacja (cięższe) |
| 7. Pracownicy | edycja widoczności/telefonu/stanowiska | nowa polityka RLS `users_update_own_company` |

**Prerequisites:** konta Ty + Grzegorza założone w Auth (zalogowane raz); znany e-mail
Grzegorza do seeda. F-02 + S-01 (gotowe).
**Estimated effort:** ~5-7 sesji; rdzeń (fazy 1-5) najpierw, 6-7 osobno.

## Open Risks & Assumptions

- **E-mail konta Grzegorza nieznany** — placeholder w seedzie do podmiany przed Fazą 2.
- Konta muszą istnieć w `auth.users` przed `db:reset` (seed dowiązuje po e-mailu, nie tworzy).
- Brak frameworku testów jednostkowych — weryfikacja przez `tsc` + RLS + manualnie.
- `companies.technical_parameters` (JSONB) zostaje nieużywany — czyszczenie osobno.

## Success Criteria (Summary)

- Zalogowany user ogląda profil dowolnej firmy i ocenia ją jednym spojrzeniem; dodaje do ulubionych.
- Owner edytuje własną wizytówkę i widzi zmiany na publicznym profilu; cudzej firmy edytować nie może.
- Profile dwóch firm z różnych branż renderują się tym samym, generycznym UI.
