-- ============================================================
--  Seed dictionaries — runs after migrations on `supabase db reset`.
--  On prod the Operator runs this manually once after `supabase db push`.
--  No companies / users seeded — that's per-pilot Operator work.
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
