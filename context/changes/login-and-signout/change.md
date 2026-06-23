---
change_id: login-and-signout
title: Login (email/hasło + Google OAuth) i wylogowanie (S-01)
status: implemented
created: 2026-06-22
updated: 2026-06-23
archived_at: null
---

## Notes

Slice S-01 z `context/foundation/roadmap.md`. Cel: realny UI loginu pod istniejącym routerem F-04 i scaffoldem F-01. User loguje się email+hasłem lub przez Google OAuth, widzi swoją tożsamość w app shellu (już dostarczone przez F-04), wylogowuje się z user menu w topbarze (już dostarczone przez F-04).

**Decyzja zakresu vs roadmapa:** roadmapa wymienia "email+hasło lub OAuth Google". Microsoft OAuth, mimo że F-01 go skonfigurował w Supabase dashboard, **świadomie pominięty** w S-01 — zgodnie z `roadmap.md:117` ("Microsoft OAuth odłożony do v2"). Konfiguracja zostaje, kod nie woła provider'a `azure`.

**Co dziedziczymy z F-01 + F-04 (ZERO pracy w S-01):**
- Supabase Auth z email + Google enabled, `getAuthRedirect()` helper
- Zustand `auth-store.ts` z `onAuthStateChange` listenerem, akcją `signOut()`, statusami `loading | authenticated | anonymous`
- `RequireAuth` guard z redirect na `/login?next=<safe>`
- `AppShell` z avatarem usera + emailem + przyciskiem "Wyloguj" w user menu
- Router config: `/login` i `/auth/callback` publiczne, reszta pod guardem
- `AuthCallback.tsx` polega na Supabase SDK auto-handle callback przez listener — działa out of the box

**Co dostarcza S-01:**
- Realny formularz w `src/routes/Login.tsx` (email + hasło + Google button) — podmiana placeholdera
- Wrappery `signInWithPassword` i `signInWithGoogleOAuth` w `src/lib/auth.ts`
- Mapowanie błędów Supabase → user-facing PL
- Edge case `?error=` w `AuthCallback.tsx` (OAuth cancel / refusal)
- `zod` + `react-hook-form` dodane do deps (świadomy override AGENTS.md "no library until concrete need" — uzasadnione reuse w S-02 edycja wizytówki i S-05 wyszukiwarka)

Zakres NIE obejmuje:
- "Zapomniałem hasła" / password reset flow (manualny przez Operatora w MVP)
- Self-registration (PRD: konta seedowane offline)
- Microsoft OAuth w kodzie (świadome zawężenie do v2)
- Toast/snackbar system (errors inline w formularzu)
- Realnej zawartości tras `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile` (każdy slice S-02..S-05)
