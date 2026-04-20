-- ============================================================
-- Unicorn Valves — Database Indexes
-- Migration 003
-- ============================================================

-- Quotes: common filter patterns
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- Quote products: join performance
CREATE INDEX idx_quote_products_quote_id ON quote_products(quote_id);

-- Product line items: join performance
CREATE INDEX idx_tubing_items_product ON product_tubing_items(quote_product_id);
CREATE INDEX idx_testing_items_product ON product_testing_items(quote_product_id);
CREATE INDEX idx_accessories_product ON product_accessories(quote_product_id);

-- Pricing lookups: the most common query patterns
CREATE INDEX idx_body_weights_lookup ON body_weights(series_id, size, rating, end_connect_type) WHERE is_active = true;
CREATE INDEX idx_bonnet_weights_lookup ON bonnet_weights(series_id, size, rating, bonnet_type) WHERE is_active = true;
CREATE INDEX idx_plug_weights_lookup ON plug_weights(series_id, size, rating) WHERE is_active = true;
CREATE INDEX idx_seat_weights_lookup ON seat_weights(series_id, size, rating) WHERE is_active = true;
CREATE INDEX idx_cage_weights_lookup ON cage_weights(series_id, size, rating) WHERE is_active = true;
CREATE INDEX idx_pilot_plug_weights_lookup ON pilot_plug_weights(series_id, size, rating) WHERE is_active = true;
CREATE INDEX idx_seal_ring_prices_lookup ON seal_ring_prices(series_id, seal_type, size, rating) WHERE is_active = true;
CREATE INDEX idx_stem_fixed_prices_lookup ON stem_fixed_prices(series_id, size, rating, material_id) WHERE is_active = true;
CREATE INDEX idx_machining_prices_lookup ON machining_prices(component, series_id, size, rating, type_key, material_id) WHERE is_active = true;
CREATE INDEX idx_testing_presets_lookup ON testing_presets(series_id, size, rating) WHERE is_active = true;
CREATE INDEX idx_tubing_presets_lookup ON tubing_presets(series_id, size, rating) WHERE is_active = true;

-- Materials: filtered by group
CREATE INDEX idx_materials_group ON materials(material_group) WHERE is_active = true;

-- Customers: common filters
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_country ON customers(country);
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- Series: active lookup
CREATE INDEX idx_series_active ON series(series_number) WHERE is_active = true;
