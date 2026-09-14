// ============================================================
// Quote helpers — quote number generation, data fetching
// ============================================================

/**
 * Generate quote number: UV/FY/NNNN
 * e.g. UV/25-26/0001
 */
export function generateFYCode(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  // Indian FY: Apr–Mar
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

export function formatQuoteNumber(fyCode: string, seq: number): string {
  return `UV/${fyCode}/${String(seq).padStart(4, '0')}`;
}

/**
 * Build a description string for a quote product (for PDF)
 */
export function buildProductDescription(config: {
  seriesName: string;
  size: string;
  rating: string;
  endConnectType: string;
  bonnetType: string;
  trimType: string;
  bodyMaterial?: string;
  seatMaterial?: string;
}): string {
  const parts = [
    config.seriesName,
    `Size: ${config.size}`,
    `Rating: ${config.rating}`,
    `End: ${config.endConnectType}`,
    `Bonnet: ${config.bonnetType}`,
    `Trim: ${config.trimType}`,
  ];
  if (config.bodyMaterial) parts.push(`Body: ${config.bodyMaterial}`);
  if (config.seatMaterial) parts.push(`Seat: ${config.seatMaterial}`);
  return parts.join(' | ');
}

/**
 * Standard clause appended after the delivery timeline wherever it's shown
 * (quote detail pages, PDF) — clarifies when the delivery clock starts.
 */
export const DELIVERY_TERMS_SUFFIX =
  'Weeks from the date of receipt of approved documents or advance payment, whichever is later.';

export function formatDeliveryText(deliveryText: string | null | undefined): string {
  const text = (deliveryText ?? '').trim();
  return text ? `${text} ${DELIVERY_TERMS_SUFFIX}` : '';
}
