// ============================================================
// Unicorn Valves — Canonical Pricing Engine
// ============================================================
// PURE FUNCTIONS ONLY — No DB calls, no side effects, no imports
// except types. This is the SINGLE SOURCE OF TRUTH for all
// pricing calculations in the entire system.
// ============================================================

import type { ComponentCosts, PricingParams, PricingResult, QuoteTotalResult, CustomItem } from '@/types';

/**
 * Round UP to the nearest ₹10 (ceiling, NOT standard rounding).
 * Only applied at steps 9 and 10 of the pricing chain.
 */
export function roundToNearest10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

/**
 * Clamp a percentage value to [0, ∞). Negative values become 0.
 */
function clampPct(pct: number): number {
  return Math.max(0, pct);
}

/**
 * Apply margin-on-selling-price formula.
 *
 * Formula: sellingPrice = cost ÷ (1 − margin% ÷ 100)
 *
 * This is NOT a markup. A 25% margin means profit = 25% of the SELLING PRICE.
 * Proof: Cost=75000, Selling=75000÷0.75=100000, Profit=25000=25% of 100000 ✓
 *
 * Guards:
 * - If marginPct >= 100 → return cost unchanged (prevents division by zero/negative)
 * - If cost <= 0 → return 0
 */
function applyMarginOnPrice(cost: number, marginPct: number): number {
  const pct = clampPct(marginPct);
  if (cost <= 0) return 0;
  if (pct >= 100) return cost; // Guard: skip if margin is 100% or more
  return cost / (1 - pct / 100);
}

/**
 * Calculate the cost of a weight-based component.
 * Formula: (weight_kg × price_per_kg) + machining_fixed_price
 */
export function calculateWeightBasedCost(
  weightKg: number,
  pricePerKg: number,
  machiningPrice: number = 0
): number {
  return weightKg * pricePerKg + machiningPrice;
}

/**
 * Calculate the cost of a fixed-price component (e.g. Seal Ring).
 * Formula: fixed_price + machining_fixed_price
 */
export function calculateFixedComponentCost(
  fixedPrice: number,
  machiningPrice: number = 0
): number {
  return fixedPrice + machiningPrice;
}

/**
 * The 10-Step Pricing Calculation Chain.
 *
 * Steps:
 * 1. Component costs are provided pre-calculated (body, bonnet, plug, etc.)
 * 2. Manufacturing Cost = sum of manufactured components + actuator + handwheel
 * 3. Apply Manufacturing Profit (margin-on-price)
 * 4. Bought-out Cost = accessories only
 * 5. Apply Bought-out Profit (margin-on-price)
 * 6. Unit Cost = mfgCostWithProfit + boCostWithProfit
 * 7. Apply Negotiation Margin (margin-on-price)
 * 8. Apply Agent Commission (margin-on-price, only for dealers)
 * 9. Apply Discount + Round unit price to nearest ₹10
 * 10. Line Total = unitPrice × quantity, rounded to nearest ₹10
 */
export function calculateProductPrice(
  costs: ComponentCosts,
  params: PricingParams
): PricingResult {
  // Clamp all percentages
  const mfgProfitPct = clampPct(params.mfgProfitPct);
  const boProfitPct = clampPct(params.boProfitPct);
  const negMarginPct = clampPct(params.negMarginPct);
  const commissionPct = clampPct(params.commissionPct);
  const discountPct = clampPct(params.discountPct);
  const quantity = Math.max(1, params.quantity || 1); // Default to 1 if 0 or empty

  // ── Step 2: Manufacturing Cost ──
  // Sum of all manufactured components + actuator + handwheel
  const mfgCost =
    costs.body +
    costs.bonnet +
    costs.plug +
    costs.seat +
    costs.stem +
    costs.cage +
    costs.sealRing +
    costs.pilotPlug +
    costs.tubing +
    costs.testing +
    costs.actuator +
    costs.handwheel;

  // ── Step 3: Apply Manufacturing Profit ──
  const mfgCostWithProfit = applyMarginOnPrice(mfgCost, mfgProfitPct);

  // ── Step 4: Bought-out Cost (accessories only) ──
  const boCost = costs.accessories;

  // ── Step 5: Apply Bought-out Profit ──
  // Guard: if boCost = 0, skip entirely
  const boCostWithProfit = boCost === 0 ? 0 : applyMarginOnPrice(boCost, boProfitPct);

  // ── Step 6: Unit Cost ──
  const unitCost = mfgCostWithProfit + boCostWithProfit;

  // ── Step 7: Apply Negotiation Margin ──
  const afterNegMargin = applyMarginOnPrice(unitCost, negMarginPct);

  // ── Step 8: Apply Agent Commission ──
  // Only if commissionPct > 0 (normal customers always have 0)
  const afterCommission =
    commissionPct > 0
      ? applyMarginOnPrice(afterNegMargin, commissionPct)
      : afterNegMargin;

  // ── Step 9: Apply Discount + Round ──
  const afterDiscount =
    discountPct > 0
      ? afterCommission * (1 - discountPct / 100)
      : afterCommission;

  const unitPrice = roundToNearest10(afterDiscount);

  // ── Step 10: Line Total ──
  const lineTotal = roundToNearest10(unitPrice * quantity);

  return {
    mfgCost,
    mfgCostWithProfit,
    boCost,
    boCostWithProfit,
    unitCost,
    afterNegMargin,
    afterCommission,
    afterDiscount,
    unitPrice,
    lineTotal,
  };
}

/**
 * Calculate quote-level totals.
 *
 * @param products - Array of products with their lineTotal values
 * @param pricingType - 'ex-works', 'for-site', or 'custom'
 * @param freightPrice - Freight charges (only for 'for-site')
 * @param customItems - Custom line items (only for 'custom')
 * @param packingPrice - Packing charges
 * @param isInternational - If true, no GST (0% tax); otherwise 18% GST
 */
export function calculateQuoteTotal(
  products: Array<{ lineTotal: number }>,
  pricingType: string,
  freightPrice: number = 0,
  customItems: CustomItem[] = [],
  packingPrice: number = 0,
  isInternational: boolean = false
): QuoteTotalResult {
  const productSubtotal = products.reduce((sum, p) => sum + p.lineTotal, 0);

  let subtotal = productSubtotal;

  if (pricingType === 'for-site') {
    subtotal += freightPrice ?? 0;
  }

  if (pricingType === 'custom') {
    subtotal += customItems.reduce((sum, item) => sum + item.price, 0);
  }

  subtotal += packingPrice ?? 0;

  const taxRate = isInternational ? 0 : 0.18; // 18% GST for India, 0% international
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  return { productSubtotal, subtotal, taxAmount, grandTotal };
}

/**
 * Convert INR to USD for display and PDF only.
 * Calculation always happens in INR.
 *
 * Uses Math.round (not floor or ceil) for currency display.
 */
export function convertToUSD(amountINR: number, exchangeRate: number): number {
  if (exchangeRate <= 0) return 0;
  return Math.round(amountINR / exchangeRate);
}
