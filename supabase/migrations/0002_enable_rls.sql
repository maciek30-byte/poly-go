-- ============================================================
--  F-02 multi-tenant data layer — Row Level Security
--  Polityki pisane wyłącznie dla roli `authenticated`.
--  `service_role` automatycznie bypassuje RLS w Supabase — to celowe,
--  bo seeding firm/userów odbywa się przez SQL z service_role key
--  poza aplikacją (per PRD: brak self-registration, Operator seeduje ręcznie).
--
--  Macierz widoczności (uproszczenie):
--    categories, certificates           -> publiczne SELECT, mutacje przez service_role
--    companies                          -> SELECT all-authenticated; UPDATE tylko swoja firma
--    users                              -> SELECT all-authenticated (UI potrzebuje full_name/job_title nadawcy w czacie); UPDATE tylko self
--    company_categories, _certificates  -> SELECT all-authenticated; mutacje tylko swoja firma
--    company_media                      -> SELECT all-authenticated; mutacje tylko swoja firma
--    favorites                          -> prywatne per user (user_id = auth.uid())
--    conversations                      -> tylko uczestnicy (participant_1/2 = auth.uid()); immutable po insercie
--    messages                           -> tylko uczestnicy konwersacji; INSERT wymusza sender_id = auth.uid(); UPDATE/DELETE zablokowane
--
--  read_at na messages aktualizuje wyłącznie SECURITY DEFINER funkcja
--  mark_message_read(uuid) — polityka UPDATE wymagałaby edycji rekordu obcego usera.
-- ============================================================


-- ============================================================
-- HELPER — zwraca company_id zalogowanego usera
-- ============================================================
-- STABLE: planner cache'uje wynik per statement, brak N+1 w bulk SELECT.
-- SECURITY DEFINER: omija RLS na users (samo by się rekursywnie zablokowało).
-- search_path explicit żeby nie dało się tego nadpisać przez user-level setting.

CREATE OR REPLACE FUNCTION current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM users WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION current_user_company_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION current_user_company_id() TO authenticated;


-- ============================================================
-- DICTIONARIES — publiczne, bez RLS
-- ============================================================

GRANT SELECT ON categories   TO authenticated;
GRANT SELECT ON certificates TO authenticated;


-- ============================================================
-- COMPANIES
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select_all
    ON companies
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY companies_update_own
    ON companies
    FOR UPDATE
    TO authenticated
    USING      (id = current_user_company_id())
    WITH CHECK (id = current_user_company_id());

-- INSERT i DELETE blokowane — tylko service_role (seeding offline).


-- ============================================================
-- USERS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- KRYTYCZNE: SELECT musi być publiczne dla authenticated, inaczej JOIN-y w
-- innych politykach (przez current_user_company_id() albo bezpośrednio)
-- zwracają NULL i izolacja blokuje wszystko. Patrz Critical Implementation
-- Details w plan.md.
CREATE POLICY users_select_all
    ON users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY users_update_self
    ON users
    FOR UPDATE
    TO authenticated
    USING      (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- INSERT i DELETE blokowane — seeding profili przez service_role.


-- ============================================================
-- COMPANY_CATEGORIES (pivot)
-- ============================================================

ALTER TABLE company_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_categories_select_all
    ON company_categories
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY company_categories_modify_own
    ON company_categories
    FOR ALL
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());


-- ============================================================
-- COMPANY_CERTIFICATES (pivot)
-- ============================================================

ALTER TABLE company_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_certificates_select_all
    ON company_certificates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY company_certificates_modify_own
    ON company_certificates
    FOR ALL
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());


-- ============================================================
-- COMPANY_MEDIA
-- ============================================================

ALTER TABLE company_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select_all
    ON company_media
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY media_modify_own
    ON company_media
    FOR ALL
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());


-- ============================================================
-- FAVORITES — prywatne per user
-- ============================================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorites_own
    ON favorites
    FOR ALL
    TO authenticated
    USING      (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================
-- CONVERSATIONS — tylko uczestnicy; immutable po insercie
-- ============================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_participants_select
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
        participant_1_id = auth.uid()
        OR participant_2_id = auth.uid()
    );

CREATE POLICY conv_insert_self
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        participant_1_id = auth.uid()
        OR participant_2_id = auth.uid()
    );

-- UPDATE i DELETE celowo zablokowane (brak polityk) — konwersacja immutable.


-- ============================================================
-- MESSAGES — tylko uczestnicy konwersacji; immutable
-- ============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY msg_select_in_conv
    ON messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
        )
    );

CREATE POLICY msg_insert_self
    ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
        )
    );

-- UPDATE i DELETE celowo zablokowane (brak polityk) — wiadomość immutable
-- (audit trail per PRD). Zmiana read_at idzie wyłącznie przez funkcję poniżej.


-- ============================================================
-- mark_message_read(uuid) — jedyny dozwolony mutator messages.read_at
-- ============================================================
-- SECURITY DEFINER żeby ominąć brak polityki UPDATE.
-- Logika dopuszcza tylko uczestnika konwersacji do oznaczenia wiadomości jako przeczytanej.
-- Jeśli wiadomość już ma read_at != NULL, no-op (idempotent).

CREATE OR REPLACE FUNCTION mark_message_read(message_id UUID)
RETURNS messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_row messages;
BEGIN
    UPDATE messages m
    SET read_at = COALESCE(m.read_at, NOW())
    WHERE m.id = message_id
      AND EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = m.conversation_id
            AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
    RETURNING m.* INTO updated_row;

    IF updated_row.id IS NULL THEN
        RAISE EXCEPTION 'Message not found or current user is not a participant of the conversation'
            USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;

    RETURN updated_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_message_read(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION mark_message_read(UUID) TO authenticated;
