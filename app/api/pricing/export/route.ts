import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// ====================================================
// Export all pricing data as a downloadable .xlsx
// Series ID columns are resolved to human-readable Series Numbers
// ====================================================

// Sheets that have a 'series_id' column needing resolution
const SERIES_RESOLVE_TABLES = [
  'body_weights', 'bonnet_weights', 'plug_weights', 'seat_weights',
  'cage_weights', 'seal_ring_prices', 'stem_weights', 'pilot_plug_weights',
  'testing_presets', 'tubing_presets',
];

const SHEET_CONFIG: Array<{
  sheetName: string;
  table: string;
  columns: Array<{ header: string; dbColumn: string }>;
}> = [
  {
    sheetName: 'Materials', table: 'materials',
    columns: [
      { header: 'Material Name', dbColumn: 'material_name' },
      { header: 'Material Group', dbColumn: 'material_group' },
      { header: 'Price Per Kg (INR)', dbColumn: 'price_per_kg' },
    ],
  },
  {
    sheetName: 'Series', table: 'series',
    columns: [
      { header: 'Series Number', dbColumn: 'series_number' },
      { header: 'Series Name', dbColumn: 'series_name' },
      { header: 'Product Type', dbColumn: 'product_type' },
      { header: 'Has Cage', dbColumn: 'has_cage' },
      { header: 'Has Seal Ring', dbColumn: 'has_seal_ring' },
    ],
  },
  {
    sheetName: 'Body Weights', table: 'body_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'End Connect Type', dbColumn: 'end_connect_type' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Bonnet Weights', table: 'bonnet_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Bonnet Type', dbColumn: 'bonnet_type' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Plug Weights', table: 'plug_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Seat Weights', table: 'seat_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Cage Weights', table: 'cage_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Seal Ring Prices', table: 'seal_ring_prices',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Seal Type', dbColumn: 'seal_type' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Fixed Price (INR)', dbColumn: 'fixed_price' },
    ],
  },
  {
    sheetName: 'Stem Weights', table: 'stem_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Actuator Models', table: 'actuator_models',
    columns: [
      { header: 'Type', dbColumn: 'type' },
      { header: 'Series', dbColumn: 'series' },
      { header: 'Model', dbColumn: 'model' },
      { header: 'Standard/Special', dbColumn: 'standard_special' },
      { header: 'Fixed Price (INR)', dbColumn: 'fixed_price' },
    ],
  },
  {
    sheetName: 'Handwheel Prices', table: 'handwheel_prices',
    columns: [
      { header: 'Type', dbColumn: 'type' },
      { header: 'Series', dbColumn: 'series' },
      { header: 'Model', dbColumn: 'model' },
      { header: 'Standard/Special', dbColumn: 'standard_special' },
      { header: 'Fixed Price (INR)', dbColumn: 'fixed_price' },
    ],
  },
  {
    sheetName: 'Pilot Plug Weights', table: 'pilot_plug_weights',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Weight (kg)', dbColumn: 'weight_kg' },
    ],
  },
  {
    sheetName: 'Testing Presets', table: 'testing_presets',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Test Name', dbColumn: 'test_name' },
      { header: 'Price (INR)', dbColumn: 'price' },
    ],
  },
  {
    sheetName: 'Tubing Presets', table: 'tubing_presets',
    columns: [
      { header: 'Series Number', dbColumn: 'series_id' },
      { header: 'Size', dbColumn: 'size' },
      { header: 'Rating', dbColumn: 'rating' },
      { header: 'Item Name', dbColumn: 'item_name' },
      { header: 'Price (INR)', dbColumn: 'price' },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Build series UUID → number lookup
    const { data: allSeries } = await supabase.from('series').select('id, series_number');
    const seriesMap = new Map<string, string>();
    (allSeries ?? []).forEach((s: { id: string; series_number: string }) => seriesMap.set(s.id, s.series_number));

    // Build workbook
    const wb = XLSX.utils.book_new();

    for (const config of SHEET_CONFIG) {
      const { data: rows } = await supabase
        .from(config.table)
        .select('*')
        .eq('is_active', true)
        .limit(5000);

      // Map to expected column headers, resolving series_id → series_number
      const needsResolve = SERIES_RESOLVE_TABLES.includes(config.table);
      const sheetData = (rows ?? []).map((row: Record<string, unknown>) => {
        const mapped: Record<string, unknown> = {};
        for (const col of config.columns) {
          if (col.dbColumn === 'series_id' && needsResolve) {
            // Resolve UUID to series number
            mapped[col.header] = seriesMap.get(row[col.dbColumn] as string) ?? row[col.dbColumn];
          } else {
            mapped[col.header] = row[col.dbColumn];
          }
        }
        return mapped;
      });

      const ws = XLSX.utils.json_to_sheet(sheetData, { header: config.columns.map(c => c.header) });

      // Auto-width columns
      ws['!cols'] = config.columns.map(col => ({
        wch: Math.max(col.header.length + 2, 15),
      }));

      XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
    }

    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pricing-data-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
