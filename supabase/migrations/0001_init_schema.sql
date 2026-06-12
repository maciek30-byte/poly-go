-- ============================================================
--  F-02 multi-tenant data layer — schema (no RLS yet)
--  RLS arrives in 0002_enable_rls.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DICTIONARIES
-- ============================================================

CREATE TABLE categories (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

COMMENT ON TABLE  categories      IS 'Słownik kategorii firm (np. Producent, Recykler)';
COMMENT ON COLUMN categories.name IS 'Unikalna nazwa kategorii';


CREATE TABLE certificates (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL UNIQUE,
    icon_url TEXT
);

COMMENT ON TABLE  certificates          IS 'Słownik certyfikatów (np. ISO 9001)';
COMMENT ON COLUMN certificates.icon_url IS 'Opcjonalna ikona tagu w Supabase Storage';


-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
    id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 TEXT        NOT NULL,
    logo_url             TEXT,
    founding_year        INTEGER     CHECK (founding_year >= 1800 AND founding_year <= EXTRACT(YEAR FROM NOW())),
    description          TEXT        CHECK (char_length(description) <= 600),
    region               TEXT,
    technical_parameters JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  companies                      IS 'Centralna tabela firm w aplikacji';
COMMENT ON COLUMN companies.logo_url             IS 'Ścieżka do pliku w Supabase Storage';
COMMENT ON COLUMN companies.description          IS 'Opis firmy — maks. 600 znaków (CHECK constraint)';
COMMENT ON COLUMN companies.region               IS 'Region / województwo firmy — używane w wyszukiwarce US-02';
COMMENT ON COLUMN companies.technical_parameters IS 'Strukturyzowane dane zależne od kategorii. Konwencja JSONB: klucz polymer_types: ARRAY<TEXT> — wartości słownikowe (PE-LD, PE-HD, PP, PET); klucz machines: ARRAY<OBJECT{name,year}>; klucz fractions: ARRAY<OBJECT> wg specyfikacji branżowej. Schemat doprecyzowuje S-02 wraz z UI.';

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================
-- USERS (1:1 z auth.users)
-- ============================================================

CREATE TABLE users (
    id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name  TEXT        NOT NULL,
    job_title  TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users            IS 'Profil użytkownika — rozszerzenie auth.users (1:1)';
COMMENT ON COLUMN users.id         IS 'FK do auth.users.id — ten sam UUID';
COMMENT ON COLUMN users.company_id IS 'Firma pracownika — używane w politykach RLS';
COMMENT ON COLUMN users.job_title  IS 'Wymagane przez UI do rozpoczęcia czatu';

CREATE INDEX idx_users_company_id ON users(company_id);


-- ============================================================
-- PIVOT TABLES (M:N)
-- ============================================================

CREATE TABLE company_categories (
    company_id  UUID    NOT NULL REFERENCES companies(id)   ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id)  ON DELETE CASCADE,
    PRIMARY KEY (company_id, category_id)
);

COMMENT ON TABLE company_categories IS 'Relacja M:N — firma może mieć wiele kategorii';

CREATE INDEX idx_company_categories_category ON company_categories(category_id);


CREATE TABLE company_certificates (
    company_id     UUID    NOT NULL REFERENCES companies(id)     ON DELETE CASCADE,
    certificate_id INTEGER NOT NULL REFERENCES certificates(id)  ON DELETE CASCADE,
    PRIMARY KEY (company_id, certificate_id)
);

COMMENT ON TABLE company_certificates IS 'Relacja M:N — firma może mieć wiele certyfikatów';

CREATE INDEX idx_company_certificates_cert ON company_certificates(certificate_id);


-- ============================================================
-- COMPANY MEDIA
-- ============================================================

CREATE TYPE media_type_enum AS ENUM ('PHOTO', 'DOCUMENT');

CREATE TABLE company_media (
    id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    media_type media_type_enum NOT NULL,
    file_url   TEXT            NOT NULL,
    file_name  TEXT,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  company_media            IS 'Zdjęcia i dokumenty firm przechowywane w Supabase Storage';
COMMENT ON COLUMN company_media.media_type IS 'PHOTO lub DOCUMENT';
COMMENT ON COLUMN company_media.file_url   IS 'Ścieżka w Supabase Storage (maks. 10 MB dla dokumentów)';
COMMENT ON COLUMN company_media.file_name  IS 'Oryginalna nazwa pliku (głównie dla PDF)';

-- Limit 5 plików per typ jest wymuszany w warstwie aplikacji (UI walidacja).
-- Trigger niżej zostawiony jako opt-in na przyszłość — odkomentuj jeśli pilot pokaże,
-- że user obchodzi limit z poziomu service_role lub bezpośredniego API call.
--
-- CREATE OR REPLACE FUNCTION check_media_limit()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF (
--         SELECT COUNT(*) FROM company_media
--         WHERE company_id = NEW.company_id AND media_type = NEW.media_type
--     ) >= 5 THEN
--         RAISE EXCEPTION 'Limit 5 plików typu % dla tej firmy został osiągnięty', NEW.media_type;
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER enforce_media_limit
--     BEFORE INSERT ON company_media
--     FOR EACH ROW EXECUTE FUNCTION check_media_limit();

CREATE INDEX idx_company_media_company ON company_media(company_id, media_type);


-- ============================================================
-- FAVORITES
-- ============================================================

CREATE TABLE favorites (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, company_id)
);

COMMENT ON TABLE favorites IS 'Ulubione firmy użytkownika';

CREATE INDEX idx_favorites_user    ON favorites(user_id);
CREATE INDEX idx_favorites_company ON favorites(company_id);


-- ============================================================
-- CONVERSATIONS (1:1 user↔user; agregacja per-firma w UI / S-04)
-- ============================================================
-- TODO: refactor na conversation_participants (M:N) w v2 dla czatu grupowego.
-- ============================================================

CREATE TABLE conversations (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (participant_1_id <> participant_2_id)
);

COMMENT ON TABLE  conversations                  IS 'Konwersacje 1:1 między użytkownikami — do refactoru na model grupowy';
COMMENT ON COLUMN conversations.participant_1_id IS 'Inicjator konwersacji';
COMMENT ON COLUMN conversations.participant_2_id IS 'Odbiorca konwersacji';

CREATE INDEX idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_p2 ON conversations(participant_2_id);

-- Wymusza jedną konwersację per para userów niezależnie od kolejności insertu.
-- Aplikacja (S-04) korzysta z tego patternem: INSERT ... ON CONFLICT DO NOTHING,
-- potem SELECT po (LEAST, GREATEST) żeby dostać id istniejącej rozmowy.
CREATE UNIQUE INDEX uniq_conversation_pair
    ON conversations (
        LEAST(participant_1_id, participant_2_id),
        GREATEST(participant_1_id, participant_2_id)
    );


-- ============================================================
-- MESSAGES (immutable — audit trail per PRD)
-- ============================================================

CREATE TABLE messages (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    content         TEXT        NOT NULL CHECK (char_length(content) > 0),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  messages           IS 'Wiadomości w konwersacjach — immutable, edycja read_at wyłącznie przez funkcję mark_message_read()';
COMMENT ON COLUMN messages.read_at   IS 'Timestamp odczytu — NULL oznacza nieprzeczytaną';
COMMENT ON COLUMN messages.sender_id IS 'FK do users.id — nadawca wiadomości';

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON messages(sender_id);
CREATE INDEX idx_messages_unread       ON messages(conversation_id) WHERE read_at IS NULL;
