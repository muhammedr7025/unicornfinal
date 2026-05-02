-- ============================================================
-- 007: Add custom pricing fields + exchange rate snapshot
-- ============================================================

-- Custom pricing type: single title + price (e.g. "Installation Charges" + 25000)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_title TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_pricing_price NUMERIC(12,2) DEFAULT 0;

-- Exchange rate snapshot at time of quote creation (for edit mode rate-change detection)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(10,4);
