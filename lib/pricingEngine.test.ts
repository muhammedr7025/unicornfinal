// ============================================================
// Unicorn Valves — Pricing Engine Unit Tests
// ============================================================
// These tests are the GROUND TRUTH. If any test fails, the
// pricing engine has a bug. The worked example from PRD §5.4
// MUST match exactly.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  roundToNearest10,
  calculateWeightBasedCost,
  calculateFixedComponentCost,
  calculateProductPrice,
  calculateQuoteTotal,
  convertToUSD,
} from './pricingEngine';
import type { ComponentCosts, PricingParams } from '@/types';

// ============================================================
// §5.2 — Rounding Rule
// ============================================================

describe('roundToNearest10', () => {
  it('rounds up exact multiples to themselves', () => {
    expect(roundToNearest10(100)).toBe(100);
    expect(roundToNearest10(50860)).toBe(50860);
    expect(roundToNearest10(0)).toBe(0);
  });

  it('rounds up non-multiples to next ₹10', () => {
    expect(roundToNearest10(101)).toBe(110);
    expect(roundToNearest10(50851)).toBe(50860);
    expect(roundToNearest10(50856.38)).toBe(50860);
    expect(roundToNearest10(1)).toBe(10);
    expect(roundToNearest10(9.99)).toBe(10);
    expect(roundToNearest10(10.01)).toBe(20);
  });

  it('handles negative values', () => {
    // Math.ceil(-5/10) * 10 produces -0, which is fine (treated as 0 in all arithmetic)
    const result = roundToNearest10(-5);
    expect(result + 0).toBe(0); // -0 + 0 = 0
    expect(result >= 0).toBe(true);
  });
});

// ============================================================
// Component Cost Calculations (§5.3 Step 1)
// ============================================================

describe('calculateWeightBasedCost', () => {
  it('computes weight × pricePerKg + machining', () => {
    // Body from worked example: 5kg × ₹180/kg + ₹850 = ₹1750
    expect(calculateWeightBasedCost(5, 180, 850)).toBe(1750);
  });

  it('handles zero weight', () => {
    expect(calculateWeightBasedCost(0, 180, 850)).toBe(850);
  });

  it('handles zero machining', () => {
    expect(calculateWeightBasedCost(5, 180, 0)).toBe(900);
  });

  it('handles all components from worked example', () => {
    // Bonnet: 1.2kg × ₹180 + ₹600 = ₹816
    expect(calculateWeightBasedCost(1.2, 180, 600)).toBe(816);
    // Plug: 0.4kg × ₹450 + ₹1200 = ₹1380
    expect(calculateWeightBasedCost(0.4, 450, 1200)).toBe(1380);
    // Seat: 0.3kg × ₹450 + ₹900 = ₹1035
    expect(calculateWeightBasedCost(0.3, 450, 900)).toBe(1035);
  });
});

describe('calculateFixedComponentCost', () => {
  it('computes fixedPrice + machining', () => {
    // Stem from worked example: ₹1200 + ₹0 = ₹1200
    expect(calculateFixedComponentCost(1200, 0)).toBe(1200);
  });

  it('adds machining when present', () => {
    expect(calculateFixedComponentCost(1200, 300)).toBe(1500);
  });
});

// ============================================================
// §5.4 — Full Worked Example (THE GROUND TRUTH)
// ============================================================

describe('calculateProductPrice — Worked Example §5.4', () => {
  const costs: ComponentCosts = {
    body: 1750,      // 5kg × ₹180 + ₹850
    bonnet: 816,     // 1.2kg × ₹180 + ₹600
    plug: 1380,      // 0.4kg × ₹450 + ₹1200
    seat: 1035,      // 0.3kg × ₹450 + ₹900
    stem: 1200,      // weight-based: e.g. 0.5kg × ₹450 + ₹975 machining (result still ₹1200 for test compatibility)
    cage: 0,         // not included in this example
    sealRing: 0,     // not included in this example
    pilotPlug: 0,    // not enabled
    tubing: 4500,    // preset
    testing: 6000,   // hydro=2500 + pmi=3500
    actuator: 12000, // fixed
    handwheel: 0,    // not enabled
    accessories: 8000, // Positioner: ₹8000 × 1
  };

  const params: PricingParams = {
    mfgProfitPct: 25,
    boProfitPct: 15,
    negMarginPct: 5,
    commissionPct: 10,
    discountPct: 5,
    quantity: 3,
  };

  it('produces correct mfgCost (Step 2)', () => {
    const result = calculateProductPrice(costs, params);
    // 1750 + 816 + 1380 + 1035 + 1200 + 0 + 0 + 0 + 4500 + 6000 + 12000 + 0 = 28681
    expect(result.mfgCost).toBe(28681);
  });

  it('produces correct mfgCostWithProfit (Step 3)', () => {
    const result = calculateProductPrice(costs, params);
    // 28681 ÷ (1 - 0.25) = 28681 ÷ 0.75 = 38241.333...
    expect(result.mfgCostWithProfit).toBeCloseTo(38241.33, 1);
  });

  it('produces correct boCost (Step 4)', () => {
    const result = calculateProductPrice(costs, params);
    // accessories only = 8000
    expect(result.boCost).toBe(8000);
  });

  it('produces correct boCostWithProfit (Step 5)', () => {
    const result = calculateProductPrice(costs, params);
    // 8000 ÷ (1 - 0.15) = 8000 ÷ 0.85 = 9411.7647...
    expect(result.boCostWithProfit).toBeCloseTo(9411.76, 1);
  });

  it('produces correct unitCost (Step 6)', () => {
    const result = calculateProductPrice(costs, params);
    // 38241.333... + 9411.7647... = 47653.098...
    expect(result.unitCost).toBeCloseTo(47653.10, 0);
  });

  it('produces correct afterNegMargin (Step 7)', () => {
    const result = calculateProductPrice(costs, params);
    // 47653.098... ÷ 0.95 = 50161.156...
    expect(result.afterNegMargin).toBeCloseTo(50161.16, 0);
  });

  it('produces correct afterCommission (Step 8)', () => {
    const result = calculateProductPrice(costs, params);
    // 50161.156... ÷ 0.90 = 55734.618...
    expect(result.afterCommission).toBeCloseTo(55734.62, 0);
  });

  it('produces correct afterDiscount (Step 9a)', () => {
    const result = calculateProductPrice(costs, params);
    // 55734.618... × 0.95 = 52947.887...
    expect(result.afterDiscount).toBeCloseTo(52947.89, 0);
  });

  it('produces correct unitPrice rounded (Step 9b)', () => {
    const result = calculateProductPrice(costs, params);
    // ceil(52947.887 / 10) × 10 = 52950
    expect(result.unitPrice).toBe(52950);
  });

  it('produces correct lineTotal (Step 10)', () => {
    const result = calculateProductPrice(costs, params);
    // ceil(52950 × 3 / 10) × 10 = ceil(158850 / 10) × 10 = 158850
    expect(result.lineTotal).toBe(158850);
  });

  it('passes the full worked example end-to-end', () => {
    const result = calculateProductPrice(costs, params);
    expect(result.mfgCost).toBe(28681);
    expect(result.boCost).toBe(8000);
    expect(result.unitPrice).toBe(52950);
    expect(result.lineTotal).toBe(158850);
  });
});

// ============================================================
// Edge Cases (§5.7)
// ============================================================

describe('calculateProductPrice — Edge Cases', () => {
  const baseCosts: ComponentCosts = {
    body: 1750, bonnet: 816, plug: 1380, seat: 1035, stem: 1200,
    cage: 0, sealRing: 0, pilotPlug: 0, tubing: 4500, testing: 6000,
    actuator: 0, handwheel: 0, accessories: 0,
  };

  it('margin >= 100% skips that step (uses cost as-is)', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 100, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // mfgCostWithProfit should equal mfgCost (margin step skipped)
    expect(result.mfgCostWithProfit).toBe(result.mfgCost);
  });

  it('margin > 100% also skips (e.g. 150%)', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 150, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    expect(result.mfgCostWithProfit).toBe(result.mfgCost);
  });

  it('discount = 0% skips discount step', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // afterDiscount should equal afterCommission (no discount applied)
    expect(result.afterDiscount).toBe(result.afterCommission);
  });

  it('commission = 0% skips commission step', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // afterCommission should equal afterNegMargin
    expect(result.afterCommission).toBe(result.afterNegMargin);
  });

  it('boCost = 0 skips BO profit step', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    expect(result.boCost).toBe(0);
    expect(result.boCostWithProfit).toBe(0);
  });

  it('quantity = 0 defaults to 1', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 0, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 0,
    });
    // lineTotal should equal unitPrice (qty=1)
    expect(result.lineTotal).toBe(result.unitPrice);
  });

  it('negative margin treated as 0 (clamped)', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: -10, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // mfgCostWithProfit == mfgCost (0% margin applied)
    expect(result.mfgCostWithProfit).toBe(result.mfgCost);
  });

  it('negative discount treated as 0', () => {
    const result = calculateProductPrice(baseCosts, {
      mfgProfitPct: 25, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: -5, quantity: 1,
    });
    // afterDiscount == afterCommission (no discount)
    expect(result.afterDiscount).toBe(result.afterCommission);
  });

  it('all zeros produces zero', () => {
    const zeroCosts: ComponentCosts = {
      body: 0, bonnet: 0, plug: 0, seat: 0, stem: 0,
      cage: 0, sealRing: 0, pilotPlug: 0, tubing: 0, testing: 0,
      actuator: 0, handwheel: 0, accessories: 0,
    };
    const result = calculateProductPrice(zeroCosts, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 10, discountPct: 5, quantity: 1,
    });
    expect(result.unitPrice).toBe(0);
    expect(result.lineTotal).toBe(0);
  });
});

// ============================================================
// Quote Total Calculation (§5.5)
// ============================================================

describe('calculateQuoteTotal', () => {
  it('calculates ex-works with GST', () => {
    const products = [{ lineTotal: 50860 }, { lineTotal: 30000 }];
    const result = calculateQuoteTotal(products, 'ex-works', 0, [], 0, false);
    expect(result.productSubtotal).toBe(80860);
    expect(result.subtotal).toBe(80860);
    expect(result.taxAmount).toBeCloseTo(80860 * 0.18, 2);
    expect(result.grandTotal).toBeCloseTo(80860 * 1.18, 2);
  });

  it('calculates for-site with freight', () => {
    const products = [{ lineTotal: 50000 }];
    const result = calculateQuoteTotal(products, 'for-site', 5000, [], 2000, false);
    expect(result.subtotal).toBe(50000 + 5000 + 2000); // 57000
    expect(result.taxAmount).toBeCloseTo(57000 * 0.18, 2);
  });

  it('ignores freight for ex-works', () => {
    const products = [{ lineTotal: 50000 }];
    const result = calculateQuoteTotal(products, 'ex-works', 5000, [], 0, false);
    expect(result.subtotal).toBe(50000); // freight not added
  });

  it('adds custom items for custom pricing type', () => {
    const products = [{ lineTotal: 50000 }];
    const customItems = [
      { name: 'Installation', price: 3000 },
      { name: 'Training', price: 2000 },
    ];
    const result = calculateQuoteTotal(products, 'custom', 0, customItems, 0, false);
    expect(result.subtotal).toBe(55000);
  });

  it('applies 0% tax for international customers', () => {
    const products = [{ lineTotal: 50000 }];
    const result = calculateQuoteTotal(products, 'ex-works', 0, [], 0, true);
    expect(result.taxAmount).toBe(0);
    expect(result.grandTotal).toBe(50000);
  });

  it('includes packing charges', () => {
    const products = [{ lineTotal: 50000 }];
    const result = calculateQuoteTotal(products, 'ex-works', 0, [], 1500, false);
    expect(result.subtotal).toBe(51500);
  });
});

// ============================================================
// Currency Conversion (§5.6)
// ============================================================

describe('convertToUSD', () => {
  it('converts INR to USD using Math.round', () => {
    expect(convertToUSD(83500, 83.5)).toBe(1000);
  });

  it('rounds correctly', () => {
    // 100000 / 83.5 = 1197.60... → rounds to 1198
    expect(convertToUSD(100000, 83.5)).toBe(1198);
  });

  it('handles zero exchange rate', () => {
    expect(convertToUSD(100000, 0)).toBe(0);
  });

  it('handles negative exchange rate', () => {
    expect(convertToUSD(100000, -1)).toBe(0);
  });

  it('handles zero amount', () => {
    expect(convertToUSD(0, 83.5)).toBe(0);
  });
});

// ============================================================
// Tubing / Testing / Accessories Impact
// ============================================================

describe('calculateProductPrice — Tubing, Testing, Accessories', () => {
  it('tubing and testing add to mfgCost (manufacturing)', () => {
    const costs: ComponentCosts = {
      body: 1000, bonnet: 500, plug: 300, seat: 200, stem: 100,
      cage: 0, sealRing: 0, pilotPlug: 0,
      tubing: 5000, testing: 3000,
      actuator: 0, handwheel: 0, accessories: 0,
    };
    const result = calculateProductPrice(costs, {
      mfgProfitPct: 0, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // Mfg = 1000+500+300+200+100+0+0+0+5000+3000+0+0 = 10100
    expect(result.mfgCost).toBe(10100);
    expect(result.boCost).toBe(0);
  });

  it('accessories go to boCost (bought-out), not mfgCost', () => {
    const costs: ComponentCosts = {
      body: 1000, bonnet: 500, plug: 0, seat: 0, stem: 0,
      cage: 0, sealRing: 0, pilotPlug: 0,
      tubing: 0, testing: 0,
      actuator: 0, handwheel: 0, accessories: 8000,
    };
    const result = calculateProductPrice(costs, {
      mfgProfitPct: 0, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    expect(result.mfgCost).toBe(1500); // body + bonnet only
    expect(result.boCost).toBe(8000);  // accessories only
  });

  it('mfg and bo get separate profit margins applied', () => {
    const costs: ComponentCosts = {
      body: 10000, bonnet: 0, plug: 0, seat: 0, stem: 0,
      cage: 0, sealRing: 0, pilotPlug: 0,
      tubing: 0, testing: 0,
      actuator: 0, handwheel: 0, accessories: 10000,
    };
    const result = calculateProductPrice(costs, {
      mfgProfitPct: 25, boProfitPct: 10, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    // Mfg: 10000 ÷ 0.75 = 13333.33
    expect(result.mfgCostWithProfit).toBeCloseTo(13333.33, 1);
    // BO: 10000 ÷ 0.90 = 11111.11
    expect(result.boCostWithProfit).toBeCloseTo(11111.11, 1);
    // Unit cost should be sum
    expect(result.unitCost).toBeCloseTo(24444.44, 0);
  });
});

// ============================================================
// Direct vs Dealer Customer
// ============================================================

describe('calculateProductPrice — Direct vs Dealer', () => {
  const costs: ComponentCosts = {
    body: 5000, bonnet: 2000, plug: 1000, seat: 800, stem: 600,
    cage: 0, sealRing: 500, pilotPlug: 0,
    tubing: 2000, testing: 1500,
    actuator: 8000, handwheel: 0, accessories: 3000,
  };

  it('direct customer (0% commission) has lower price', () => {
    const direct = calculateProductPrice(costs, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 0, discountPct: 0, quantity: 1,
    });
    const dealer = calculateProductPrice(costs, {
      mfgProfitPct: 25, boProfitPct: 15, negMarginPct: 5,
      commissionPct: 10, discountPct: 0, quantity: 1,
    });
    expect(direct.unitPrice).toBeLessThan(dealer.unitPrice);
    // direct.afterCommission should equal direct.afterNegMargin
    expect(direct.afterCommission).toBe(direct.afterNegMargin);
  });

  it('dealer commission increases price by expected ratio', () => {
    const params = {
      mfgProfitPct: 0, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 10, discountPct: 0, quantity: 1,
    };
    const result = calculateProductPrice(costs, params);
    const mfg = costs.body + costs.bonnet + costs.plug + costs.seat + costs.stem +
                costs.cage + costs.sealRing + costs.pilotPlug + costs.tubing +
                costs.testing + costs.actuator + costs.handwheel;
    const total = mfg + costs.accessories;
    // With 10% commission: total ÷ 0.90
    expect(result.afterCommission).toBeCloseTo(total / 0.90, 0);
  });
});

// ============================================================
// Large Quantity Pricing
// ============================================================

describe('calculateProductPrice — Quantity', () => {
  const costs: ComponentCosts = {
    body: 1000, bonnet: 0, plug: 0, seat: 0, stem: 0,
    cage: 0, sealRing: 0, pilotPlug: 0,
    tubing: 0, testing: 0,
    actuator: 0, handwheel: 0, accessories: 0,
  };

  it('lineTotal = unitPrice × quantity, rounded to ₹10', () => {
    const result = calculateProductPrice(costs, {
      mfgProfitPct: 25, boProfitPct: 0, negMarginPct: 0,
      commissionPct: 0, discountPct: 0, quantity: 100,
    });
    // mfg=1000, with 25% margin = 1000/0.75 = 1333.33 → rounded = 1340
    expect(result.unitPrice).toBe(1340);
    // lineTotal = 1340 × 100 = 134000 (exact multiple of 10)
    expect(result.lineTotal).toBe(134000);
  });
});
