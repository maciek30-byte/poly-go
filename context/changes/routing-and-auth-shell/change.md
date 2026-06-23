---
change_id: routing-and-auth-shell
title: Routing + auth-protected app shell (F-04)
status: implemented
created: 2026-06-12
updated: 2026-06-22
archived_at: null
---

## Notes

Foundation F-04 z `context/foundation/roadmap.md`. Cel: wprowadzić `react-router-dom` (Data Router), strukturę tras (`/login`, `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile`, `/auth/callback`) i layout shell z auth guardem przekierowującym na `/login?next=<pathname>` jeśli brak sesji.

Sesja żyje w Zustand store (`src/lib/auth-store.ts`) subskrybującym `supabase.auth.onAuthStateChange` — świadomy override AGENTS.md "no Redux/Zustand until concrete need", uzasadniony tym, że sesja będzie potrzebna też poza komponentami (np. w fetchach do Supabase) i kolejnymi slice'ami (S-04 realtime).

Zakres NIE obejmuje:
- UI formularza logowania ani OAuth (S-01 `login-and-signout` podmieni `Login.tsx` placeholder)
- Realnej zawartości tras `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile` (każdy slice S-02..S-04 podmieni `<ComingSoon>` na właściwy ekran)
- Responsive mobile layout (decyzja: MVP desktop-only)
- UI strony `/auth/callback` (zostaje minimalny redirect, wystarczy `supabase.auth.getSession()` + `Navigate` na `/`)

Krytyczne ograniczenia z `context/foundation/infrastructure.md` Risk #2/#4: NIE dodawać `public/404.html`, NIE dodawać `_redirects` z `/* /index.html 200` — Cloudflare Pages auto-fallback do `index.html` jest jedyną SPA routing strategy.
