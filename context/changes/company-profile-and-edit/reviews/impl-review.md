<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Profil firmy + edycja wizytówki (S-03 + S-02)

- **Plan**: context/changes/company-profile-and-edit/plan.md
- **Scope**: 7 z 7 faz (cała zmiana)
- **Date**: 2026-06-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 krytycznych · 6 ostrzeżeń · 3 obserwacje

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS (build ✓, RLS 14/14 ✓, lint = baseline pre-existing) |

Drift praktycznie zerowy — 7 faz zgodnie z planem, "What We're NOT Doing" w pełni respektowane (realtime czat, GUS/KRS, self-registration, wyszukiwarka S-05, brak zmian istniejących polityk poza 0006). Komplet asercji RLS (2a/2b/8a/11) dodany.

## Findings

### F1 — Nieatomowa wymiana pivotów/highlights (delete + insert)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — realny tradeoff; zatrzymaj się i przemyśl
- **Dimension**: Safety & Quality
- **Location**: src/lib/use-own-company.ts:210-230, 266-282 + src/routes/Profile.tsx:169-193
- **Detail**: saveCompanyCategories/Certificates/Highlights robią delete-all potem insert (dwa round-tripy). Błąd insertu po udanym delete → firma z pustymi kategoriami/certami/Top-5. onSubmit leci 5 zapisów sekwencyjnie bez transakcji; błąd w środku zostawia profil w stanie częściowym, toast mówi tylko "nie udało się zapisać". Najdotkliwsze dla ręcznego Top-5.
- **Fix A ⭐ Recommended**: po błędzie w onSubmit wywołać onSaved()/reload, by formularz pokazał realny stan z bazy + jaśniejszy komunikat.
  - Strength: Tanie (kilka linii), user widzi prawdę. Reload już istnieje (state.reload).
  - Tradeoff: Nie usuwa nieatomowości — chroni przed cichym stanem.
  - Confidence: HIGH.
  - Blind spot: Okno utraty danych nadal istnieje, tylko widoczne.
- **Fix B**: przenieść każdą wymianę do RPC plpgsql (delete+insert w jednej transakcji, SECURITY INVOKER).
  - Strength: Prawdziwa atomowość.
  - Tradeoff: Nowa migracja + 3 funkcje; więcej pracy niż reszta fazy.
  - Confidence: MED — ostrożność z RLS w SECURITY INVOKER.
  - Blind spot: Pilot ma 2 firmy — czy atomowość warta kosztu teraz?
- **Decision**: PENDING

### F2 — file_url renderowany w <a href> bez walidacji schematu (stored XSS)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — szybka decyzja; poprawka oczywista i wąska
- **Dimension**: Safety & Quality
- **Location**: src/components/CompanyProfile.tsx:287
- **Detail**: `<a href={d.file_url} target="_blank">` renderuje file_url (TEXT z bazy) bez sprawdzenia schematu. Dziś file_url wstawiany tylko przez getPublicUrl() (nieedytowalny w UI), wektor wąski; ale logo_url jest edytowalne dowolnym UPDATE companies. javascript: URL w <a href> wykona skrypt po kliknięciu, a profil jest publiczny dla wszystkich authenticated.
- **Fix**: helper safeHref(url) zwracający url tylko gdy new URL(url).protocol === 'https:', inaczej undefined; użyć dla href dokumentów (i logo/website gdy SHOW_REGISTRY włączone).
- **Decision**: PENDING

### F3 — Bucket public=true: dokumenty PDF dostępne anonimowo

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — stawka produktowa/architektoniczna; przemyśl
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/0005_storage_company_media.sql:19-30
- **Detail**: public=true → pliki przez /object/public/... dla każdego (nie tylko zalogowanych), polityki SELECT TO authenticated obchodzone. URL = company_id + timestamp + nazwa (częściowo przewidywalny). Logo/galeria OK, ale dokumenty PDF firm wyciekają anonimowo. Decyzja świadoma (komentarz migracji) — akceptacja ryzyka, nie izolacja.
- **Fix A ⭐ Recommended**: potwierdzić w PRD, że publiczna dostępność dokumentów jest zamierzona na pilot; zostawić jak jest.
  - Strength: Zero pracy, zgodne z "prościej w pilocie".
  - Tradeoff: Dokumenty firm jawne dla świata.
  - Confidence: HIGH — pilot, 2 firmy, dane demo.
  - Blind spot: Czy realne firmy wgrają wrażliwe PDF-y?
- **Fix B**: osobny prywatny bucket na dokumenty + signed URL.
  - Strength: Dokumenty za autoryzacją.
  - Tradeoff: Nowa migracja + zmiana use-company-media + render z signed URL.
  - Confidence: MED — signed URL wygasają, odświeżanie w UI.
  - Blind spot: Większy koszt niż reszta fazy 6.
- **Decision**: PENDING

### F4 — Upload/usuwanie mediów: brak rollbacku → sieroty w Storage

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — szybka decyzja; poprawka oczywista i wąska
- **Dimension**: Safety & Quality
- **Location**: src/lib/use-company-media.ts:68-98 (upload), 106-133 (remove)
- **Detail**: (a) upload: storage.upload się uda, ale insert company_media / update logo_url zawiedzie → plik sierota (publiczny URL działa, nieindeksowany), brak storage.remove w gałęzi błędu. (b) remove/removeLogo: kasują wiersz DB PRZED obiektem Storage; jeśli pathFromPublicUrl zwróci null lub remove zawiedzie — plik osierocony na zawsze.
- **Fix**: w gałęzi błędu uploadu wywołać storage.remove([path]) przed return false; w remove logować ostrzeżenie gdy pathFromPublicUrl zwróci null zamiast cicho pominąć.
- **Decision**: PENDING

### F5 — useFavorite.toggle: race na szybkim podwójnym kliknięciu

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — szybka decyzja; poprawka oczywista i wąska
- **Dimension**: Safety & Quality
- **Location**: src/lib/use-favorite.ts:49-70
- **Detail**: toggle blokuje na `pending` (stan Reacta, async). Dwa kliknięcia w tym samym ticku widzą pending===false i oba startują → upsert + delete w nieokreślonej kolejności. Okno praktycznie zamknięte przez disabled={favoritePending} na przycisku, ale sam hook nie jest odporny.
- **Fix**: useRef jako synchroniczny zamek (if (pendingRef.current) return; pendingRef.current = true) obok stanu pending.
- **Decision**: PENDING

### F6 — Modułowy `let requestSeq` w hookach per-instancja

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — realny tradeoff; zatrzymaj się i przemyśl
- **Dimension**: Pattern Consistency
- **Location**: src/lib/use-own-company.ts:70, use-company-employees.ts:23, use-company-profile.ts:58
- **Detail**: Trzy hooki kopiują modułowy `let requestSeq` z auth-store.ts (singleton) — ale jako hooki per-komponent dzielą jeden licznik między instancjami. Dwie instancje useCompanyProfile dla różnych firm na jednej stronie będą się wzajemnie unieważniać (ostatnia wygra, reszta utknie w loading). Dziś nieaktywne (każdy renderowany pojedynczo). useFavorite robi to poprawnie (lokalny `active`).
- **Fix**: zamienić modułowy `let` na useRef(0) (licznik lokalny per instancja) w trzech hookach.
- **Decision**: PENDING

### F7 — RLS users_select_all: telefony niewidocznych pracowników czytelne dla każdego authenticated

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — realny tradeoff; pause to reason
- **Dimension**: Safety & Quality
- **Location**: src/lib/use-company-profile.ts:81,130 + supabase/migrations/0002_enable_rls.sql:84-88
- **Detail**: is_visible_on_profile to filtr PREZENTACJI (embed query + shape), nie RLS. Dowolny authenticated może `select phone from users where company_id=X` i pobrać telefony "niewidocznych". Zgodne z planem (założył users_select_all jako wystarczające) → nie drift, ale warto świadomie potwierdzić, że wszystkie dane users są jawne dla zalogowanych.
- **Fix**: jeśli niepożądane — zawęzić SELECT w RLS (pełny wiersz tylko gdy company_id = current_user_company_id() OR is_visible_on_profile).
- **Decision**: PENDING

### F8 — Polityka 0006 nie ogranicza zakresu kolumn (ryzyko regresji)

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — realny tradeoff; pause to reason
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/0006_users_update_own_company.sql:17-22 + supabase/tests/rls.sql TEST 11
- **Detail**: users_update_own_company daje owner pełny UPDATE wszystkich kolumn wierszy własnej firmy. Dziś bezpieczne (users nie ma role/email; role w osobnej tabeli z self-policy; zmiana company_id łapana przez WITH CHECK). Gdy dojdzie wrażliwa kolumna, owner zmieni ją współpracownikom przez surowy PostgREST — RLS nie filtruje kolumn.
- **Fix**: komentarz ostrzegawczy w migracji + (opc.) TEST asercja, że przeniesienie pracownika do obcej firmy jest blokowane.
- **Decision**: PENDING

### F9 — Seed dowiązuje ownerów po hardkodowanym UUID, nie po e-mailu

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — realny tradeoff; pause to reason
- **Dimension**: Plan Adherence
- **Location**: supabase/seed.sql
- **Detail**: Plan: dowiązanie po e-mailu z RAISE NOTICE/skip gdy konto nie istnieje. Implementacja: hardkodowane UUID + seed sam INSERTuje auth.users (lokalny db:reset ma pusty auth.users — decyzja świadoma, opisana w nagłówku seeda). Ryzyko: jeśli UUID nie zgadzają się z realnymi auth.users.id na PROD, owner nie dowiąże się mimo "sukcesu" seeda.
- **Fix**: zweryfikować UUID względem prod przed seedem produkcyjnym.
- **Decision**: PENDING
