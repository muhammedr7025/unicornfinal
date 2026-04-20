import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// ====================================================
// Sheet name → table name mapping + column definitions
// Supports both "Series ID" and "Series Number" headers
// (auto-resolved to UUID either way)
// ====================================================
type ColType = 'string' | 'number' | 'boolean';
interface ColDef {
  headers: string[];   // Accepted header names (first match wins)
  dbColumn: string;
  type: ColType;
  required?: boolean;
}
interface SheetDef {
  table: string;
  columns: ColDef[];
  resolveSeriesColumn?: string; // DB column that needs series_number → UUID resolution
}

const SHEET_MAP: Record<string, SheetDef> = {
  'Materials': {
    table: 'materials',
    columns: [
      { headers: ['Material Name'], dbColumn: 'material_name', type: 'string', required: true },
      { headers: ['Material Group'], dbColumn: 'material_group', type: 'string', required: true },
      { headers: ['Price Per Kg (INR)'], dbColumn: 'price_per_kg', type: 'number', required: true },
    ],
  },
  'Series': {
    table: 'series',
    columns: [
      { headers: ['Series Number'], dbColumn: 'series_number', type: 'string', required: true },
      { headers: ['Series Name'], dbColumn: 'series_name', type: 'string', required: true },
      { headers: ['Product Type'], dbColumn: 'product_type', type: 'string', required: true },
      { headers: ['Has Cage'], dbColumn: 'has_cage', type: 'boolean' },
      { headers: ['Has Seal Ring'], dbColumn: 'has_seal_ring', type: 'boolean' },
    ],
  },
  'Body Weights': {
    table: 'body_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['End Connect Type'], dbColumn: 'end_connect_type', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Bonnet Weights': {
    table: 'bonnet_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Bonnet Type'], dbColumn: 'bonnet_type', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Plug Weights': {
    table: 'plug_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Seat Weights': {
    table: 'seat_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Cage Weights': {
    table: 'cage_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Seal Ring Prices': {
    table: 'seal_ring_prices',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Seal Type'], dbColumn: 'seal_type', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Fixed Price (INR)'], dbColumn: 'fixed_price', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Stem Weights': {
    table: 'stem_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Actuator Models': {
    table: 'actuator_models',
    columns: [
      { headers: ['Type'], dbColumn: 'type', type: 'string', required: true },
      { headers: ['Series'], dbColumn: 'series', type: 'string', required: true },
      { headers: ['Model', 'Model Name'], dbColumn: 'model', type: 'string', required: true },
      { headers: ['Standard/Special'], dbColumn: 'standard_special', type: 'string' },
      { headers: ['Fixed Price (INR)'], dbColumn: 'fixed_price', type: 'number', required: true },
    ],
  },
  'Handwheel Prices': {
    table: 'handwheel_prices',
    columns: [
      { headers: ['Type'], dbColumn: 'type', type: 'string', required: true },
      { headers: ['Series'], dbColumn: 'series', type: 'string', required: true },
      { headers: ['Model', 'Model Name'], dbColumn: 'model', type: 'string', required: true },
      { headers: ['Standard/Special'], dbColumn: 'standard_special', type: 'string' },
      { headers: ['Fixed Price (INR)'], dbColumn: 'fixed_price', type: 'number', required: true },
    ],
  },
  'Pilot Plug Weights': {
    table: 'pilot_plug_weights',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Weight (kg)'], dbColumn: 'weight_kg', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Testing Presets': {
    table: 'testing_presets',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Test Name', 'Item Name'], dbColumn: 'test_name', type: 'string', required: true },
      { headers: ['Price (INR)'], dbColumn: 'price', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
  'Tubing Presets': {
    table: 'tubing_presets',
    columns: [
      { headers: ['Series Number', 'Series ID'], dbColumn: 'series_id', type: 'string', required: true },
      { headers: ['Size'], dbColumn: 'size', type: 'string', required: true },
      { headers: ['Rating'], dbColumn: 'rating', type: 'string', required: true },
      { headers: ['Item Name'], dbColumn: 'item_name', type: 'string', required: true },
      { headers: ['Price (INR)'], dbColumn: 'price', type: 'number', required: true },
    ],
    resolveSeriesColumn: 'series_id',
  },
};

/** Find the matching header value from Excel row using alias list */
function findValue(raw: Record<string, unknown>, headerAliases: string[]): unknown {
  for (const h of headerAliases) {
    if (raw[h] !== undefined) return raw[h];
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const errors: Array<{ sheet: string; row: number; column: string; error: string }> = [];
    const sheetResults: Array<{ sheet: string; rowCount: number }> = [];

    // Use service role client for writes (bypass RLS)
    const serviceClient = createServiceClient();

    // ---- Build lookup cache for series ----
    const { data: allSeries } = await serviceClient.from('series').select('id, series_number');
    const seriesMap = new Map<string, string>();
    (allSeries ?? []).forEach((s: { id: string; series_number: string }) =>
      seriesMap.set(String(s.series_number).trim().toLowerCase(), s.id)
    );

    // Process 'Series' and 'Materials' sheets FIRST (referenced by other sheets)
    const orderedSheets = Object.entries(SHEET_MAP).sort(([a], [b]) => {
      const priority = ['Series', 'Materials'];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai >= 0 && bi < 0) return -1;
      if (ai < 0 && bi >= 0) return 1;
      return 0;
    });

    for (const [sheetName, config] of orderedSheets) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue; // Skip missing sheets silently

      const jsonData: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(ws);
      if (jsonData.length === 0) continue;

      // Validate and transform rows
      const rows: Array<Record<string, unknown>> = [];
      for (let r = 0; r < jsonData.length; r++) {
        const raw = jsonData[r];
        const row: Record<string, unknown> = {};
        let rowValid = true;

        for (const col of config.columns) {
          const val = findValue(raw, col.headers);

          if (col.required && (val === undefined || val === null || val === '')) {
            errors.push({ sheet: sheetName, row: r + 2, column: col.headers[0], error: 'Required field missing' });
            rowValid = false;
            continue;
          }

          if (val === undefined || val === null || val === '') {
            row[col.dbColumn] = col.type === 'boolean' ? false : null;
            continue;
          }

          if (col.type === 'number') {
            const num = Number(val);
            if (isNaN(num)) {
              errors.push({ sheet: sheetName, row: r + 2, column: col.headers[0], error: `Expected number, got "${val}"` });
              rowValid = false;
            } else {
              row[col.dbColumn] = num;
            }
          } else if (col.type === 'boolean') {
            row[col.dbColumn] = val === true || val === 'true' || val === 'TRUE' || val === 1 || val === 'Yes' || val === 'yes';
          } else {
            row[col.dbColumn] = String(val).trim();
          }
        }

        // ---- Resolve series number/name to UUID ----
        if (rowValid && config.resolveSeriesColumn) {
          const seriesVal = String(row[config.resolveSeriesColumn] ?? '').trim().toLowerCase();
          if (seriesVal) {
            const uuid = seriesMap.get(seriesVal);
            if (uuid) {
              row[config.resolveSeriesColumn] = uuid;
            } else {
              errors.push({
                sheet: sheetName,
                row: r + 2,
                column: 'Series',
                error: `Series "${raw['Series ID'] ?? raw['Series Number'] ?? seriesVal}" not found. Make sure the Series sheet is included and uploaded first.`,
              });
              rowValid = false;
            }
          }
        }

        if (rowValid) rows.push(row);
      }

      if (rows.length === 0) continue;

      // Delete existing data and insert new
      const { error: delErr } = await serviceClient.from(config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) {
        errors.push({ sheet: sheetName, row: 0, column: '-', error: `Failed to clear table: ${delErr.message}` });
        continue;
      }

      // Batch insert (500 at a time)
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error: insErr } = await serviceClient.from(config.table).insert(batch);
        if (insErr) {
          errors.push({ sheet: sheetName, row: 0, column: '-', error: `Insert failed: ${insErr.message}` });
        }
      }

      sheetResults.push({ sheet: sheetName, rowCount: rows.length });

      // If we just uploaded Series, rebuild the lookup cache
      if (sheetName === 'Series') {
        const { data: updatedSeries } = await serviceClient.from('series').select('id, series_number');
        seriesMap.clear();
        (updatedSeries ?? []).forEach((s: { id: string; series_number: string }) =>
          seriesMap.set(String(s.series_number).trim().toLowerCase(), s.id)
        );
      }
    }

    if (errors.length > 0 && sheetResults.length === 0) {
      return NextResponse.json({ error: 'Upload failed — all sheets had errors', details: errors }, { status: 400 });
    }

    return NextResponse.json({
      message: `Uploaded ${sheetResults.length} sheets: ${sheetResults.map(s => `${s.sheet} (${s.rowCount})`).join(', ')}`,
      sheets: sheetResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload processing failed' }, { status: 500 });
  }
}
