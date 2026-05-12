-- ============================================================
-- 008: Add cage_quantity to quote_products
-- ============================================================

-- Cage quantity: how many cages per valve (1, 2, or 3)
-- Cost is (material + machining) × cage_quantity
ALTER TABLE quote_products ADD COLUMN IF NOT EXISTS cage_quantity INTEGER DEFAULT 1;
