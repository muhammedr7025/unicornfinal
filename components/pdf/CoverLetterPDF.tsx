import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer';
import path from 'path';

// ============================================================
// Unicorn Valves — Cover Letter + Terms & Conditions PDF
// Matches production reference documents exactly
// ============================================================

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

const LOGO_PATH = path.join(process.cwd(), 'public', 'unicorn-logo.png');

const colors = {
  black: '#000000',
  gray: '#6b7280',
  red: '#cc0000',
  border: '#cccccc',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 55,
    paddingLeft: 50,
    paddingRight: 50,
    color: colors.black,
    lineHeight: 1.4,
  },

  /* Logo — top-right absolute */
  logo: { position: 'absolute', top: 18, right: 35, width: 130, height: 56 },

  /* Footer — fixed on all pages */
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  footerLine1: { fontSize: 7, lineHeight: 1.3 },
  footerLine2: { fontSize: 7, lineHeight: 1.3, marginTop: 1 },
  footerUrl: { fontSize: 7, color: colors.red, marginTop: 1 },
  footerBold: { fontWeight: 700, color: colors.red },
  footerNormal: { fontWeight: 400, color: '#333' },

  /* ─── Cover Letter Styles ─── */
  clLocation: { fontSize: 10, fontWeight: 700, marginTop: 50 },
  clDate: { fontSize: 10, marginBottom: 16 },
  clCustomerName: { fontSize: 10, fontWeight: 600, textDecoration: 'underline', marginBottom: 1 },
  clCustomerLine: { fontSize: 10, marginBottom: 0.5 },
  clSalutation: { fontSize: 10, marginTop: 12, marginBottom: 10 },
  clRefRow: { flexDirection: 'row', marginBottom: 4, fontSize: 10 },
  clRefLabel: { fontWeight: 600, width: 52 },
  clRefValue: { flex: 1, fontSize: 10 },
  clProjectRow: { flexDirection: 'row', marginBottom: 12, fontSize: 10 },
  clProjectLabel: { fontWeight: 600, width: 52 },
  clProjectValue: { flex: 1, fontSize: 10 },
  clBody: { fontSize: 10, lineHeight: 1.5, marginBottom: 8, textAlign: 'justify' as any },
  clRefUnderline: { textDecoration: 'underline' },
  clOfferTitle: { fontSize: 10, marginBottom: 6 },
  clListItem: { fontSize: 10, lineHeight: 1.8, paddingLeft: 24, marginBottom: 1 },
  clTrust: { fontSize: 10, lineHeight: 1.5, marginTop: 8, marginBottom: 8, textAlign: 'justify' as any },
  clLookForward: { fontSize: 10, lineHeight: 1.5, marginBottom: 16, textAlign: 'justify' as any },
  clThanking: { fontSize: 10, fontWeight: 600, color: colors.red, marginBottom: 12 },
  clSignName: { fontSize: 10, fontWeight: 700, marginBottom: 3 },
  clSignTitle: { fontSize: 10, fontWeight: 700, marginBottom: 3 },
  clSignPhone: { fontSize: 10, fontWeight: 700, marginBottom: 1 },

  /* ─── T&C Styles ─── */
  tcTitle: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 24 },
  tcSectionHead: { fontSize: 10, fontWeight: 700, textDecoration: 'underline', marginBottom: 6, marginTop: 4 },
  tcSubHead: { fontSize: 9.5, fontWeight: 700, textDecoration: 'underline', marginBottom: 4 },
  tcBody: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 6, textAlign: 'justify' as any },
  tcBodyBold: { fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 6, textAlign: 'justify' as any },
  tcIndent: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 2, paddingLeft: 20, textAlign: 'justify' as any },
  tcIndentBold: { fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 2, paddingLeft: 20 },
  tcBullet: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 1, paddingLeft: 8 },
  tcSection: { marginBottom: 10 },
  tcDutyNote: { fontSize: 9, fontWeight: 700, lineHeight: 1.5, marginTop: 4, marginBottom: 6 },

  /* T&C Page numbering */
  tcPageRow: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tcPageNum: { fontSize: 8, color: colors.black },
  tcRevision: { fontSize: 7, color: colors.gray },
});

/* ── Shared footer ── */
function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLine1}>
        <Text style={s.footerBold}>Unicorn Valves Private Limited,</Text>
        <Text style={s.footerNormal}> SF No : 100/2B, Valukkuparai, P.O., Marichettipathy Road, Nachipalayam,</Text>
      </Text>
      <Text style={s.footerLine2}>
        <Text style={s.footerNormal}>Madukkarai Taluk, Coimbatore – 641032, Tamil Nadu, India, Ph No. +91-422-2901322</Text>
      </Text>
      <Text style={s.footerUrl}>www.unicorn-valves.com</Text>
    </View>
  );
}

/* ── Logo component ── */
function Logo() {
  return <Image style={s.logo} src={LOGO_PATH} />;
}

/* ── Props ── */
interface CoverLetterPDFProps {
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
  };
  customer: {
    name: string;
    company?: string;
    address?: string;
    country: string;
    is_international: boolean;
  };
  creator: {
    full_name: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
  };
  company: {
    name: string;
    address: string;
  };
}

export function CoverLetterPDF({ quote, customer, creator, company }: CoverLetterPDFProps) {
  const dateStr = new Date(quote.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const shortDate = new Date(quote.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <Document>
      {/* ═══════════════ PAGE 1 — COVER LETTER ═══════════════ */}
      <Page size="A4" style={s.page}>
        <Logo />

        {/* Location & Date */}
        <Text style={s.clLocation}>Coimbatore, INDIA</Text>
        <Text style={s.clDate}>{dateStr}</Text>

        {/* Customer Address Block */}
        <Text style={s.clCustomerName}>{customer.name}</Text>
        {customer.company && <Text style={s.clCustomerLine}>{customer.company}</Text>}
        {customer.address && (
          customer.address.split('\n').map((line, i) => (
            <Text key={i} style={s.clCustomerLine}>{line}</Text>
          ))
        )}
        <Text style={s.clCustomerLine}>{customer.country}</Text>

        {/* Salutation */}
        <Text style={s.clSalutation}>Sir</Text>

        {/* Ref row */}
        {quote.enquiry_id && (
          <View style={s.clRefRow}>
            <Text style={s.clRefLabel}>Ref:</Text>
            <Text style={s.clRefValue}>{quote.enquiry_id}</Text>
          </View>
        )}

        {/* Project row */}
        {quote.project_name && (
          <View style={s.clProjectRow}>
            <Text style={s.clProjectLabel}>Project:</Text>
            <Text style={s.clProjectValue}>{quote.project_name}</Text>
          </View>
        )}

        {/* Body paragraph with underlined reference */}
        <Text style={s.clBody}>
          We thank you for the above referred RFQ, and are pleased to submit our offer with{'\n'}
          <Text style={s.clRefUnderline}>Reference: {quote.quote_number}, Dt. {shortDate}.</Text>
        </Text>

        {/* Offer list */}
        <Text style={s.clOfferTitle}>Our Offer comprises of the following</Text>
        <Text style={s.clListItem}>1.   Covering Letter</Text>
        <Text style={s.clListItem}>2.   Priced Bid with Commercial Terms and Conditions</Text>
        <Text style={s.clListItem}>3.   Technical Bid</Text>

        {/* Trust & closing */}
        <Text style={s.clTrust}>
          Trust our offer is in line with your requirement. Should you require any further clarification, please feel free to call on the undersigned.
        </Text>
        <Text style={s.clLookForward}>
          We now look forward to the pleasure of receiving the valuable order.
        </Text>

        {/* Sign-off */}
        <Text style={s.clThanking}>Thanking you</Text>
        <Text style={s.clSignName}>{creator.full_name}</Text>
        <Text style={s.clSignTitle}>
          {creator.designation || 'Assistant Manager - Application Engineering'} |{creator.department || 'Internal Sales/Marketing Department'}
        </Text>
        {creator.phone && <Text style={s.clSignPhone}>Mobile No. : {creator.phone}</Text>}

        <Footer />
      </Page>

      {/* ═══════════════ T&C PAGE 1 ═══════════════ */}
      <Page size="A4" style={s.page}>
        <Logo />
        <Text style={s.tcTitle}>COMMERCIAL TERMS &amp; CONDITIONS</Text>

        {/* ACCEPTANCE AND CONTRACT FORMATION */}
        <View style={s.tcSection}>
          <Text style={s.tcSectionHead}>ACCEPTANCE AND CONTRACT FORMATION</Text>
          <Text style={s.tcBody}>
            This offer follows Standard Conditions of Sale of materials involving Valves, Actuators, Accessories, Spare Parts, Services being an essential part of the Sellers offer. Buyers proposed Terms and Conditions, cannot be incorporated into any contract between the seller &amp; Buyer unless document purporting to modify due to supplementing the Terms &amp; Conditions shall be binding unless negotiated and signed by both the buyer &amp; Seller.
          </Text>
        </View>

        {/* Taxes & Duties */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Taxes &amp; Duties *</Text>
          <Text style={s.tcIndentBold}>=   Sale transaction within India</Text>
          <Text style={s.tcIndent}>
            GST applicable @ 18% for Valves, Actuators, Spares &amp; Services and 28% for selective Accessories.
          </Text>
          <Text style={s.tcIndentBold}>=   Sale transaction outside India</Text>
          <Text style={s.tcIndent}>
            Nil Duties. However, any duties applicable at the time of dispatch will be to the buyer account
          </Text>
          <Text style={s.tcDutyNote}>
            *-  Prevailing Duties for exports and GST will be applicable at the time of dispatches.
          </Text>
        </View>

        {/* PAYMENTS */}
        <View style={s.tcSection}>
          <Text style={s.tcSectionHead}>PAYMENTS</Text>
          <Text style={s.tcBody}>
            Unless agreed between the Buyer and Seller. the terms of Payment shall be 40% advance along with the Purchase Order and balance upon readiness of material at the sellers premises against an Invoice. Pro rata payments shall be made by the buyer for partial shipments. Delay in payment despite reminders will accrue 1% per month or legally accepted maximum amount to be charged. In the event of any unforeseen delivery prevention / work postponement, by the Buyer, all dates of payment related to delivery shall relate instead of date of completion of manufacturing/service. Seller will require cash payment or security deposit before the revised delivery schedules.
          </Text>
        </View>

        {/* Delivery Period */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Delivery Period</Text>
          <Text style={s.tcBody}>
            Offered shipment dates are estimates and indicates the availability of the goods at the Sellers facility. Shipment Dates shall commence after receipt of technically and commercially clear Purchase Order and advance payment if any, whereby, the Purchase Order carries all the final technical information, resolution of engineering, and / or commercial issues or Buyers mutually approved drawings.
          </Text>
          <Text style={s.tcBody}>
            Delays resulting in none compliance to the above clause, shall extend the offered shipping dates proportionately or by mutual agreement between the buyer and seller and may result in an increase in the price of the goods and waiver of claims due to delay.
          </Text>
        </View>

        {/* Cancellation / Termination charges */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Cancellation / Termination  charges</Text>
          <Text style={s.tcBody}>
            After acceptance of the order, following cancelation charges are to be paid towards compensation: -
          </Text>
          <Text style={s.tcBullet}>Immediately after release of PO but within 14 days - 10 % of order value</Text>
          <Text style={s.tcBullet}>Between 14th Day and 45 days – 25% of order Value</Text>
          <Text style={s.tcBullet}>After 45 days from the date of PO - 50 % of order value</Text>
          <Text style={s.tcBullet}>After completion of manufacture of items at our works - 100 % order value</Text>
          <Text style={[s.tcBody, { marginTop: 4 }]}>
            Seller may declare Buyer in default and terminate this Agreement in the event Buyer fails to make any payment to Seller when due or otherwise commits a material breach of this Agreement. Buyer shall be liable to ensure the payment towards the above mentioned terms.
          </Text>
        </View>

        {/* Page number row */}
        <View style={s.tcPageRow}>
          <Text style={s.tcPageNum}>1</Text>
          <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
        </View>
        <Footer />
      </Page>

      {/* ═══════════════ T&C PAGE 2 ═══════════════ */}
      <Page size="A4" style={s.page}>
        <Logo />

        {/* Inspection */}
        <View style={[s.tcSection, { marginTop: 40 }]}>
          <Text style={s.tcSubHead}>Inspection</Text>
          <Text style={s.tcBody}>
            All goods will undergo sellers standard quality control inspection and testing procedures, before release from factory. Any additional tests and / or inspection requirements will be at buyer's cost and will need to be communicated and agreed at the time of order.
          </Text>
        </View>

        {/* Third party inspection */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Third party inspection</Text>
          <Text style={s.tcBody}>
            If third party inspection is required by the buyer, Seller should be informed at the time of placing order. Additional charges if any, related to third party inspection activities at the works of Seller or subsuppliers, will be to the cost of the buyer.
          </Text>
        </View>

        {/* Transit Insurance */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Transit Insurance</Text>
          <Text style={s.tcBody}>
            Transit insurance (Ex-works, FOB, FCA, CIF, CFR or any other INCO terms sales) is not included. Transit insurance shall be arranged and borne by the buyer unless specifically quoted.
          </Text>
        </View>

        {/* Freight / Transportation */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Freight / Transportation</Text>
          <Text style={s.tcBody}>
            Unless otherwise stated, the ex-works price does not include dispatch, freight, or insurance charges. These will be at buyer's cost. For F.O.R./C.I.F. quotes, freight charges are included as part of the quoted price.
          </Text>
        </View>

        {/* WARRANTY */}
        <View style={s.tcSection}>
          <Text style={s.tcSectionHead}>WARRANTY</Text>
          <Text style={s.tcBody}>
            {quote.warranty_shipment_months} months from the date of delivery or {quote.warranty_installation_months} months from installation / commissioning whichever is earlier. Warranty is limited to defects in material and workmanship under normal recommended operating conditions.
          </Text>
          <Text style={s.tcBody}>
            Seller shall not be liable for any wear and tear arising out of usage, improper handling, maintenance, operation or any condition exceeding the original design specifications. Warranty is void if the equipment is modified, repaired, or serviced by anyone other than the Seller or their authorized representative without prior written consent.
          </Text>
          <Text style={s.tcBody}>
            Warranty is limited to repair or replacement of defective parts at the sole discretion of the Seller. Labour and transportation costs for warranty service shall be borne by the buyer unless otherwise agreed.
          </Text>
        </View>

        {/* Limitation of Liability */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Limitation of Liability</Text>
          <Text style={s.tcBody}>
            In no event shall the Seller be liable for any indirect, incidental, consequential, special, or punitive damages, including but not limited to loss of profits, loss of production, loss of use, arising out of or related to the products or services provided. Seller's total liability shall not exceed the purchase price of the goods/services.
          </Text>
        </View>

        <View style={s.tcPageRow}>
          <Text style={s.tcPageNum}>2</Text>
          <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
        </View>
        <Footer />
      </Page>

      {/* ═══════════════ T&C PAGE 3 ═══════════════ */}
      <Page size="A4" style={s.page}>
        <Logo />

        {/* FORCE MAJEURE */}
        <View style={[s.tcSection, { marginTop: 40 }]}>
          <Text style={s.tcSectionHead}>FORCE MAJEURE</Text>
          <Text style={s.tcBody}>
            Neither party shall be held responsible for any delay or failure in performance resulting from acts beyond their reasonable control, including but not limited to acts of God, fire, flood, earthquake, pandemic, epidemic, war, terrorism, civil disturbance, governmental actions, strikes, lockouts, shortage of materials, and any other causes beyond reasonable control of the affected party. The affected party shall notify the other party promptly and shall use reasonable efforts to mitigate the impact of such events.
          </Text>
        </View>

        {/* Technical Specifications */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Technical Specifications</Text>
          <Text style={s.tcBody}>
            The Seller reserves the right to make minor changes to the design, materials, or specifications of the goods, provided such changes do not adversely affect the performance or suitability of the goods for the intended purpose. Any major deviations will be communicated to the buyer for approval.
          </Text>
        </View>

        {/* Packing & Forwarding */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Packing &amp; Forwarding</Text>
          <Text style={s.tcBody}>
            Standard domestic / export packing as applicable. Special packing requirements, if any, shall be at additional cost and must be communicated at the time of order placement.
          </Text>
        </View>

        {/* Returns */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Returns</Text>
          <Text style={s.tcBody}>
            No goods shall be returned without prior written consent of the Seller. Goods returned without authorization will not be accepted. Restocking charges may apply for authorized returns.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Intellectual Property</Text>
          <Text style={s.tcBody}>
            All drawings, designs, specifications, and technical data provided by the Seller remain the exclusive property of the Seller. The buyer shall not reproduce, disclose, or use such information for any purpose other than the intended use without prior written permission.
          </Text>
        </View>

        {/* Compliance */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Compliance</Text>
          <Text style={s.tcBody}>
            Both parties shall comply with all applicable laws, regulations, and standards in the performance of the contract, including but not limited to environmental, safety, labour, anti-corruption, and export control laws.
          </Text>
        </View>

        <View style={s.tcPageRow}>
          <Text style={s.tcPageNum}>3</Text>
          <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
        </View>
        <Footer />
      </Page>

      {/* ═══════════════ T&C PAGE 4 ═══════════════ */}
      <Page size="A4" style={s.page}>
        <Logo />

        {/* DISPUTE RESOLUTION */}
        <View style={[s.tcSection, { marginTop: 40 }]}>
          <Text style={s.tcSectionHead}>DISPUTE RESOLUTION</Text>
          <Text style={s.tcBody}>
            Any dispute, controversy or claim arising out of, or relating to this contract, or the breach, termination or invalidity thereof, shall first be attempted to be settled amicably through mutual consultation. If the matter is not resolved within 30 days, it shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Coimbatore, Tamil Nadu, India. The language of arbitration shall be English.
          </Text>
        </View>

        {/* JURISDICTION */}
        <View style={s.tcSection}>
          <Text style={s.tcSectionHead}>JURISDICTION</Text>
          <Text style={s.tcBody}>
            This contract shall be governed by and construed in accordance with the laws of India. All disputes shall be subject to the exclusive jurisdiction of the courts of Coimbatore, Tamil Nadu, India.
          </Text>
        </View>

        {/* Confidentiality */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Confidentiality</Text>
          <Text style={s.tcBody}>
            Both parties agree to maintain confidentiality of all commercial, technical, and proprietary information exchanged in connection with this transaction. This obligation shall survive the termination or completion of the contract.
          </Text>
        </View>

        {/* Entire Agreement */}
        <View style={s.tcSection}>
          <Text style={s.tcSubHead}>Entire Agreement</Text>
          <Text style={s.tcBody}>
            This quotation together with the attached terms and conditions constitutes the entire agreement between the parties. No modification or amendment shall be binding unless made in writing and signed by authorized representatives of both parties.
          </Text>
        </View>

        {/* Signature block */}
        <View style={{ marginTop: 28, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 14 }}>
          <Text style={[s.tcBody, { fontWeight: 700 }]}>For UNICORN VALVES PRIVATE LIMITED</Text>
          <Text style={s.tcBody}>{'\n'}{'\n'}</Text>
          <Text style={[s.tcBody, { fontWeight: 600 }]}>Authorized Signatory</Text>
        </View>

        <View style={s.tcPageRow}>
          <Text style={s.tcPageNum}>4</Text>
          <Text style={s.tcRevision}>FR/MK/05, REV No: 1, Rev.Date: 15/05/2017</Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
