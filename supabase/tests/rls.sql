-- ============================================================
--  F-02 — RLS isolation test harness
--  Run with: pnpm db:test:rls
--  Or:       psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/rls.sql
--
--  What it does:
--   1. As `postgres` (bypasses RLS): wipe + seed two companies A and B,
--      two auth.users (uuid_a, uuid_b), two profile rows, two favorites
--      (one per user), one conversation between A and B, one message from A.
--   2. Switch to `authenticated` impersonating user A. Run 8 assertions
--      proving the row-level isolation matrix from plan.md / Phase 3 holds.
--   3. RAISE EXCEPTION on the first failure; RAISE NOTICE 'RLS isolation OK'
--      if every assertion passes.
--   4. Clean up.
--
--  Idempotent — safe to rerun.
-- ============================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- ============================================================
-- 0. Setup (as superuser — bypasses RLS)
-- ============================================================

-- Deterministic UUIDs so the test can refer to them by name.
DO $setup$
DECLARE
    company_a UUID := '11111111-1111-1111-1111-1111111111aa';
    company_b UUID := '22222222-2222-2222-2222-2222222222bb';
    user_a    UUID := '33333333-3333-3333-3333-3333333333aa';
    user_b    UUID := '44444444-4444-4444-4444-4444444444bb';
    conv_ab   UUID := '55555555-5555-5555-5555-555555555555';
    msg_a     UUID := '66666666-6666-6666-6666-6666666666aa';
    hl_b      UUID := '77777777-7777-7777-7777-7777777777bb';
    test_cat  INTEGER;
    def_b     INTEGER;
BEGIN
    -- Clear any leftovers from a prior run.
    DELETE FROM messages       WHERE id IN (msg_a);
    DELETE FROM conversations  WHERE id = conv_ab;
    DELETE FROM favorites      WHERE user_id IN (user_a, user_b);
    DELETE FROM user_roles     WHERE user_id IN (user_a, user_b);
    DELETE FROM highlights     WHERE company_id IN (company_a, company_b);
    DELETE FROM company_parameter_values WHERE company_id IN (company_a, company_b);
    DELETE FROM users          WHERE id IN (user_a, user_b);
    DELETE FROM auth.users     WHERE id IN (user_a, user_b);
    DELETE FROM companies      WHERE id IN (company_a, company_b);

    -- Companies
    INSERT INTO companies (id, name, description, region) VALUES
        (company_a, 'Firma A', 'Test company A', 'Mazowieckie'),
        (company_b, 'Firma B', 'Test company B', 'Małopolskie');

    -- A parameter definition (słownik) tied to any existing category, plus a
    -- value + a highlight owned by company B — targets for the write-isolation
    -- assertions (user A must not touch B's parameters/highlights).
    SELECT id INTO test_cat FROM categories ORDER BY id LIMIT 1;
    INSERT INTO parameter_definitions (category_id, key, label, value_type)
    VALUES (test_cat, 'rls_test_key', 'RLS Test Param', 'text')
    ON CONFLICT (category_id, key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO def_b;

    INSERT INTO company_parameter_values (company_id, definition_id, value)
    VALUES (company_b, def_b, 'B-owned value');

    INSERT INTO highlights (id, company_id, title, sort_order) VALUES
        (hl_b, company_b, 'B highlight', 0);

    -- auth.users (minimal columns — Supabase tolerates this for service-level tests)
    INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at)
    VALUES
        (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW()),
        (user_b, 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW());

    -- Profiles
    INSERT INTO users (id, company_id, full_name, job_title) VALUES
        (user_a, company_a, 'Alice A', 'Handlowiec'),
        (user_b, company_b, 'Bob B',   'Handlowiec');

    -- Favorites: each user marks the other's company.
    INSERT INTO favorites (user_id, company_id) VALUES
        (user_a, company_b),
        (user_b, company_a);

    -- Roles: A is super_admin, B is a plain user (RBAC isolation test).
    INSERT INTO user_roles (user_id, role) VALUES
        (user_a, 'super_admin'),
        (user_b, 'user');

    -- Conversation A <-> B + one message from A.
    INSERT INTO conversations (id, participant_1_id, participant_2_id) VALUES
        (conv_ab, user_a, user_b);
    INSERT INTO messages (id, conversation_id, sender_id, content) VALUES
        (msg_a, conv_ab, user_a, 'hello from A');

    RAISE NOTICE 'Setup complete: companies, users, favorites, conversation, message seeded.';
END
$setup$;


-- ============================================================
-- Helper: impersonate `authenticated` as a specific user
-- ============================================================
-- SET LOCAL ROLE + SET LOCAL request.jwt.claims drives auth.uid() inside RLS.
-- All assertions run in the same transaction so SET LOCAL persists.

-- ============================================================
-- TEST 1: companies SELECT is public to authenticated
-- ============================================================
DO $test1$
DECLARE
    visible_count INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    SELECT count(*) INTO visible_count
    FROM companies
    WHERE id IN ('11111111-1111-1111-1111-1111111111aa', '22222222-2222-2222-2222-2222222222bb');

    IF visible_count <> 2 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: user A should see BOTH companies (got %)', visible_count;
    END IF;
    RAISE NOTICE 'TEST 1 OK: user A sees both companies (public SELECT).';

    RESET ROLE;
END
$test1$;


-- ============================================================
-- TEST 2: UPDATE of foreign company is silently filtered to 0 rows
-- ============================================================
DO $test2$
DECLARE
    affected INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    UPDATE companies SET name = 'hacked' WHERE id = '22222222-2222-2222-2222-2222222222bb';
    GET DIAGNOSTICS affected = ROW_COUNT;

    IF affected <> 0 THEN
        RAISE EXCEPTION 'TEST 2 FAILED: user A modified company B (affected=%)', affected;
    END IF;
    RAISE NOTICE 'TEST 2 OK: user A cannot UPDATE company B (0 rows affected).';

    RESET ROLE;
END
$test2$;


-- ============================================================
-- TEST 2a: company_parameter_values — A cannot write B's parameters
-- ============================================================
-- INSERT for company B blocked by WITH CHECK; UPDATE/DELETE of B's existing
-- value filtered to 0 rows by USING. Mutacje tylko własnej firmy.
DO $test2a$
DECLARE
    def_b    INTEGER;
    blocked  BOOLEAN := FALSE;
    affected INTEGER;
BEGIN
    SELECT id INTO def_b FROM parameter_definitions WHERE key = 'rls_test_key' LIMIT 1;

    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO company_parameter_values (company_id, definition_id, value)
        VALUES ('22222222-2222-2222-2222-2222222222bb', def_b, 'hacked');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 2a FAILED: user A inserted a parameter for company B';
    END IF;

    UPDATE company_parameter_values SET value = 'hacked'
    WHERE company_id = '22222222-2222-2222-2222-2222222222bb' AND definition_id = def_b;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN
        RAISE EXCEPTION 'TEST 2a FAILED: user A updated company B parameter (affected=%)', affected;
    END IF;

    RAISE NOTICE 'TEST 2a OK: user A cannot write company B parameters.';

    RESET ROLE;
END
$test2a$;


-- ============================================================
-- TEST 2b: highlights — A cannot write B's highlights
-- ============================================================
DO $test2b$
DECLARE
    blocked  BOOLEAN := FALSE;
    affected INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO highlights (company_id, title, sort_order)
        VALUES ('22222222-2222-2222-2222-2222222222bb', 'hacked', 0);
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 2b FAILED: user A inserted a highlight for company B';
    END IF;

    UPDATE highlights SET title = 'hacked'
    WHERE company_id = '22222222-2222-2222-2222-2222222222bb';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN
        RAISE EXCEPTION 'TEST 2b FAILED: user A updated company B highlight (affected=%)', affected;
    END IF;

    RAISE NOTICE 'TEST 2b OK: user A cannot write company B highlights.';

    RESET ROLE;
END
$test2b$;


-- ============================================================
-- TEST 3: favorites are private — A does not see B's favorites
-- ============================================================
DO $test3$
DECLARE
    own_count    INTEGER;
    other_count  INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    SELECT count(*) INTO own_count   FROM favorites WHERE user_id = '33333333-3333-3333-3333-3333333333aa';
    SELECT count(*) INTO other_count FROM favorites WHERE user_id = '44444444-4444-4444-4444-4444444444bb';

    IF own_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: user A should see 1 own favorite (got %)', own_count;
    END IF;
    IF other_count <> 0 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: user A leaked % of B''s favorites', other_count;
    END IF;
    RAISE NOTICE 'TEST 3 OK: favorites private (A sees 1 own, 0 from B).';

    RESET ROLE;
END
$test3$;


-- ============================================================
-- TEST 4: inserting a favorite impersonating B is blocked by WITH CHECK
-- ============================================================
DO $test4$
DECLARE
    blocked BOOLEAN := FALSE;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO favorites (user_id, company_id)
        VALUES ('44444444-4444-4444-4444-4444444444bb', '11111111-1111-1111-1111-1111111111aa');
        -- If we got here, WITH CHECK didn't fire.
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;

    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 4 FAILED: user A successfully wrote a favorite as user B';
    END IF;
    RAISE NOTICE 'TEST 4 OK: cross-user favorite INSERT blocked by WITH CHECK.';

    RESET ROLE;
END
$test4$;


-- ============================================================
-- TEST 5: messages SELECT — A is a participant so sees their conv's message
-- ============================================================
DO $test5$
DECLARE
    visible_count INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    SELECT count(*) INTO visible_count FROM messages
    WHERE id = '66666666-6666-6666-6666-6666666666aa';

    IF visible_count <> 1 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: user A should see message in their conv (got %)', visible_count;
    END IF;
    RAISE NOTICE 'TEST 5 OK: user A sees message in their own conversation.';

    RESET ROLE;
END
$test5$;


-- ============================================================
-- TEST 6: A cannot insert a message into a conversation they don't belong to
-- ============================================================
-- We simulate this by removing A from the conversation (swap participants) and
-- then trying to insert. Cleaner approach: build a separate conv between B and a
-- third party. For MVP we mutate inline as `postgres` and roll back.
DO $test6$
DECLARE
    foreign_conv UUID := '77777777-7777-7777-7777-7777777777cc';
    user_c       UUID := '88888888-8888-8888-8888-8888888888cc';
    company_c    UUID := '99999999-9999-9999-9999-999999999999';
    blocked      BOOLEAN := FALSE;
BEGIN
    -- Setup conv between B and C (A is NOT a participant).
    RESET ROLE; -- back to postgres / superuser
    INSERT INTO companies (id, name, description) VALUES (company_c, 'Firma C', 'third party');
    INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at)
    VALUES (user_c, 'c@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW());
    INSERT INTO users (id, company_id, full_name, job_title)
    VALUES (user_c, company_c, 'Carol C', 'Handlowiec');
    INSERT INTO conversations (id, participant_1_id, participant_2_id)
    VALUES (foreign_conv, '44444444-4444-4444-4444-4444444444bb', user_c);

    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES (foreign_conv, '33333333-3333-3333-3333-3333333333aa', 'sneaky');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;

    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 6 FAILED: user A inserted a message into a foreign conversation';
    END IF;
    RAISE NOTICE 'TEST 6 OK: non-participant cannot INSERT into foreign conversation.';

    RESET ROLE;
END
$test6$;


-- ============================================================
-- TEST 7: A in their own conv cannot impersonate sender_id = B
-- ============================================================
DO $test7$
DECLARE
    blocked BOOLEAN := FALSE;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES (
            '55555555-5555-5555-5555-555555555555',
            '44444444-4444-4444-4444-4444444444bb', -- pretending to be B
            'forged'
        );
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;

    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 7 FAILED: user A inserted a message with sender_id = B';
    END IF;
    RAISE NOTICE 'TEST 7 OK: sender_id spoofing blocked by WITH CHECK.';

    RESET ROLE;
END
$test7$;


-- ============================================================
-- TEST 8: A cannot insert company_media for company B
-- ============================================================
DO $test8$
DECLARE
    blocked BOOLEAN := FALSE;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    BEGIN
        INSERT INTO company_media (company_id, media_type, file_url)
        VALUES ('22222222-2222-2222-2222-2222222222bb', 'PHOTO', 'storage/path.jpg');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;

    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 8 FAILED: user A wrote media for company B';
    END IF;
    RAISE NOTICE 'TEST 8 OK: cross-company media INSERT blocked.';

    RESET ROLE;
END
$test8$;


-- ============================================================
-- TEST 8a: Storage — A cannot write to company B's prefix
-- ============================================================
-- Polityki storage.objects (company-media) wymuszają pierwszy folder ścieżki =
-- current_user_company_id(). A (firma 1111..aa) może wgrać do "1111..aa/...",
-- ale NIE do "2222..bb/...".
DO $test8a$
DECLARE
    blocked   BOOLEAN := FALSE;
    own_ok    BOOLEAN := FALSE;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    -- Zapis do cudzego prefiksu (firma B) — zablokowany przez WITH CHECK.
    BEGIN
        INSERT INTO storage.objects (bucket_id, name)
        VALUES ('company-media', '22222222-2222-2222-2222-2222222222bb/photos/x.jpg');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'TEST 8a FAILED: user A wrote to company B storage prefix';
    END IF;

    -- Zapis do własnego prefiksu (firma A) — dozwolony.
    BEGIN
        INSERT INTO storage.objects (bucket_id, name)
        VALUES ('company-media', '11111111-1111-1111-1111-1111111111aa/photos/ok.jpg');
        own_ok := TRUE;
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        own_ok := FALSE;
    END;
    IF NOT own_ok THEN
        RAISE EXCEPTION 'TEST 8a FAILED: user A could NOT write to own storage prefix';
    END IF;

    RAISE NOTICE 'TEST 8a OK: storage write scoped to own company prefix.';

    RESET ROLE;
END
$test8a$;


-- ============================================================
-- TEST 9: user_roles SELECT-self — A sees their own role row
-- ============================================================
DO $test9$
DECLARE
    own_count INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    SELECT count(*) INTO own_count
    FROM user_roles WHERE user_id = '33333333-3333-3333-3333-3333333333aa';

    IF own_count <> 1 THEN
        RAISE EXCEPTION 'TEST 9 FAILED: user A should see 1 own role row (got %)', own_count;
    END IF;
    RAISE NOTICE 'TEST 9 OK: user A sees their own role (SELECT-self).';

    RESET ROLE;
END
$test9$;


-- ============================================================
-- TEST 10: user_roles is private — A does NOT see B's role row
-- ============================================================
DO $test10$
DECLARE
    other_count INTEGER;
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-3333333333aa","role":"authenticated"}';

    SELECT count(*) INTO other_count
    FROM user_roles WHERE user_id = '44444444-4444-4444-4444-4444444444bb';

    IF other_count <> 0 THEN
        RAISE EXCEPTION 'TEST 10 FAILED: user A leaked B''s role row (got %)', other_count;
    END IF;
    RAISE NOTICE 'TEST 10 OK: user A cannot see B''s role (SELECT-self isolation).';

    RESET ROLE;
END
$test10$;


-- ============================================================
-- Final banner (inside a DO block — psql can't RAISE NOTICE bare)
-- ============================================================
DO $banner$
BEGIN
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'RLS isolation OK — 13/13 assertions passed';
    RAISE NOTICE '----------------------------------------';
END
$banner$;

-- ============================================================
-- Cleanup — transaction rollback removes all seeded test rows.
-- ============================================================
ROLLBACK;
