-- ============================================================
-- Unicorn Valves — Row Level Security Policies
-- Migration 002
-- ============================================================
-- RULE: Enable RLS on EVERY table. Default deny all.

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "profiles_admin_insert" ON profiles FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "profiles_admin_delete" ON profiles FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- CUSTOMERS
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_read_all" ON customers FOR SELECT
  USING (true);

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "customers_admin_update" ON customers FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "customers_admin_delete" ON customers FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- QUOTES
-- ============================================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON quotes FOR SELECT
  USING (created_by = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "quotes_update" ON quotes FOR UPDATE
  USING (
    (created_by = auth.uid() OR get_user_role() = 'admin')
    AND status = 'draft'
  );

CREATE POLICY "quotes_delete" ON quotes FOR DELETE
  USING (
    (created_by = auth.uid() OR get_user_role() = 'admin')
    AND status = 'draft'
  );

-- ============================================================
-- QUOTE PRODUCTS (inherits access from quotes)
-- ============================================================

ALTER TABLE quote_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_products_select" ON quote_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_id
    AND (quotes.created_by = auth.uid() OR get_user_role() = 'admin')
  ));

CREATE POLICY "quote_products_insert" ON quote_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_id
    AND quotes.created_by = auth.uid()
    AND quotes.status = 'draft'
  ));

CREATE POLICY "quote_products_update" ON quote_products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_id
    AND (quotes.created_by = auth.uid() OR get_user_role() = 'admin')
    AND quotes.status = 'draft'
  ));

CREATE POLICY "quote_products_delete" ON quote_products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_id
    AND (quotes.created_by = auth.uid() OR get_user_role() = 'admin')
    AND quotes.status = 'draft'
  ));

-- ============================================================
-- PRODUCT LINE ITEMS (same pattern as quote_products)
-- ============================================================

-- Tubing Items
ALTER TABLE product_tubing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tubing_items_all" ON product_tubing_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quote_products qp
    JOIN quotes q ON q.id = qp.quote_id
    WHERE qp.id = quote_product_id
    AND (q.created_by = auth.uid() OR get_user_role() = 'admin')
  ));

-- Testing Items
ALTER TABLE product_testing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testing_items_all" ON product_testing_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quote_products qp
    JOIN quotes q ON q.id = qp.quote_id
    WHERE qp.id = quote_product_id
    AND (q.created_by = auth.uid() OR get_user_role() = 'admin')
  ));

-- Accessories
ALTER TABLE product_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accessories_all" ON product_accessories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quote_products qp
    JOIN quotes q ON q.id = qp.quote_id
    WHERE qp.id = quote_product_id
    AND (q.created_by = auth.uid() OR get_user_role() = 'admin')
  ));

-- ============================================================
-- PRICING MASTER TABLES (everyone reads, admin writes)
-- ============================================================

-- Series
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "series_read" ON series FOR SELECT USING (true);
CREATE POLICY "series_admin_write" ON series FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "series_admin_update" ON series FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "series_admin_delete" ON series FOR DELETE USING (get_user_role() = 'admin');

-- Materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_admin_write" ON materials FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "materials_admin_update" ON materials FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "materials_admin_delete" ON materials FOR DELETE USING (get_user_role() = 'admin');

-- Body Weights
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "body_weights_read" ON body_weights FOR SELECT USING (true);
CREATE POLICY "body_weights_admin_write" ON body_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "body_weights_admin_update" ON body_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "body_weights_admin_delete" ON body_weights FOR DELETE USING (get_user_role() = 'admin');

-- Bonnet Weights
ALTER TABLE bonnet_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bonnet_weights_read" ON bonnet_weights FOR SELECT USING (true);
CREATE POLICY "bonnet_weights_admin_write" ON bonnet_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "bonnet_weights_admin_update" ON bonnet_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "bonnet_weights_admin_delete" ON bonnet_weights FOR DELETE USING (get_user_role() = 'admin');

-- Plug Weights
ALTER TABLE plug_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plug_weights_read" ON plug_weights FOR SELECT USING (true);
CREATE POLICY "plug_weights_admin_write" ON plug_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "plug_weights_admin_update" ON plug_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "plug_weights_admin_delete" ON plug_weights FOR DELETE USING (get_user_role() = 'admin');

-- Seat Weights
ALTER TABLE seat_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat_weights_read" ON seat_weights FOR SELECT USING (true);
CREATE POLICY "seat_weights_admin_write" ON seat_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "seat_weights_admin_update" ON seat_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "seat_weights_admin_delete" ON seat_weights FOR DELETE USING (get_user_role() = 'admin');

-- Cage Weights
ALTER TABLE cage_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cage_weights_read" ON cage_weights FOR SELECT USING (true);
CREATE POLICY "cage_weights_admin_write" ON cage_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "cage_weights_admin_update" ON cage_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "cage_weights_admin_delete" ON cage_weights FOR DELETE USING (get_user_role() = 'admin');

-- Pilot Plug Weights
ALTER TABLE pilot_plug_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pilot_plug_weights_read" ON pilot_plug_weights FOR SELECT USING (true);
CREATE POLICY "pilot_plug_weights_admin_write" ON pilot_plug_weights FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "pilot_plug_weights_admin_update" ON pilot_plug_weights FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "pilot_plug_weights_admin_delete" ON pilot_plug_weights FOR DELETE USING (get_user_role() = 'admin');

-- Seal Ring Prices
ALTER TABLE seal_ring_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seal_ring_prices_read" ON seal_ring_prices FOR SELECT USING (true);
CREATE POLICY "seal_ring_prices_admin_write" ON seal_ring_prices FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "seal_ring_prices_admin_update" ON seal_ring_prices FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "seal_ring_prices_admin_delete" ON seal_ring_prices FOR DELETE USING (get_user_role() = 'admin');

-- Stem Fixed Prices
ALTER TABLE stem_fixed_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stem_fixed_prices_read" ON stem_fixed_prices FOR SELECT USING (true);
CREATE POLICY "stem_fixed_prices_admin_write" ON stem_fixed_prices FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "stem_fixed_prices_admin_update" ON stem_fixed_prices FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "stem_fixed_prices_admin_delete" ON stem_fixed_prices FOR DELETE USING (get_user_role() = 'admin');

-- Actuator Models
ALTER TABLE actuator_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actuator_models_read" ON actuator_models FOR SELECT USING (true);
CREATE POLICY "actuator_models_admin_write" ON actuator_models FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "actuator_models_admin_update" ON actuator_models FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "actuator_models_admin_delete" ON actuator_models FOR DELETE USING (get_user_role() = 'admin');

-- Handwheel Prices
ALTER TABLE handwheel_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handwheel_prices_read" ON handwheel_prices FOR SELECT USING (true);
CREATE POLICY "handwheel_prices_admin_write" ON handwheel_prices FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "handwheel_prices_admin_update" ON handwheel_prices FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "handwheel_prices_admin_delete" ON handwheel_prices FOR DELETE USING (get_user_role() = 'admin');

-- Machining Prices
ALTER TABLE machining_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machining_prices_read" ON machining_prices FOR SELECT USING (true);
CREATE POLICY "machining_prices_admin_write" ON machining_prices FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "machining_prices_admin_update" ON machining_prices FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "machining_prices_admin_delete" ON machining_prices FOR DELETE USING (get_user_role() = 'admin');

-- Testing Presets
ALTER TABLE testing_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testing_presets_read" ON testing_presets FOR SELECT USING (true);
CREATE POLICY "testing_presets_admin_write" ON testing_presets FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "testing_presets_admin_update" ON testing_presets FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "testing_presets_admin_delete" ON testing_presets FOR DELETE USING (get_user_role() = 'admin');

-- Tubing Presets
ALTER TABLE tubing_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tubing_presets_read" ON tubing_presets FOR SELECT USING (true);
CREATE POLICY "tubing_presets_admin_write" ON tubing_presets FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "tubing_presets_admin_update" ON tubing_presets FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "tubing_presets_admin_delete" ON tubing_presets FOR DELETE USING (get_user_role() = 'admin');

-- ============================================================
-- GLOBAL SETTINGS
-- ============================================================

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read" ON global_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_insert" ON global_settings FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "settings_admin_update" ON global_settings FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "settings_admin_delete" ON global_settings FOR DELETE USING (get_user_role() = 'admin');

-- ============================================================
-- QUOTE SEQUENCES
-- ============================================================

ALTER TABLE quote_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequences_read" ON quote_sequences FOR SELECT USING (true);
CREATE POLICY "sequences_write" ON quote_sequences FOR ALL USING (true);
