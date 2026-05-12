import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

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

    const [materialsRes, seriesRes, actuatorsRes, handwheelsRes, profileRes, machiningRes,
      bodyWRes, bonnetWRes, plugWRes, seatWRes, cageWRes, pilotWRes, sealPRes] = await Promise.all([
      materialIds.length > 0 ? supabase.from('materials').select('id,material_name,price_per_kg,material_group').in('id', materialIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('series').select('id,series_number,series_name').in('id', seriesIds) : { data: [] },
      actuatorIds.length > 0 ? supabase.from('actuator_models').select('id,type,model,fixed_price').in('id', actuatorIds) : { data: [] },
      handwheelIds.length > 0 ? supabase.from('handwheel_prices').select('id,type,model,fixed_price').in('id', handwheelIds) : { data: [] },
      supabase.from('profiles').select('full_name,designation,phone,email').eq('id', quote.created_by).single(),
      seriesIds.length > 0 ? supabase.from('machining_prices').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('body_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('bonnet_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('plug_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('seat_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('cage_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('pilot_plug_weights').select('*').in('series_id', seriesIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from('seal_ring_prices').select('*').in('series_id', seriesIds) : { data: [] },
    ]);

    const matMap: Record<string, { material_name: string; price_per_kg: number }> = Object.fromEntries((materialsRes.data ?? []).map((m: { id: string; material_name: string; price_per_kg: number }) => [m.id, m]));
    const seriesMap: Record<string, { series_number: string; series_name: string }> = Object.fromEntries((seriesRes.data ?? []).map((s: { id: string; series_number: string; series_name: string }) => [s.id, s]));
    const actMap: Record<string, { type: string; model: string; fixed_price: number }> = Object.fromEntries((actuatorsRes.data ?? []).map((a: { id: string; type: string; model: string; fixed_price: number }) => [a.id, a]));
    const hwMap: Record<string, { type: string; model: string; fixed_price: number }> = Object.fromEntries((handwheelsRes.data ?? []).map((h: { id: string; type: string; model: string; fixed_price: number }) => [h.id, h]));
    const machiningData: { component: string; series_id: string; size: string; rating: string; type_key: string; material_id: string; fixed_price: number }[] = machiningRes.data ?? [];
    const profile = profileRes.data;
    const customer = quote.customer as { name: string; company?: string; country: string; is_international: boolean; address?: string };

    const fw = (data: { series_id: string; size: string; rating: string; [k: string]: unknown }[], sid: string, sz: string, rt: string, ek?: string, ev?: string): number | null => {
      const m = data.find(w => w.series_id === sid && w.size === sz && w.rating === rt && (ek ? w[ek] === ev : true));
      return m ? Number(m.weight_kg) : null;
    };
    const fm = (comp: string, sid: string, sz: string, rt: string, tk: string, mid: string): number => {
      const m = machiningData.find(x => x.component === comp && x.series_id === sid && x.size === sz && x.rating === rt && x.type_key === tk && x.material_id === mid);
      return m ? Number(m.fixed_price) : 0;
    };
    const fSeal = (sid: string, stype: string, sz: string, rt: string): number => {
      const m = (sealPRes.data ?? []).find((s: { series_id: string; seal_type: string; size: string; rating: string; fixed_price: number }) => s.series_id === sid && s.seal_type === stype && s.size === sz && s.rating === rt);
      return m ? Number(m.fixed_price) : 0;
    };

    const applyMargin = (cost: number, pct: number) => (cost <= 0 || pct >= 100) ? cost : cost / (1 - pct / 100);
    const r10 = (v: number) => Math.ceil(v / 10) * 10;

    const isIntl = customer.is_international;
    const taxRate = isIntl ? 0 : 0.18;
    const subtotalProducts = productList.reduce((s, p) => s + Number(p.line_total_inr ?? 0), 0);
    const freight = quote.pricing_type === 'for-site' ? Number(quote.freight_price ?? 0) : 0;
    const packing = Number(quote.packing_price ?? 0);
    const customCharge = quote.pricing_type === 'custom' ? Number(quote.custom_pricing_price ?? 0) : 0;
    const taxable = subtotalProducts + freight + packing + customCharge;
    const taxAmount = taxable * taxRate;
    const grandTotal = taxable + taxAmount;

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Quote Summary ──
    const sumData: (string | number | null)[][] = [
      ['QUOTE SUMMARY'],
      [],
      ['Quote Number', quote.quote_number],
      ['Date', new Date(quote.created_at).toLocaleDateString('en-IN')],
      ['Customer', customer.name + (customer.company ? ` (${customer.company})` : '')],
      ['Country', customer.country],
      ['Currency', isIntl ? 'USD ($)' : 'INR (₹)'],
      ['Project', quote.project_name ?? ''],
      ['Enquiry Ref', quote.enquiry_id ?? ''],
      ['Pricing Mode', quote.pricing_mode ?? ''],
      ['Pricing Type', quote.pricing_type ?? ''],
      [],
      ['COMMERCIAL TERMS'],
      ['Validity', `${quote.validity_days} days`],
      ['Delivery', quote.delivery_text ?? ''],
      ['Payment – Advance', `${quote.payment_advance_pct}%`],
      ['Payment – On Approval', `${quote.payment_approval_pct}%`],
      ['Payment – On Despatch', `${quote.payment_despatch_pct}%`],
      ['Warranty (Shipment)', `${quote.warranty_shipment_months} months`],
      ['Warranty (Installation)', `${quote.warranty_installation_months} months`],
      [],
      ['PRICE SUMMARY'],
      ['Products Subtotal (INR)', subtotalProducts],
      ...(freight > 0 ? [['Freight (INR)', freight]] : []),
      ['Packing (INR)', packing],
      ...(quote.pricing_type === 'custom' && quote.custom_pricing_title ? [[quote.custom_pricing_title + ' (INR)', customCharge]] : []),
      ['Taxable Amount (INR)', taxable],
      ...(!isIntl ? [['GST 18% (INR)', taxAmount]] : []),
      ['GRAND TOTAL (INR)', grandTotal],
      ...(isIntl ? [['Exchange Rate', `1 USD = ₹${quote.exchange_rate_snapshot ?? 83.5}`], ['GRAND TOTAL (USD)', Math.round(grandTotal / Number(quote.exchange_rate_snapshot ?? 83.5))]] : []),
      [],
      ['Prepared By', profile?.full_name ?? ''],
      ['Phone', profile?.phone ?? ''],
      ['Email', profile?.email ?? ''],
    ] as (string | number | null)[][];

    const sumSheet = XLSX.utils.aoa_to_sheet(sumData);
    sumSheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
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
        'DISCOUNT %', 'COMM %'],
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
        Number(p.commission_pct ?? 0),
      ]);
    }
    const configSheet = XLSX.utils.aoa_to_sheet(configData);
    configSheet['!cols'] = Array(22).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, configSheet, 'Configuration');

    // ── One sheet per product ──
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

      const bbRate = bbMat ? Number(bbMat.price_per_kg) : 0;
      const cageQty = Number(p.cage_quantity ?? 1);

      // Weights
      const bodyW = fw(bodyWRes.data ?? [], p.series_id, p.size, p.rating, 'end_connect_type', p.end_connect_type);
      const bonnetW = fw(bonnetWRes.data ?? [], p.series_id, p.size, p.rating, 'bonnet_type', p.bonnet_type);
      const plugW = fw(plugWRes.data ?? [], p.series_id, p.size, p.rating);
      const seatW = fw(seatWRes.data ?? [], p.series_id, p.size, p.rating);
      const cageW = cageMat ? fw(cageWRes.data ?? [], p.series_id, p.size, p.rating) : null;
      const pilotW = p.has_pilot_plug ? fw(pilotWRes.data ?? [], p.series_id, p.size, p.rating) : null;

      // Machining
      const bodyMach = p.body_bonnet_material_id ? fm('body', p.series_id, p.size, p.rating, p.end_connect_type, p.body_bonnet_material_id) : 0;
      const bonnetMach = p.body_bonnet_material_id ? fm('bonnet', p.series_id, p.size, p.rating, p.bonnet_type, p.body_bonnet_material_id) : 0;
      const plugMach = p.plug_material_id ? fm('plug', p.series_id, p.size, p.rating, p.trim_type ?? '', p.plug_material_id) : 0;
      const seatMach = p.seat_material_id ? fm('seat', p.series_id, p.size, p.rating, p.trim_type ?? '', p.seat_material_id) : 0;
      const stemMach = p.stem_material_id ? fm('stem', p.series_id, p.size, p.rating, p.trim_type ?? '', p.stem_material_id) : 0;
      const cageMach = (cageMat && p.cage_material_id) ? fm('cage', p.series_id, p.size, p.rating, p.trim_type ?? '', p.cage_material_id) : 0;
      const sealPrice = p.seal_ring_type ? fSeal(p.series_id, p.seal_ring_type, p.size, p.rating) : 0;

      // Stored costs
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

      // Pricing chain
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
      const unitPrice = r10(afterDisc);
      const lineTotal = r10(unitPrice * qty);

      const INR = (v: number) => Math.round(v);
      const sheetData: (string | number | null)[][] = [
        [`PRODUCT ${i + 1} — COST BREAKDOWN`],
        [`Quote: ${quote.quote_number}  |  Customer: ${customer.name}`],
        [`Series: ${s?.series_number ?? ''} — ${s?.series_name ?? ''}  |  Tag: ${p.tag_number ?? 'N/A'}  |  Size: ${p.size}  |  Rating: ${p.rating}  |  End: ${p.end_connect_type}`],
        [],
        // Component table header
        ['COMPONENT', 'MATERIAL', 'WEIGHT (kg)', 'RATE (₹/kg)', 'MATERIAL COST (₹)', 'MACHINING COST (₹)', 'COMPONENT TOTAL (₹)', 'NOTES'],
      ];

      const row = (comp: string, mat: string, wt: number | null, rate: number, matCost: number | null, mach: number, total: number, note = '') =>
        [comp, mat, wt ?? '—', rate || '—', matCost != null ? INR(matCost) : '—', mach || '—', INR(total), note];

      sheetData.push(row('Body', bbMat?.material_name ?? 'N/A', bodyW, bbRate, bodyW != null ? bodyW * bbRate : null, bodyMach, bodyCost));
      sheetData.push(row('Bonnet', bbMat?.material_name ?? 'N/A', bonnetW, bbRate, bonnetW != null ? bonnetW * bbRate : null, bonnetMach, bonnetCost));
      sheetData.push(row('Plug', plugMat?.material_name ?? 'N/A', plugW, plugMat ? Number(plugMat.price_per_kg) : 0, plugW != null ? plugW * (plugMat ? Number(plugMat.price_per_kg) : 0) : null, plugMach, plugCost));
      sheetData.push(row('Seat', seatMat?.material_name ?? 'N/A', seatW, seatMat ? Number(seatMat.price_per_kg) : 0, seatW != null ? seatW * (seatMat ? Number(seatMat.price_per_kg) : 0) : null, seatMach, seatCost));
      sheetData.push(row('Stem', stemMat?.material_name ?? 'N/A', null, 0, null, stemMach, stemCost, 'Weight-based + machining'));
      if (cageMat) {
        const cageRate = Number(cageMat.price_per_kg);
        const cageMatCost = cageW != null ? cageW * cageRate * cageQty : null;
        sheetData.push(row(`Cage (×${cageQty})`, cageMat.material_name, cageW != null ? cageW * cageQty : null, cageRate, cageMatCost, cageMach * cageQty, cageCost, `Qty ${cageQty} cage(s)`));
      }
      if (sealPrice > 0 || sealCost > 0) {
        sheetData.push(['Seal Ring', p.seal_ring_type ?? 'N/A', '—', '—', INR(sealPrice || sealCost), '—', INR(sealCost), 'Fixed price']);
      }
      if (p.has_pilot_plug) {
        const ppRate = plugMat ? Number(plugMat.price_per_kg) : 0;
        sheetData.push(row('Pilot Plug', plugMat?.material_name ?? 'N/A', pilotW, ppRate, pilotW != null ? pilotW * ppRate : null, 0, pilotCost));
      }
      if (p.has_actuator && actCost > 0) {
        sheetData.push(['Actuator', act ? `${act.type} — ${act.model}` : 'N/A', '—', '—', '—', '—', INR(actCost), 'Bought-out']);
      }
      if (p.has_handwheel && hwCost > 0) {
        sheetData.push(['Handwheel', hw ? `${hw.type} — ${hw.model}` : 'N/A', '—', '—', '—', '—', INR(hwCost), 'Bought-out']);
      }
      for (const t of pTesting as { item_name: string; price: number | string }[]) {
        sheetData.push(['Testing', t.item_name, '—', '—', '—', '—', INR(Number(t.price)), 'Fixed price']);
      }
      for (const t of pTubing as { item_name: string; price: number | string }[]) {
        sheetData.push(['Tubing / Fitting', t.item_name, '—', '—', '—', '—', INR(Number(t.price)), 'Fixed price']);
      }
      for (const a of pAcc as { item_name: string; unit_price: number | string; quantity: number }[]) {
        sheetData.push([`Accessory — ${a.item_name}`, `×${a.quantity}`, '—', '—', INR(Number(a.unit_price)), '—', INR(Number(a.unit_price) * a.quantity), 'Bought-out']);
      }

      sheetData.push([]);
      sheetData.push(['PRICING CHAIN', '', '', '', '', '', '(₹)']);
      sheetData.push(['Manufacturing Cost (body+bonnet+plug+seat+stem+cage+seal+pilot+testing+tubing+act+hw)', '', '', '', '', '', INR(mfgCost)]);
      sheetData.push([`Mfg Profit (${mfgProfitPct}% margin-on-price)`, '', '', '', '', '', INR(mfgWithProfit - mfgCost)]);
      sheetData.push(['Mfg Cost After Profit', '', '', '', '', '', INR(mfgWithProfit)]);
      sheetData.push(['Bought-out Cost (accessories)', '', '', '', '', '', INR(boCost)]);
      sheetData.push([`BO Profit (${boProfitPct}% margin-on-price)`, '', '', '', '', '', INR(boWithProfit - boCost)]);
      sheetData.push(['Unit Cost (Mfg + BO)', '', '', '', '', '', INR(unitCost)]);
      sheetData.push([`Negotiation Margin (${negMarginPct}%)`, '', '', '', '', '', INR(afterNeg - unitCost)]);
      sheetData.push(['After Negotiation Margin', '', '', '', '', '', INR(afterNeg)]);
      if (commPct > 0) {
        sheetData.push([`Agent Commission (${commPct}%)`, '', '', '', '', '', INR(afterComm - afterNeg)]);
        sheetData.push(['After Commission', '', '', '', '', '', INR(afterComm)]);
      }
      if (discPct > 0) {
        sheetData.push([`Discount (${discPct}%)`, '', '', '', '', '', INR(afterDisc - afterComm)]);
        sheetData.push(['After Discount', '', '', '', '', '', INR(afterDisc)]);
      }
      sheetData.push([`⭐ UNIT PRICE (rounded to ₹10)`, '', '', '', '', '', unitPrice]);
      sheetData.push([`LINE TOTAL (×${qty} qty, rounded to ₹10)`, '', '', '', '', '', lineTotal]);

      const prodSheet = XLSX.utils.aoa_to_sheet(sheetData);
      prodSheet['!cols'] = [{ wch: 55 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 25 }];
      const sheetName = `P${i + 1}${p.tag_number ? '-' + String(p.tag_number).slice(0, 10) : ''}`;
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
