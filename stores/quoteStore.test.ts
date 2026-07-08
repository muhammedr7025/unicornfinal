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
