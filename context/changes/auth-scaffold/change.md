---
change_id: auth-scaffold
title: Fundament uwierzytelniania — Supabase Auth (email/hasło + OAuth Google/Microsoft)
status: implementing
created: 2026-06-11
updated: 2026-06-11
archived_at: null
---

## Notes

Foundation F-01 z `context/foundation/roadmap.md`. Cel: skonfigurować Supabase Auth (email/hasło + OAuth Google i Microsoft), zapewnić działający redirect callback i dodać helper `getAuthRedirect()` w `src/lib/auth.ts` używany jednolicie (mitigation Risk #3 z `context/foundation/infrastructure.md` — preview URLs Cloudflare Pages).

Zakres NIE obejmuje:
- UI logowania/wylogowania (to S-01 `login-and-signout`)
- Routera ani guarda sesji (to F-04 `routing-and-auth-shell`)
- Schematu users/companies (to F-02 `multi-tenant-data-rls`)

Weryfikacja OAuth callbacków powinna iść przez staging Supabase (F-03 `staging-supabase-isolation`) zanim trafi na prod — F-01 i F-03 są oznaczone jako `Parallel with`.
