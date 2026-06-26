-- ============================================================
--  S-03 + S-02 — Storage bucket dla mediów firm (logo, galeria, PDF)
--  Bucket `company-media`: publiczny ODCZYT (logo/zdjęcia/PDF pokazywane
--  przez public URL — prościej niż signed URL w pilocie), ZAPIS tylko do
--  własnego prefiksu firmy. Konwencja ścieżki: "{company_id}/...".
--
--  Izolacja zapisu: pierwszy segment ścieżki musi równać się
--  current_user_company_id() — tej samej funkcji co RLS na company_media.
--  Bez zmian kolumn → regeneracja typów niepotrzebna.
-- ============================================================


-- ============================================================
-- 1. Bucket
-- ============================================================
-- public = true: odczyt plików przez public URL bez tokenu (logo na profilu).
-- Limit rozmiaru 10 MB egzekwowany też po stronie klienta (walidacja uploadu).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-media',
    'company-media',
    true,
    10485760, -- 10 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
    SET public             = EXCLUDED.public,
        file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- 2. Polityki na storage.objects (scoped do bucketa company-media)
-- ============================================================
-- SELECT: publiczny odczyt dla authenticated (bucket i tak public, ale jawna
-- polityka jest czytelna i spójna z resztą schematu).
-- INSERT/UPDATE/DELETE: tylko gdy pierwszy folder ścieżki = company_id usera.

DROP POLICY IF EXISTS company_media_read   ON storage.objects;
DROP POLICY IF EXISTS company_media_insert ON storage.objects;
DROP POLICY IF EXISTS company_media_update ON storage.objects;
DROP POLICY IF EXISTS company_media_delete ON storage.objects;

CREATE POLICY company_media_read
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'company-media');

CREATE POLICY company_media_insert
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'company-media'
        AND (storage.foldername(name))[1] = current_user_company_id()::text
    );

CREATE POLICY company_media_update
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'company-media'
        AND (storage.foldername(name))[1] = current_user_company_id()::text
    )
    WITH CHECK (
        bucket_id = 'company-media'
        AND (storage.foldername(name))[1] = current_user_company_id()::text
    );

CREATE POLICY company_media_delete
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'company-media'
        AND (storage.foldername(name))[1] = current_user_company_id()::text
    );
