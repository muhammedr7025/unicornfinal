import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { calculateQuoteTotal, convertToUSD } from '@/lib/pricingEngine';
import { formatDeliveryText, finalTotalLabel, pricingTypeLabel } from '@/lib/quoteHelpers';

// Cell display formats. Values stay exact — these only control how many
// decimals Excel shows, the same rule the app and PDF follow.
const MONEY_FMT = '#,##0.00';
const WEIGHT_FMT = '#,##0.000';

// A stored cost/price and its reconstruction are treated as equal within
// this tolerance — stored columns are NUMERIC(12,2), so exact arithmetic
// can differ from them by up to half a paisa.
const TOLERANCE = 0.01;

function formatNumericCells(ws: XLSX.WorkSheet, cols: number[], fmt: string) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (const c of cols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = fmt;
    }
  }
}

// Excel rejects sheet names containing : \ / ? * [ ] and caps them at 31
// characters. Tag numbers are free text (e.g. "FCV/101"), so without this a
// single tag would make the whole export fail.
function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: quote, error: quoteErr } = await supabase
      .from('quotes').select('*, customer:customers(*)').eq('id', id).single();
    if (quoteErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    const { data: products } = await supabase
      .from('quote_products').select('*').eq('quote_id', id).order('sort_order');
    const productList = products ?? [];
    const productIds = productList.map(p => p.id);

    const [tubingRes, testingRes, accessoriesRes] = await Promise.all([
      productIds.length > 0 ? supabase.from('product_tubing_items').select('*').in('quote_product_id', productIds) : { data: [] },
      productIds.length > 0 ? supabase.from('product_testing_items').select('*').in('quote_product_id', productIds) : { data: [] },
      productIds.length > 0 ? supabase.from('product_accessories').select('*').in('quote_product_id', productIds) : { data: [] },
    ]);
    const tubingItems = tubingRes.data ?? [];
    const testingItems = testingRes.data ?? [];
    const accessoryItems = accessoriesRes.data ?? [];

    const materialIds = [...new Set(productList.flatMap(p =>
      [p.body_bonnet_material_id, p.plug_material_id, p.seat_material_id, p.stem_material_id, p.cage_material_id].filter(Boolean)
    ))];
    const seriesIds = [...new Set(productList.map(p => p.series_id).filter(Boolean))];
    const actuatorIds = [...new Set(productList.map(p => p.actuator_model_id).filter(Boolean))];
    const handwheelIds = [...new Set(productList.map(p => p.handwheel_model_id).filter(Boolean))];

    // Master-data lookups use the same is_active filter as the wizard's price
    // calculation, so the breakdown reconstructs from the same rows it used.
    const bySeries = (table: string) =>
      seriesIds.length > 0
        ? supabase.from(table).select('*').in('series_id', seriesIds).eq('is_active', true)
        : { data: [] };

    const [materialsRes, seriesRes, actuatorsRes, handwheelsRes, profileRes, machiningRes,
      bodyWRes, bonnetWRes, plugWRes, seatWRes, stemWRes, cageWRes, pilotWRes, sealPRes] = await Promise.all([
      materialIds.length > 0 ? supabase.from('materials').select('id,material_name,price_per_kg,material_group').in('id', materialIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('series').select('id,series_number,series_name').in('id', seriesIds) : { data: [] },
      actuatorIds.length > 0 ? supabase.from('actuator_models').select('id,type,model,fixed_price').in('id', actuatorIds) : { data: [] },
      handwheelIds.length > 0 ? supabase.from('handwheel_prices').select('id,type,model,fixed_price').in('id', handwheelIds) : { data: [] },
      supabase.from('profiles').select('full_name,designation,phone,email').eq('id', quote.created_by).single(),
      bySeries('machining_prices'),
      bySeries('body_weights'),
      bySeries('bonnet_weights'),
      bySeries('plug_weights'),
      bySeries('seat_weights'),
      bySeries('stem_weights'),
      bySeries('cage_weights'),
      bySeries('pilot_plug_weights'),
      bySeries('seal_ring_prices'),
    ]);

    const matMap: Record<string, { material_name: string; price_per_kg: number }> = Object.fromEntries((materialsRes.data ?? []).map((m: { id: string; material_name: string; price_per_kg: number }) => [m.id, m]));
    const seriesMap: Record<string, { series_number: string; series_name: string }> = Object.fromEntries((seriesRes.data ?? []).map((s: { id: string; series_number: string; series_name: string }) => [s.id, s]));
    const actMap: Record<string, { type: string; model: string; fixed_price: number }> = Object.fromEntries((actuatorsRes.data ?? []).map((a: { id: string; type: string; model: string; fixed_price: number }) => [a.id, a]));
    const hwMap: Record<string, { type: string; model: string; fixed_price: number }> = Object.fromEntries((handwheelsRes.data ?? []).map((h: { id: string; type: string; model: string; fixed_price: number }) => [h.id, h]));
    const machiningData: { component: string; series_id: string; size: string; rating: string; type_key: string; material_id: string; fixed_price: number }[] = machiningRes.data ?? [];
    const profile = profileRes.data;
    const customer = quote.customer as {
      name: string; company?: string; country: string; is_international: boolean;
      address?: string; customer_type?: string;
    };

    const fw = (data: { series_id: string; size: string; rating: string; [k: string]: unknown }[], sid: string, sz: string, rt: string, ek?: string, ev?: string): number | null => {
      const m = data.find(w => w.series_id === sid && w.size === sz && w.rating === rt && (ek ? w[ek] === ev : true));
      return m ? Number(m.weight_kg) : null;
    };
    const fm = (comp: string, sid: string, sz: string, rt: string, tk: string, mid: string): number => {
      const m = machiningData.find(x => x.component === comp && x.series_id === sid && x.size === sz && x.rating === rt && x.type_key === tk && x.material_id === mid);
      return m ? Number(m.fixed_price) : 0;
    };
    const fSeal = (sid: string, stype: string, sz: string, rt: string): number | null => {
      const m = (sealPRes.data ?? []).find((s: { series_id: string; seal_type: string; size: string; rating: string; fixed_price: number }) => s.series_id === sid && s.seal_type === stype && s.size === sz && s.rating === rt);
      return m ? Number(m.fixed_price) : null;
    };

    const applyMargin = (cost: number, pct: number) => (cost <= 0 || pct >= 100) ? cost : cost / (1 - pct / 100);

    const isIntl = customer.is_international;
    const isDealer = customer.customer_type === 'dealer';
    const pricingType = quote.pricing_type as string;
    const subtotalProducts = productList.reduce((s, p) => s + Number(p.line_total_inr ?? 0), 0);
    const freight = pricingType === 'for-site' ? Number(quote.freight_price ?? 0) : 0;
    const packing = Number(quote.packing_price ?? 0);
    // Custom pricing: title 1 labels the charge row; title 2 labels the final
    // total (via finalTotalLabel), exactly as on the PDF.
    const customChargeTitle = quote.custom_pricing_title?.trim() ?? '';
    const customCharge = pricingType === 'custom' ? Number(quote.custom_pricing_price ?? 0) : 0;
    const customItems = customChargeTitle && customCharge > 0
      ? [{ name: customChargeTitle, price: customCharge }]
      : [];
    // Same helper the wizard saves with, so the workbook's GST and grand total
    // match the stored ones.
    const { subtotal: taxable, taxAmount, grandTotal } = calculateQuoteTotal(
      productList.map((p) => ({ lineTotal: Number(p.line_total_inr ?? 0) })),
      pricingType,
      freight,
      customItems,
      packing,
      isIntl,
    );

    // International quotes are shown in USD using the rate the quote was saved
    // with — never an assumed default. A quote with no saved rate would
    // otherwise be silently converted at a made-up rate, so it falls back to
    // INR and says so.
    const exRate = Number(quote.exchange_rate_snapshot ?? 0);
    const showUSD = isIntl && exRate > 0;
    const currencyLabel = showUSD ? 'USD' : 'INR';
    const displayAmount = (amountINR: number) => showUSD ? convertToUSD(amountINR, exRate) : amountINR;
    const agentCommissionPct = Number(productList[0]?.commission_pct ?? 0);

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Quote Summary ──
    const sumData: (string | number | null)[][] = [
      ['QUOTE SUMMARY'],
      [],
      ['Quote Number', quote.quote_number],
      ['Date', new Date(quote.created_at).toLocaleDateString('en-IN')],
      ['Customer', customer.name + (customer.company ? ` (${customer.company})` : '')],
      ['Country', customer.country],
      ['Currency', isIntl
        ? (showUSD ? 'USD ($)' : 'USD ($) — exchange rate not recorded on this quote, amounts shown in INR')
        : 'INR (₹)'],
      ['Project', quote.project_name ?? ''],
      ['Enquiry Ref', quote.enquiry_id ?? ''],
      ['Pricing Mode', quote.pricing_mode ?? ''],
      ['Pricing Type', pricingTypeLabel(pricingType)],
      ...(isDealer ? [['Agent Commission', `${agentCommissionPct}%`]] : []),
      [],
      ['COMMERCIAL TERMS'],
      ['Validity', `${quote.validity_days} days from the date of quotation`],
      ['Delivery', formatDeliveryText(quote.delivery_text)],
      ['Payment – Advance', `${quote.payment_advance_pct}%`],
      ...(Number(quote.payment_approval_pct) > 0 ? [['Payment – On Approval', `${quote.payment_approval_pct}%`]] : []),
      ['Payment – On Despatch', `${quote.payment_despatch_pct}%`],
      ['Warranty (Shipment)', `${quote.warranty_shipment_months} months`],
      ['Warranty (Installation)', `${quote.warranty_installation_months} months`],
      // Freight is charged only on F.O.R. quotes (it appears in the price
      // summary below); everything else leaves it to the buyer, as on the PDF.
      ...(pricingType !== 'for-site' ? [['Freight', 'To be borne by buyer']] : []),
      ['Insurance', 'To be arranged by buyer'],
      ...(quote.notes?.trim() ? [['Special Notes', quote.notes.trim()]] : []),
      [],
      ['PRICE SUMMARY'],
      ...(showUSD ? [['Exchange Rate', `1 USD = ₹${exRate}`]] : []),
      [`Products Subtotal (${currencyLabel})`, displayAmount(subtotalProducts)],
      ...(freight > 0 ? [[`Freight Charges (${currencyLabel})`, displayAmount(freight)]] : []),
      [`Packing Charges (${currencyLabel})`, displayAmount(packing)],
      ...customItems.map(item => [`${item.name} (${currencyLabel})`, displayAmount(item.price)]),
      [`Taxable Amount (${currencyLabel})`, displayAmount(taxable)],
      ...(!isIntl ? [['GST 18% (INR)', taxAmount]] : []),
      [`${finalTotalLabel(pricingType, quote.custom_pricing_title_2)} (${currencyLabel})`, displayAmount(grandTotal)],
      [],
      ['Prepared By', profile?.full_name ?? ''],
      ['Phone', profile?.phone ?? ''],
      ['Email', profile?.email ?? ''],
    ] as (string | number | null)[][];

    const sumSheet = XLSX.utils.aoa_to_sheet(sumData);
    sumSheet['!cols'] = [{ wch: 48 }, { wch: 60 }];
    formatNumericCells(sumSheet, [1], MONEY_FMT);
    XLSX.utils.book_append_sheet(wb, sumSheet, 'Quote Summary');

    // ── Sheet 2: Configuration ──
    const configData: (string | number | null)[][] = [
      [`VALVE CONFIGURATION — ${quote.quote_number}`],
      [`Customer: ${customer.name}${customer.company ? ` (${customer.company})` : ''}`],
      [`Project: ${quote.project_name ?? ''}`],
      [],
      ['#', 'TAG', 'QTY', 'SERIES', 'SIZE', 'RATING', 'END CONNECTIONS', 'BODY MATERIAL',
        'BONNET TYPE', 'TRIM TYPE', 'CAGE QTY', 'SEAL TYPE', 'SEAT MATERIAL', 'PLUG MATERIAL',
        'STEM MATERIAL', 'CAGE MATERIAL', 'PILOT PLUG', 'ACTUATOR', 'ACTUATOR MODEL', 'HANDWHEEL',
        'DISCOUNT %', ...(isDealer ? ['COMM %'] : [])],
    ];
    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const s = seriesMap[p.series_id];
      const act = p.actuator_model_id ? actMap[p.actuator_model_id] : null;
      const hw = p.handwheel_model_id ? hwMap[p.handwheel_model_id] : null;
      configData.push([
        i + 1, p.tag_number ?? '', p.quantity,
        s ? `${s.series_number} — ${s.series_name}` : '',
        p.size, p.rating, p.end_connect_type,
        matMap[p.body_bonnet_material_id]?.material_name ?? 'N/A',
        p.bonnet_type, p.trim_type ?? '',
        p.cage_material_id ? (p.cage_quantity ?? 1) : 'N/A',
        p.seal_ring_type ?? 'N/A',
        matMap[p.seat_material_id]?.material_name ?? 'N/A',
        matMap[p.plug_material_id]?.material_name ?? 'N/A',
        matMap[p.stem_material_id]?.material_name ?? 'N/A',
        matMap[p.cage_material_id]?.material_name ?? 'N/A',
        p.has_pilot_plug ? 'YES' : 'NO',
        act ? act.type : (p.has_actuator ? 'YES' : 'NO'),
        act ? act.model : '',
        hw ? `${hw.type} - ${hw.model}` : (p.has_handwheel ? 'YES' : 'NO'),
        Number(p.discount_pct ?? 0),
        ...(isDealer ? [Number(p.commission_pct ?? 0)] : []),
      ]);
    }
    const configSheet = XLSX.utils.aoa_to_sheet(configData);
    configSheet['!cols'] = Array(isDealer ? 22 : 21).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, configSheet, 'Configuration');

    // ── One sheet per product ──
    const RATES_CHANGED = '⚠ Rates changed since quoting — total is the quoted figure';
    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const s = seriesMap[p.series_id];
      const bbMat = matMap[p.body_bonnet_material_id];
      const plugMat = matMap[p.plug_material_id];
      const seatMat = matMap[p.seat_material_id];
      const stemMat = matMap[p.stem_material_id];
      const cageMat = matMap[p.cage_material_id];
      const act = p.actuator_model_id ? actMap[p.actuator_model_id] : null;
      const hw = p.handwheel_model_id ? hwMap[p.handwheel_model_id] : null;
      const pTubing = tubingItems.filter((t: { quote_product_id: string }) => t.quote_product_id === p.id);
      const pTesting = testingItems.filter((t: { quote_product_id: string }) => t.quote_product_id === p.id);
      const pAcc = accessoryItems.filter((a: { quote_product_id: string }) => a.quote_product_id === p.id);

      const rateOf = (m?: { price_per_kg: number }) => (m ? Number(m.price_per_kg) : 0);
      const bbRate = rateOf(bbMat);
      const cageQty = Number(p.cage_quantity ?? 1);

      // Weights — same tables and keys the wizard used to price the quote.
      const bodyW = fw(bodyWRes.data ?? [], p.series_id, p.size, p.rating, 'end_connect_type', p.end_connect_type);
      const bonnetW = fw(bonnetWRes.data ?? [], p.series_id, p.size, p.rating, 'bonnet_type', p.bonnet_type);
      const plugW = fw(plugWRes.data ?? [], p.series_id, p.size, p.rating);
      const seatW = fw(seatWRes.data ?? [], p.series_id, p.size, p.rating);
      const stemW = stemMat ? fw(stemWRes.data ?? [], p.series_id, p.size, p.rating) : null;
      const cageW = cageMat ? fw(cageWRes.data ?? [], p.series_id, p.size, p.rating) : null;
      const pilotW = p.has_pilot_plug ? fw(pilotWRes.data ?? [], p.series_id, p.size, p.rating) : null;

      // Machining
      const bodyMach = p.body_bonnet_material_id ? fm('body', p.series_id, p.size, p.rating, p.end_connect_type, p.body_bonnet_material_id) : 0;
      const bonnetMach = p.body_bonnet_material_id ? fm('bonnet', p.series_id, p.size, p.rating, p.bonnet_type, p.body_bonnet_material_id) : 0;
      const plugMach = p.plug_material_id ? fm('plug', p.series_id, p.size, p.rating, p.trim_type ?? '', p.plug_material_id) : 0;
      const seatMach = p.seat_material_id ? fm('seat', p.series_id, p.size, p.rating, p.trim_type ?? '', p.seat_material_id) : 0;
      const stemMach = p.stem_material_id ? fm('stem', p.series_id, p.size, p.rating, p.trim_type ?? '', p.stem_material_id) : 0;
      const cageMach = (cageMat && p.cage_material_id) ? fm('cage', p.series_id, p.size, p.rating, p.trim_type ?? '', p.cage_material_id) : 0;
      const sealPrice = p.seal_ring_type ? fSeal(p.series_id, p.seal_ring_type, p.size, p.rating) : null;

      // Stored costs — what the quote was actually priced with.
      const bodyCost = Number(p.body_cost ?? 0);
      const bonnetCost = Number(p.bonnet_cost ?? 0);
      const plugCost = Number(p.plug_cost ?? 0);
      const seatCost = Number(p.seat_cost ?? 0);
      const stemCost = Number(p.stem_cost ?? 0);
      const cageCost = Number(p.cage_cost ?? 0);
      const sealCost = Number(p.seal_ring_cost ?? 0);
      const pilotCost = Number(p.pilot_plug_cost ?? 0);
      const actCost = Number(p.actuator_cost ?? 0);
      const hwCost = Number(p.handwheel_cost ?? 0);
      const tubingTotal = pTubing.reduce((s: number, t: { price: number | string }) => s + Number(t.price), 0);
      const testingTotal = pTesting.reduce((s: number, t: { price: number | string }) => s + Number(t.price), 0);
      const accTotal = pAcc.reduce((s: number, a: { unit_price: number | string; quantity: number }) => s + Number(a.unit_price) * a.quantity, 0);

      // Pricing chain — recomputed from the stored costs and stored margins.
      const mfgCost = bodyCost + bonnetCost + plugCost + seatCost + stemCost + cageCost + sealCost + pilotCost + tubingTotal + testingTotal + actCost + hwCost;
      const mfgProfitPct = Number(p.mfg_profit_pct ?? 0);
      const boProfitPct = Number(p.bo_profit_pct ?? 0);
      const negMarginPct = Number(p.neg_margin_pct ?? 0);
      const commPct = Number(p.commission_pct ?? 0);
      const discPct = Number(p.discount_pct ?? 0);
      const qty = Number(p.quantity ?? 1);
      const boCost = accTotal;
      const mfgWithProfit = applyMargin(mfgCost, mfgProfitPct);
      const boWithProfit = boCost === 0 ? 0 : applyMargin(boCost, boProfitPct);
      const unitCost = mfgWithProfit + boWithProfit;
      const afterNeg = applyMargin(unitCost, negMarginPct);
      const afterComm = commPct > 0 ? applyMargin(afterNeg, commPct) : afterNeg;
      const afterDisc = discPct > 0 ? afterComm * (1 - discPct / 100) : afterComm;
      const recalculatedUnitPrice = afterDisc;

      // The quoted figures are authoritative — they're what the Summary sheet,
      // the PDF and the detail pages show.
      const quotedUnitPrice = Number(p.unit_price_inr ?? 0);
      const quotedLineTotal = Number(p.line_total_inr ?? 0);

      const sheetData: (string | number | null)[][] = [
        [`PRODUCT ${i + 1} — COST BREAKDOWN`],
        [`Quote: ${quote.quote_number}  |  Customer: ${customer.name}`],
        [`Series: ${s?.series_number ?? ''} — ${s?.series_name ?? ''}  |  Tag: ${p.tag_number || 'N/A'}  |  Size: ${p.size}  |  Rating: ${p.rating}  |  End: ${p.end_connect_type}`],
        [],
        ['COMPONENT', 'MATERIAL', 'WEIGHT (kg)', 'RATE (₹/kg)', 'MATERIAL COST (₹)', 'MACHINING COST (₹)', 'COMPONENT TOTAL (₹)', 'NOTES'],
      ];

      // One weight-based component row. If today's weight × rate + machining
      // no longer reproduces the stored total, master data changed after the
      // quote was priced — flag it rather than leave the row silently wrong.
      const row = (comp: string, mat: string, wt: number | null, rate: number, matCost: number | null, mach: number, total: number, note = '') => {
        const drifted = Math.abs((matCost ?? 0) + mach - total) > TOLERANCE;
        return [comp, mat, wt ?? '—', rate || '—', matCost ?? '—', mach || '—', total,
          [note, drifted ? RATES_CHANGED : ''].filter(Boolean).join(' · ')];
      };
      // One fixed-price component row, flagged the same way if its master
      // price no longer matches what was quoted.
      const fixedRow = (comp: string, desc: string, current: number | null, total: number, note: string) => {
        const drifted = current != null && Math.abs(current - total) > TOLERANCE;
        return [comp, desc, '—', '—', '—', '—', total,
          [note, drifted ? RATES_CHANGED : ''].filter(Boolean).join(' · ')];
      };

      sheetData.push(row('Body', bbMat?.material_name ?? 'N/A', bodyW, bbRate, bodyW != null ? bodyW * bbRate : null, bodyMach, bodyCost));
      sheetData.push(row('Bonnet', bbMat?.material_name ?? 'N/A', bonnetW, bbRate, bonnetW != null ? bonnetW * bbRate : null, bonnetMach, bonnetCost));
      sheetData.push(row('Plug', plugMat?.material_name ?? 'N/A', plugW, rateOf(plugMat), plugW != null ? plugW * rateOf(plugMat) : null, plugMach, plugCost));
      sheetData.push(row('Seat', seatMat?.material_name ?? 'N/A', seatW, rateOf(seatMat), seatW != null ? seatW * rateOf(seatMat) : null, seatMach, seatCost));
      sheetData.push(row('Stem', stemMat?.material_name ?? 'N/A', stemW, rateOf(stemMat), stemW != null ? stemW * rateOf(stemMat) : null, stemMach, stemCost));
      if (cageMat) {
        const cageRate = rateOf(cageMat);
        sheetData.push(row(`Cage (×${cageQty})`, cageMat.material_name, cageW != null ? cageW * cageQty : null, cageRate,
          cageW != null ? cageW * cageRate * cageQty : null, cageMach * cageQty, cageCost, `Qty ${cageQty} cage(s)`));
      }
      if (p.seal_ring_type || sealCost > 0) {
        sheetData.push(fixedRow('Seal Ring', p.seal_ring_type ?? 'N/A', sealPrice, sealCost, 'Fixed price'));
      }
      if (p.has_pilot_plug) {
        const ppRate = rateOf(plugMat);
        sheetData.push(row('Pilot Plug', plugMat?.material_name ?? 'N/A', pilotW, ppRate, pilotW != null ? pilotW * ppRate : null, 0, pilotCost, 'Plug material rate'));
      }
      if (p.has_actuator && actCost > 0) {
        sheetData.push(fixedRow('Actuator', act ? `${act.type} — ${act.model}` : 'N/A', act ? Number(act.fixed_price) : null, actCost, 'Bought-out'));
      }
      if (p.has_handwheel && hwCost > 0) {
        sheetData.push(fixedRow('Handwheel', hw ? `${hw.type} — ${hw.model}` : 'N/A', hw ? Number(hw.fixed_price) : null, hwCost, 'Bought-out'));
      }
      for (const t of pTesting as { item_name: string; price: number | string }[]) {
        sheetData.push(['Testing', t.item_name, '—', '—', '—', '—', Number(t.price), 'Fixed price · manufacturing cost']);
      }
      for (const t of pTubing as { item_name: string; price: number | string }[]) {
        sheetData.push(['Tubing / Fitting', t.item_name, '—', '—', '—', '—', Number(t.price), 'Fixed price · manufacturing cost']);
      }
      for (const a of pAcc as { item_name: string; unit_price: number | string; quantity: number }[]) {
        sheetData.push([`Accessory — ${a.item_name}`, `×${a.quantity}`, '—', '—', Number(a.unit_price), '—', Number(a.unit_price) * a.quantity, 'Bought-out']);
      }

      sheetData.push([]);
      // Exact values throughout — each step amount is the true difference
      // between two exact running totals, so the column adds up by definition.
      sheetData.push(['PRICING CHAIN', '', '', '', '', '', '(₹)']);
      sheetData.push(['Manufacturing Cost (body+bonnet+plug+seat+stem+cage+seal+pilot+testing+tubing+act+hw)', '', '', '', '', '', mfgCost]);
      sheetData.push([`Mfg Profit (${mfgProfitPct}% margin-on-price)`, '', '', '', '', '', mfgWithProfit - mfgCost]);
      sheetData.push(['Mfg Cost After Profit', '', '', '', '', '', mfgWithProfit]);
      sheetData.push(['Bought-out Cost (accessories)', '', '', '', '', '', boCost]);
      sheetData.push([`BO Profit (${boProfitPct}% margin-on-price)`, '', '', '', '', '', boWithProfit - boCost]);
      sheetData.push(['Unit Cost (Mfg + BO)', '', '', '', '', '', unitCost]);
      sheetData.push([`Negotiation Margin (${negMarginPct}%)`, '', '', '', '', '', afterNeg - unitCost]);
      sheetData.push(['After Negotiation Margin', '', '', '', '', '', afterNeg]);
      if (commPct > 0) {
        sheetData.push([`Agent Commission (${commPct}%)`, '', '', '', '', '', afterComm - afterNeg]);
        sheetData.push(['After Commission', '', '', '', '', '', afterComm]);
      }
      if (discPct > 0) {
        sheetData.push([`Discount (${discPct}%)`, '', '', '', '', '', afterDisc - afterComm]);
        sheetData.push(['After Discount', '', '', '', '', '', afterDisc]);
      }
      sheetData.push([]);
      sheetData.push([`⭐ UNIT PRICE (INR)`, '', '', '', '', '', quotedUnitPrice]);
      sheetData.push([`LINE TOTAL (×${qty} qty, INR)`, '', '', '', '', '', quotedLineTotal]);
      if (showUSD) {
        sheetData.push([`UNIT PRICE (USD @ ₹${exRate})`, '', '', '', '', '', convertToUSD(quotedUnitPrice, exRate)]);
        sheetData.push([`LINE TOTAL (USD @ ₹${exRate})`, '', '', '', '', '', convertToUSD(quotedLineTotal, exRate)]);
      }
      // Quotes priced under earlier rates or the old ₹10 rounding rule won't
      // reproduce from the chain above — say so instead of showing two
      // different "unit prices" with no explanation.
      if (Math.abs(recalculatedUnitPrice - quotedUnitPrice) > TOLERANCE) {
        sheetData.push([]);
        sheetData.push(['Recalculated unit price (from the chain above)', '', '', '', '', '', recalculatedUnitPrice]);
        sheetData.push(['Note: this quote was priced under earlier rates or rounding rules. The quoted unit price above is what the customer was offered.']);
      }

      const prodSheet = XLSX.utils.aoa_to_sheet(sheetData);
      prodSheet['!cols'] = [{ wch: 55 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 48 }];
      formatNumericCells(prodSheet, [2], WEIGHT_FMT);
      formatNumericCells(prodSheet, [3, 4, 5, 6], MONEY_FMT);
      const sheetName = safeSheetName(`P${i + 1}${p.tag_number ? '-' + String(p.tag_number).slice(0, 10) : ''}`);
      XLSX.utils.book_append_sheet(wb, prodSheet, sheetName);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = quote.quote_number.replace(/\//g, '-');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
