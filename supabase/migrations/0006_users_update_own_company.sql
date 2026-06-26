-- ============================================================
--  S-02 — Faza 7: edycja pracowników własnej firmy
--  Owner edytuje dane pracowników (job_title, phone, is_visible_on_profile)
--  widocznych na profilu firmy. Dotąd users_update_self (0002) pozwalał
--  edytować TYLKO własny wiersz (id = auth.uid()); tu dokładamy politykę
--  pozwalającą edytować KAŻDY wiersz własnej firmy.
--
--  Jedyna zmiana polityki w całej zmianie. Bez zmian kolumn → regeneracja
--  typów niepotrzebna.
--
--  Bezpieczeństwo: USING zawęża edytowalne wiersze do własnej firmy, a
--  WITH CHECK wymaga, by po edycji wiersz NADAL należał do własnej firmy —
--  owner nie przeniesie pracownika do obcej firmy ani nie zagarnie obcego.
--  Współistnieje z users_update_self (Postgres łączy polityki przez OR).
-- ============================================================

CREATE POLICY users_update_own_company
    ON users
    FOR UPDATE
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());
