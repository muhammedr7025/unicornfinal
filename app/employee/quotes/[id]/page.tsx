'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { convertToUSD } from '@/lib/pricingEngine';

export default function EmployeeQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [quote, setQuote] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83.5);

  const load = useCallback(async () => {
    setLoading(true);
    const [quoteRes, prodRes, settingsRes] = await Promise.all([
      supabase.from('quotes').select('*, customer:customers(*)').eq('id', id).single(),
      supabase.from('quote_products').select('*').eq('quote_id', id).order('sort_order'),
      supabase.from('global_settings').select('value').eq('key', 'exchange_rate').single(),
    ]);
    setQuote(quoteRes.data);
    setProducts(prodRes.data ?? []);
    setExchangeRate((settingsRes.data?.value as { usd_to_inr: number })?.usd_to_inr ?? 83.5);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number?.replace(/\//g, '-') ?? 'quote'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to generate PDF'); }
    setDownloadingPdf(false);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!quote) return <div className="text-center py-24 text-muted-foreground">Quote not found</div>;

  const customer = quote.customer as { name: string; company?: string; country: string; is_international: boolean };
  const isIntl = customer.is_international;
  const fmt = (v: number) => isIntl
    ? `$${convertToUSD(v, exchangeRate).toLocaleString('en-US')}`
    : `₹${v.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/employee/quotes"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">{quote.quote_number}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{quote.status}</Badge>
          <Button variant="outline" onClick={downloadPdf} disabled={downloadingPdf} className="gap-2">
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{customer.name}</p>
            {customer.company && <p className="text-muted-foreground">{customer.company}</p>}
            <p className="text-muted-foreground">{customer.country}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(Number(quote.subtotal_inr ?? 0))}</span></div>
            {!isIntl && <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>{fmt(Number(quote.tax_amount_inr ?? 0))}</span></div>}
            {isIntl && <div className="flex justify-between text-muted-foreground/60"><span>GST</span><span>N/A</span></div>}
            <Separator className="my-1" />
            <div className="flex justify-between font-bold"><span>Grand Total</span><span className="text-primary">{fmt(Number(quote.grand_total_inr ?? 0))}</span></div>
            {isIntl && <p className="text-[10px] text-muted-foreground">Rate: 1 USD = ₹{exchangeRate}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Products</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell><p className="text-sm font-medium">{p.description || `${p.size} | ${p.rating}`}</p></TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(Number(p.unit_price_inr ?? 0))}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(Number(p.line_total_inr ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
