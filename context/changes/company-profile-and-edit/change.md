---
change_id: company-profile-and-edit
title: Strona profilu firmy (oglądanie) + edycja własnej wizytówki (S-03 + S-02)
status: impl_reviewed
created: 2026-06-26
updated: 2026-06-29
archived_at: null
---

## Notes

Łączy dwa slice'y z `context/foundation/roadmap.md`:
- **S-03** (`favorites-and-company-card`, US-03/US-06) — strona profilu firmy do oglądania + ulubione.
- **S-02** (`edit-own-company-profile`, US-07) — edycja własnej wizytówki na `/profile`.

Użytkownik nazwał to "S-02"; po analizie briefu (strona *przeglądania* firmy + 2 CTA + edycja) zakres pokrywa S-03 w całości + edycję z S-02. Świadomie połączone w jedną zmianę na życzenie użytkownika.

**Świadomie POZA zakresem (decyzje z sesji planowania):**
- Realtime czat 1:1 (S-04, north star) — CTA "Napisz" otwiera tylko drawer-placeholder. Pełny czat ma własny `/10x-research` (wybór Supabase Realtime) i zostaje osobnym slice'em.
- Integracja GUS/KRS — dane rejestrowe wpisywane ręcznie; schemat API-ready (kolumny nip/regon/krs istnieją).
- Self-registration — konta seedowane (Operator / pilot).

**Kluczowe decyzje:**
- Parametry techniczne **data-driven**: słownik `parameter_definitions` + `company_parameter_values`. Firmy z różnych branż (wtryskarki → farby/oleje → polimery → auto); nowa branża = seed definicji, nie zmiana kodu. (memory: param-definitions-data-not-code)
- Top-5 "Czym się zajmujemy" → tabela `highlights`.
- Konta Ty + Grzegorz: realne z `auth.users`, seed dowiązuje po e-mailu.
- Edycja na osobnej trasie `/profile` (rhf + zod); `/companies/:id` read-only.
- UI: przepisanie istniejącego `CompanyProfile.tsx` z tabs (`@radix-ui/react-tabs`) na single-page + sticky kotwice (brief: "bez zakładek"), oraz z mock-danych na real data.
