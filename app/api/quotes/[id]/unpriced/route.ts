import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CompleteQuotePDF } from '@/components/pdf/CompleteQuotePDF';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quote, error: quoteErr } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const { data: products } = await supabase
      .from('quote_products')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, designation, department, phone, email')
      .eq('id', quote.created_by)
      .single();

    const [companyRes, exRateRes] = await Promise.all([
      supabase.from('global_settings').select('value').eq('key', 'company_info').single(),
      supabase.from('global_settings').select('value').eq('key', 'exchange_rate').single(),
    ]);

    const company = (companyRes.data?.value as { name: string; address: string }) ?? {
      name: 'Unicorn Valves Private Limited',
      address: 'Coimbatore, Tamil Nadu, India',
    };
    const exchangeRate = (exRateRes.data?.value as { usd_to_inr: number })?.usd_to_inr ?? 83.5;

    const customer = quote.customer as {
      name: string; company?: string; address?: string; country: string; is_international: boolean;
    };

    const creator = {
      full_name: profile?.full_name ?? 'Unknown',
      designation: profile?.designation ?? undefined,
      department: profile?.department ?? undefined,
      phone: profile?.phone ?? '+91 9497471386',
      email: profile?.email ?? 'sales@unicorn-valves.com',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(CompleteQuotePDF, {
      quote: {
        quote_number: quote.quote_number,
        created_at: quote.created_at,
        enquiry_id: quote.enquiry_id ?? undefined,
        project_name: quote.project_name ?? undefined,
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
      },
      mode: 'unpriced-summary',
      customer,
      products: (products ?? []).map(p => ({
        sort_order: p.sort_order,
        description: p.description || `${p.size} | ${p.rating} | ${p.end_connect_type}`,
        quantity: p.quantity,
        unit_price_inr: Number(p.unit_price_inr ?? 0),
        line_total_inr: Number(p.line_total_inr ?? 0),
        tag_number: p.tag_number ?? undefined,
      })),
      creator,
      company,
      exchangeRate,
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const pdfBuffer = await renderToBuffer(pdfElement);

    const filename = quote.quote_number.replace(/\//g, '-');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}_Unpriced.pdf"`,
      },
    });
  } catch (error) {
    console.error('Unpriced PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Unpriced PDF' }, { status: 500 });
  }
}
