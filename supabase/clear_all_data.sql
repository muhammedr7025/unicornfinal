-- ============================================================
-- Clear ALL data EXCEPT profiles & customers
-- Run in Supabase SQL Editor
-- Order: child tables first → parent tables last (FK safe)
-- ============================================================

-- 1. Quote line items (children of quote_products)
TRUNCATE product_accessories    CASCADE;
TRUNCATE product_testing_items  CASCADE;
TRUNCATE product_tubing_items   CASCADE;

-- 2. Quote products (children of quotes)
TRUNCATE quote_products CASCADE;

-- 3. Quotes
TRUNCATE quotes CASCADE;

-- 4. Machining prices (references series + materials)
TRUNCATE machining_prices CASCADE;

-- 5. Weight tables (reference series)
TRUNCATE body_weights       CASCADE;
TRUNCATE bonnet_weights     CASCADE;
TRUNCATE plug_weights       CASCADE;
TRUNCATE seat_weights       CASCADE;
TRUNCATE stem_weights       CASCADE;
TRUNCATE cage_weights       CASCADE;
TRUNCATE pilot_plug_weights CASCADE;

-- 6. Fixed price tables (reference series / materials)
TRUNCATE seal_ring_prices   CASCADE;
TRUNCATE stem_fixed_prices  CASCADE;

-- 7. Standalone pricing tables
TRUNCATE actuator_models    CASCADE;
TRUNCATE handwheel_prices   CASCADE;
TRUNCATE testing_presets    CASCADE;
TRUNCATE tubing_presets     CASCADE;

-- 8. Parent tables
TRUNCATE materials CASCADE;
TRUNCATE series    CASCADE;

-- 9. Settings & sequences (optional, uncomment if needed)
-- TRUNCATE global_settings CASCADE;
-- TRUNCATE quote_sequences CASCADE;

-- ============================================================
-- Done! profiles & customers are untouched.
-- ============================================================
