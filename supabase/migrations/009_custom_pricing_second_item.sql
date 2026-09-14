-- ============================================================
-- 009: Second custom pricing title
-- ============================================================

-- Custom pricing previously held a single title + price (migration 007).
-- A quote needs to name two custom charges (e.g. "Installation Charges"
-- and "Supervision Charges") that share ONE price, so only a second title
-- is added — the existing custom_pricing_price covers both.
-- The second title is optional.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_title_2 TEXT;

-- An earlier revision of this migration also added a second price column.
-- There is only ever one price, so drop it if that revision was applied.
ALTER TABLE quotes DROP COLUMN IF EXISTS custom_pricing_price_2;
