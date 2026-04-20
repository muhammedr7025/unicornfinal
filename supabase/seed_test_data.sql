-- ============================================================
-- Unicorn Valves — Test Seed Data
-- Run this in Supabase SQL editor to populate minimal test data
-- for end-to-end pricing verification.
-- ============================================================
-- This creates:
--   1 Series (100 Globe Valve)
--   5 Materials (BodyBonnet, Plug, Seat, Stem, Cage)
--   2 Body weights (2" Flanged + 3" Flanged)
--   2 Bonnet weights (2" Plain + 3" Plain)
--   2 Plug weights, 2 Seat weights, 2 Stem weights
--   6 Machining prices (body/bonnet/plug/seat/stem/cage for 2")
--   1 Seal ring price
--   2 Actuator models (Electric + Pneumatic)
--   2 Handwheel models
-- ============================================================

-- Step 1: Series
INSERT INTO series (id, series_number, series_name, product_type, has_cage, has_seal_ring, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '100', '100 Globe Valve', 'Globe', true, true, true)
ON CONFLICT (series_number) DO NOTHING;

-- Step 2: Materials
INSERT INTO materials (id, material_name, price_per_kg, material_group, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'WCB (Carbon Steel)',    180.00, 'BodyBonnet', true),
  ('b0000000-0000-0000-0000-000000000002', 'SS 316',               450.00, 'Plug',       true),
  ('b0000000-0000-0000-0000-000000000003', 'Stellite 6',           520.00, 'Seat',       true),
  ('b0000000-0000-0000-0000-000000000004', 'SS 316 (Stem)',        460.00, 'Stem',       true),
  ('b0000000-0000-0000-0000-000000000005', 'SS 304 (Cage)',        400.00, 'Cage',       true)
ON CONFLICT DO NOTHING;

-- Step 3: Body Weights (2" and 3" Flanged, 150#)
INSERT INTO body_weights (series_id, size, rating, end_connect_type, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 'Flanged',       5.000, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 'Flanged',      12.500, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 'Butt Welded',   4.200, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '300#', 'Flanged',       7.800, true)
ON CONFLICT (series_id, size, rating, end_connect_type) DO NOTHING;

-- Step 4: Bonnet Weights
INSERT INTO bonnet_weights (series_id, size, rating, bonnet_type, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 'Plain',     1.200, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 'Extended',  1.800, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 'Plain',     3.100, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '300#', 'Plain',     2.000, true)
ON CONFLICT (series_id, size, rating, bonnet_type) DO NOTHING;

-- Step 5: Plug Weights
INSERT INTO plug_weights (series_id, size, rating, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 0.400, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 1.100, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '300#', 0.600, true)
ON CONFLICT (series_id, size, rating) DO NOTHING;

-- Step 6: Seat Weights
INSERT INTO seat_weights (series_id, size, rating, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 0.300, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 0.800, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '300#', 0.450, true)
ON CONFLICT (series_id, size, rating) DO NOTHING;

-- Step 7: Stem Weights
INSERT INTO stem_weights (series_id, size, rating, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 0.500, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 1.200, true),
  ('a0000000-0000-0000-0000-000000000001', '2"',  '300#', 0.700, true)
ON CONFLICT (series_id, size, rating) DO NOTHING;

-- Step 8: Cage Weights
INSERT INTO cage_weights (series_id, size, rating, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"',  '150#', 0.600, true),
  ('a0000000-0000-0000-0000-000000000001', '3"',  '150#', 1.500, true)
ON CONFLICT (series_id, size, rating) DO NOTHING;

-- Step 9: Seal Ring Prices
INSERT INTO seal_ring_prices (series_id, seal_type, size, rating, fixed_price, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Graphite',  '2"', '150#', 350.00, true),
  ('a0000000-0000-0000-0000-000000000001', 'PTFE',      '2"', '150#', 500.00, true),
  ('a0000000-0000-0000-0000-000000000001', 'Graphite',  '3"', '150#', 550.00, true)
ON CONFLICT (series_id, seal_type, size, rating) DO NOTHING;

-- Step 10: Machining Prices (for 2" 150# Flanged, Metal-to-Metal trim)
-- body → keyed by end_connect_type, bonnet → bonnet_type, plug/seat/stem/cage → trim_type
INSERT INTO machining_prices (component, series_id, size, rating, type_key, material_id, fixed_price, is_active) VALUES
  ('body',   'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Flanged',          'b0000000-0000-0000-0000-000000000001', 850.00, true),
  ('bonnet', 'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Plain',            'b0000000-0000-0000-0000-000000000001', 600.00, true),
  ('plug',   'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000002', 1200.00, true),
  ('seat',   'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000003', 900.00, true),
  ('stem',   'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000004', 750.00, true),
  ('cage',   'a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000005', 1100.00, true),
  -- Also add for 3" 150# Flanged
  ('body',   'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Flanged',          'b0000000-0000-0000-0000-000000000001', 1400.00, true),
  ('bonnet', 'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Plain',            'b0000000-0000-0000-0000-000000000001', 950.00, true),
  ('plug',   'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000002', 1800.00, true),
  ('seat',   'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000003', 1300.00, true),
  ('stem',   'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000004', 1100.00, true),
  ('cage',   'a0000000-0000-0000-0000-000000000001', '3"', '150#', 'Metal to Metal',   'b0000000-0000-0000-0000-000000000005', 1600.00, true)
ON CONFLICT (component, series_id, size, rating, type_key, material_id) DO NOTHING;

-- Step 11: Actuator Models (cascading: Type → Series → Model → Standard/Special)
INSERT INTO actuator_models (type, series, model, standard_special, fixed_price, is_active) VALUES
  ('Electric',   'Series E', 'EL-100', 'Standard', 12000.00, true),
  ('Electric',   'Series E', 'EL-100', 'Special',  18000.00, true),
  ('Electric',   'Series E', 'EL-200', 'Standard', 22000.00, true),
  ('Pneumatic',  'Series P', 'PN-50',  'Standard',  8500.00, true),
  ('Pneumatic',  'Series P', 'PN-50',  'Special',  13000.00, true),
  ('Pneumatic',  'Series P', 'PN-100', 'Standard', 15000.00, true)
ON CONFLICT DO NOTHING;

-- Step 12: Handwheel Prices (cascading: Type → Series → Model → Standard/Special)
INSERT INTO handwheel_prices (type, series, model, standard_special, fixed_price, is_active) VALUES
  ('Gear Operated', 'HW Series A', 'HW-100', 'Standard', 4500.00, true),
  ('Gear Operated', 'HW Series A', 'HW-100', 'Special',  7000.00, true),
  ('Gear Operated', 'HW Series A', 'HW-200', 'Standard', 8000.00, true),
  ('Lever',         'HW Series B', 'LV-50',  'Standard', 2500.00, true),
  ('Lever',         'HW Series B', 'LV-50',  'Special',  4000.00, true)
ON CONFLICT DO NOTHING;

-- Step 13: Pilot Plug Weights (optional)
INSERT INTO pilot_plug_weights (series_id, size, rating, weight_kg, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 0.150, true),
  ('a0000000-0000-0000-0000-000000000001', '3"', '150#', 0.350, true)
ON CONFLICT (series_id, size, rating) DO NOTHING;

-- Step 14: Global Settings (margins + exchange rate)
INSERT INTO global_settings (key, value) VALUES
  ('standard_margins', '{"mfg_profit_pct": 25, "bo_profit_pct": 15, "neg_margin_pct": 5}'),
  ('project_margins',  '{"mfg_profit_pct": 20, "bo_profit_pct": 10, "neg_margin_pct": 3}'),
  ('exchange_rate',    '{"usd_to_inr": 83.5}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Step 15: Test Customers (requires a valid profile id — use your logged-in user id)
-- Replace 'YOUR_USER_UUID' with your actual profile UUID from the profiles table
-- Run: SELECT id FROM profiles LIMIT 1;  to get your UUID
DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM profiles LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'No profiles found — skip customer creation';
    RETURN;
  END IF;

  INSERT INTO customers (id, name, company, country, customer_type, commission_pct, created_by) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Test India Dealer',    'Dealer India Pvt Ltd',   'India',         'dealer', 5, uid),
    ('c0000000-0000-0000-0000-000000000002', 'Test India Normal',    'Normal India Pvt Ltd',   'India',         'normal', 0, uid),
    ('c0000000-0000-0000-0000-000000000003', 'Test Foreign Dealer',  'Dealer Overseas LLC',    'United States', 'dealer', 5, uid),
    ('c0000000-0000-0000-0000-000000000004', 'Test Foreign Normal',  'Normal Overseas GmbH',   'Germany',       'normal', 0, uid)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================
-- 7. TESTING PRESETS (Predefined tests for 2" / 150#)
-- ============================================================
INSERT INTO testing_presets (series_id, size, rating, test_name, price) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Hydro Test', 500),
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Pneumatic Test', 750),
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Fugitive Emission Test', 1200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. TUBING PRESETS (Predefined tubing for 2" / 150#)
-- ============================================================
INSERT INTO tubing_presets (series_id, size, rating, item_name, price) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 'SS Tubing 1/4"', 350),
  ('a0000000-0000-0000-0000-000000000001', '2"', '150#', 'Tubing Fittings Set', 600)
ON CONFLICT DO NOTHING;
