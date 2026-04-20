-- ============================================================
-- Unicorn Valves — Seed Data
-- ============================================================

INSERT INTO global_settings (key, value) VALUES
  ('standard_margins', '{"mfg_profit_pct": 25, "bo_profit_pct": 15, "neg_margin_pct": 5}'),
  ('project_margins',  '{"mfg_profit_pct": 20, "bo_profit_pct": 10, "neg_margin_pct": 3}'),
  ('exchange_rate',    '{"usd_to_inr": 83.50}'),
  ('company_info',     '{"name": "Unicorn Valves Pvt. Ltd.", "address": "Coimbatore, Tamil Nadu, India", "gstin": ""}')
ON CONFLICT (key) DO NOTHING;
