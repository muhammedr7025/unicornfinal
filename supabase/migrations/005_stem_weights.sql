-- ============================================================
-- Migration 005: Add stem_weights table (stem is now weight-based)
-- The old stem_fixed_prices table is kept for backwards compatibility
-- but new quotes will use stem_weights instead.
-- ============================================================

CREATE TABLE IF NOT EXISTS stem_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  weight_kg       NUMERIC(10,4) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, size, rating)
);

ALTER TABLE stem_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read stem_weights" ON stem_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage stem_weights" ON stem_weights FOR ALL TO authenticated USING (true) WITH CHECK (true);
