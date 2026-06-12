---
change_id: multi-tenant-data-rls
title: Multi-tenant data layer + RLS izolacji per-firma
status: implementing
created: 2026-06-11
updated: 2026-06-11
archived_at: null
---

## Notes

Foundation F-02 z `context/foundation/roadmap.md`. Cel: dostarczyć schemat Postgres (companies, users, favorites, conversations, messages + tabele słownikowe i media) z politykami RLS gwarantującymi izolację danych firm. User widzi pełną wizytówkę dowolnej zaseedowanej firmy, ale modyfikować może tylko swoją; ulubieni i historia rozmów są prywatne per user/firma.

Punkt wyjścia: użytkownik dostarczył projekt schematu (ERD + SQL DDL) jako brief F-02. Plan adaptuje ten schemat z trzema niezbędnymi zmianami: dodanie pola `region TEXT` na `companies` (US-02/S-05), UNIQUE indeks `LEAST/GREATEST` na `conversations` (deduplikacja czatów), oraz konwencja `technical_parameters` JSONB udokumentowana w `COMMENT ON COLUMN` (slot na `polymer_types`).

Zakres NIE obejmuje:
- UI edycji wizytówki ani widoku karty firmy (to S-02 i S-03)
- Realtime subscriptions dla czatu (to S-04)
- Tabel audit log ani soft-delete dla RODO (świadomie odłożone do v2)
- Tabel `polymer_types` jako osobnego słownika (decyzja: trzymamy w JSONB do czasu obserwacji w pilocie)
- Triggera enforce_media_limit (limit 5 plików egzekwowany w UI)

Weryfikacja izolacji RLS odbywa się lokalnie (supabase start) + przez skrypt `supabase/tests/rls.sql`. Na prod migrację puszczamy `supabase db push` na pustej bazie — żadnych userów pilotowych jeszcze nie ma, więc zerowy blast radius regresji.
