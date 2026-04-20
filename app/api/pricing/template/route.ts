import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// ====================================================
// Generate an empty template Excel with all 14 sheets
// (headers only, no data) for pricing data upload
// ====================================================

const SHEET_HEADERS: Array<{ sheetName: string; headers: string[] }> = [
  { sheetName: 'Materials', headers: ['Material Name', 'Material Group', 'Price Per Kg (INR)'] },
  { sheetName: 'Series', headers: ['Series Number', 'Series Name', 'Product Type', 'Has Cage', 'Has Seal Ring'] },
  { sheetName: 'Body Weights', headers: ['Series Number', 'Size', 'Rating', 'End Connect Type', 'Weight (kg)'] },
  { sheetName: 'Bonnet Weights', headers: ['Series Number', 'Size', 'Rating', 'Bonnet Type', 'Weight (kg)'] },
  { sheetName: 'Plug Weights', headers: ['Series Number', 'Size', 'Rating', 'Weight (kg)'] },
  { sheetName: 'Seat Weights', headers: ['Series Number', 'Size', 'Rating', 'Weight (kg)'] },
  { sheetName: 'Cage Weights', headers: ['Series Number', 'Size', 'Rating', 'Weight (kg)'] },
  { sheetName: 'Seal Ring Prices', headers: ['Series Number', 'Seal Type', 'Size', 'Rating', 'Fixed Price (INR)'] },
  { sheetName: 'Stem Weights', headers: ['Series Number', 'Size', 'Rating', 'Weight (kg)'] },
  { sheetName: 'Actuator Models', headers: ['Type', 'Series', 'Model', 'Standard/Special', 'Fixed Price (INR)'] },
  { sheetName: 'Handwheel Prices', headers: ['Type', 'Series', 'Model', 'Standard/Special', 'Fixed Price (INR)'] },
  { sheetName: 'Pilot Plug Weights', headers: ['Series Number', 'Size', 'Rating', 'Weight (kg)'] },
  { sheetName: 'Testing Presets', headers: ['Series Number', 'Size', 'Rating', 'Test Name', 'Price (INR)'] },
  { sheetName: 'Tubing Presets', headers: ['Series Number', 'Size', 'Rating', 'Item Name', 'Price (INR)'] },
];

export async function GET() {
  const wb = XLSX.utils.book_new();

  for (const { sheetName, headers } of SHEET_HEADERS) {
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pricing-data-template.xlsx"',
    },
  });
}
