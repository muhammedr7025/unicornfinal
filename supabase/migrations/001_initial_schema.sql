-- ============================================================
-- Unicorn Valves — Initial Database Schema
-- Migration 001: All tables, functions, sequences
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  country         TEXT NOT NULL DEFAULT 'India',
  is_international BOOLEAN GENERATED ALWAYS AS (country != 'India') STORED,
  customer_type   TEXT NOT NULL CHECK (customer_type IN ('normal', 'dealer')),
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct < 100),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT normal_customer_no_commission CHECK (
    customer_type != 'normal' OR commission_pct = 0
  )
);

-- ============================================================
-- 3. PRICING MASTER TABLES
-- ============================================================

CREATE TABLE series (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_number   TEXT NOT NULL UNIQUE,
  series_name     TEXT NOT NULL,
  product_type    TEXT NOT NULL,
  has_cage        BOOLEAN NOT NULL DEFAULT false,
  has_seal_ring   BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name   TEXT NOT NULL,
  price_per_kg    NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
  material_group  TEXT NOT NULL CHECK (material_group IN ('BodyBonnet','Plug','Seat','Stem','Cage')),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE body_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  end_connect_type TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating, end_connect_type)
);

CREATE TABLE bonnet_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  bonnet_type     TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating, bonnet_type)
);

CREATE TABLE plug_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating)
);

CREATE TABLE seat_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating)
);

CREATE TABLE cage_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating)
);

CREATE TABLE pilot_plug_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  weight_kg       NUMERIC(8,3) NOT NULL CHECK (weight_kg >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating)
);

CREATE TABLE seal_ring_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  seal_type       TEXT NOT NULL,
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  fixed_price     NUMERIC(10,2) NOT NULL CHECK (fixed_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, seal_type, size, rating)
);

CREATE TABLE stem_fixed_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  material_id     UUID NOT NULL REFERENCES materials(id),
  fixed_price     NUMERIC(10,2) NOT NULL CHECK (fixed_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (series_id, size, rating, material_id)
);

CREATE TABLE actuator_models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  series          TEXT NOT NULL,
  model           TEXT NOT NULL,
  standard_special TEXT NOT NULL DEFAULT 'standard',
  fixed_price     NUMERIC(10,2) NOT NULL CHECK (fixed_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE handwheel_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  series          TEXT NOT NULL,
  model           TEXT NOT NULL,
  standard_special TEXT NOT NULL DEFAULT 'standard',
  fixed_price     NUMERIC(10,2) NOT NULL CHECK (fixed_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE machining_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component       TEXT NOT NULL CHECK (component IN ('body','bonnet','plug','seat','stem','cage')),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  type_key        TEXT NOT NULL,
  material_id     UUID NOT NULL REFERENCES materials(id),
  fixed_price     NUMERIC(10,2) NOT NULL CHECK (fixed_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (component, series_id, size, rating, type_key, material_id)
);

CREATE TABLE testing_presets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  test_name       TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE tubing_presets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID NOT NULL REFERENCES series(id),
  size            TEXT NOT NULL,
  rating          TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- 4. QUOTES & QUOTE PRODUCTS
-- ============================================================

CREATE TABLE quotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number        TEXT NOT NULL UNIQUE,
  customer_id         UUID NOT NULL REFERENCES customers(id),
  created_by          UUID NOT NULL REFERENCES profiles(id),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  pricing_mode        TEXT NOT NULL DEFAULT 'standard'
                      CHECK (pricing_mode IN ('standard', 'project')),

  -- Quote-level settings (for PDF)
  validity_days       INTEGER NOT NULL DEFAULT 30,
  delivery_text       TEXT NOT NULL DEFAULT '4-6 working weeks',
  payment_advance_pct NUMERIC(5,2) NOT NULL DEFAULT 30,
  payment_approval_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  payment_despatch_pct NUMERIC(5,2) NOT NULL DEFAULT 70,
  warranty_shipment_months INTEGER DEFAULT 18,
  warranty_installation_months INTEGER DEFAULT 12,
  pricing_type        TEXT NOT NULL DEFAULT 'ex-works'
                      CHECK (pricing_type IN ('ex-works', 'for-site', 'custom')),
  freight_price       NUMERIC(12,2) DEFAULT 0,
  packing_price       NUMERIC(12,2) DEFAULT 0,
  exchange_rate_snapshot NUMERIC(10,4),
  notes               TEXT,

  -- Computed totals (stored for fast display)
  subtotal_inr        NUMERIC(14,2),
  tax_amount_inr      NUMERIC(14,2),
  grand_total_inr     NUMERIC(14,2),

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quote_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id            UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  tag_number          TEXT,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Valve configuration
  series_id           UUID NOT NULL REFERENCES series(id),
  size                TEXT NOT NULL,
  rating              TEXT NOT NULL,
  end_connect_type    TEXT NOT NULL,
  bonnet_type         TEXT NOT NULL,
  trim_type           TEXT NOT NULL,

  -- Material selections
  body_bonnet_material_id UUID REFERENCES materials(id),
  plug_material_id    UUID REFERENCES materials(id),
  seat_material_id    UUID REFERENCES materials(id),
  stem_material_id    UUID REFERENCES materials(id),
  cage_material_id    UUID REFERENCES materials(id),
  seal_ring_type      TEXT,

  -- Optional toggles
  has_pilot_plug      BOOLEAN DEFAULT false,
  has_actuator        BOOLEAN DEFAULT false,
  actuator_model_id   UUID REFERENCES actuator_models(id),
  has_handwheel       BOOLEAN DEFAULT false,
  handwheel_model_id  UUID REFERENCES handwheel_prices(id),

  -- Pricing parameters (snapshot at time of save)
  mfg_profit_pct      NUMERIC(5,2) NOT NULL,
  bo_profit_pct       NUMERIC(5,2) NOT NULL,
  neg_margin_pct      NUMERIC(5,2) NOT NULL,
  commission_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Cost breakdown
  body_cost           NUMERIC(12,2),
  bonnet_cost         NUMERIC(12,2),
  plug_cost           NUMERIC(12,2),
  seat_cost           NUMERIC(12,2),
  stem_cost           NUMERIC(12,2),
  cage_cost           NUMERIC(12,2),
  seal_ring_cost      NUMERIC(12,2),
  pilot_plug_cost     NUMERIC(12,2),
  actuator_cost       NUMERIC(12,2),
  handwheel_cost      NUMERIC(12,2),
  tubing_cost         NUMERIC(12,2),
  testing_cost        NUMERIC(12,2),
  accessories_cost    NUMERIC(12,2),

  -- Final calculated values
  mfg_total_cost      NUMERIC(12,2),
  bo_total_cost       NUMERIC(12,2),
  unit_price_inr      NUMERIC(12,2),
  line_total_inr      NUMERIC(12,2),

  -- Item description for PDF
  description         TEXT,

  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. PRODUCT LINE ITEMS
-- ============================================================

CREATE TABLE product_tubing_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_product_id UUID NOT NULL REFERENCES quote_products(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  price           NUMERIC(12,2) NOT NULL,
  is_preset       BOOLEAN DEFAULT true
);

CREATE TABLE product_testing_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_product_id UUID NOT NULL REFERENCES quote_products(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  price           NUMERIC(12,2) NOT NULL,
  is_preset       BOOLEAN DEFAULT true
);

CREATE TABLE product_accessories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_product_id UUID NOT NULL REFERENCES quote_products(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  line_total      NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);

-- ============================================================
-- 6. GLOBAL SETTINGS
-- ============================================================

CREATE TABLE global_settings (
  key     TEXT PRIMARY KEY,
  value   JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. QUOTE SEQUENCES
-- ============================================================

CREATE TABLE quote_sequences (
  fy_code     TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Atomic function to get next sequence number for a financial year
CREATE OR REPLACE FUNCTION get_next_quote_sequence(p_fy_code TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO quote_sequences (fy_code, last_number)
  VALUES (p_fy_code, 1)
  ON CONFLICT (fy_code)
  DO UPDATE SET last_number = quote_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
