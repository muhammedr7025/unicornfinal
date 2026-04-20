import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// ====================================================
// Bulk upload machining prices from Excel
// ====================================================

const VALID_COMPONENTS = ['body', 'bonnet', 'plug', 'seat', 'stem', 'cage'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find the first sheet (single-sheet workbook)
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: 'No sheets in workbook' }, { status: 400 });
    const ws = workbook.Sheets[sheetName];
    const jsonData: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(ws);

    if (jsonData.length === 0) return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 });

    // Look up series and materials for name→ID resolution
    const [seriesRes, matRes] = await Promise.all([
      supabase.from('series').select('id, series_number').eq('is_active', true),
      supabase.from('materials').select('id, material_name').eq('is_active', true),
    ]);
    const seriesMap = new Map((seriesRes.data ?? []).map(s => [s.series_number, s.id]));
    const matMap = new Map((matRes.data ?? []).map(m => [m.material_name, m.id]));

    const errors: Array<{ row: number; column: string; error: string }> = [];
    const rows: Array<Record<string, unknown>> = [];

    for (let r = 0; r < jsonData.length; r++) {
      const raw = jsonData[r];
      const rowNum = r + 2; // header is row 1

      // Component
      const comp = String(raw['Component'] ?? '').toLowerCase().trim();
      if (!VALID_COMPONENTS.includes(comp)) {
        errors.push({ row: rowNum, column: 'Component', error: `Invalid component "${comp}". Must be one of: ${VALID_COMPONENTS.join(', ')}` });
        continue;
      }

      // Series
      const seriesNum = String(raw['Series Number'] ?? '').trim();
      const seriesId = seriesMap.get(seriesNum);
      if (!seriesId) { errors.push({ row: rowNum, column: 'Series Number', error: `Series "${seriesNum}" not found` }); continue; }

      // Material
      const matName = String(raw['Material Name'] ?? '').trim();
      const matId = matMap.get(matName);
      if (!matId) { errors.push({ row: rowNum, column: 'Material Name', error: `Material "${matName}" not found` }); continue; }

      // Size, Rating
      const size = String(raw['Size'] ?? '').trim();
      const rating = String(raw['Rating'] ?? '').trim();
      if (!size) { errors.push({ row: rowNum, column: 'Size', error: 'Required' }); continue; }
      if (!rating) { errors.push({ row: rowNum, column: 'Rating', error: 'Required' }); continue; }

      const typeKey = String(raw['Type Key'] ?? '').trim();
      const price = Number(raw['Fixed Price (INR)']);
      if (isNaN(price) || price < 0) { errors.push({ row: rowNum, column: 'Fixed Price (INR)', error: 'Must be a positive number' }); continue; }

      rows.push({
        component: comp,
        series_id: seriesId,
        size,
        rating,
        type_key: typeKey,
        material_id: matId,
        fixed_price: price,
        is_active: true,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows to import', details: errors }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Delete existing and insert new
    const { error: delErr } = await serviceClient.from('machining_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) return NextResponse.json({ error: `Failed to clear table: ${delErr.message}` }, { status: 500 });

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: insErr } = await serviceClient.from('machining_prices').insert(batch);
      if (insErr) {
        errors.push({ row: 0, column: '-', error: `Insert failed: ${insErr.message}` });
      }
    }

    return NextResponse.json({
      message: `Imported ${rows.length} machining price entries`,
      rowCount: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Machining upload error:', error);
    return NextResponse.json({ error: 'Upload processing failed' }, { status: 500 });
  }
}
