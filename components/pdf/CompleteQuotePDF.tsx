import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

// ============================================================
// Unicorn Valves — Complete Quote PDF
// 6 pages: Cover Letter | Price Summary | T&C (4 pages)
// Designed to match reference UC-EN-2526-0700_Complete.pdf
// ============================================================

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

// Fallback font for glyphs missing from Inter subset (e.g. ₹ U+20B9).
// Roboto Regular's Latin subset includes the Indian Rupee Sign.
Font.register({
  family: 'RupeeFallback',
  src: 'https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf',
  fontWeight: 400,
  fontStyle: 'normal',
  // @ts-expect-error - fallback is supported at runtime but missing in older types
  fallback: true,
});

const LOGO_DATA: string = (() => {
  try {
    const p = path.join(process.cwd(), 'public', 'unicorn-logo.png');
    return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  } catch {
    return '';
  }
})();

const c = {
  black: '#000000',
  text: '#111111',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  border: '#d1d5db',
  red: '#cc0000',
};

const s = StyleSheet.create({
  /* ── Page templates ── */
  pageBasic: {
    fontFamily: 'Inter',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingLeft: 50,
    paddingRight: 50,
    color: c.text,
    lineHeight: 1.4,
  },
  pageSummary: {
    fontFamily: 'Inter',
    fontSize: 9,
    paddingTop: 90,
    paddingBottom: 65,
    paddingLeft: 40,
    paddingRight: 40,
    color: c.text,
  },
  pageTC: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    paddingTop: 90,
    paddingBottom: 80,
    paddingLeft: 50,
    paddingRight: 50,
    color: c.text,
    lineHeight: 1.4,
  },

  /* ── Cover letter: simple top-right logo, no header bar ── */
  clLogo: { position: 'absolute', top: 30, right: 40, width: 110, height: 48 },
  clLocation: { fontSize: 10, marginTop: 60 },
  clDate: { fontSize: 10, marginBottom: 30 },
  clCustomerLine: { fontSize: 10, marginBottom: 1 },
  clSalutation: { fontSize: 10, marginTop: 22, marginBottom: 14 },
  clBody: { fontSize: 10, lineHeight: 1.5, marginBottom: 14, textAlign: 'justify' as const },
  clOfferTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  clListItem: { fontSize: 10, lineHeight: 1.7, paddingLeft: 24 },
  clTrust: { fontSize: 10, lineHeight: 1.5, marginTop: 12, marginBottom: 10, textAlign: 'justify' as const },
  clLookForward: { fontSize: 10, lineHeight: 1.5, marginBottom: 22, textAlign: 'justify' as const },
  clThanking: { fontSize: 10, fontWeight: 700, marginBottom: 1 },
  clYours: { fontSize: 10, fontWeight: 700, marginBottom: 16 },
  clForCompany: { fontSize: 10, fontWeight: 700, marginBottom: 28 },
  clSigLine: { borderBottomWidth: 0.7, borderBottomColor: c.black, width: 180, marginBottom: 6 },
  clSigName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  clSigText: { fontSize: 10, marginBottom: 1 },

  /* ── Simple footer (cover + summary) ── */
  footerBasic: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    textAlign: 'center',
  },
  footerBasicName: { fontSize: 8, fontWeight: 700, color: c.black },
  footerBasicLine: { fontSize: 7.5, color: c.black, lineHeight: 1.35 },

  /* ── Branded summary header ── */
  summaryHeader: {
    position: 'absolute',
    top: 25,
    left: 40,
    right: 40,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.black,
    paddingBottom: 6,
  },
  summaryHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700 },
  summaryHeaderLogo: { width: 70, height: 32 },

  /* ── Summary page content ── */
  metaGrid: { marginBottom: 12 },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaCol: { flexDirection: 'row', width: '50%' },
  metaLabel: { fontSize: 9, fontWeight: 700, width: 78 },
  metaValue: { fontSize: 9, flex: 1 },

  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 6 },

  /* Items table */
  table: { borderWidth: 0.5, borderColor: c.border, marginBottom: 12 },
  tHeadRow: {
    flexDirection: 'row',
    backgroundColor: c.grayLight,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  tHeadCell: {
    fontSize: 8.5,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 5,
    textAlign: 'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: c.border,
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
    minHeight: 22,
  },
  tCell: {
    fontSize: 8.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: c.border,
  },
  tCellRight: { textAlign: 'right' as const },
  tCellCenter: { textAlign: 'center' as const },
  tCellBold: { fontWeight: 700 },
  colSn: { width: 36 },
  colTag: { width: 56 },
  colDesc: { flex: 1 },
  colUnit: { width: 78 },
  colQty: { width: 40 },
  colTotal: { width: 88 },

  /* Total summary table */
  totBlock: { borderWidth: 0.5, borderColor: c.border, marginBottom: 14 },
  totHead: {
    backgroundColor: c.grayLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
    textAlign: 'center' as const,
    fontSize: 9,
    fontWeight: 700,
  },
  totRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  totLabel: {
    flex: 1,
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: c.border,
  },
  totValue: {
    width: 110,
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 8,
    textAlign: 'right' as const,
  },
  totFinal: { backgroundColor: c.grayLight, fontWeight: 700 },

  /* Commercial terms table */
  termsTable: { borderWidth: 0.5, borderColor: c.border, marginBottom: 18 },
  termRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  termLabel: {
    width: 110,
    fontSize: 9,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: c.border,
  },
  termValue: {
    flex: 1,
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  /* Summary sign-off */
  sumSignFor: { fontSize: 9.5, marginTop: 8, marginBottom: 18 },
  sumSigName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  sumSigText: { fontSize: 9.5, marginBottom: 1 },

  /* ── T&C ── */
  tcHeader: {
    position: 'absolute',
    top: 25,
    left: 50,
    right: 50,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tcHeaderTitle: { flex: 1, fontSize: 13, fontWeight: 700 },
  tcHeaderLogo: { width: 70, height: 32 },

  tcFooter: {
    position: 'absolute',
    bottom: 22,
    left: 50,
    right: 50,
    textAlign: 'center',
  },
  tcPageRow: {
    position: 'absolute',
    bottom: 62,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tcPageNum: { fontSize: 8, color: c.black },
  tcRevision: { fontSize: 7.5, color: c.black },

  tcSectionHead: { fontSize: 10, fontWeight: 700, textDecoration: 'underline', marginBottom: 6, marginTop: 4 },
  tcSubHead: { fontSize: 9.5, fontWeight: 700, textDecoration: 'underline', marginBottom: 4 },
  tcBody: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 6, textAlign: 'justify' as const },
  tcIndent: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 2, paddingLeft: 20, textAlign: 'justify' as const },
  tcIndentBold: { fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 2, paddingLeft: 20 },
  tcBullet: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 1, paddingLeft: 8 },
  tcSection: { marginBottom: 10 },
  tcDutyNote: { fontSize: 9, fontWeight: 700, lineHeight: 1.5, marginTop: 4, marginBottom: 6 },
});

/* ── Shared simple footer ── */
function FooterBasic() {
  return (
    <View style={s.footerBasic} fixed>
      <Text style={s.footerBasicName}>Unicorn Valves Private Limited</Text>
      <Text style={s.footerBasicLine}>SF No : 100/2B, Valukkuparai P.O., Marichettipathy Road, Nachipalayam,</Text>
      <Text style={s.footerBasicLine}>Madukkarai Taluk, Coimbatore – 641032, Tamil Nadu, India, Ph No. +91-422-2901322</Text>
    </View>
  );
}

/* ── T&C footer (red, with URL) ── */
function FooterTC() {
  return (
    <View style={s.tcFooter} fixed>
      <Text style={{ fontSize: 8 }}>
        <Text style={{ fontWeight: 700, color: c.red }}>Unicorn Valves Private Limited,</Text>
        <Text> SF No : 100/2B, Valukkuparai, P.O., Marichettipathy Road,</Text>
      </Text>
      <Text style={{ fontSize: 8 }}>Nachipalayam, Madukkarai Taluk, Coimbatore – 641032, Tamil Nadu, India, Ph No. +91-422-2901322</Text>
      <Text style={{ fontSize: 8, color: c.red }}>www.unicorn-valves.com</Text>
    </View>
  );
}

interface CompleteQuoteProps {
  quote: {
    quote_number: string;
    created_at: string;
    enquiry_id?: string;
    project_name?: string;
    pricing_type: string;
    validity_days: number;
    delivery_text: string;
    payment_advance_pct: number;
    payment_approval_pct: number;
    payment_despatch_pct: number;
    warranty_shipment_months: number;
    warranty_installation_months: number;
    freight_price: number;
    packing_price: number;
    custom_pricing_title?: string;
    custom_pricing_price: number;
    subtotal_inr: number;
    tax_amount_inr: number;
    grand_total_inr: number;
  };
  mode?: 'complete' | 'price-summary' | 'unpriced-summary';
  customer: {
    name: string;
    company?: string;
    address?: string;
    country: string;
    is_international: boolean;
  };
  products: Array<{
    sort_order: number;
    description: string;
    quantity: number;
    unit_price_inr: number;
    line_total_inr: number;
    tag_number?: string;
  }>;
  creator: {
    full_name: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
  };
  company: { name: string; address: string };
  exchangeRate: number;
}

export function CompleteQuotePDF({ quote, mode = 'complete', customer, products, creator, company, exchangeRate }: CompleteQuoteProps) {
  const isIntl = customer.is_international;
  const cur = isIntl ? 'USD' : 'INR';
  const sym = isIntl ? '$' : 'Rs.';
  const isUnpriced = mode === 'unpriced-summary';

  // ── USD conversion: full precision, format to 2 decimals at display time ──
  const toUSD = (inr: number) => exchangeRate > 0 ? inr / exchangeRate : 0;
  const fmtUSDVal = (usd: number) => `${sym} ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtINRVal = (inr: number) => `${sym} ${inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  /** Format a single INR value */
  const fmt = (inr: number) => {
    if (isUnpriced) return 'Quoted';
    if (isIntl) return fmtUSDVal(toUSD(inr));
    return fmtINRVal(inr);
  };

  /** Format a line total: unit × qty (computed in display currency) */
  const fmtLine = (unitInr: number, qty: number) => {
    if (isUnpriced) return 'Quoted';
    if (isIntl) return fmtUSDVal(toUSD(unitInr) * qty);
    return fmtINRVal(unitInr * qty);
  };

  /** Format a pre-computed display value (already in the right currency) */
  const fmtDisplay = (displayVal: number) => {
    if (isUnpriced) return 'Quoted';
    if (isIntl) return fmtUSDVal(displayVal);
    return fmtINRVal(displayVal);
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return `${day}-${mon}-${d.getFullYear()}`;
  };
  const dateLong = fmtDate(quote.created_at);
  const dateCL = dateLong;

  const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
  const totalQty = sorted.reduce((sum, p) => sum + (p.quantity || 0), 0);

  // ── Compute display values ──
  const packing = quote.packing_price || 0;
  const freight = quote.freight_price || 0;
  const customExtra = quote.custom_pricing_price || 0;
  const isForSite = quote.pricing_type === 'for-site';

  // For international: convert each component to USD. For INR: use raw values.
  const exWorksDisplay = isIntl
    ? sorted.reduce((sum, p) => sum + toUSD(p.unit_price_inr) * p.quantity, 0)
    : quote.subtotal_inr;
  const packingDisplay = isIntl ? toUSD(packing) : packing;
  const freightDisplay = isIntl ? toUSD(freight) : freight;
  const customExtraDisplay = isIntl ? toUSD(customExtra) : customExtra;
  const gstAmount = quote.tax_amount_inr || 0;
  const gstDisplay = isIntl ? 0 : gstAmount; // GST is 0 for international
  const totalExWorksDisplay = exWorksDisplay + packingDisplay + customExtraDisplay;
  const totalWithFreightDisplay = totalExWorksDisplay + (isForSite ? freightDisplay : 0);
  const grandTotalDisplay = !isIntl && gstAmount > 0
    ? totalWithFreightDisplay + gstDisplay
    : totalWithFreightDisplay;

  const paymentTerms = [
    `${quote.payment_advance_pct}% advance against PO`,
    quote.payment_approval_pct > 0 ? `${quote.payment_approval_pct}% on approval` : null,
    `${quote.payment_despatch_pct}% before despatch`,
  ].filter(Boolean).join('\n');

  const signaturePart = (
    <>
      <Text style={s.sumSigName}>{creator.full_name}</Text>
      <Text style={s.sumSigText}>{creator.designation || 'Assistant Manager - Application Engineering'}</Text>
      <Text style={s.sumSigText}>{creator.department || 'Internal Sales/Marketing Department'}</Text>
      {creator.phone && <Text style={s.sumSigText}>Mobile: {creator.phone}</Text>}
      {creator.email && <Text style={s.sumSigText}>Email: {creator.email}</Text>}
    </>
  );

  return (
    <Document>
      {/* ════════════ PAGE 1 — COVER LETTER (only in complete mode) ════════════ */}
      {mode === 'complete' && (<>
        <Page size="A4" style={s.pageBasic}>
          {LOGO_DATA && <Image style={s.clLogo} src={LOGO_DATA} />}

          <Text style={s.clLocation}>Coimbatore, INDIA</Text>
          <Text style={s.clDate}>Date: {dateCL}</Text>

          <Text style={s.clCustomerLine}>{customer.name}</Text>
          {customer.company && <Text style={s.clCustomerLine}>{customer.company}</Text>}
          {customer.address && customer.address.split('\n').map((line, i) => (
            <Text key={i} style={s.clCustomerLine}>{line}</Text>
          ))}
          <Text style={s.clCustomerLine}>{customer.country}</Text>

          <Text style={s.clSalutation}>Dear Sir/Madam,</Text>

          <Text style={s.clBody}>
            We thank you for the above referred RFQ/Enquiry, and are pleased to submit our techno-commercial offer for your kind consideration.
          </Text>

          <Text style={s.clOfferTitle}>Our Offer comprises of the following:</Text>
          <Text style={s.clListItem}>1.   Covering Letter</Text>
          <Text style={s.clListItem}>2.   Priced Bid with Commercial Terms and Conditions</Text>
          <Text style={s.clListItem}>3.   Technical Specifications</Text>

          <Text style={s.clTrust}>
            We trust our offer meets your requirements. Should you require any further clarification or technical assistance, please feel free to contact the undersigned.
          </Text>
          <Text style={s.clLookForward}>
            We look forward to receiving your valuable order and assure you of our best services at all times.
          </Text>

          <Text style={s.clThanking}>Thanking you,</Text>
          <Text style={s.clYours}>Yours faithfully,</Text>
          <Text style={s.clForCompany}>For UNICORN VALVES PRIVATE LIMITED</Text>

          <View style={s.clSigLine} />
          <Text style={s.clSigName}>{creator.full_name}</Text>
          <Text style={s.clSigText}>{creator.designation || 'Assistant Manager - Application Engineering'}</Text>
          <Text style={s.clSigText}>{creator.department || 'Internal Sales/Marketing Department'}</Text>
          {creator.phone && <Text style={s.clSigText}>Mobile: {creator.phone}</Text>}
          {creator.email && <Text style={s.clSigText}>Email: {creator.email}</Text>}

          <FooterBasic />
        </Page>
      </>)}

      {/* ════════════ PRICE SUMMARY PAGE ════════════ */}
      <Page size="A4" style={s.pageSummary}>
        <View style={s.summaryHeader} fixed>
          <Text style={s.summaryHeaderTitle}>Price Summary for Control Valves &amp; Accessories</Text>
          {LOGO_DATA && <Image style={s.summaryHeaderLogo} src={LOGO_DATA} />}
        </View>

        {/* Unpriced heading */}
        {isUnpriced && (
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline' }}>PRICE SUMMARY (UNPRICED)</Text>
          </View>
        )}

        {/* Meta grid */}
        <View style={s.metaGrid}>
          {isUnpriced ? (
            <>
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Quote No:</Text><Text style={s.metaValue}>{quote.quote_number}</Text></View>
              </View>
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Date:</Text><Text style={s.metaValue}>{dateLong}</Text></View>
              </View>
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Customer:</Text><Text style={s.metaValue}>{customer.name}</Text></View>
              </View>
              {quote.project_name && (
                <View style={s.metaRow}>
                  <View style={s.metaCol}><Text style={s.metaLabel}>Project:</Text><Text style={s.metaValue}>{quote.project_name}</Text></View>
                </View>
              )}
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Enquiry Ref:</Text><Text style={s.metaValue}>{quote.enquiry_id || '—'}</Text></View>
              </View>
            </>
          ) : (
            <>
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Customer:</Text><Text style={s.metaValue}>{customer.name}</Text></View>
                <View style={s.metaCol}><Text style={s.metaLabel}>Unicorn Ref:</Text><Text style={s.metaValue}>{quote.quote_number}</Text></View>
              </View>
              <View style={s.metaRow}>
                <View style={s.metaCol}><Text style={s.metaLabel}>Enquiry Ref:</Text><Text style={s.metaValue}>{quote.enquiry_id || '—'}</Text></View>
                <View style={s.metaCol}><Text style={s.metaLabel}>Date:</Text><Text style={s.metaValue}>{dateLong}</Text></View>
              </View>
              {quote.project_name && (
                <View style={s.metaRow}>
                  <View style={s.metaCol}><Text style={s.metaLabel}>Project:</Text><Text style={s.metaValue}>{quote.project_name}</Text></View>
                </View>
              )}
            </>
          )}
        </View>

        <Text style={s.sectionTitle}>ITEM DETAILS</Text>

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={[s.tHeadCell, s.colSn]}>S.No</Text>
            <Text style={[s.tHeadCell, s.colTag]}>Tag No.</Text>
            <Text style={[s.tHeadCell, s.colDesc, { textAlign: 'left' }]}>Item Description</Text>
            <Text style={[s.tHeadCell, s.colUnit]}>Unit Price{'\n'}({cur})</Text>
            <Text style={[s.tHeadCell, s.colQty]}>Qty</Text>
            <Text style={[s.tHeadCell, s.colTotal, { borderRightWidth: 0 }]}>Total Price{'\n'}({cur})</Text>
          </View>
          {sorted.map((p, i) => (
            <View key={i} style={s.tRow}>
              <Text style={[s.tCell, s.colSn, s.tCellCenter]}>{i + 1}</Text>
              <Text style={[s.tCell, s.colTag, s.tCellCenter]}>{p.tag_number || ''}</Text>
              <Text style={[s.tCell, s.colDesc]}>{p.description}</Text>
              <Text style={[s.tCell, s.colUnit, s.tCellRight]}>{fmt(p.unit_price_inr)}</Text>
              <Text style={[s.tCell, s.colQty, s.tCellCenter]}>{p.quantity}</Text>
              <Text style={[s.tCell, s.colTotal, s.tCellRight, { borderRightWidth: 0 }]}>{fmtLine(p.unit_price_inr, p.quantity)}</Text>
            </View>
          ))}
          {/* Total Qty row */}
          <View style={[s.tRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.tCell, s.colSn]}> </Text>
            <Text style={[s.tCell, s.colTag]}> </Text>
            <Text style={[s.tCell, s.colDesc, s.tCellRight, s.tCellBold]}>Total Qty:</Text>
            <Text style={[s.tCell, s.colUnit]}> </Text>
            <Text style={[s.tCell, s.colQty, s.tCellCenter, s.tCellBold]}>{totalQty}</Text>
            <Text style={[s.tCell, s.colTotal, { borderRightWidth: 0 }]}> </Text>
          </View>
        </View>

        {/* Total summary */}
        <View style={s.totBlock}>
          <Text style={s.totHead}>TOTAL</Text>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Ex-Works Price Coimbatore</Text>
            <Text style={s.totValue}>{fmtDisplay(exWorksDisplay)}</Text>
          </View>
          {packing > 0 && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>Packing Charges</Text>
              <Text style={s.totValue}>{fmtDisplay(packingDisplay)}</Text>
            </View>
          )}
          {isForSite && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>Freight Charges</Text>
              <Text style={s.totValue}>{fmtDisplay(freightDisplay)}</Text>
            </View>
          )}
          {quote.custom_pricing_title && customExtra > 0 && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>{quote.custom_pricing_title}</Text>
              <Text style={s.totValue}>{fmtDisplay(customExtraDisplay)}</Text>
            </View>
          )}
          {!isIntl && gstAmount > 0 && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>GST(18 %)</Text>
              <Text style={s.totValue}>{fmtDisplay(gstDisplay)}</Text>
            </View>
          )}
          <View style={[s.totRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.totLabel, s.totFinal]}>{isForSite ? 'Total F.O.R. Site Price (Excluding Insurance)' : 'Total Ex-works Price(Excluding Freight/Insurance)'}</Text>
            <Text style={[s.totValue, s.totFinal]}>{fmtDisplay(grandTotalDisplay)}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>

        <View style={s.termsTable}>
          <View style={s.termRow}>
            <Text style={s.termLabel}>Prices</Text>
            <Text style={s.termValue}>{isForSite ? 'F.O.R.' : 'Ex-Works'} {cur} each net</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>Validity</Text>
            <Text style={s.termValue}>{quote.validity_days} days from the date of quotation</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>Delivery{'\n'}(Ex-Works)</Text>
            <Text style={s.termValue}>{quote.delivery_text}</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>Warranty</Text>
            <Text style={s.termValue}>UVPL Standard Warranty - {quote.warranty_shipment_months} months from shipping or {quote.warranty_installation_months} months from installation, whichever is earlier (on material & workmanship)</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>Payment Terms</Text>
            <Text style={s.termValue}>{paymentTerms}</Text>
          </View>
          {!isForSite && (
            <View style={s.termRow}>
              <Text style={s.termLabel}>Freight</Text>
              <Text style={s.termValue}>{quote.freight_price > 0 ? `Included: ${fmt(quote.freight_price)}` : 'To be borne by buyer'}</Text>
            </View>
          )}
          <View style={s.termRow}>
            <Text style={s.termLabel}>Insurance</Text>
            <Text style={s.termValue}>To be arranged by buyer</Text>
          </View>
          <View style={[s.termRow, { borderBottomWidth: 0 }]}>
            <Text style={s.termLabel}>Manufacturer</Text>
            <Text style={s.termValue}>Unicorn Valves Private Limited</Text>
          </View>
        </View>

        <Text style={s.sumSignFor}>For {company.name || 'Unicorn Valves Private Limited'},</Text>
        {signaturePart}

        <FooterBasic />
      </Page>

      {/* ════════════ PAGES 3-6 — T&C (only in complete mode) ════════════ */}
      {mode === 'complete' && (<>
        {/* T&C Page 1 */}
        <Page size="A4" style={s.pageTC}>
          <View style={s.tcHeader} fixed>
            <Text style={s.tcHeaderTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>
            {LOGO_DATA && <Image style={s.tcHeaderLogo} src={LOGO_DATA} />}
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>ACCEPTANCE AND CONTRACT FORMATION</Text>
            <Text style={s.tcBody}>
              This offer follows Standard Conditions of Sale of materials involving Valves, Actuators, Accessories, Spare Parts, Services being an essential part of the Sellers offer. Buyers proposed Terms and Conditions, cannot be incorporated into any contract between the seller &amp; Buyer unless document purporting to modify due to supplementing the Terms &amp; Conditions shall be binding unless negotiated and signed by both the buyer &amp; Seller.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Taxes &amp; Duties *</Text>
            <Text style={s.tcIndentBold}>=   Sale transaction within India</Text>
            <Text style={s.tcIndent}>GST applicable @ 18% for Valves, Actuators, Spares &amp; Services and 28% for selective Accessories.</Text>
            <Text style={s.tcIndentBold}>=   Sale transaction outside India</Text>
            <Text style={s.tcIndent}>Nil Duties. However, any duties applicable at the time of dispatch will be to the buyer account</Text>
            <Text style={s.tcDutyNote}>*-  Prevailing Duties for exports and GST will be applicable at the time of dispatches.</Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>PAYMENTS</Text>
            <Text style={s.tcBody}>
              Unless agreed between the Buyer and Seller. the terms of Payment shall be 40% advance along with the Purchase Order and balance upon readiness of material at the sellers premises against an Invoice. Pro rata payments shall be made by the buyer for partial shipments. Delay in payment despite reminders will accrue 1% per month or legally accepted maximum amount to be charged. In the event of any unforeseen delivery prevention / work postponement, by the Buyer, all dates of payment related to delivery shall relate instead of date of completion of manufacturing/service. Seller will require cash payment or security deposit before the revised delivery schedules.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Delivery Period</Text>
            <Text style={s.tcBody}>
              Offered shipment dates are estimates and indicates the availability of the goods at the Sellers facility. Shipment Dates shall commence after receipt of technically and commercially clear Purchase Order and advance payment if any, whereby, the Purchase Order carries all the final technical information, resolution of engineering, and / or commercial issues or Buyers mutually approved drawings.
            </Text>
            <Text style={s.tcBody}>
              Delays resulting in none compliance to the above clause, shall extend the offered shipping dates proportionately or by mutual agreement between the buyer and seller and may result in an increase in the price of the goods and waiver of claims due to delay.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Cancellation / Termination  charges</Text>
            <Text style={s.tcBody}>After acceptance of the order, following cancelation charges are to be paid towards compensation: -</Text>
            <Text style={s.tcBullet}>Immediately after release of PO but within 14 days - 10 % of order value</Text>
            <Text style={s.tcBullet}>Between 14th Day and 45 days – 25% of order Value</Text>
            <Text style={s.tcBullet}>After 45 days from the date of PO - 50 % of order value</Text>
            <Text style={s.tcBullet}>After completion of manufacture of items at our works - 100 % order value</Text>
            <Text style={[s.tcBody, { marginTop: 4 }]}>
              Seller may declare Buyer in default and terminate this Agreement in the event Buyer fails to make any payment to Seller when due or otherwise commits a material breach of this Agreement. Buyer
            </Text>
          </View>

          <View style={s.tcPageRow} fixed>
            <Text style={s.tcPageNum}>1</Text>
            <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
          </View>
          <FooterTC />
        </Page>

        {/* T&C Page 2 */}
        <Page size="A4" style={s.pageTC}>
          <View style={s.tcHeader} fixed>
            <Text style={s.tcHeaderTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>
            {LOGO_DATA && <Image style={s.tcHeaderLogo} src={LOGO_DATA} />}
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcBody}>
              may terminate this Agreement at any time, for any reason. Upon any such termination, Buyer shall pay Seller a termination payment compensating Seller for all costs incurred to the date of termination, plus overhead and profit as compiled above. Buyer may suspend Seller&apos;s performance of the work for an aggregate period of up to 90 days, provided that Buyer shall pay to Seller all costs associated with any such suspension. If a suspension of work persists for longer than an aggregate of 90 days, Seller may terminate this Agreement as described above.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Inspection, Testing &amp; Expediting</Text>
            <Text style={s.tcBody}>
              Unicorn standard Quality Control Plan / Inspection Test Plan is available on request. Purchase Orders resulting from quotation, specifies Quality Assurance requirements which deviate from Unicorn standard plan, the Company will interpret the deviations and include them in a revised QA. plan, which will be sent to customers either before or immediately on receipt of the order. Approval of this plan will be required before the order can be processed into the Company&apos;s manufacturing and procurement systems.
            </Text>
            <Text style={s.tcBody}>
              Any requirement for Customer or Customer nominated third party involvement in Inspection, Testing or Expediting must be clearly defined prior Purchase Order, together with any agreed charges for same. If any changes to defined requirements are made after receipt of Purchase Order, the Company reserves the right to amend costs and/or delivery requirements as necessary.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Documentation &amp; Certification</Text>
            <Text style={s.tcBody}>
              As we do not have any indication of your documentation requirements, the prices shown in this quotation include for documentation and certification in accordance with Unicorn valves standard which comprises of:-
            </Text>
            <Text style={s.tcBody}>One print of Valve Data sheet</Text>
            <Text style={s.tcBody}>One print of outline General arrangement drawings. (In general, it will be 2-3 Weeks from receipt of order). *</Text>
            <Text style={s.tcBody}>One print of body &amp; bonnet EN 10204 3.1 material certificates *</Text>
            <Text style={s.tcBody}>One print of body hydrostatic and seat leakage test certificates. *</Text>
            <Text style={s.tcBody}>Extra prints, reproducible or other items of documentation/certification are chargeable extra at cost. *</Text>
            <Text style={s.tcBody}>*These conditions changes on case to case basis on mutually accepted terms with buyer.</Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Surface Coating</Text>
            <Text style={s.tcBody}>
              The equipment offered in this quotation will be supplied with a surface coating as per Unicorn valves standard unless otherwise specified in the offer datasheet.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Warranty</Text>
            <Text style={s.tcBody}>
              The supplied material will be warranted against any manufacturing defects for a period of {quote.warranty_installation_months} months from the date of commissioning or {quote.warranty_shipment_months} months from the date of Dispatch, whichever is early. The warranty is null and void if found to be mishandled, not installed properly and are subjected to flow conditions not matching with what was specified in the datasheet.
            </Text>
            <Text style={s.tcBody}>
              Seller warrants that its manufactured goods and services will be free from defects in materials and workmanship. Any Warranty claim must be made in any event, within the earlier of {quote.warranty_installation_months} months from date of initial operation or {quote.warranty_shipment_months} months from delivery. Upon Buyer&apos;s submission of a claim as provided above and substantiation thereof, Seller shall, at its option (i) either repair or replace its
            </Text>
          </View>

          <View style={s.tcPageRow} fixed>
            <Text style={s.tcPageNum}>2</Text>
            <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
          </View>
          <FooterTC />
        </Page>

        {/* T&C Page 3 */}
        <Page size="A4" style={s.pageTC}>
          <View style={s.tcHeader} fixed>
            <Text style={s.tcHeaderTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>
            {LOGO_DATA && <Image style={s.tcHeaderLogo} src={LOGO_DATA} />}
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcBody}>
              nonconforming goods, or re-perform the services or (ii) refund an equitable portion of the purchase price attributable to such non-conforming goods. Seller shall not be liable for the cost of removal or reinstallation of materials or any unauthorized warranty work, nor shall Seller be responsible for any transportation cost, unless expressly authorized in writing by Seller. Any spare parts provided by Seller hereunder shall be warranted for any defects due to workmanship and to be brought to the notice of the seller, within seven working days after receipt of materials at the buyer&apos;s stores. Seller makes no representation regarding the stocking by Seller of spare parts for the goods. Repair or replacement of goods or refund of an equitable portion of the purchase price shall be Seller&apos;s only obligation and the sole and exclusive remedy of Buyer in the event of a failure to conform to the foregoing warranty. The foregoing warranty is exclusive and in lieu of all other warranties (except that of title), express or implied, including, but not limited to the implied warranties of merchantability or fitness for a particular purpose.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>PATENTS/LICENCE</Text>
            <Text style={s.tcBody}>
              Seller agrees to indemnify Buyer against, and assume the defense of, any suit for infringement of any Indian patent brought against Buyer by a non-affiliated third party to the extent such suit (i) charges infringement of an apparatus or product claim by Seller&apos;s goods in and of themselves, provided that said goods are built entirely to Seller&apos;s design and (ii) charges infringement of a process or method claim if such infringement results from the normal use of Seller&apos;s goods and is the direct result of Buyer following specific instructions regarding such use furnished by Seller; provided that (a) Buyer notifies Seller in writing of the filing of such suit within ten (10) days after the service of process thereof and (b) Seller is given complete control of the defense of such suit, including the right to defend, settle and make changes in the product for the purpose of avoiding infringement.
            </Text>
            <Text style={s.tcBody}>
              If the goods sold incorporate software or firmware containing software, Buyer is granted a non exclusive, non transferable license to use the software in connection with the normal and intended operation of the goods. Buyer acquires no right or title to the software and will not copy, modify, reverse engineer or compile, disassemble or disclose to any third party all or part of the software, except to the extent that any reduction of the software to human readable form (whether by reverse engineering, decompilation or disassembly) is necessary for the purposes of integrating the operation of the software with the operation of other software or systems used by the Buyer, unless the Seller is prepared to carry out such action at a reasonable commercial fee or has provided the information necessary to achieve such integration within a reasonable period, and the Buyer shall request the Seller to carry out such action or to provide such information (and shall meet the Seller&apos;s reasonable costs in providing that information) before undertaking any such reduction
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>APPLICABLE LAW</Text>
            <Text style={s.tcBody}>
              This Agreement shall be governed by and construed in accordance with Indian Laws. No term of this Agreement shall be enforceable solely by virtue of the Contracts (Rights of Third Parties) by any person who is not a party to this Agreement.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>DISPUTES</Text>
            <Text style={s.tcBody}>
              Each party irrevocably agrees to submit to the non-exclusive jurisdiction of Coimbatore courts, Tamil Nadu, India over any claim or matter arising under or in connection with this Agreement.
            </Text>
          </View>

          <View style={s.tcPageRow} fixed>
            <Text style={s.tcPageNum}>3</Text>
            <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
          </View>
          <FooterTC />
        </Page>

        {/* T&C Page 4 */}
        <Page size="A4" style={s.pageTC}>
          <View style={s.tcHeader} fixed>
            <Text style={s.tcHeaderTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>
            {LOGO_DATA && <Image style={s.tcHeaderLogo} src={LOGO_DATA} />}
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSectionHead}>LIMITATION OF LIABILITY</Text>
            <Text style={s.tcBody}>
              In no event shall Seller be liable for special, incidental, indirect or consequential damages whether for breach of Agreement, breach of warranty, tort or otherwise. The Seller&apos;s liability on all other claims for loss or liability arising out of or connected with this Agreement, or the manufacture, sale, delivery, resale, or use of any parts or equipment covered by this Agreement shall in no case exceed the price of the services or the unit price of such equipment or part hereof involved in the claim. Any release, limitation of liability or other exculpatory language contained herein shall apply regardless of the fault, negligence, or strict liability of the Seller. Notwithstanding the above, nothing in these terms and conditions shall be construed so as to exclude or limit the Seller&apos;s liability for personal injury or death caused by its negligence or for fraudulent misrepresentation.
            </Text>
          </View>

          <View style={s.tcSection}>
            <Text style={s.tcSubHead}>Liability Cap</Text>
            <Text style={s.tcBody}>
              &apos;Notwithstanding anything to the contrary in these or any applicable conditions the Supplier&apos;s total liability for all damages in the aggregate (including damages caused by breach of contract, tort or statutory duty) shall not exceed the Contract price nor shall the Supplier be liable for any special indirect economic or consequential damages or losses such as but not limited to loss of revenue, loss of profit, loss of contract, loss of use, loss of production, costs of capital or costs connected
            </Text>
            <Text style={s.tcBody}>
              With operation, accepting that nothing contained in this clause shall be construed as an attempt to exclude or limit liability for:-
            </Text>
            <Text style={s.tcBody}>Death or personal injury to any person or</Text>
            <Text style={s.tcBody}>Claims from third parties in tort, or</Text>
            <Text style={s.tcBody}>Accidental damage as covered by the Supplier&apos;s insurance policies or</Text>
            <Text style={s.tcBody}>Breach of confidentiality obligations or patent infringement obligations&apos;</Text>
            <Text style={s.tcBody}>
              We trust you will find our offer of interest, and look forward to the receipt of your further instructions, which will receive our immediate attention.
            </Text>
          </View>

          <View style={[s.tcSection, { marginTop: 14 }]}>
            <Text style={[s.tcBody, { fontWeight: 700 }]}>Yours faithfully</Text>
            <Text style={[s.tcBody, { fontWeight: 700, marginBottom: 24 }]}>For UNICORN VALVES PVT. LTD</Text>
            <Text style={[s.tcBody, { fontWeight: 700, marginBottom: 2 }]}>{creator.full_name}</Text>
            <Text style={[s.tcBody, { fontWeight: 700 }]}>{creator.designation || 'Assistant Manager - Application Engineering'} |{creator.department || 'Internal Sales/Marketing Department'}</Text>
          </View>

          <View style={s.tcPageRow} fixed>
            <Text style={s.tcPageNum}>4</Text>
            <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
          </View>
          <FooterTC />
        </Page>
      </>)}
    </Document>
  );
}
