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

    // Verify user access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch quote with customer
    const { data: quote, error: quoteErr } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Fetch products with related data
    const { data: products } = await supabase
      .from('quote_products')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order');

    const productList = products ?? [];

    // Fetch tubing, testing, accessories for all products
    const productIds = productList.map(p => p.id);

    const [tubingRes, testingRes, accessoriesRes] = await Promise.all([
      productIds.length > 0
        ? supabase.from('product_tubing_items').select('*').in('quote_product_id', productIds)
        : { data: [] },
      productIds.length > 0
        ? supabase.from('product_testing_items').select('*').in('quote_product_id', productIds)
        : { data: [] },
      productIds.length > 0
        ? supabase.from('product_accessories').select('*').in('quote_product_id', productIds)
        : { data: [] },
    ]);

    const tubingItems = tubingRes.data ?? [];
    const testingItems = testingRes.data ?? [];
    const accessoryItems = accessoriesRes.data ?? [];

    // Fetch material names, series names, actuator/handwheel names
    const materialIds = [...new Set(productList.flatMap(p => [
      p.body_bonnet_material_id, p.plug_material_id, p.seat_material_id,
      p.stem_material_id, p.cage_material_id,
    ].filter(Boolean)))];

    const seriesIds = [...new Set(productList.map(p => p.series_id).filter(Boolean))];
    const actuatorIds = [...new Set(productList.map(p => p.actuator_model_id).filter(Boolean))];
    const handwheelIds = [...new Set(productList.map(p => p.handwheel_model_id).filter(Boolean))];

    const [materialsRes, seriesRes, actuatorsRes, handwheelsRes] = await Promise.all([
      materialIds.length > 0
        ? supabase.from('materials').select('id, material_name, price_per_kg, material_group').in('id', materialIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('series').select('id, series_number, series_name').in('id', seriesIds)
        : { data: [] },
      actuatorIds.length > 0
        ? supabase.from('actuator_models').select('id, type, model, fixed_price').in('id', actuatorIds)
        : { data: [] },
      handwheelIds.length > 0
        ? supabase.from('handwheel_prices').select('id, type, model, fixed_price').in('id', handwheelIds)
        : { data: [] },
    ]);

    const matMap = Object.fromEntries((materialsRes.data ?? []).map(m => [m.id, m]));
    const seriesMap = Object.fromEntries((seriesRes.data ?? []).map(s => [s.id, s]));
    const actMap = Object.fromEntries((actuatorsRes.data ?? []).map(a => [a.id, a]));
    const hwMap = Object.fromEntries((handwheelsRes.data ?? []).map(h => [h.id, h]));

    // ── Fetch weight & machining data for detailed breakdown ──
    // Body weights, bonnet weights, plug weights, seat weights, cage weights, pilot plug weights
    const [bodyWRes, bonnetWRes, plugWRes, seatWRes, cageWRes, pilotWRes, stemPRes, sealPRes] = await Promise.all([
      seriesIds.length > 0
        ? supabase.from('body_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('bonnet_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('plug_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('seat_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('cage_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('pilot_plug_weights').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('stem_fixed_prices').select('*').in('series_id', seriesIds)
        : { data: [] },
      seriesIds.length > 0
        ? supabase.from('seal_ring_prices').select('*').in('series_id', seriesIds)
        : { data: [] },
    ]);

    // Fetch machining prices
    const machiningRes = seriesIds.length > 0
      ? await supabase.from('machining_prices').select('*').in('series_id', seriesIds)
      : { data: [] };
    const machiningData = machiningRes.data ?? [];

    // Helper: find weight for a given component
    function findWeight(
      weightData: any[],
      seriesId: string, size: string, rating: string, extraKey?: string, extraVal?: string
    ): number | null {
      const match = weightData.find(w =>
        w.series_id === seriesId && w.size === size && w.rating === rating &&
        (extraKey ? w[extraKey] === extraVal : true)
      );
      return match ? Number(match.weight_kg) : null;
    }

    // Helper: find machining price for a component
    function findMachining(
      component: string, seriesId: string, size: string, rating: string,
      typeKey: string, materialId: string
    ): number {
      const match = machiningData.find(m =>
        m.component === component && m.series_id === seriesId &&
        m.size === size && m.rating === rating &&
        m.type_key === typeKey && m.material_id === materialId
      );
      return match ? Number(match.fixed_price) : 0;
    }

    // Helper: find stem fixed price
    function findStemPrice(seriesId: string, size: string, rating: string, materialId: string): number {
      const stemData = stemPRes.data ?? [];
      const match = stemData.find((s: any) =>
        s.series_id === seriesId && s.size === size && s.rating === rating && s.material_id === materialId
      );
      return match ? Number(match.fixed_price) : 0;
    }

    // Helper: find seal ring price
    function findSealPrice(seriesId: string, sealType: string, size: string, rating: string): number {
      const sealData = sealPRes.data ?? [];
      const match = sealData.find((s: any) =>
        s.series_id === seriesId && s.seal_type === sealType && s.size === size && s.rating === rating
      );
      return match ? Number(match.fixed_price) : 0;
    }

    const customer = quote.customer as {
      name: string; company?: string; country: string; is_international: boolean;
    };

    // ============================================================
    // Sheet 1: Configuration
    // ============================================================
    const configData: (string | number | null)[][] = [];

    configData.push(['Customer Name', customer.name + (customer.company ? ` (${customer.company})` : '')]);
    configData.push(['Enquiry Ref', quote.enquiry_id ?? '']);
    configData.push(['Project', quote.project_name ?? '']);
    configData.push(['Unicorn Ref', quote.quote_number]);
    configData.push([]); // blank row 5
    configData.push([]); // blank row 6

    // Column headers (row 7)
    const configHeaders = [
      '', 'ITEM', 'TAG#', 'QTY', 'MODEL', 'SIZE', 'RATING', 'END CONNECTIONS',
      'BODY MATERIAL', 'BONNET TYPE', 'TRIM TYPE', 'NO. OF CAGES', 'SEAL TYPE',
      'SEAT MATERIAL', 'PLUG MATERIAL', 'STEM MATERIAL', 'CAGE MATERIAL',
      'PILOT PLUG', 'ACTUATOR', 'MODEL', 'HANDWHEEL',
      'REV', 'By', 'DATE',
    ];
    configData.push(configHeaders);

    // Product rows
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', quote.created_by)
      .single();
    const creatorName = profile?.full_name ?? 'Unknown';

    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const s = seriesMap[p.series_id];
      const bbMat = matMap[p.body_bonnet_material_id];
      const seatMat = matMap[p.seat_material_id];
      const plugMat = matMap[p.plug_material_id];
      const stemMat = matMap[p.stem_material_id];
      const cageMat = matMap[p.cage_material_id];
      const act = p.actuator_model_id ? actMap[p.actuator_model_id] : null;
      const hw = p.handwheel_model_id ? hwMap[p.handwheel_model_id] : null;

      configData.push([
        '', // A
        i + 1, // ITEM
        p.tag_number ?? '', // TAG#
        p.quantity, // QTY
        s?.series_number ?? '', // MODEL
        p.size, // SIZE
        p.rating, // RATING
        p.end_connect_type, // END CONNECTIONS
        bbMat?.material_name ?? 'N/A', // BODY MATERIAL
        p.bonnet_type, // BONNET TYPE
        p.trim_type ?? '', // TRIM TYPE
        p.cage_material_id ? '1 CAGE' : 'N/A', // NO. OF CAGES
        p.seal_ring_type ?? 'N/A', // SEAL TYPE
        seatMat?.material_name ?? 'N/A', // SEAT MATERIAL
        plugMat?.material_name ?? 'N/A', // PLUG MATERIAL
        stemMat?.material_name ?? 'N/A', // STEM MATERIAL
        cageMat?.material_name ?? 'N/A', // CAGE MATERIAL
        p.has_pilot_plug ? 'YES' : 'NO PILOT PLUG', // PILOT PLUG
        act ? act.type : (p.has_actuator ? 'Yes' : 'No'), // ACTUATOR
        act ? act.model : '', // MODEL
        hw ? `${hw.type} - ${hw.model}` : (p.has_handwheel ? 'Yes' : 'No'), // HANDWHEEL
        0, // REV
        creatorName, // By
        new Date(quote.created_at).getTime(), // DATE
      ]);
    }

    const configSheet = XLSX.utils.aoa_to_sheet(configData);
    configSheet['!cols'] = configHeaders.map((_, i) => ({ wch: i === 0 ? 3 : 18 }));

    // ============================================================
    // Sheet 2: Cost Breakdown (with detailed weight/rate/machining)
    // ============================================================
    const costData: (string | number | null)[][] = [];

    costData.push([`COST BREAKDOWN - ${quote.quote_number}`]);
    costData.push([`Customer: ${customer.name}${customer.company ? ` (${customer.company})` : ''}`]);
    costData.push([]); // blank row

    // Headers
    costData.push([
      'ITEM', 'TAG#', 'COMPONENT', 'MATERIAL', 'WEIGHT (kg)',
      'RATE (₹/kg)', 'MATERIAL COST (₹)', 'MACHINING COST (₹)', 'TOTAL COST (₹)',
    ]);

    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const item = i + 1;
      const tag = p.tag_number ?? '';
      const bbMat = matMap[p.body_bonnet_material_id];
      const plugMat = matMap[p.plug_material_id];
      const seatMat = matMap[p.seat_material_id];
      const stemMat = matMap[p.stem_material_id];
      const cageMat = matMap[p.cage_material_id];
      const act = p.actuator_model_id ? actMap[p.actuator_model_id] : null;
      const hw = p.handwheel_model_id ? hwMap[p.handwheel_model_id] : null;

      // Get tubing/testing/accessories for this product
      const pTubing = tubingItems.filter(t => t.quote_product_id === p.id);
      const pTesting = testingItems.filter(t => t.quote_product_id === p.id);
      const pAccessories = accessoryItems.filter(a => a.quote_product_id === p.id);

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
      const tubingTotal = pTubing.reduce((s, t) => s + Number(t.price), 0);
      const testingTotal = pTesting.reduce((s, t) => s + Number(t.price), 0);
      const accessoriesTotal = pAccessories.reduce((s, a) => s + Number(a.unit_price) * a.quantity, 0);

      // ── Look up weights and machining for each component ──
      const bbRate = bbMat ? Number(bbMat.price_per_kg) : 0;

      // Body
      const bodyWeight = findWeight(bodyWRes.data ?? [], p.series_id, p.size, p.rating, 'end_connect_type', p.end_connect_type);
      const bodyMachining = p.body_bonnet_material_id
        ? findMachining('body', p.series_id, p.size, p.rating, p.end_connect_type, p.body_bonnet_material_id) : 0;
      const bodyMatCost = bodyWeight !== null ? bodyWeight * bbRate : null;
      costData.push([item, tag, 'Body', bbMat?.material_name ?? 'N/A',
        bodyWeight ?? '-', bodyWeight !== null ? bbRate : '-',
        bodyMatCost ?? '-', bodyMachining || '-', bodyCost]);

      // Bonnet
      const bonnetWeight = findWeight(bonnetWRes.data ?? [], p.series_id, p.size, p.rating, 'bonnet_type', p.bonnet_type);
      const bonnetMachining = p.body_bonnet_material_id
        ? findMachining('bonnet', p.series_id, p.size, p.rating, p.bonnet_type, p.body_bonnet_material_id) : 0;
      const bonnetMatCost = bonnetWeight !== null ? bonnetWeight * bbRate : null;
      costData.push([item, tag, 'Bonnet', bbMat?.material_name ?? 'N/A',
        bonnetWeight ?? '-', bonnetWeight !== null ? bbRate : '-',
        bonnetMatCost ?? '-', bonnetMachining || '-', bonnetCost]);

      // Plug
      const plugRate = plugMat ? Number(plugMat.price_per_kg) : 0;
      const plugWeight = findWeight(plugWRes.data ?? [], p.series_id, p.size, p.rating);
      const plugMachining = p.plug_material_id
        ? findMachining('plug', p.series_id, p.size, p.rating, p.trim_type ?? '', p.plug_material_id) : 0;
      const plugMatCost = plugWeight !== null ? plugWeight * plugRate : null;
      costData.push([item, tag, 'Plug', plugMat?.material_name ?? 'N/A',
        plugWeight ?? '-', plugWeight !== null ? plugRate : '-',
        plugMatCost ?? '-', plugMachining || '-', plugCost]);

      // Seat
      const seatRate = seatMat ? Number(seatMat.price_per_kg) : 0;
      const seatWeight = findWeight(seatWRes.data ?? [], p.series_id, p.size, p.rating);
      const seatMachining = p.seat_material_id
        ? findMachining('seat', p.series_id, p.size, p.rating, '', p.seat_material_id) : 0;
      const seatMatCost = seatWeight !== null ? seatWeight * seatRate : null;
      costData.push([item, tag, 'Seat', seatMat?.material_name ?? 'N/A',
        seatWeight ?? '-', seatWeight !== null ? seatRate : '-',
        seatMatCost ?? '-', seatMachining || '-', seatCost]);

      // Stem (fixed price, no weight)
      const stemFixedPrice = p.stem_material_id
        ? findStemPrice(p.series_id, p.size, p.rating, p.stem_material_id) : 0;
      const stemMachining = p.stem_material_id
        ? findMachining('stem', p.series_id, p.size, p.rating, '', p.stem_material_id) : 0;
      costData.push([item, tag, 'Stem', stemMat?.material_name ?? 'N/A',
        '-', '-', stemFixedPrice || stemCost, stemMachining || '-', stemCost]);

      // Cage
      if (cageMat) {
        const cageRate = Number(cageMat.price_per_kg);
        const cageWeight = findWeight(cageWRes.data ?? [], p.series_id, p.size, p.rating);
        const cageMachining = findMachining('cage', p.series_id, p.size, p.rating, '', p.cage_material_id);
        const cageMatCost = cageWeight !== null ? cageWeight * cageRate : null;
        costData.push([item, tag, 'Cage', cageMat.material_name,
          cageWeight ?? '-', cageWeight !== null ? cageRate : '-',
          cageMatCost ?? '-', cageMachining || '-', cageCost]);
      }

      // Seal Ring (fixed price)
      if (sealCost > 0) {
        costData.push([item, tag, 'Seal Ring', p.seal_ring_type ?? 'N/A',
          '-', '-', sealCost, '-', sealCost]);
      }

      // Pilot Plug
      if (p.has_pilot_plug && pilotCost > 0) {
        const ppWeight = findWeight(pilotWRes.data ?? [], p.series_id, p.size, p.rating);
        const ppRate = plugMat ? Number(plugMat.price_per_kg) : 0;
        const ppMatCost = ppWeight !== null ? ppWeight * ppRate : null;
        costData.push([item, tag, 'Pilot Plug', plugMat?.material_name ?? 'N/A',
          ppWeight ?? '-', ppWeight !== null ? ppRate : '-',
          ppMatCost ?? '-', '-', pilotCost]);
      }

      // Actuator (bought-out, fixed price)
      if (p.has_actuator && actCost > 0) {
        costData.push([item, tag, 'Actuator', act ? `${act.type} - ${act.model}` : 'N/A',
          '-', '-', actCost, '-', actCost]);
      }

      // Handwheel (bought-out, fixed price)
      if (p.has_handwheel && hwCost > 0) {
        costData.push([item, tag, 'Handwheel', hw ? `${hw.type} - ${hw.model}` : 'N/A',
          '-', '-', hwCost, '-', hwCost]);
      }

      // Testing items
      for (const t of pTesting) {
        costData.push([item, tag, 'Testing', t.item_name, '-', '-', Number(t.price), '-', Number(t.price)]);
      }

      // Tubing items
      for (const t of pTubing) {
        costData.push([item, tag, 'Tubing/Fitting', t.item_name, '-', '-', Number(t.price), '-', Number(t.price)]);
      }

      // Accessories
      for (const a of pAccessories) {
        const lineAmt = Number(a.unit_price) * a.quantity;
        costData.push([item, tag, 'Accessory', `${a.item_name} x${a.quantity}`, '-', '-', lineAmt, '-', lineAmt]);
      }

      costData.push([]); // blank row

      // Subtotals
      const bodySubAssembly = bodyCost + bonnetCost + plugCost + seatCost + stemCost + cageCost + sealCost + pilotCost;

      costData.push([item, tag, 'SUBTOTALS', '', '', '', '', '', '']);
      costData.push(['', '', 'Body Sub-Assembly Total', '', '', '', '', '', bodySubAssembly]);
      costData.push(['', '', 'Actuator Sub-Assembly Total', '', '', '', '', '', actCost + hwCost]);
      costData.push(['', '', 'Testing Total', '', '', '', '', '', testingTotal]);
      costData.push(['', '', 'Tubing & Fitting Total', '', '', '', '', '', tubingTotal]);
      costData.push(['', '', 'Accessories Total', '', '', '', '', '', accessoriesTotal]);
      costData.push([]); // blank

      // Pricing Breakdown
      const mfgTotal = Number(p.mfg_total_cost ?? 0);
      const boTotal = Number(p.bo_total_cost ?? 0);
      const mfgProfitPct = Number(p.mfg_profit_pct);
      const boProfitPct = Number(p.bo_profit_pct);
      const negMarginPct = Number(p.neg_margin_pct);
      const unitPrice = Number(p.unit_price_inr ?? 0);
      const lineTotal = Number(p.line_total_inr ?? 0);

      // Recalculate pricing steps for display
      const mfgCostWithProfit = mfgProfitPct >= 100 ? mfgTotal : mfgTotal / (1 - mfgProfitPct / 100);
      const boCostWithProfit = boTotal === 0 ? 0 : (boProfitPct >= 100 ? boTotal : boTotal / (1 - boProfitPct / 100));
      const unitCost = mfgCostWithProfit + boCostWithProfit;
      const afterNegMargin = negMarginPct >= 100 ? unitCost : unitCost / (1 - negMarginPct / 100);

      costData.push([item, tag, '=== PRICING BREAKDOWN ===', '', '', '', '', '', '']);
      costData.push(['', '', '1. BASE COSTS (Before Profits)', '', '', '', '', '', '']);
      costData.push(['', '', '   Manufacturing Items (Body+Testing)', '', '', '', '', '', mfgTotal]);
      costData.push(['', '', '   Bought-out Items (Actuator+Tubing+Acc)', '', '', '', '', '', boTotal]);
      costData.push(['', '', '   TOTAL BASE COST', '', '', '', '', '', mfgTotal + boTotal]);
      costData.push([]); // blank

      costData.push(['', '', '2. AFTER MANUFACTURING PROFIT', '', '', '', '', '', '']);
      costData.push(['', '', `   Manufacturing Profit (${mfgProfitPct}% on ₹${mfgTotal.toLocaleString('en-IN')})`, '', '', '', '', '', `+ ₹${(mfgCostWithProfit - mfgTotal).toLocaleString('en-IN', { maximumFractionDigits: 3 })}`]);
      costData.push(['', '', '   Cost After Mfg Profit', '', '', '', '', '', mfgCostWithProfit]);
      costData.push([]); // blank

      costData.push(['', '', '3. AFTER BOUGHT-OUT PROFIT', '', '', '', '', '', '']);
      costData.push(['', '', `   Bought-out Profit (${boProfitPct}% on ₹${boTotal.toLocaleString('en-IN')})`, '', '', '', '', '', `+ ₹${(boCostWithProfit - boTotal).toLocaleString('en-IN', { maximumFractionDigits: 3 })}`]);
      costData.push(['', '', '   Cost After All Profits', '', '', '', '', '', unitCost]);
      costData.push([]); // blank

      costData.push(['', '', '4. AFTER NEGOTIATION MARGIN', '', '', '', '', '', '']);
      costData.push(['', '', `   Negotiation Margin (${negMarginPct}%)`, '', '', '', '', '', `+ ₹${(afterNegMargin - unitCost).toLocaleString('en-IN', { maximumFractionDigits: 3 })}`]);
      costData.push(['', '', '   ⭐ FINAL UNIT COST', '', '', '', '', '', unitPrice]);
      costData.push([]); // blank
      costData.push(['', '', `5. LINE TOTAL (Unit Cost × ${p.quantity} qty)`, '', '', '', '', '', lineTotal]);

      costData.push([]); // blank separator between products
    }

    // Grand Total
    const grandTotal = productList.reduce((s, p) => s + Number(p.line_total_inr ?? 0), 0);
    costData.push([]); // blank
    costData.push(['', '', '🏆 GRAND TOTAL (All Products)', '', '', '', '', '', grandTotal]);

    const costSheet = XLSX.utils.aoa_to_sheet(costData);
    costSheet['!cols'] = [
      { wch: 6 }, { wch: 8 }, { wch: 42 }, { wch: 22 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];

    // Build workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, configSheet, 'Configuration');
    XLSX.utils.book_append_sheet(wb, costSheet, 'Cost Breakdown');

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
