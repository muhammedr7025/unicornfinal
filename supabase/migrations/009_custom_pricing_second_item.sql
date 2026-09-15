-- ============================================================
-- 009: Second custom pricing title
-- ============================================================

-- Custom pricing previously held a single title + price (migration 007).
-- A second title is added with a different role — there is still one price:
--   custom_pricing_title   → label of the custom charge row, beside its price
--   custom_pricing_title_2 → label of the quote's final total row on the PDF
--                            (the custom equivalent of "Total Ex-works Price")

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_title_2 TEXT;

-- An earlier revision of this migration also added a second price column.
-- There is only ever one price, so drop it if that revision was applied.
ALTER TABLE quotes DROP COLUMN IF EXISTS custom_pricing_price_2;
