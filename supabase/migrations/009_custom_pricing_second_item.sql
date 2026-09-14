-- ============================================================
-- 009: Second custom pricing line item
-- ============================================================

-- Custom pricing previously held a single title + price (migration 007).
-- Quotes need to list two custom charges (e.g. "Installation Charges" and
-- "Supervision Charges"), so a second title/price pair is added alongside
-- the first. Both are optional — a quote may use one or both.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_title_2 TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_price_2 NUMERIC(12,2) DEFAULT 0;
