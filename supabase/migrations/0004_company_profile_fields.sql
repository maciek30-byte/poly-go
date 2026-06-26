-- ============================================================
--  S-03 + S-02 — company profile fields
--  Dokłada kolumny rejestrowe/prezentacyjne na companies, tabelę highlights
--  (Top-5), data-driven słownik parametrów (parameter_definitions +
--  company_parameter_values) oraz pola pracownika na users.
--
--  RLS dla nowych tabel pisany w tym samym pliku (konwencja: każda nowa
--  tabela dostaje politykę od razu). Istniejące polityki companies/users
--  pokrywają nowe kolumny bez zmian.
--
--  Po tej migracji: `pnpm db:types` w TYM SAMYM commicie (createClient<Database>).
-- ============================================================


-- ============================================================
-- 1. Kolumny rejestrowe + prezentacyjne na companies
-- ============================================================
-- API-ready pod przyszłą integrację GUS/KRS. nip UNIQUE (klucz unikalności
-- firmy wg briefu), nullable w pilocie. founding_year już istnieje w 0001.

ALTER TABLE companies
    ADD COLUMN display_name         TEXT,
    ADD COLUMN nip                  TEXT UNIQUE,
    ADD COLUMN regon                TEXT,
    ADD COLUMN krs                  TEXT,
    ADD COLUMN headquarters_address TEXT,
    ADD COLUMN plant_address        TEXT,
    ADD COLUMN website              TEXT;

COMMENT ON COLUMN companies.display_name         IS 'Nazwa wyświetlana na profilu (gdy różna od name)';
COMMENT ON COLUMN companies.nip                  IS 'NIP — klucz unikalności firmy (UNIQUE, nullable w pilocie)';
COMMENT ON COLUMN companies.regon                IS 'REGON — dane rejestrowe (wpisywane ręcznie, API-ready)';
COMMENT ON COLUMN companies.krs                  IS 'KRS — dane rejestrowe (wpisywane ręcznie, API-ready)';
COMMENT ON COLUMN companies.headquarters_address IS 'Adres siedziby';
COMMENT ON COLUMN companies.plant_address        IS 'Adres zakładu / produkcji';
COMMENT ON COLUMN companies.website              IS 'Strona WWW firmy';

-- companies_select_all / companies_update_own (0002) pokrywają nowe kolumny.


-- ============================================================
-- 2. highlights — curated Top-5 "Czym się zajmujemy"
-- ============================================================

CREATE TABLE highlights (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  highlights            IS 'Top-5 "Czym się zajmujemy" — edytowalne per pozycja, z kolejnością. Limit 5 egzekwowany w UI.';
COMMENT ON COLUMN highlights.sort_order IS 'Kolejność wyświetlania na profilu';

CREATE INDEX idx_highlights_company ON highlights(company_id);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY highlights_select_all
    ON highlights
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY highlights_modify_own
    ON highlights
    FOR ALL
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());


-- ============================================================
-- 3. Słownik parametrów (data-driven) — definicje + wartości
-- ============================================================
-- Definicje per kategoria w słowniku; wartości firmy osobno. Nowa branża =
-- seed definicji, zero zmian kodu. UI renderuje label: value [unit] generycznie.

CREATE TABLE parameter_definitions (
    id          SERIAL  PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    key         TEXT    NOT NULL,
    label       TEXT    NOT NULL,
    unit        TEXT,
    value_type  TEXT    NOT NULL CHECK (value_type IN ('text', 'number', 'enum', 'array')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category_id, key)
);

COMMENT ON TABLE  parameter_definitions            IS 'Słownik definicji parametrów technicznych per kategoria — data-driven, mutacje przez service_role';
COMMENT ON COLUMN parameter_definitions.key        IS 'Stabilny klucz parametru w obrębie kategorii (np. polymer_types)';
COMMENT ON COLUMN parameter_definitions.value_type IS 'Typ wartości: text | number | enum | array — steruje renderem inputu w formularzu';

CREATE TABLE company_parameter_values (
    company_id    UUID    NOT NULL REFERENCES companies(id)             ON DELETE CASCADE,
    definition_id INTEGER NOT NULL REFERENCES parameter_definitions(id) ON DELETE CASCADE,
    value         TEXT    NOT NULL,
    PRIMARY KEY (company_id, definition_id)
);

COMMENT ON TABLE  company_parameter_values       IS 'Wartości parametrów firmy wg słownika parameter_definitions';
COMMENT ON COLUMN company_parameter_values.value IS 'Wartość jako TEXT; interpretacja wg parameter_definitions.value_type';

-- Index pod przyszłe filtry wyszukiwarki S-05 (szukanie firm po parametrze).
CREATE INDEX idx_company_parameter_values_definition ON company_parameter_values(definition_id);

-- parameter_definitions — słownik: publiczny SELECT, mutacje tylko service_role.
ALTER TABLE parameter_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY parameter_definitions_select_all
    ON parameter_definitions
    FOR SELECT
    TO authenticated
    USING (true);

-- Brak polityk INSERT/UPDATE/DELETE — mutacje tylko przez service_role (seed).

-- company_parameter_values — SELECT publiczny, mutacje tylko swoja firma.
ALTER TABLE company_parameter_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_parameter_values_select_all
    ON company_parameter_values
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY company_parameter_values_modify_own
    ON company_parameter_values
    FOR ALL
    TO authenticated
    USING      (company_id = current_user_company_id())
    WITH CHECK (company_id = current_user_company_id());


-- ============================================================
-- 4. Pola pracownika na users
-- ============================================================
-- Telefon (opcjonalny) + flaga widoczności na profilu firmy.
-- users_select_all / users_update_self (0002) pokrywają odczyt i edycję self.

ALTER TABLE users
    ADD COLUMN phone                 TEXT,
    ADD COLUMN is_visible_on_profile BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN users.phone                 IS 'Telefon kontaktowy pracownika (opcjonalny)';
COMMENT ON COLUMN users.is_visible_on_profile IS 'Czy pracownik jest pokazywany w sekcji Pracownicy na profilu firmy';
