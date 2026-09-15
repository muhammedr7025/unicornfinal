import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

// ── In-memory Supabase fake ─────────────────────────────────────────────
// Supports the chain the route uses: from().select().eq().in().order().single(),
// awaited directly or via .single(). eq/in actually filter, so lookups behave
// like the real tables.
type Row = Record<string, unknown>;
let tables: Record<string, Row[]> = {};

class Query {
  private rows: Row[];
  constructor(table: string) { this.rows = [...(tables[table] ?? [])]; }
  select() { return this; }
  order() { return this; }
  limit() { return this; }
  eq(col: string, val: unknown) { this.rows = this.rows.filter(r => r[col] === val); return this; }
  in(col: string, vals: unknown[]) { this.rows = this.rows.filter(r => vals.includes(r[col])); return this; }
  single() { return Promise.resolve({ data: this.rows[0] ?? null, error: this.rows[0] ? null : { message: 'none' } }); }
  then<T>(resolve: (v: { data: Row[]; error: null }) => T) { return Promise.resolve({ data: this.rows, error: null }).then(resolve); }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => new Query(table),
  }),
}));

import { GET } from './route';

async function exportWorkbook() {
  const res = await GET({} as never, { params: Promise.resolve({ id: 'q1' }) });
  expect(res.status).toBe(200);
  return XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer', cellNF: true });
}
const rowsOf = (wb: XLSX.WorkBook, name: string) =>
  XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[name], { header: 1, defval: '' });
// Summary sheet values sit in column B; product-sheet chain values in column G.
const valueFor = (rows: (string | number)[][], label: string, col = 1) =>
  rows.find(r => String(r[0]).startsWith(label))?.[col];

const S = 's1', BB = 'm-bb', PL = 'm-pl', SE = 'm-se', ST = 'm-st';
const key = { series_id: S, size: '2"', rating: '150#', is_active: true };

beforeEach(() => {
  tables = {
    quotes: [{
      id: 'q1', quote_number: 'UV/26-27/0001', created_at: '2026-09-01T00:00:00Z', created_by: 'u1',
      pricing_mode: 'standard', pricing_type: 'custom',
      custom_pricing_title: 'Installation Charges', custom_pricing_title_2: 'Total Price incl. Installation',
      custom_pricing_price: 25000, freight_price: 9999, packing_price: 5000,
      exchange_rate_snapshot: 80, validity_days: 30, delivery_text: '6-8',
      payment_advance_pct: 30, payment_approval_pct: 0, payment_despatch_pct: 70,
      warranty_shipment_months: 18, warranty_installation_months: 12,
      notes: 'Deliver to Site B', project_name: 'Refinery', enquiry_id: 'ENQ-1',
      customer: { name: 'Gulf Co', country: 'UAE', is_international: true, customer_type: 'dealer' },
    }],
    quote_products: [{
      id: 'p1', quote_id: 'q1', sort_order: 0, tag_number: 'FCV/101', quantity: 2,
      series_id: S, size: '2"', rating: '150#', end_connect_type: 'Flanged', bonnet_type: 'Plain', trim_type: 'MTM',
      body_bonnet_material_id: BB, plug_material_id: PL, seat_material_id: SE, stem_material_id: ST,
      body_cost: 1850, bonnet_cost: 816, plug_cost: 0, seat_cost: 0, stem_cost: 675,
      mfg_profit_pct: 25, bo_profit_pct: 15, neg_margin_pct: 5, commission_pct: 10, discount_pct: 0,
      unit_price_inr: 5000,  // quoted under the old ₹10 rounding — won't reproduce exactly
      line_total_inr: 10000,
    }],
    product_tubing_items: [], product_testing_items: [], product_accessories: [],
    materials: [
      { id: BB, material_name: 'WCB', price_per_kg: 200, material_group: 'BodyBonnet' },
      { id: PL, material_name: 'SS316', price_per_kg: 0, material_group: 'Plug' },
      { id: SE, material_name: 'SS316', price_per_kg: 0, material_group: 'Seat' },
      { id: ST, material_name: 'SS410', price_per_kg: 450, material_group: 'Stem' },
    ],
    series: [{ id: S, series_number: 'GS', series_name: 'Globe' }],
    profiles: [{ id: 'u1', full_name: 'Eng', phone: '1', email: 'e@x' }],
    body_weights: [{ ...key, end_connect_type: 'Flanged', weight_kg: 5 }],     // 5×200+850 = 1850 ✓
    bonnet_weights: [{ ...key, bonnet_type: 'Plain', weight_kg: 1.2 }],       // 1.2×200+600 = 840 ≠ 816 stored
    plug_weights: [], seat_weights: [], cage_weights: [], pilot_plug_weights: [], seal_ring_prices: [],
    stem_weights: [{ ...key, weight_kg: 0.5 }],                               // 0.5×450+450 = 675 ✓
    machining_prices: [
      { ...key, component: 'body', type_key: 'Flanged', material_id: BB, fixed_price: 850 },
      { ...key, component: 'bonnet', type_key: 'Plain', material_id: BB, fixed_price: 600 },
      { ...key, component: 'stem', type_key: 'MTM', material_id: ST, fixed_price: 450 },
    ],
    actuator_models: [], handwheel_prices: [],
  };
});

describe('Excel export', () => {
  it('does not crash on a tag containing "/" and sanitises the sheet name', async () => {
    const wb = await exportWorkbook();
    expect(wb.SheetNames).toEqual(['Quote Summary', 'Configuration', 'P1-FCV-101']);
  });

  it('summary mirrors the PDF: delivery clause, notes, total label, USD at the saved rate', async () => {
    const rows = rowsOf(await exportWorkbook(), 'Quote Summary');
    expect(valueFor(rows, 'Pricing Type')).toBe('Custom');
    expect(valueFor(rows, 'Agent Commission')).toBe('10%');
    expect(String(valueFor(rows, 'Delivery'))).toMatch(/^6-8 Weeks from the date of receipt/);
    expect(valueFor(rows, 'Special Notes')).toBe('Deliver to Site B');
    expect(valueFor(rows, 'Freight')).toBe('To be borne by buyer');
    expect(valueFor(rows, 'Payment – On Approval')).toBeUndefined();
    expect(valueFor(rows, 'Exchange Rate')).toBe('1 USD = ₹80');
    // Stale ₹9,999 freight on a custom quote must not appear or be charged.
    expect(valueFor(rows, 'Freight Charges')).toBeUndefined();
    expect(valueFor(rows, 'Installation Charges (USD)')).toBeCloseTo(25000 / 80, 6);
    // 10000 products + 5000 packing + 25000 custom = 40000 INR → USD at 80
    expect(valueFor(rows, 'Total Price incl. Installation (USD)')).toBeCloseTo(40000 / 80, 6);
  });

  it('never invents an exchange rate: no saved rate falls back to INR and says so', async () => {
    (tables.quotes[0] as Row).exchange_rate_snapshot = null;
    const rows = rowsOf(await exportWorkbook(), 'Quote Summary');
    expect(String(valueFor(rows, 'Currency'))).toMatch(/not recorded/);
    expect(valueFor(rows, 'Exchange Rate')).toBeUndefined();
    expect(valueFor(rows, 'Total Price incl. Installation (INR)')).toBe(40000);
  });

  it('product sheet: stem is weight-based, drifted rates are flagged, quoted price is authoritative', async () => {
    const rows = rowsOf(await exportWorkbook(), 'P1-FCV-101');
    const comp = (name: string) => rows.find(r => r[0] === name)!;

    expect(comp('Stem').slice(2, 7)).toEqual([0.5, 450, 225, 450, 675]);
    expect(comp('Stem')[7]).toBe('');
    expect(comp('Body')[7]).toBe('');
    expect(String(comp('Bonnet')[7])).toMatch(/Rates changed since quoting/);

    expect(valueFor(rows, '⭐ UNIT PRICE (INR)', 6)).toBe(5000);
    expect(valueFor(rows, 'LINE TOTAL (×2 qty, INR)', 6)).toBe(10000);
    expect(valueFor(rows, 'UNIT PRICE (USD @ ₹80)', 6)).toBeCloseTo(62.5, 6);
    expect(rows.some(r => String(r[0]).startsWith('Note: this quote was priced under earlier'))).toBe(true);
  });

  it('shows numbers with 2 decimals without changing the stored value', async () => {
    const ws = (await exportWorkbook()).Sheets['P1-FCV-101'];
    const unitCell = Object.values(ws).find(c => (c as XLSX.CellObject)?.v === 5000) as XLSX.CellObject;
    expect(unitCell.z).toBe('#,##0.00');
    expect(unitCell.v).toBe(5000);
  });
});
