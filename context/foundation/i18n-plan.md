# Wdrożenie i18n (react-i18next)

Data: 2026-07-09

## Kontekst

CLAUDE.md wymaga, by cały tekst UI pochodził z plików JSON (tłumaczeń). Obecnie
projekt **nie ma żadnego i18n** — ~140–160 polskich literałów zaszytych w komponentach,
schematach zod, toastach i mapperach błędów. Wdrażamy `react-i18next`.

Biblioteka: **react-i18next + i18next** (decyzja użytkownika). Powód nadrzędny:
poprawna **polska pluralizacja** (formy one/few/many: „1 plik / 2 pliki / 5 plików"),
której lekki własny provider nie daje bez ręcznej logiki. Dodatkowo interpolacja
`{{var}}`, namespace'y, gotowość na kolejne języki.

Stack: React 19, Vite 8, TS strict, alias `@/` → `src/`, pnpm. Brak testów.
Aplikacja montuje się `main.tsx → App → RouterProvider`; jedyny globalny stan to
`auth-store` (zustand).

## Biblioteki

```
pnpm add i18next react-i18next i18next-browser-languagedetector
```

(`languagedetector` opcjonalnie — na start i tak wymuszamy `pl`, ale zostawia furtkę.)

## Struktura plików

```
src/i18n/
  index.ts            // init i18next (initReactI18next), lng: 'pl', fallbackLng: 'pl'
  resources.ts        // import wszystkich JSON, złożenie w resources { pl: { <ns>: ... } }
src/locales/pl/
  common.json         // przyciski, statusy, nawigacja, aria (Ładowanie…, Zapisz, Napisz, Wyloguj…)
  auth.json           // Login + auth.ts (błędy logowania, toasty)
  profile.json        // Profile.tsx (edycja wizytówki) — największy
  company.json        // CompanyProfile.tsx + CompanyDetail.tsx (widok publiczny, taby, KPI, plurale)
  validation.json     // komunikaty zod (login + profile)
  media.json          // use-company-media.ts (walidacja plików)
  errors.json         // NotFound/Forbidden/ComingSoon/router
```

Namespace = plik. Klucze zagnieżdżone i opisowe: `profile.sections.basics`,
`company.tabs.registry`, `validation.year.range`.

## Wzorce techniczne

- **Init** w `src/i18n/index.ts`, import raz w `main.tsx` przed `<App/>`.
- **Provider**: `initReactI18next` wystarcza (nie trzeba `<I18nextProvider>` przy jednej
  globalnej instancji). Opcjonalnie `<Suspense>` — nie jest wymagany, bo zasoby ładujemy
  synchronicznie (import JSON do bundla).
- **Hook w komponentach**: `const { t } = useTranslation('company')` → `t('tabs.profile')`.
- **Interpolacja**: `t('validation.year.range', { max: CURRENT_YEAR })` z `"Rok … {{max}}."`.
- **Pluralizacja** (i18next natywnie, PL = one/few/many):
  ```json
  "company": {
    "employeesCount_one": "{{count}} pracownik",
    "employeesCount_few": "{{count}} pracownicy",
    "employeesCount_many": "{{count}} pracowników"
  }
  ```
  → `t('employeesCount', { count })`. Analogicznie zdjęcia (zdjęcie/zdjęcia/zdjęć) i pliki (plik/pliki/plików).
- **zod poza komponentem**: schematy nie mają dostępu do hooka. Rozwiązanie: budować
  schemat wewnątrz komponentu z `t` (np. `useMemo(() => makeSchema(t), [t])`) **lub**
  trzymać w zod klucze i18n, tłumaczyć przy renderze błędu. Wybór: **schemat jako funkcja
  `(t) => z.object(...)`** wywoływana w komponencie — najprostsze, zachowuje typy.
- **Błędy auth/media poza komponentem** (`auth.ts`, `use-company-media.ts`): zwracać
  **kody/klucze** (np. `'auth.errors.invalidCredentials'`), a tłumaczyć w miejscu użycia
  (`toast.error(t(code))`). Te moduły nie renderują — nie wołają `t` bezpośrednio.

## Typowanie kluczy (TS strict)

`src/i18n/i18next.d.ts` z `declare module 'i18next'` i `CustomTypeOptions` wskazującym
na strukturę zasobów (import typów z JSON `pl` jako `resources`). Daje autouzupełnianie
i błąd `tsc` przy literówce klucza.

## Kolejność ekstrakcji (per plik, wg wielkości)

1. `common.json` + AppShell/ComingSoon/NotFound/Forbidden/Require*/AuthCallback (proste).
2. `company.json` — CompanyProfile.tsx (świeżo przepisany) + CompanyDetail.tsx (plurale, taby).
3. `auth.json` + Login.tsx + auth.ts (błędy jako klucze).
4. `profile.json` + validation.json — Profile.tsx (największy, formularz + zod + toasty).
5. `media.json` — use-company-media.ts.

## Weryfikacja

- `pnpm build` (tsc + vite) zielone; typy kluczy działają (celowa literówka → błąd `tsc`).
- `pnpm lint` czysto.
- Grep kontrolny: brak polskich literałów w JSX/atrybutach (poza JSON) w objętych plikach.
- Ręcznie: render `/login`, `/profile`, profil firmy — teksty i plurale poprawne
  (0/1/2/5 pracowników, plików). Toasty błędów logowania po kluczach.
- CLAUDE.md: reguła „treści z JSON" jest już zapisana; dopisać krótką notkę „i18n: react-i18next, klucze w src/locales/pl/<ns>.json".

## Uwaga o zakresie

Dynamiczne dane z bazy (nazwy firm, kategorii, certyfikatów, parametrów, opisy) **nie są**
tłumaczeniami UI — zostają jak są. i18n obejmuje wyłącznie statyczny tekst interfejsu.
Na start jeden język (pl); struktura gotowa na dodanie `en` bez zmian w komponentach.
