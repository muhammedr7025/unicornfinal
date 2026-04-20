// ============================================================
// Unicorn Valves — Zod Validation Schemas
// ============================================================

import { z } from 'zod';

// ---- Shared ----

const pctField = z.coerce.number().min(0).max(100);
const moneyField = z.coerce.number().min(0);
const uuidField = z.string().uuid();

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---- Profiles ----

export const createEmployeeSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'employee']).default('employee'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

// ---- Customers ----

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().min(1).default('India'),
  customer_type: z.enum(['normal', 'dealer']),
  commission_pct: pctField.default(0),
}).refine(
  (data) => data.customer_type !== 'normal' || data.commission_pct === 0,
  { message: 'Normal customers cannot have commission', path: ['commission_pct'] }
);

export type CustomerInput = z.infer<typeof customerSchema>;

// ---- Quote ----

export const quoteSettingsSchema = z.object({
  customer_id: uuidField,
  pricing_mode: z.enum(['standard', 'project']).default('standard'),
  validity_days: z.coerce.number().int().positive().default(30),
  delivery_text: z.string().min(1).default('4-6 working weeks'),
  payment_advance_pct: pctField.default(30),
  payment_approval_pct: pctField.default(0),
  payment_despatch_pct: pctField.default(70),
  warranty_shipment_months: z.coerce.number().int().positive().default(18),
  warranty_installation_months: z.coerce.number().int().positive().default(12),
  pricing_type: z.enum(['ex-works', 'for-site', 'custom']).default('ex-works'),
  freight_price: moneyField.default(0),
  packing_price: moneyField.default(0),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    const total = data.payment_advance_pct + data.payment_approval_pct + data.payment_despatch_pct;
    return Math.abs(total - 100) < 0.01;
  },
  { message: 'Payment terms must sum to 100%', path: ['payment_advance_pct'] }
);

export type QuoteSettingsInput = z.infer<typeof quoteSettingsSchema>;

// ---- Quote Product ----

export const quoteProductSchema = z.object({
  tag_number: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  series_id: uuidField,
  size: z.string().min(1, 'Size is required'),
  rating: z.string().min(1, 'Rating is required'),
  end_connect_type: z.string().min(1, 'End connection type is required'),
  bonnet_type: z.string().min(1, 'Bonnet type is required'),
  trim_type: z.string().min(1, 'Trim type is required'),
  body_bonnet_material_id: uuidField.optional().nullable(),
  plug_material_id: uuidField.optional().nullable(),
  seat_material_id: uuidField.optional().nullable(),
  stem_material_id: uuidField.optional().nullable(),
  cage_material_id: uuidField.optional().nullable(),
  seal_ring_type: z.string().optional().nullable(),
  has_pilot_plug: z.boolean().default(false),
  has_actuator: z.boolean().default(false),
  actuator_model_id: uuidField.optional().nullable(),
  has_handwheel: z.boolean().default(false),
  handwheel_model_id: uuidField.optional().nullable(),
  discount_pct: pctField.default(0),
  // Admin-only overrides (optional — will use global defaults if not provided)
  mfg_profit_pct: pctField.optional(),
  bo_profit_pct: pctField.optional(),
  neg_margin_pct: pctField.optional(),
});

export type QuoteProductInput = z.infer<typeof quoteProductSchema>;

// ---- Accessories ----

export const accessorySchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  unit_price: moneyField,
  quantity: z.coerce.number().int().min(0).default(0),
});

export type AccessoryInput = z.infer<typeof accessorySchema>;

// ---- Tubing / Testing Items ----

export const lineItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  price: moneyField,
  is_preset: z.boolean().default(false),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

// ---- Global Settings ----

export const marginsSchema = z.object({
  mfg_profit_pct: pctField,
  bo_profit_pct: pctField,
  neg_margin_pct: pctField,
});

export type MarginsInput = z.infer<typeof marginsSchema>;

export const exchangeRateSchema = z.object({
  usd_to_inr: z.coerce.number().positive('Exchange rate must be positive'),
});

export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;

export const companyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  gstin: z.string(),
});

export type CompanyInfoInput = z.infer<typeof companyInfoSchema>;

// ---- Status Change ----

export const quoteStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'approved', 'rejected']),
});

export type QuoteStatusInput = z.infer<typeof quoteStatusSchema>;
