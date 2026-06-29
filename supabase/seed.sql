-- ============================================================
--  Seed — runs after migrations on `supabase db reset`.
--  On prod the Operator runs this manually once after `supabase db push`.
--
--  Dwie warstwy:
--   1. Słowniki (categories, certificates) — globalne.
--   2. Słownik parametrów (parameter_definitions) — data-driven, per kategoria.
--   3. Dwie firmy (Ty + Grzegorz) dowiązane do realnych kont auth.users PO UUID.
--
--  Konta auth.users: na zdalnej instancji już istnieją (logowanie Google).
--  Lokalnie po `db:reset` są puste — dlatego seed wstawia minimalne wiersze
--  auth.users z `ON CONFLICT (id) DO NOTHING` (lokalnie tworzy, zdalnie no-op,
--  nie nadpisuje kont Google). public.users ma FK na auth.users(id), więc to
--  wstawienie jest warunkiem dowiązania firmy.
--
--  Całość idempotentna — bezpieczna przy wielokrotnym `db:reset`.
-- ============================================================

-- ============================================================
-- 1. Słowniki
-- ============================================================

INSERT INTO categories (name) VALUES
    ('Producent'),
    ('Recykler'),
    ('Dystrybutor'),
    ('Trader'),
    ('Serwis')
ON CONFLICT (name) DO NOTHING;

INSERT INTO certificates (name, icon_url) VALUES
    ('ISO 9001',  NULL),
    ('ISO 14001', NULL),
    ('CE',        NULL),
    ('REACH',     NULL)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 2. Słownik parametrów (data-driven) dla kilku branż
-- ============================================================
-- Dowiązanie po nazwie kategorii (id-agnostic — SERIAL może się różnić między
-- środowiskami). Każdy value_type reprezentowany: number(+unit), text, array, enum.
-- Nowa branża = dopisanie wierszy tutaj, zero zmian kodu.

INSERT INTO parameter_definitions (category_id, key, label, unit, value_type, sort_order)
SELECT c.id, d.key, d.label, d.unit, d.value_type, d.sort_order
FROM (VALUES
    -- Producent
    ('Producent', 'polymer_types',     'Przetwarzane polimery',      NULL,        'array',  10),
    ('Producent', 'machine_count',      'Liczba maszyn',              'szt.',      'number', 20),
    ('Producent', 'annual_capacity',    'Zdolność produkcyjna',       't/rok',     'number', 30),
    ('Producent', 'technologies',       'Technologie',                NULL,        'array',  40),
    ('Producent', 'min_order',          'Minimalne zamówienie',       'kg',        'number', 50),
    -- Recykler
    ('Recykler',  'input_fractions',    'Przyjmowane frakcje',        NULL,        'array',  10),
    ('Recykler',  'output_form',        'Forma produktu',             NULL,        'enum',   20),
    ('Recykler',  'processing_capacity','Moc przerobowa',             't/mies.',   'number', 30),
    ('Recykler',  'regranulate_purity', 'Czystość regranulatu',       '%',         'number', 40),
    -- Dystrybutor
    ('Dystrybutor', 'brands',           'Reprezentowane marki',       NULL,        'array',  10),
    ('Dystrybutor', 'warehouse_area',   'Powierzchnia magazynu',      'm²',        'number', 20),
    ('Dystrybutor', 'delivery_time',    'Czas dostawy',               'dni',       'number', 30),
    -- Trader
    ('Trader',    'traded_materials',   'Materiały w obrocie',        NULL,        'array',  10),
    ('Trader',    'markets',            'Rynki',                      NULL,        'array',  20),
    -- Serwis
    ('Serwis',    'service_scope',      'Zakres usług',               NULL,        'array',  10),
    ('Serwis',    'response_time',      'Czas reakcji',               'h',         'number', 20)
) AS d(category_name, key, label, unit, value_type, sort_order)
JOIN categories c ON c.name = d.category_name
ON CONFLICT (category_id, key) DO NOTHING;


-- ============================================================
-- 3. Firmy + dowiązanie kont auth.users po UUID
-- ============================================================
-- UUID-y realnych kont (logowanie Google). Lokalnie auth.users pusty →
-- wstawiamy minimalny rekord ON CONFLICT DO NOTHING; zdalnie no-op.

DO $seed_companies$
DECLARE
    -- Realne konta auth.users (Google login).
    owner_maciek_id    UUID := '34b7ee9e-fcb9-4605-9e74-01b49b23439f';
    owner_maciek_email TEXT := 'maciek29.opozda@gmail.com';
    owner_grzes_id     UUID := '784d7b27-9614-46b7-9271-c0e4f304714e';
    owner_grzes_email  TEXT := 'suchocki.g@gmail.com';

    -- Deterministyczne UUID firm (idempotencja przy powtórnym seedzie).
    company_rich_id    UUID := 'aaaaaaaa-0000-4000-8000-00000000aaaa';
    company_lean_id    UUID := 'bbbbbbbb-0000-4000-8000-00000000bbbb';

    cat_producent INT;
    cat_recykler  INT;
BEGIN
    SELECT id INTO cat_producent FROM categories WHERE name = 'Producent';
    SELECT id INTO cat_recykler  FROM categories WHERE name = 'Recykler';

    -- --------------------------------------------------------
    -- 3a. Konta auth.users (lokalnie tworzy, zdalnie no-op)
    -- --------------------------------------------------------
    -- Tworzymy konta z hasłem (logowanie email+hasło dev) ORAZ potwierdzonym
    -- e-mailem. Hasło dev dla OBU kont: "haslo123" (zmień w razie potrzeby).
    -- ON CONFLICT (id) DO NOTHING → zdalnie (gdzie konta Google już istnieją)
    -- NIE nadpisuje hasłem realnych kont. Logowanie przez Google nadal działa:
    -- GoTrue dołoży identity 'google' do tego samego usera po zgodnym e-mailu.
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        instance_id, aud, role,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    )
    VALUES
        (owner_maciek_id, owner_maciek_email,
         crypt('haslo123', gen_salt('bf')), NOW(),
         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         '{"provider":"email","providers":["email"]}', '{}',
         NOW(), NOW()),
        (owner_grzes_id, owner_grzes_email,
         crypt('haslo123', gen_salt('bf')), NOW(),
         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         '{"provider":"email","providers":["email"]}', '{}',
         NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- GoTrue skanuje kolumny token do Go string (nie *string) → NULL wywala
    -- logowanie błędem "Database error querying schema". Ustawiamy '' dla
    -- ręcznie wstawionych kont. Dotyka tylko nasze 2 konta (po id).
    UPDATE auth.users SET
        confirmation_token          = COALESCE(confirmation_token, ''),
        recovery_token              = COALESCE(recovery_token, ''),
        email_change                = COALESCE(email_change, ''),
        email_change_token_new      = COALESCE(email_change_token_new, ''),
        email_change_token_current  = COALESCE(email_change_token_current, ''),
        phone_change                = COALESCE(phone_change, ''),
        phone_change_token          = COALESCE(phone_change_token, ''),
        reauthentication_token      = COALESCE(reauthentication_token, '')
    WHERE id IN (owner_maciek_id, owner_grzes_id);

    -- Identities provider 'email' — GoTrue wymaga ich do logowania email+hasło.
    -- provider_id = user id (konwencja dla providera 'email'). Idempotentne.
    INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    VALUES
        (owner_maciek_id::text, owner_maciek_id,
         jsonb_build_object('sub', owner_maciek_id::text, 'email', owner_maciek_email, 'email_verified', true),
         'email', NOW(), NOW(), NOW()),
        (owner_grzes_id::text, owner_grzes_id,
         jsonb_build_object('sub', owner_grzes_id::text, 'email', owner_grzes_email, 'email_verified', true),
         'email', NOW(), NOW(), NOW())
    ON CONFLICT (provider_id, provider) DO NOTHING;

    -- --------------------------------------------------------
    -- 3b. Firma BOGATA (Ty) — Producent, pełny profil
    -- --------------------------------------------------------
    INSERT INTO companies (
        id, name, display_name, logo_url, founding_year, description, region,
        nip, regon, krs, headquarters_address, plant_address, website
    ) VALUES (
        company_rich_id,
        'PolyMax Sp. z o.o.',
        'PolyMax',
        NULL,
        2008,
        'Producent wyrobów z tworzyw sztucznych metodą wtryskową. Specjalizujemy się w komponentach technicznych dla motoryzacji i AGD. Własna narzędziownia, kontrola jakości na każdym etapie.',
        'Mazowieckie',
        '5223344556',
        '146789012',
        '0000456789',
        'ul. Przemysłowa 12, 02-232 Warszawa',
        'ul. Fabryczna 8, 05-820 Piastów',
        'https://polymax.example.pl'
    ) ON CONFLICT (id) DO NOTHING;

    -- Owner profile (ten sam UUID co auth.users — FK 1:1).
    INSERT INTO users (id, company_id, full_name, job_title, phone, is_visible_on_profile)
    VALUES (owner_maciek_id, company_rich_id, 'Maciek Opozda', 'Właściciel', '+48 600 100 200', true)
    ON CONFLICT (id) DO NOTHING;

    -- Kategorie firmy bogatej: Producent.
    INSERT INTO company_categories (company_id, category_id)
    VALUES (company_rich_id, cat_producent)
    ON CONFLICT DO NOTHING;

    -- Certyfikaty: ISO 9001, ISO 14001, CE.
    INSERT INTO company_certificates (company_id, certificate_id)
    SELECT company_rich_id, id FROM certificates WHERE name IN ('ISO 9001', 'ISO 14001', 'CE')
    ON CONFLICT DO NOTHING;

    -- Wartości parametrów (wg definicji Producenta).
    INSERT INTO company_parameter_values (company_id, definition_id, value)
    SELECT company_rich_id, pd.id, v.value
    FROM (VALUES
        ('polymer_types',  'PP, PE-HD, ABS, PA6'),
        ('machine_count',  '14'),
        ('annual_capacity','3200'),
        ('technologies',   'Wtrysk, Wtrysk wielokomponentowy'),
        ('min_order',      '500')
    ) AS v(key, value)
    JOIN parameter_definitions pd ON pd.category_id = cat_producent AND pd.key = v.key
    ON CONFLICT (company_id, definition_id) DO NOTHING;

    -- Top-5 highlights.
    INSERT INTO highlights (company_id, title, description, sort_order)
    SELECT company_rich_id, h.title, h.description, h.sort_order
    FROM (VALUES
        ('Komponenty techniczne dla motoryzacji', 'Detale wtryskowe wg rysunku klienta, walidacja PPAP.', 10),
        ('Własna narzędziownia',                  'Projektowanie i utrzymanie form wtryskowych in-house.', 20),
        ('Wtrysk wielokomponentowy',              'Produkcja elementów 2K w jednym cyklu.', 30),
        ('Kontrola jakości',                      'Pomiary 3D, kontrola wymiarowa partii.', 40),
        ('Krótkie serie i prototypy',             'Elastyczne przezbrojenia, wsparcie R&D klienta.', 50)
    ) AS h(title, description, sort_order)
    WHERE NOT EXISTS (
        SELECT 1 FROM highlights WHERE company_id = company_rich_id
    );

    -- --------------------------------------------------------
    -- 3c. Firma CHUDA (Grzegorz) — Recykler, empty-state
    -- --------------------------------------------------------
    INSERT INTO companies (
        id, name, display_name, founding_year, description, region
    ) VALUES (
        company_lean_id,
        'EkoReg',
        NULL,
        2021,
        'Recykling tworzyw sztucznych.',
        'Małopolskie'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, company_id, full_name, job_title, phone, is_visible_on_profile)
    VALUES (owner_grzes_id, company_lean_id, 'Grzegorz Suchocki', 'Właściciel', NULL, true)
    ON CONFLICT (id) DO NOTHING;

    -- Minimalna kategoria, brak certów / parametrów / highlights / mediów
    -- → testuje ukrywanie pustych sekcji w Fazie 3.
    INSERT INTO company_categories (company_id, category_id)
    VALUES (company_lean_id, cat_recykler)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed firm OK: % (bogata) + % (chuda) dowiązane do ownerów.', company_rich_id, company_lean_id;
END
$seed_companies$;
