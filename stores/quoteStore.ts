// ============================================================
// Zustand store for the quote builder wizard
// ============================================================

import { create } from 'zustand';

export interface ProductConfig {
  id: string; // client-side temp id
  tag_number: string;
  quantity: number;
  series_id: string;
  series_name: string;
  size: string;
  rating: string;
  end_connect_type: string;
  bonnet_type: string;
  trim_type: string;
  body_bonnet_material_id: string;
  body_bonnet_material_name: string;
  plug_material_id: string;
  plug_material_name: string;
  seat_material_id: string;
  seat_material_name: string;
  stem_material_id: string;
  stem_material_name: string;
  cage_material_id: string;
  cage_material_name: string;
  seal_ring_type: string;
  has_pilot_plug: boolean;
  has_actuator: boolean;
  actuator_type: string;
  actuator_series: string;
  actuator_model_id: string;
  actuator_model_name: string;
  actuator_standard_special: string;
  has_handwheel: boolean;
  handwheel_type: string;
  handwheel_series: string;
  handwheel_model_id: string;
  handwheel_model_name: string;
  handwheel_standard_special: string;
  discount_pct: number;
  // Costs (populated after lookup)
  body_cost: number;
  bonnet_cost: number;
  plug_cost: number;
  seat_cost: number;
  stem_cost: number;
  cage_cost: number;
  seal_ring_cost: number;
  pilot_plug_cost: number;
  actuator_cost: number;
  handwheel_cost: number;
  tubing_items: Array<{ item_name: string; price: number; is_preset: boolean }>;
  testing_items: Array<{ item_name: string; price: number; is_preset: boolean }>;
  accessories: Array<{ item_name: string; unit_price: number; quantity: number }>;
  // Calculated
  unit_price: number;
  line_total: number;
  // Pricing validation
  pricing_warnings: string[];
  has_pricing_errors: boolean;
}

const emptyProduct = (): ProductConfig => ({
  id: crypto.randomUUID(),
  tag_number: '',
  quantity: 1,
  series_id: '',
  series_name: '',
  size: '',
  rating: '',
  end_connect_type: '',
  bonnet_type: '',
  trim_type: '',
  body_bonnet_material_id: '',
  body_bonnet_material_name: '',
  plug_material_id: '',
  plug_material_name: '',
  seat_material_id: '',
  seat_material_name: '',
  stem_material_id: '',
  stem_material_name: '',
  cage_material_id: '',
  cage_material_name: '',
  seal_ring_type: '',
  has_pilot_plug: false,
  has_actuator: false,
  actuator_type: '',
  actuator_series: '',
  actuator_model_id: '',
  actuator_model_name: '',
  actuator_standard_special: '',
  has_handwheel: false,
  handwheel_type: '',
  handwheel_series: '',
  handwheel_model_id: '',
  handwheel_model_name: '',
  handwheel_standard_special: '',
  discount_pct: 0,
  body_cost: 0,
  bonnet_cost: 0,
  plug_cost: 0,
  seat_cost: 0,
  stem_cost: 0,
  cage_cost: 0,
  seal_ring_cost: 0,
  pilot_plug_cost: 0,
  actuator_cost: 0,
  handwheel_cost: 0,
  tubing_items: [],
  testing_items: [],
  accessories: [],
  unit_price: 0,
  line_total: 0,
  pricing_warnings: [],
  has_pricing_errors: false,
});

interface QuoteState {
  // Step tracking
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Step 1: Customer & Project
  customer_id: string;
  customer_name: string;
  custom_quote_number: string;
  project_name: string;
  enquiry_id: string;
  pricing_mode: 'standard' | 'project';

  // Step 3: Terms & Pricing
  agent_commission_pct: number;
  pricing_type: 'ex-works' | 'for-site' | 'custom';
  custom_pricing_title: string;
  custom_pricing_price: number;
  validity_days: number;
  delivery_text: string;
  payment_advance_pct: number;
  payment_approval_pct: number;
  payment_despatch_pct: number;
  warranty_shipment_months: number;
  warranty_installation_months: number;
  freight_price: number;
  packing_price: number;
  notes: string;
  setQuoteSettings: (settings: Partial<QuoteState>) => void;

  // Step 2: Products
  products: ProductConfig[];
  addProduct: () => void;
  updateProduct: (id: string, updates: Partial<ProductConfig>) => void;
  removeProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;

  // Margins (loaded from global settings)
  mfg_profit_pct: number;
  bo_profit_pct: number;
  neg_margin_pct: number;
  setMargins: (margins: { mfg_profit_pct: number; bo_profit_pct: number; neg_margin_pct: number }) => void;

  // Edit mode
  edit_mode: boolean;
  edit_quote_id: string;
  exchange_rate_snapshot: number | null;
  loadForEdit: (data: {
    quote: any;
    products: any[];
    customItems?: any[];
  }) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  customer_id: '',
  customer_name: '',
  custom_quote_number: '',
  project_name: '',
  enquiry_id: '',
  pricing_mode: 'standard' as const,
  agent_commission_pct: 0,
  pricing_type: 'ex-works' as const,
  custom_pricing_title: '',
  custom_pricing_price: 0,
  validity_days: 30,
  delivery_text: '',
  payment_advance_pct: 30,
  payment_approval_pct: 0,
  payment_despatch_pct: 70,
  warranty_shipment_months: 18,
  warranty_installation_months: 12,
  freight_price: 0,
  packing_price: 0,
  notes: '',
  products: [] as ProductConfig[],
  mfg_profit_pct: 25,
  bo_profit_pct: 15,
  neg_margin_pct: 5,
  edit_mode: false,
  edit_quote_id: '',
  exchange_rate_snapshot: null as number | null,
};

export const useQuoteStore = create<QuoteState>((set) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  setQuoteSettings: (settings) => set((state) => ({ ...state, ...settings })),

  addProduct: () => set((state) => ({
    products: [...state.products, emptyProduct()],
  })),

  updateProduct: (id, updates) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, ...updates } : p),
  })),

  removeProduct: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id),
  })),

  duplicateProduct: (id) => set((state) => {
    const source = state.products.find(p => p.id === id);
    if (!source) return state;
    const clone = { ...source, id: crypto.randomUUID(), tag_number: '' };
    return { products: [...state.products, clone] };
  }),

  setMargins: (margins) => set(margins),

  loadForEdit: ({ quote, products, customItems }) => set({
    edit_mode: true,
    edit_quote_id: quote.id,
    currentStep: 0,
    customer_id: quote.customer_id,
    customer_name: quote.customer?.name ?? '',
    custom_quote_number: quote.quote_number,
    project_name: quote.project_name ?? '',
    enquiry_id: quote.enquiry_id ?? '',
    pricing_mode: quote.pricing_mode,
    agent_commission_pct: Number(quote.commission_pct ?? 0),
    pricing_type: quote.pricing_type,
    custom_pricing_title: quote.custom_pricing_title ?? '',
    custom_pricing_price: Number(quote.custom_pricing_price ?? 0),
    validity_days: quote.validity_days,
    delivery_text: quote.delivery_text,
    payment_advance_pct: Number(quote.payment_advance_pct),
    payment_approval_pct: Number(quote.payment_approval_pct),
    payment_despatch_pct: Number(quote.payment_despatch_pct),
    warranty_shipment_months: quote.warranty_shipment_months,
    warranty_installation_months: quote.warranty_installation_months,
    freight_price: Number(quote.freight_price ?? 0),
    packing_price: Number(quote.packing_price ?? 0),
    notes: quote.notes ?? '',
    exchange_rate_snapshot: quote.exchange_rate_snapshot ? Number(quote.exchange_rate_snapshot) : null,
    mfg_profit_pct: Number(products[0]?.mfg_profit_pct ?? 25),
    bo_profit_pct: Number(products[0]?.bo_profit_pct ?? 15),
    neg_margin_pct: Number(products[0]?.neg_margin_pct ?? 5),
    products: products.map((p: any) => ({
      id: p.id,
      tag_number: p.tag_number ?? '',
      quantity: p.quantity,
      series_id: p.series_id,
      series_name: p.description?.split(' | ')[0] ?? '',
      size: p.size,
      rating: p.rating,
      end_connect_type: p.end_connect_type,
      bonnet_type: p.bonnet_type,
      trim_type: p.trim_type,
      body_bonnet_material_id: p.body_bonnet_material_id ?? '',
      body_bonnet_material_name: '',
      plug_material_id: p.plug_material_id ?? '',
      plug_material_name: '',
      seat_material_id: p.seat_material_id ?? '',
      seat_material_name: '',
      stem_material_id: p.stem_material_id ?? '',
      stem_material_name: '',
      cage_material_id: p.cage_material_id ?? '',
      cage_material_name: '',
      seal_ring_type: p.seal_ring_type ?? '',
      has_pilot_plug: p.has_pilot_plug ?? false,
      has_actuator: p.has_actuator ?? false,
      actuator_type: '',
      actuator_series: '',
      actuator_model_id: p.actuator_model_id ?? '',
      actuator_model_name: '',
      actuator_standard_special: '',
      has_handwheel: p.has_handwheel ?? false,
      handwheel_type: '',
      handwheel_series: '',
      handwheel_model_id: p.handwheel_model_id ?? '',
      handwheel_model_name: '',
      handwheel_standard_special: '',
      discount_pct: Number(p.discount_pct ?? 0),
      body_cost: Number(p.body_cost ?? 0),
      bonnet_cost: Number(p.bonnet_cost ?? 0),
      plug_cost: Number(p.plug_cost ?? 0),
      seat_cost: Number(p.seat_cost ?? 0),
      stem_cost: Number(p.stem_cost ?? 0),
      cage_cost: Number(p.cage_cost ?? 0),
      seal_ring_cost: Number(p.seal_ring_cost ?? 0),
      pilot_plug_cost: Number(p.pilot_plug_cost ?? 0),
      actuator_cost: Number(p.actuator_cost ?? 0),
      handwheel_cost: Number(p.handwheel_cost ?? 0),
      tubing_items: (p.tubing_items ?? []).map((t: any) => ({
        item_name: t.item_name,
        price: Number(t.price),
        is_preset: t.is_preset ?? false,
      })),
      testing_items: (p.testing_items ?? []).map((t: any) => ({
        item_name: t.item_name,
        price: Number(t.price),
        is_preset: t.is_preset ?? false,
      })),
      accessories: (p.accessories ?? []).map((a: any) => ({
        item_name: a.item_name,
        unit_price: Number(a.unit_price),
        quantity: a.quantity,
      })),
      unit_price: Number(p.unit_price_inr ?? 0),
      line_total: Number(p.line_total_inr ?? 0),
      pricing_warnings: [],
      has_pricing_errors: false,
    })),
  }),

  reset: () => set({ ...initialState, products: [] }),
}));

export { emptyProduct };
