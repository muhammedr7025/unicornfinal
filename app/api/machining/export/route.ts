import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// ====================================================
// Export machining prices as downloadable .xlsx
// ====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: rows } = await supabase
      .from('machining_prices')
      .select('*, series:series(series_number), material:materials(material_name)')
      .eq('is_active', true)
      .order('component')
      .order('size');

    const sheetData = (rows ?? []).map((r: any) => ({
      'Component': r.component,
      'Series Number': r.series?.series_number ?? r.series_id,
      'Size': r.size,
      'Rating': r.rating,
      'Type Key': r.type_key,
      'Material Name': r.material?.material_name ?? r.material_id,
      'Fixed Price (INR)': Number(r.fixed_price),
    }));

    const wb = XLSX.utils.book_new();
    const headers = ['Component', 'Series Number', 'Size', 'Rating', 'Type Key', 'Material Name', 'Fixed Price (INR)'];
    const ws = XLSX.utils.json_to_sheet(sheetData, { header: headers });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Machining Prices');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="machining-prices-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Machining export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
