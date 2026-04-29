import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CoverLetterPDF } from '@/components/pdf/CoverLetterPDF';
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

    // Fetch creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, designation, department, phone, email')
      .eq('id', quote.created_by)
      .single();

    // Fetch company info
    const { data: companyRes } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'company_info')
      .single();

    const company = (companyRes?.value as { name: string; address: string }) ?? {
      name: 'Unicorn Valves Pvt. Ltd.',
      address: 'SF No: 100/2B, Valukkuparai P.O., Marichettipathy Road, Nachipalayam, Madukkarai Taluk, Coimbatore 641032, Tamil Nadu, India',
    };

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

    // Generate PDF
    const pdfElement = React.createElement(CoverLetterPDF, {
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
      },
      customer,
      creator,
      company,
    }) as any;

    const pdfBuffer = await renderToBuffer(pdfElement);

    const filename = quote.quote_number.replace(/\//g, '-');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}_CoverLetter.pdf"`,
      },
    });
  } catch (error) {
    console.error('Cover letter PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Cover Letter PDF' }, { status: 500 });
  }
}
