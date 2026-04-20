import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// ====================================================
// Generate empty machining pricing template (headers only)
// ====================================================

const HEADERS = ['Component', 'Series Number', 'Size', 'Rating', 'Type Key', 'Material Name', 'Fixed Price (INR)'];

export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Machining Prices');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="machining-pricing-template.xlsx"',
    },
  });
}
