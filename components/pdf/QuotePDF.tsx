import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';

// ============================================================
// Unicorn Valves — PDF Quote Template
// ============================================================

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

const colors = {
  navy: '#1a1a3e',
  navyLight: '#2a2a5e',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  border: '#e5e7eb',
  white: '#ffffff',
};

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, padding: 40, color: '#1f2937' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logo: { fontSize: 16, fontWeight: 700, color: colors.navy },
  logoSub: { fontSize: 8, color: colors.gray, marginTop: 2 },
  quoteInfo: { textAlign: 'right' },
  quoteNumber: { fontSize: 12, fontWeight: 700, color: colors.navy },
  quoteDate: { fontSize: 8, color: colors.gray, marginTop: 2 },
  quoteBadge: { backgroundColor: colors.navy, color: colors.white, fontSize: 7, fontWeight: 600, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginTop: 4, textAlign: 'center' },
  // Customer section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: colors.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', marginBottom: 2 },
  labelCol: { width: 100, color: colors.gray, fontSize: 8 },
  valueCol: { flex: 1, fontSize: 8, fontWeight: 600 },
  // Table
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.navy, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3 },
  tableHeaderText: { color: colors.white, fontSize: 7, fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tableRowAlt: { backgroundColor: colors.grayLight },
  tableCell: { fontSize: 8 },
  tableCellBold: { fontSize: 8, fontWeight: 700 },
  // Columns
  colSn: { width: 25 },
  colDesc: { flex: 1 },
  colQty: { width: 35, textAlign: 'center' },
  colUnit: { width: 70, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  // Summary
  summaryBox: { marginTop: 8, alignSelf: 'flex-end', width: 220 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLabel: { fontSize: 8, color: colors.gray },
  summaryValue: { fontSize: 8, fontWeight: 600 },
  summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.navy, paddingTop: 4, marginTop: 4 },
  summaryTotalLabel: { fontSize: 10, fontWeight: 700, color: colors.navy },
  summaryTotalValue: { fontSize: 10, fontWeight: 700, color: colors.navy },
  // Terms
  terms: { marginTop: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border },
  termItem: { flexDirection: 'row', marginBottom: 3 },
  termLabel: { width: 120, fontSize: 7, color: colors.gray },
  termValue: { flex: 1, fontSize: 7 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: colors.gray, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 8 },
});

interface QuotePDFProps {
  quote: {
    quote_number: string;
    created_at: string;
    status: string;
    pricing_mode: string;
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
    notes?: string;
  };
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
  company: {
    name: string;
    address: string;
    gstin: string;
  };
  exchangeRate: number;
}

export function QuotePDF({ quote, customer, products, company, exchangeRate }: QuotePDFProps) {
  const isIntl = customer.is_international;
  const formatCurrency = (v: number) => {
    if (isIntl) {
      const usd = exchangeRate > 0 ? Math.round(v / exchangeRate) : 0;
      return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return `\u20B9${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const sortedProducts = [...products].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>{company.name}</Text>
            <Text style={s.logoSub}>{company.address}</Text>
            {company.gstin && <Text style={s.logoSub}>GSTIN: {company.gstin}</Text>}
          </View>
          <View style={s.quoteInfo}>
            <Text style={s.quoteNumber}>{quote.quote_number}</Text>
            <Text style={s.quoteDate}>
              Date: {new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={s.quoteBadge}>{quote.pricing_type.toUpperCase()}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Bill To</Text>
          <View style={s.row}><Text style={s.labelCol}>Customer</Text><Text style={s.valueCol}>{customer.name}</Text></View>
          {customer.company && <View style={s.row}><Text style={s.labelCol}>Company</Text><Text style={s.valueCol}>{customer.company}</Text></View>}
          {customer.address && <View style={s.row}><Text style={s.labelCol}>Address</Text><Text style={s.valueCol}>{customer.address}</Text></View>}
          <View style={s.row}><Text style={s.labelCol}>Country</Text><Text style={s.valueCol}>{customer.country}</Text></View>
        </View>

        {/* Products Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colSn]}>S.N.</Text>
            <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeaderText, s.colUnit]}>Unit Price</Text>
            <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
          </View>
          {sortedProducts.map((p, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCell, s.colSn]}>{i + 1}</Text>
              <View style={s.colDesc}>
                <Text style={s.tableCellBold}>{p.description}</Text>
                {p.tag_number && <Text style={{ fontSize: 7, color: colors.gray }}>Tag: {p.tag_number}</Text>}
              </View>
              <Text style={[s.tableCell, s.colQty]}>{p.quantity}</Text>
              <Text style={[s.tableCell, s.colUnit]}>{formatCurrency(p.unit_price_inr)}</Text>
              <Text style={[s.tableCellBold, s.colTotal]}>{formatCurrency(p.line_total_inr)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={s.summaryBox}>
          <View style={s.summaryRow}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryValue}>{formatCurrency(quote.subtotal_inr)}</Text></View>
          {quote.freight_price > 0 && <View style={s.summaryRow}><Text style={s.summaryLabel}>Freight</Text><Text style={s.summaryValue}>{formatCurrency(quote.freight_price)}</Text></View>}
          {quote.packing_price > 0 && <View style={s.summaryRow}><Text style={s.summaryLabel}>Packing</Text><Text style={s.summaryValue}>{formatCurrency(quote.packing_price)}</Text></View>}
          {quote.custom_pricing_title && quote.custom_pricing_price > 0 && <View style={s.summaryRow}><Text style={s.summaryLabel}>{quote.custom_pricing_title}</Text><Text style={s.summaryValue}>{formatCurrency(quote.custom_pricing_price)}</Text></View>}
          {!isIntl && <View style={s.summaryRow}><Text style={s.summaryLabel}>GST (18%)</Text><Text style={s.summaryValue}>{formatCurrency(quote.tax_amount_inr)}</Text></View>}
          {isIntl && <View style={s.summaryRow}><Text style={s.summaryLabel}>GST</Text><Text style={s.summaryValue}>N/A</Text></View>}
          <View style={s.summaryTotal}>
            <Text style={s.summaryTotalLabel}>Grand Total</Text>
            <Text style={s.summaryTotalValue}>{formatCurrency(quote.grand_total_inr)}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={s.terms}>
          <Text style={s.sectionTitle}>Terms & Conditions</Text>
          <View style={s.termItem}><Text style={s.termLabel}>Validity</Text><Text style={s.termValue}>{quote.validity_days} days from date of quote</Text></View>
          <View style={s.termItem}><Text style={s.termLabel}>Delivery</Text><Text style={s.termValue}>{quote.delivery_text}</Text></View>
          <View style={s.termItem}><Text style={s.termLabel}>Payment</Text><Text style={s.termValue}>{quote.payment_advance_pct}% Advance · {quote.payment_approval_pct > 0 ? `${quote.payment_approval_pct}% On Approval · ` : ''}{quote.payment_despatch_pct}% Before Despatch</Text></View>
          <View style={s.termItem}><Text style={s.termLabel}>Warranty</Text><Text style={s.termValue}>{quote.warranty_shipment_months} months from shipment or {quote.warranty_installation_months} months from installation, whichever is earlier</Text></View>
          {quote.notes && <View style={s.termItem}><Text style={s.termLabel}>Notes</Text><Text style={s.termValue}>{quote.notes}</Text></View>}
        </View>

        {/* Footer */}
        <Text style={s.footer}>{company.name} · {company.address} · This is a system-generated quotation</Text>
      </Page>
    </Document>
  );
}
