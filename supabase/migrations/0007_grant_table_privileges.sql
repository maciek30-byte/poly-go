-- ============================================================
--  FIX — jawne GRANT-y na tabele public dla roli authenticated
--
--  Problem: na produkcji żądania PostgREST do /rest/v1/users (i innych tabel
--  profilu) zwracały 403 mimo poprawnego tokenu (role=authenticated) i mimo
--  istniejących polityk RLS (np. users_select_all USING(true)).
--
--  Przyczyna: PostgREST sprawdza NAJPIERW przywileje tabeli (GRANT), dopiero
--  potem RLS. Migracje 0001–0006 nadawały GRANT jawnie tylko dla categories,
--  certificates i user_roles. Pozostałe tabele (users, companies, media,
--  highlights, pivoty, czaty…) działały lokalnie wyłącznie dzięki domyślnym
--  przywilejom lokalnego obrazu Supabase, których środowisko produkcyjne nie
--  ma — stąd „działa lokalnie, 403 na prodzie".
--
--  Rozwiązanie: nadać przywileje komplementarne do polityk RLS każdej tabeli.
--  RLS nadal zawęża WIERSZE; GRANT tylko otwiera tabelę dla PostgREST.
--  Idempotentne: GRANT jest bezpieczny do powtórnego wykonania.
--
--  Zakres przywilejów = zbiór poleceń obsłużonych przez polityki tabeli:
--    SELECT,UPDATE → companies, users
--    SELECT only   → parameter_definitions
--    SELECT + write (ALL policy) → company_categories, company_certificates,
--                    company_media, company_parameter_values, highlights, favorites
--    SELECT,INSERT → conversations, messages
--
--  DELETE/INSERT na users celowo NIE nadawane — brak polityk INSERT/DELETE
--  (profile seeduje service_role, który omija RLS i granty).
-- ============================================================

-- Read-only słownik
GRANT SELECT ON parameter_definitions TO authenticated;

-- SELECT + UPDATE (RLS zawęża do siebie / własnej firmy)
GRANT SELECT, UPDATE ON users     TO authenticated;
GRANT SELECT, UPDATE ON companies TO authenticated;

-- Tabele z polityką ALL — pełny CRUD, RLS zawęża do własnej firmy
GRANT SELECT, INSERT, UPDATE, DELETE ON company_categories       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_certificates     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_media            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_parameter_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlights               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorites                TO authenticated;

-- Czat — odczyt + tworzenie (brak polityk UPDATE/DELETE)
GRANT SELECT, INSERT ON conversations TO authenticated;
GRANT SELECT, INSERT ON messages      TO authenticated;
