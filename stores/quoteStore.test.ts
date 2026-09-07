import { describe, it, expect, beforeEach } from 'vitest';
import { useQuoteStore, emptyProduct } from './quoteStore';

function seedProduct() {
  const store = useQuoteStore.getState();
  store.addProduct();
  const p = useQuoteStore.getState().products[0];
  // Simulate a calculated product
  store.updateProduct(p.id, { unit_price: 1000, line_total: 1000, price_stale: false });
  return useQuoteStore.getState().products[0];
}

beforeEach(() => {
  useQuoteStore.getState().reset();
});

describe('updateProduct staleness', () => {
  it('marks the product stale when a price-affecting scalar changes', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, { quantity: 5 });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(true);
  });

  it('marks stale for discount changes', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, { discount_pct: 10 });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(true);
  });

  it('marks stale when an array field is updated', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, {
      tubing_items: [{ item_name: 'Tube', price: 100, is_preset: false }],
    });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(true);
  });

  it('does NOT mark stale for tag_number', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, { tag_number: 'TAG-1' });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });

  it('does NOT mark stale when the value is unchanged', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, { quantity: p.quantity });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });

  it('does NOT mark stale when writing calculation results, and an explicit price_stale: false clears the flag', () => {
    const p = seedProduct();
    useQuoteStore.getState().updateProduct(p.id, { quantity: 3 }); // now stale
    useQuoteStore.getState().updateProduct(p.id, {
      body_cost: 500, unit_price: 2000, line_total: 6000, price_stale: false,
    });
    const after = useQuoteStore.getState().products[0];
    expect(after.price_stale).toBe(false);
    expect(after.unit_price).toBe(2000);
  });

  it('only marks the targeted product stale', () => {
    const p1 = seedProduct();
    useQuoteStore.getState().addProduct();
    const p2 = useQuoteStore.getState().products[1];
    useQuoteStore.getState().updateProduct(p2.id, { price_stale: false, unit_price: 500 });
    useQuoteStore.getState().updateProduct(p1.id, { size: '3"' });
    const products = useQuoteStore.getState().products;
    expect(products[0].price_stale).toBe(true);
    expect(products[1].price_stale).toBe(false);
  });
});

describe('calculation sequencing (concurrent recalculation races)', () => {
  it('beginCalculation returns an incrementing sequence number per product', () => {
    const p = seedProduct();
    const seq1 = useQuoteStore.getState().beginCalculation(p.id);
    const seq2 = useQuoteStore.getState().beginCalculation(p.id);
    expect(seq2).toBeGreaterThan(seq1);
  });

  it('commitCalculationResult applies the result when it is still the latest calculation for that product', () => {
    const p = seedProduct();
    const seq = useQuoteStore.getState().beginCalculation(p.id);
    const snapshot = useQuoteStore.getState().products.find(x => x.id === p.id)!;
    const committed = useQuoteStore.getState().commitCalculationResult(p.id, seq, snapshot, {
      unit_price: 850, line_total: 850, price_stale: false,
    });
    expect(committed).toBe(true);
    expect(useQuoteStore.getState().products[0].unit_price).toBe(850);
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });

  it('rejects a superseded (out-of-order) result and keeps the newer one — the discount race', () => {
    const p = seedProduct(); // unit_price 1000, price_stale false, discount 0%
    // Call A starts calculating with discount still at 0%.
    const seqA = useQuoteStore.getState().beginCalculation(p.id);
    const snapshotA = useQuoteStore.getState().products.find(x => x.id === p.id)!;

    // User sets a 10% discount while call A is still in flight.
    useQuoteStore.getState().updateProduct(p.id, { discount_pct: 10 });

    // Call B starts (e.g. a second click, or a clobbered/re-enabled button)
    // and correctly captures discount_pct = 10.
    const seqB = useQuoteStore.getState().beginCalculation(p.id);
    const snapshotB = useQuoteStore.getState().products.find(x => x.id === p.id)!;
    expect(snapshotB.discount_pct).toBe(10);

    // B finishes first with the correctly-discounted price.
    const committedB = useQuoteStore.getState().commitCalculationResult(p.id, seqB, snapshotB, {
      unit_price: 900, line_total: 900, price_stale: false,
    });
    expect(committedB).toBe(true);

    // A finishes second, still holding its stale (pre-discount) snapshot.
    const committedA = useQuoteStore.getState().commitCalculationResult(p.id, seqA, snapshotA, {
      unit_price: 1000, line_total: 1000, price_stale: false,
    });
    expect(committedA).toBe(false);

    // B's correct, discounted result must survive A's late arrival.
    const final = useQuoteStore.getState().products.find(x => x.id === p.id)!;
    expect(final.unit_price).toBe(900);
    expect(final.price_stale).toBe(false);
  });

  it('rejects a result whose captured inputs drifted, even with no concurrent calculation', () => {
    const p = seedProduct();
    const seq = useQuoteStore.getState().beginCalculation(p.id);
    const staleSnapshot = useQuoteStore.getState().products.find(x => x.id === p.id)!;

    // Discount changes after the snapshot was captured, but before this same
    // calculation (still the latest — no new beginCalculation call) finishes.
    useQuoteStore.getState().updateProduct(p.id, { discount_pct: 25 });

    const committed = useQuoteStore.getState().commitCalculationResult(p.id, seq, staleSnapshot, {
      unit_price: 1000, line_total: 1000, price_stale: false,
    });
    expect(committed).toBe(false);
    // The stale write must not land, and the product should still read as stale.
    expect(useQuoteStore.getState().products[0].unit_price).toBe(1000); // seedProduct's original value, unchanged
    expect(useQuoteStore.getState().products[0].price_stale).toBe(true);
  });
});

describe('setQuoteSettings staleness', () => {
  it('marks ALL products stale when agent_commission_pct changes', () => {
    seedProduct();
    useQuoteStore.getState().addProduct();
    useQuoteStore.getState().setQuoteSettings({ agent_commission_pct: 7 });
    expect(useQuoteStore.getState().products.every(p => p.price_stale)).toBe(true);
  });

  it('does NOT mark stale when agent_commission_pct is re-sent unchanged', () => {
    seedProduct();
    const current = useQuoteStore.getState().agent_commission_pct;
    useQuoteStore.getState().setQuoteSettings({ agent_commission_pct: current, customer_id: 'c1' });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });

  it('marks ALL products stale when pricing_mode changes', () => {
    seedProduct();
    useQuoteStore.getState().setQuoteSettings({ pricing_mode: 'project' });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(true);
  });

  it('does NOT mark stale for unrelated settings', () => {
    seedProduct();
    useQuoteStore.getState().setQuoteSettings({ project_name: 'X', delivery_text: '4 weeks' });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });
});

describe('defaults', () => {
  it('new products start not-stale', () => {
    expect(emptyProduct().price_stale).toBe(false);
  });

  it('loadForEdit restores the agent commission from the saved products', () => {
    // commission_pct lives on quote_products (schema 001), NOT on quotes —
    // reading quote.commission_pct silently yielded undefined -> 0, so every
    // reopened dealer quote showed 0% commission.
    useQuoteStore.getState().loadForEdit({
      quote: {
        id: 'q1', customer_id: 'c1', quote_number: 'UV-1', pricing_mode: 'standard',
        pricing_type: 'ex-works', validity_days: 30, delivery_text: '4 weeks',
        payment_advance_pct: 30, payment_approval_pct: 0, payment_despatch_pct: 70,
        warranty_shipment_months: 18, warranty_installation_months: 12,
      },
      products: [{
        id: 'p1', quantity: 1, series_id: 's1', size: '2"', rating: '150#',
        end_connect_type: 'Flanged', bonnet_type: 'Plain', trim_type: 'Metal to Metal',
        commission_pct: '7.50', mfg_profit_pct: 25, bo_profit_pct: 15, neg_margin_pct: 5,
        unit_price_inr: 15240, line_total_inr: 15240,
      }],
    });
    expect(useQuoteStore.getState().agent_commission_pct).toBe(7.5);
  });

  it('loadForEdit falls back to 0 commission when the quote has no products', () => {
    useQuoteStore.getState().loadForEdit({
      quote: {
        id: 'q1', customer_id: 'c1', quote_number: 'UV-1', pricing_mode: 'standard',
        pricing_type: 'ex-works', validity_days: 30, delivery_text: '4 weeks',
        payment_advance_pct: 30, payment_approval_pct: 0, payment_despatch_pct: 70,
        warranty_shipment_months: 18, warranty_installation_months: 12,
      },
      products: [],
    });
    expect(useQuoteStore.getState().agent_commission_pct).toBe(0);
  });

  it('loadForEdit products start not-stale', () => {
    useQuoteStore.getState().loadForEdit({
      quote: {
        id: 'q1', customer_id: 'c1', quote_number: 'UV-1', pricing_mode: 'standard',
        pricing_type: 'ex-works', validity_days: 30, delivery_text: '4 weeks',
        payment_advance_pct: 30, payment_approval_pct: 0, payment_despatch_pct: 70,
        warranty_shipment_months: 18, warranty_installation_months: 12,
      },
      products: [{
        id: 'p1', quantity: 1, series_id: 's1', size: '2"', rating: '150#',
        end_connect_type: 'Flanged', bonnet_type: 'Plain', trim_type: 'Metal to Metal',
        unit_price_inr: 15240, line_total_inr: 15240,
      }],
    });
    expect(useQuoteStore.getState().products[0].price_stale).toBe(false);
  });
});
