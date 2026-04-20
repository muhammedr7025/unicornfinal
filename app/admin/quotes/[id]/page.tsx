'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, Loader2, ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { convertToUSD } from '@/lib/pricingEngine';

export default function AdminQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [quote, setQuote] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83.5);

  const load = useCallback(async () => {
    setLoading(true);
    const [quoteRes, prodRes, settingsRes] = await Promise.all([
      supabase.from('quotes').select('*, customer:customers(*), created_by_profile:profiles!quotes_created_by_fkey(full_name)').eq('id', id).single(),
      supabase.from('quote_products').select('*').eq('quote_id', id).order('sort_order'),
      supabase.from('global_settings').select('value').eq('key', 'exchange_rate').single(),
    ]);
    setQuote(quoteRes.data);
    setProducts(prodRes.data ?? []);
    const exRate = (settingsRes.data?.value as { usd_to_inr: number })?.usd_to_inr ?? 83.5;
    setExchangeRate(exRate);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true);
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Status updated to ${newStatus}`); load(); }
    setUpdatingStatus(false);
  }

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number?.replace(/\//g, '-') ?? 'quote'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF');
    }
    setDownloadingPdf(false);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!quote) return <div className="text-center py-24 text-muted-foreground">Quote not found</div>;

  const customer = quote.customer as { name: string; company?: string; country: string; is_international: boolean };
  const creator = quote.created_by_profile as { full_name: string };
  const isIntl = customer.is_international;
  const fmt = (v: number) => isIntl
    ? `$${convertToUSD(v, exchangeRate).toLocaleString('en-US')}`
    : `₹${v.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotes"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">{quote.quote_number}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Created by {creator?.full_name} · {new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={quote.status} onValueChange={(v) => updateStatus(v ?? quote.status)} disabled={updatingStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadPdf} disabled={downloadingPdf} className="gap-2">
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{customer.name}</p>
            {customer.company && <p className="text-muted-foreground">{customer.company}</p>}
            <p className="text-muted-foreground">{customer.country}</p>
            {isIntl && <Badge variant="outline" className="text-[10px]">International · USD</Badge>}
            {!isIntl && <Badge variant="secondary" className="text-[10px]">Domestic · INR</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><Badge variant="secondary" className="text-[10px] capitalize">{quote.pricing_mode}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{quote.pricing_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Validity</span><span>{quote.validity_days} days</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><Badge variant={isIntl ? 'default' : 'secondary'} className="text-[10px]">{isIntl ? 'USD ($)' : 'INR (₹)'}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
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

      {/* Products */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Products ({products.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{p.description || `${p.size} | ${p.rating}`}</p>
                    {p.tag_number && <p className="text-xs text-muted-foreground">Tag: {p.tag_number}</p>}
                  </TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(Number(p.unit_price_inr ?? 0))}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(Number(p.line_total_inr ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Terms & Conditions</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p>Delivery: {quote.delivery_text}</p>
          <p>Payment: {quote.payment_advance_pct}% Advance · {quote.payment_approval_pct > 0 ? `${quote.payment_approval_pct}% Approval · ` : ''}{quote.payment_despatch_pct}% Before Despatch</p>
          <p>Warranty: {quote.warranty_shipment_months}m from shipment / {quote.warranty_installation_months}m from installation</p>
          {quote.notes && <p className="mt-2">Notes: {quote.notes}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
