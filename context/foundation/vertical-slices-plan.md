# Vertical Slice Architecture — POLY_GO

> Propozycja reorganizacji obecnej struktury (technicznie warstwowej: `routes/`, `components/`, `lib/`) na architekturę vertical slice.
> Status: **propozycja / do wykonania**. Ten dokument nie zmienia kodu — opisuje docelowy kształt i reguły.

## 1. Zasady twarde

Trzy warstwy, jednokierunkowe zależności:

```
        features/*  ──►  shared/*  ──►  (nic)
           │  ▲
           │  └── features NIE importuje z innego features
           ▼
          app/  ──► features/*, shared/*   (tylko app składa całość)
```

- `features/A` **nie** importuje z `features/B` — nigdy, w żadną stronę.
- `shared` **nie** importuje z `features`.
- Wspólne dla ≥2 slice'ów = idzie do `shared`. Tylko `app/` widzi wszystko (składa router + i18n).
- **Bez barreli / bez `index.ts` jako "publiczne API"** — importy to pełne, głębokie ścieżki:
  `import { useCompanyProfile } from '@/shared/data/company/use-company-profile'`.
  Widać dokładnie skąd co idzie, grep działa, nie ma iluzji publicznego API.
- Reguły egzekwuje **lint**, nie konwencja (patrz §6).

## 2. Docelowe drzewo

```
src/
├── app/
│   ├── App.tsx · main.tsx
│   ├── router.tsx                    # składa RouteObject[] z każdego slice'a
│   └── i18n/{index.ts, i18next.d.ts}
│
├── shared/
│   ├── data/company/                 # WSPÓLNA warstwa danych o firmie
│   │   ├── types.ts                  #   (Company + pochodne z database.types)
│   │   ├── use-company-profile.ts
│   │   ├── use-company-media.ts
│   │   └── use-company-employees.ts
│   ├── ui/                           # button, input, tabs, textarea, skeleton
│   ├── components/                   # AppShell, Logo, ComingSoon
│   ├── lib/                          # supabase.ts, utils.ts, database.types.ts
│   └── locales/pl/                   # common, validation, errors
│
└── features/
    ├── auth/         { routes/, components/, hooks/, locales/pl/auth.json }
    │                   ⬅ Login, AuthCallback, Forbidden, RequireAuth,
    │                     RequireRole, auth.ts, auth-store.ts, use-auth.ts
    ├── company/      { routes/, components/, locales/pl/{company,media}.json }
    │                   ⬅ CompanyDetail, Home, CompanyProfile  (UI nad shared/data/company)
    ├── profile/      { routes/, hooks/, locales/pl/profile.json }
    │                   ⬅ Profile.tsx, use-own-company.ts       (UI nad shared/data/company)
    ├── favorites/    ⬅ Favorites, use-favorite.ts
    ├── chat/         ⬅ Chat, MessageDrawerPlaceholder
    └── admin/        ⬅ route /admin (ComingSoon)
```

## 3. Mapowanie: obecny plik → cel

| Cel | Co się przenosi |
|---|---|
| **features/auth** | `lib/auth.ts`, `lib/auth-store.ts`, `lib/use-auth.ts`, `routes/Login.tsx`, `routes/AuthCallback.tsx`, `routes/Forbidden.tsx`, `components/RequireAuth.tsx`, `components/RequireRole.tsx`, `locales/pl/auth.json` |
| **features/company** | `components/CompanyProfile.tsx`, `routes/CompanyDetail.tsx`, `routes/Home.tsx`, `locales/pl/company.json` + `media.json` |
| **features/profile** | `routes/Profile.tsx`, `lib/use-own-company.ts`, `locales/pl/profile.json` |
| **features/favorites** | `routes/Favorites.tsx`, `lib/use-favorite.ts` |
| **features/chat** | `routes/Chat.tsx`, `components/MessageDrawerPlaceholder.tsx` |
| **features/admin** | route `/admin` (na razie `ComingSoon`) |
| **shared/data/company** | `lib/use-company-profile.ts`, `lib/use-company-media.ts`, `lib/use-company-employees.ts` + typ `Company` (z `database.types`) |
| **shared/ui** | `components/ui/*` (button, input, tabs, textarea, skeleton, button-variants) |
| **shared/components** | `components/AppShell.tsx`, `components/Logo.tsx`, `components/ComingSoon.tsx` |
| **shared/lib** | `lib/supabase.ts`, `lib/utils.ts`, `lib/database.types.ts` |
| **shared/locales/pl** | `common.json`, `validation.json`, `errors.json` |
| **app/** | `App.tsx`, `main.tsx`, `router.tsx`, `i18n/index.ts`, `i18n/i18next.d.ts` |

## 4. Kluczowa decyzja: warstwa danych o firmie → `shared`

`use-company-profile / media / employees` oraz typ `Company` **NIE** są w slice `company` — są w `shared/data/company`.

Powód: `company` (cudze firmy, read) i `profile` (moja firma, edycja) korzystają z tego samego kształtu `Company` i tych samych zapytań do Supabase. Skoro slice'y ze sobą nie rozmawiają, to co wspólne, ląduje w `shared` — obie strony gadają wyłącznie z `shared`, nigdy ze sobą. Zero duplikacji typów/zapytań.

`use-own-company` zostaje w `features/profile` — to logika właściciela (edycja, upload), specyficzna dla tego slice'a. Wspólne odczyty woła z `shared/data/company`.

## 5. i18n per-slice

- Namespace = slice. `t('company:...')`, `t('auth:...')`, `t('profile:...')`.
- `app/i18n/index.ts` rejestruje namespace'y ze slice'ów (`auth`, `company`, `media`, `profile`) + wspólne z `shared` (`common`, `validation`, `errors`).
- Content domknięty w slice (zgodnie z regułą z CLAUDE.md — cały tekst z JSON-ów, nie literały w kodzie).
- Obce języki później: `locales/en/…` w tym samym folderze slice'a.

## 6. Egzekucja granic (ESLint)

`import/no-restricted-paths` (z `eslint-plugin-import`) — reguła, nie konwencja:

```js
'import/no-restricted-paths': ['error', { zones: [
  { target: './src/features/auth',      from: './src/features', except: ['./auth'] },
  { target: './src/features/company',   from: './src/features', except: ['./company'] },
  { target: './src/features/profile',   from: './src/features', except: ['./profile'] },
  { target: './src/features/favorites', from: './src/features', except: ['./favorites'] },
  { target: './src/features/chat',      from: './src/features', except: ['./chat'] },
  { target: './src/features/admin',     from: './src/features', except: ['./admin'] },
  { target: './src/shared',             from: './src/features' },   // shared ↛ features
]}]
```

## 7. Router zdekomponowany

`app/router.tsx` nie importuje pojedynczych route'ów wprost — każdy slice eksportuje swoje `RouteObject[]` (np. `authRoutes`, `companyRoutes`), a `app/` je składa. Uwaga: to jedyny wyjątek od „bez barreli" — plik z definicją tras slice'a jest jego punktem wejścia dla `app/`, nie dla innych slice'ów.

## 8. Uwagi z przeglądu kodu (opcjonalne, przy okazji migracji)

- `routes/Profile.tsx` ma **833 linie**, `components/CompanyProfile.tsx` **543** — migracja do slice'a to dobry moment, żeby rozbić je na mniejsze komponenty w `features/<slice>/components/`. Nie jest to warunek slice'ów.

## 9. Warianty wykonania (do wyboru przy realizacji)

- **A) Plan + fazy** — `/10x-new refactor-vertical-slices`, potem migracja fazami (recenzowalne, bezpieczne).
- **B) Migracja od razu** — `git mv` plików, przepisanie importów, podział router + i18n, reguła ESLint, `tsc` do zera.
- **C) Slice pilotażowy** — najpierw `shared/data/company` + `company` jako wzorzec, reszta iteracyjnie.
