// ============================================================
// Unicorn Valves — Shared TypeScript Types
// ============================================================

// ---- Enums / Literal Unions ----

export type UserRole = 'admin' | 'employee';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected';
export type PricingMode = 'standard' | 'project';
export type PricingType = 'ex-works' | 'for-site' | 'custom';
export type CustomerType = 'normal' | 'dealer';
export type MaterialGroup = 'BodyBonnet' | 'Plug' | 'Seat' | 'Stem' | 'Cage';
export type MachiningComponent = 'body' | 'bonnet' | 'plug' | 'seat' | 'stem' | 'cage';

// ---- Auth & Users ----

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ---- Customers ----

export interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string;
  is_international: boolean;
  customer_type: CustomerType;
  commission_pct: number;
  gstin: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Quotes ----

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  created_by: string;
  status: QuoteStatus;
  pricing_mode: PricingMode;

  // Quote-level settings
  validity_days: number;
  delivery_text: string;
  payment_advance_pct: number;
  payment_approval_pct: number;
  payment_despatch_pct: number;
  warranty_shipment_months: number;
  warranty_installation_months: number;
  pricing_type: PricingType;
  freight_price: number;
  packing_price: number;
  exchange_rate_snapshot: number | null;
  notes: string | null;

  // Computed totals
  subtotal_inr: number | null;
  tax_amount_inr: number | null;
  grand_total_inr: number | null;

  created_at: string;
  updated_at: string;

  // Joined data (optional)
  customer?: Customer;
  products?: QuoteProduct[];
  created_by_profile?: Profile;
}

export interface QuoteProduct {
  id: string;
  quote_id: string;
  sort_order: number;
  tag_number: string | null;
  quantity: number;

  // Valve configuration
  series_id: string;
  size: string;
  rating: string;
  end_connect_type: string;
  bonnet_type: string;
  trim_type: string;

  // Material selections
  body_bonnet_material_id: string | null;
  plug_material_id: string | null;
  seat_material_id: string | null;
  stem_material_id: string | null;
  cage_material_id: string | null;
  seal_ring_type: string | null;

  // Optional toggles
  has_pilot_plug: boolean;
  has_actuator: boolean;
  actuator_model_id: string | null;
  has_handwheel: boolean;
  handwheel_model_id: string | null;

  // Pricing parameters (snapshot)
  mfg_profit_pct: number;
  bo_profit_pct: number;
  neg_margin_pct: number;
  commission_pct: number;
  discount_pct: number;

  // Cost breakdown
  body_cost: number | null;
  bonnet_cost: number | null;
  plug_cost: number | null;
  seat_cost: number | null;
  stem_cost: number | null;
  cage_cost: number | null;
  seal_ring_cost: number | null;
  pilot_plug_cost: number | null;
  actuator_cost: number | null;
  handwheel_cost: number | null;
  tubing_cost: number | null;
  testing_cost: number | null;
  accessories_cost: number | null;

  // Final calculated values
  mfg_total_cost: number | null;
  bo_total_cost: number | null;
  unit_price_inr: number | null;
  line_total_inr: number | null;

  // Description
  description: string | null;

  created_at: string;

  // Joined data (optional)
  series?: Series;
  tubing_items?: ProductTubingItem[];
  testing_items?: ProductTestingItem[];
  accessories?: ProductAccessory[];
}

// ---- Line Items ----

export interface ProductTubingItem {
  id: string;
  quote_product_id: string;
  item_name: string;
  price: number;
  is_preset: boolean;
}

export interface ProductTestingItem {
  id: string;
  quote_product_id: string;
  item_name: string;
  price: number;
  is_preset: boolean;
}

export interface ProductAccessory {
  id: string;
  quote_product_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

// ---- Pricing Master Tables ----

export interface Series {
  id: string;
  series_number: string;
  series_name: string;
  product_type: string;
  has_cage: boolean;
  has_seal_ring: boolean;
  is_active: boolean;
}

export interface Material {
  id: string;
  material_name: string;
  price_per_kg: number;
  material_group: MaterialGroup;
  is_active: boolean;
}

export interface BodyWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  end_connect_type: string;
  weight_kg: number;
  is_active: boolean;
}

export interface BonnetWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  bonnet_type: string;
  weight_kg: number;
  is_active: boolean;
}

export interface PlugWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  weight_kg: number;
  is_active: boolean;
}

export interface SeatWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  weight_kg: number;
  is_active: boolean;
}

export interface CageWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  weight_kg: number;
  is_active: boolean;
}

export interface PilotPlugWeight {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  weight_kg: number;
  is_active: boolean;
}

export interface SealRingPrice {
  id: string;
  series_id: string;
  seal_type: string;
  size: string;
  rating: string;
  fixed_price: number;
  is_active: boolean;
}

export interface StemFixedPrice {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  material_id: string;
  fixed_price: number;
  is_active: boolean;
}

export interface ActuatorModel {
  id: string;
  type: string;
  series: string;
  model: string;
  standard_special: string;
  fixed_price: number;
  is_active: boolean;
}

export interface HandwheelPrice {
  id: string;
  type: string;
  series: string;
  model: string;
  standard_special: string;
  fixed_price: number;
  is_active: boolean;
}

export interface MachiningPrice {
  id: string;
  component: MachiningComponent;
  series_id: string;
  size: string;
  rating: string;
  type_key: string;
  material_id: string;
  fixed_price: number;
  is_active: boolean;
}

export interface TestingPreset {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  test_name: string;
  price: number;
  is_active: boolean;
}

export interface TubingPreset {
  id: string;
  series_id: string;
  size: string;
  rating: string;
  item_name: string;
  price: number;
  is_active: boolean;
}

// ---- Global Settings ----

export interface StandardMargins {
  mfg_profit_pct: number;
  bo_profit_pct: number;
  neg_margin_pct: number;
}

export interface ProjectMargins {
  mfg_profit_pct: number;
  bo_profit_pct: number;
  neg_margin_pct: number;
}

export interface ExchangeRate {
  usd_to_inr: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  gstin: string;
}

export interface GlobalSettingsMap {
  standard_margins: StandardMargins;
  project_margins: ProjectMargins;
  exchange_rate: ExchangeRate;
  company_info: CompanyInfo;
}

// ---- Pricing Engine Types ----

export interface ComponentCosts {
  body: number;
  bonnet: number;
  plug: number;
  seat: number;
  stem: number;
  cage: number;
  sealRing: number;
  pilotPlug: number;
  tubing: number;
  testing: number;
  actuator: number;
  handwheel: number;
  accessories: number;
}

export interface PricingParams {
  mfgProfitPct: number;
  boProfitPct: number;
  negMarginPct: number;
  commissionPct: number;   // 0 for normal customers
  discountPct: number;
  quantity: number;
}

export interface PricingResult {
  mfgCost: number;
  mfgCostWithProfit: number;
  boCost: number;
  boCostWithProfit: number;
  unitCost: number;
  afterNegMargin: number;
  afterCommission: number;
  afterDiscount: number;
  unitPrice: number;        // rounded to nearest ₹10
  lineTotal: number;        // rounded to nearest ₹10
}

export interface QuoteTotalResult {
  productSubtotal: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

export interface CustomItem {
  name: string;
  price: number;
}

// ---- Quote Sequences ----

export interface QuoteSequence {
  fy_code: string;
  last_number: number;
}

// ---- PDF Types ----

export type PdfType = 'price-summary' | 'cover-letter' | 'combined' | 'unpriced';

// ---- API Response Types ----

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Array<{
    sheet?: string;
    row?: number;
    column?: string;
    error: string;
  }>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
