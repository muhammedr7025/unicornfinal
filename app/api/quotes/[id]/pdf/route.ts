import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/QuotePDF';
import React from 'react';

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

    // Fetch products
    const { data: products } = await supabase
      .from('quote_products')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order');

    // Fetch company info and exchange rate
    const [companyRes, exRateRes] = await Promise.all([
      supabase.from('global_settings').select('value').eq('key', 'company_info').single(),
      supabase.from('global_settings').select('value').eq('key', 'exchange_rate').single(),
    ]);

    const company = (companyRes.data?.value as { name: string; address: string; gstin: string }) ?? {
      name: 'Unicorn Valves Pvt. Ltd.',
      address: 'Coimbatore, Tamil Nadu, India',
      gstin: '',
    };
    const exchangeRate = (exRateRes.data?.value as { usd_to_inr: number })?.usd_to_inr ?? 83.5;

    const customer = quote.customer as { name: string; company?: string; address?: string; country: string; is_international: boolean };

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(QuotePDF, {
        quote: {
          quote_number: quote.quote_number,
          created_at: quote.created_at,
          status: quote.status,
          pricing_mode: quote.pricing_mode,
          pricing_type: quote.pricing_type,
          validity_days: quote.validity_days,
          delivery_text: quote.delivery_text,
          payment_advance_pct: Number(quote.payment_advance_pct),
          payment_approval_pct: Number(quote.payment_approval_pct),
          payment_despatch_pct: Number(quote.payment_despatch_pct),
          warranty_shipment_months: quote.warranty_shipment_months,
          warranty_installation_months: quote.warranty_installation_months,
          freight_price: Number(quote.freight_price ?? 0),
          packing_price: Number(quote.packing_price ?? 0),
          custom_pricing_title: quote.custom_pricing_title ?? undefined,
          custom_pricing_price: Number(quote.custom_pricing_price ?? 0),
          subtotal_inr: Number(quote.subtotal_inr ?? 0),
          tax_amount_inr: Number(quote.tax_amount_inr ?? 0),
          grand_total_inr: Number(quote.grand_total_inr ?? 0),
          notes: quote.notes ?? undefined,
        },
        customer,
        products: (products ?? []).map(p => ({
          sort_order: p.sort_order,
          description: p.description || `${p.size} | ${p.rating} | ${p.end_connect_type}`,
          quantity: p.quantity,
          unit_price_inr: Number(p.unit_price_inr ?? 0),
          line_total_inr: Number(p.line_total_inr ?? 0),
          tag_number: p.tag_number ?? undefined,
        })),
        company,
        exchangeRate,
      }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quote_number.replace(/\//g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
