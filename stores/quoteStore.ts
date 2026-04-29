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
});

interface QuoteState {
  // Step tracking
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Step 1: Quote settings
  customer_id: string;
  customer_name: string;
  custom_quote_number: string;
  project_name: string;
  enquiry_id: string;
  agent_commission_pct: number;
  pricing_mode: 'standard' | 'project';
  pricing_type: 'ex-works' | 'for-site' | 'custom';
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
  agent_commission_pct: 0,
  pricing_mode: 'standard' as const,
  pricing_type: 'ex-works' as const,
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
  products: [],
  mfg_profit_pct: 25,
  bo_profit_pct: 15,
  neg_margin_pct: 5,
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

  reset: () => set({ ...initialState, products: [] }),
}));

export { emptyProduct };
