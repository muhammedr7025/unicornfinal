import { it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { CompleteQuotePDF, type CompleteQuoteProps } from '@/components/pdf/CompleteQuotePDF';
import React from 'react';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Visual-inspection only: dumps rendered PDFs to the OS temp dir so a human
// can eyeball pagination. Not an assertion-based test.
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'unicornvalves-pagenum-'));

const base: Omit<CompleteQuoteProps, 'products' | 'mode'> = {
  quote: {
    quote_number: 'UC-EN-2526-0700', created_at: new Date().toISOString(),
    enquiry_id: 'ENQ-2026-001', project_name: 'IOCL Paradip', pricing_type: 'ex-works',
    validity_days: 30, delivery_text: '6-8 working weeks from receipt of clear PO',
    payment_advance_pct: 30, payment_approval_pct: 0, payment_despatch_pct: 70,
    warranty_shipment_months: 18, warranty_installation_months: 12,
    freight_price: 0, packing_price: 5000, custom_pricing_title: undefined,
    custom_pricing_price: 0, subtotal_inr: 163850, tax_amount_inr: 29493, grand_total_inr: 193343,
  },
  customer: { name: 'BPCL', company: 'BPCL', address: 'Mumbai', country: 'India', is_international: false },
  creator: { full_name: 'Test Engineer', designation: 'AM', department: 'Sales', phone: '+91 900', email: 'a@b.com' },
  company: { name: 'Unicorn Valves Private Limited', address: 'Coimbatore' },
  exchangeRate: 83.5,
};

const mkProducts = (n: number): CompleteQuoteProps['products'] => Array.from({ length: n }, (_, i) => ({
  sort_order: i, description: `GS Series | ${i + 2}" | ANSI 300 | Flanged RF`,
  quantity: 1, unit_price_inr: 52950, line_total_inr: 52950, tag_number: `FCV-1${i}`,
}));

// @react-pdf/renderer types renderToBuffer's argument as a <Document>-typed
// element, which CompleteQuotePDF's return type doesn't declare — the same
// gap the API routes that render this component work around.
type PdfDocument = Parameters<typeof renderToBuffer>[0];

it('small quote (fits on one summary page)', async () => {
  const el = React.createElement(CompleteQuotePDF, { ...base, products: mkProducts(2), mode: 'complete' });
  fs.writeFileSync(`${OUT}/pn-small.pdf`, await renderToBuffer(el as unknown as PdfDocument));
}, 60000);

it('large quote (summary overflows to 2 pages)', async () => {
  const el = React.createElement(CompleteQuotePDF, { ...base, products: mkProducts(30), mode: 'complete' });
  fs.writeFileSync(`${OUT}/pn-large.pdf`, await renderToBuffer(el as unknown as PdfDocument));
}, 60000);

it('price-summary mode only', async () => {
  const el = React.createElement(CompleteQuotePDF, { ...base, products: mkProducts(2), mode: 'price-summary' });
  fs.writeFileSync(`${OUT}/pn-summary.pdf`, await renderToBuffer(el as unknown as PdfDocument));
}, 60000);
