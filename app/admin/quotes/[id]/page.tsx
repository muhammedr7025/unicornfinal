'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, Loader2, ArrowLeft, FileSpreadsheet, Shield, Truck, CreditCard, DollarSign, ChevronDown, FileText, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const [downloadingExcel, setDownloadingExcel] = useState(false);
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

  async function downloadCoverLetter() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${id}/cover-letter`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number?.replace(/\//g, '-') ?? 'quote'}_CoverLetter.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to generate Cover Letter'); }
    setDownloadingPdf(false);
  }

  async function downloadExcel() {
    setDownloadingExcel(true);
    try {
      const res = await fetch(`/api/quotes/${id}/excel`);
      if (!res.ok) throw new Error('Excel generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number?.replace(/\//g, '-') ?? 'quote'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate Excel');
    }
    setDownloadingExcel(false);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!quote) return <div className="text-center py-24 text-muted-foreground">Quote not found</div>;

  const customer = quote.customer as { name: string; company?: string; country: string; is_international: boolean };
  const creator = quote.created_by_profile as { full_name: string } | null;
  const isIntl = customer.is_international;
  const fmtINR = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  const fmtUSD = (v: number) => `$${convertToUSD(v, exchangeRate).toLocaleString('en-US')}`;
  const fmt = (v: number) => isIntl ? fmtUSD(v) : fmtINR(v);

  const productSubtotal = products.reduce((s, p) => s + Number(p.line_total_inr ?? 0), 0);
  const packingPrice = Number(quote.packing_price ?? 0);
  const freightPrice = Number(quote.freight_price ?? 0);
  const subtotalINR = Number(quote.subtotal_inr ?? 0);
  const taxINR = Number(quote.tax_amount_inr ?? 0);
  const grandTotalINR = Number(quote.grand_total_inr ?? 0);

  const statusColor: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotes"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quote Details</h1>
            <p className="text-muted-foreground text-sm font-mono">{quote.quote_number}</p>
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
          {quote.status === 'draft' && (
            <Link href={`/employee/quotes/${id}/edit`}>
              <Button variant="outline" className="gap-2">
                <Pencil className="w-4 h-4" /> Edit Quote
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={downloadExcel} disabled={downloadingExcel} className="gap-2">
            {downloadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Excel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
              <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadCoverLetter}>
                <FileText className="w-4 h-4 mr-2" /> Cover Letter + T&C
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPdf}>
                <FileText className="w-4 h-4 mr-2" /> Complete Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Quote Info Grid ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <p className="font-semibold text-sm">{customer.name}</p>
              {customer.company && <p className="text-xs text-muted-foreground">{customer.company}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Project Name</p>
              <p className="font-semibold text-sm">{quote.project_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Enquiry ID</p>
              <p className="font-semibold text-sm">{quote.enquiry_id || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor[quote.status] ?? ''}`}>
                {quote.status}
              </span>
            </div>
          </div>

          <div className="border-t mt-5 pt-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created By</p>
              <p className="font-semibold text-sm">{creator?.full_name ?? 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="font-semibold text-sm">{new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">📅 Validity</p>
              <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">{quote.validity_days} days</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">🏷️ Pricing Type</p>
              <p className="font-semibold text-sm capitalize">{quote.pricing_type}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Terms Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Warranty */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Warranty (Months)</p>
            </div>
            <p className="text-sm">From Despatch: <span className="font-bold">{quote.warranty_shipment_months}</span></p>
            <p className="text-sm">From Installation: <span className="font-bold">{quote.warranty_installation_months}</span></p>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Delivery</p>
            </div>
            <p className="text-sm font-bold">{quote.delivery_text}</p>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Payment Terms</p>
            </div>
            <p className="text-sm"><span className="font-bold">{quote.payment_advance_pct}%</span> advance against PO</p>
            {Number(quote.payment_approval_pct) > 0 && (
              <p className="text-sm"><span className="font-bold">{quote.payment_approval_pct}%</span> on approval</p>
            )}
            <p className="text-sm"><span className="font-bold">{quote.payment_despatch_pct}%</span> before despatch</p>
          </CardContent>
        </Card>

        {/* Exchange Rate — only for international */}
        {isIntl && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-sky-500" />
                <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">Exchange Rate</p>
              </div>
              <p className="text-sm font-bold">1 USD = ₹{exchangeRate}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Item Details Table ── */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">📋 Item Details</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-14 font-bold">S.No</TableHead>
                    <TableHead className="w-16 font-bold">Tag No.</TableHead>
                    <TableHead className="font-bold">Item Description</TableHead>
                    {isIntl && <TableHead className="text-right font-bold">Unit Price (USD)</TableHead>}
                    <TableHead className="text-right font-bold">Unit Price (INR)</TableHead>
                    <TableHead className="text-center w-14 font-bold">Qty</TableHead>
                    {isIntl && <TableHead className="text-right font-bold">Total Price (USD)</TableHead>}
                    <TableHead className="text-right font-bold">Total Price (INR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p, i) => {
                    const unitINR = Number(p.unit_price_inr ?? 0);
                    const totalINR = Number(p.line_total_inr ?? 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{p.tag_number ?? '—'}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{p.description || `${p.size} | ${p.rating} | ${p.end_connect_type}`}</p>
                        </TableCell>
                        {isIntl && <TableCell className="text-right text-blue-600 dark:text-blue-400 font-semibold">{fmtUSD(unitINR)}</TableCell>}
                        <TableCell className="text-right font-semibold">{fmtINR(unitINR)}</TableCell>
                        <TableCell className="text-center">{p.quantity}</TableCell>
                        {isIntl && <TableCell className="text-right text-blue-600 dark:text-blue-400 font-semibold">{fmtUSD(totalINR)}</TableCell>}
                        <TableCell className="text-right font-semibold">{fmtINR(totalINR)}</TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Subtotal row */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-bold">Subtotal:</TableCell>
                    {isIntl && <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{fmtUSD(productSubtotal)}</TableCell>}
                    <TableCell className="text-right font-bold">{fmtINR(productSubtotal)}</TableCell>
                  </TableRow>

                  {/* Packing row */}
                  {packingPrice > 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-medium">Packing Charges:</TableCell>
                      {isIntl && <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{fmtUSD(packingPrice)}</TableCell>}
                      <TableCell className="text-right font-medium">{fmtINR(packingPrice)}</TableCell>
                    </TableRow>
                  )}

                  {/* Freight row */}
                  {quote.pricing_type === 'for-site' && freightPrice > 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-medium">Freight Charges:</TableCell>
                      {isIntl && <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{fmtUSD(freightPrice)}</TableCell>}
                      <TableCell className="text-right font-medium">{fmtINR(freightPrice)}</TableCell>
                    </TableRow>
                  )}

                  {/* Custom pricing row */}
                  {quote.pricing_type === 'custom' && quote.custom_pricing_title && Number(quote.custom_pricing_price ?? 0) > 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-medium">{quote.custom_pricing_title}:</TableCell>
                      {isIntl && <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{fmtUSD(Number(quote.custom_pricing_price))}</TableCell>}
                      <TableCell className="text-right font-medium">{fmtINR(Number(quote.custom_pricing_price))}</TableCell>
                    </TableRow>
                  )}

                  {/* GST row */}
                  {!isIntl && taxINR > 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-medium">GST (18%):</TableCell>
                      {isIntl && <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{fmtUSD(taxINR)}</TableCell>}
                      <TableCell className="text-right font-medium">{fmtINR(taxINR)}</TableCell>
                    </TableRow>
                  )}

                  {/* Grand Total row */}
                  <TableRow className="bg-emerald-50 dark:bg-emerald-950/30">
                    <TableCell colSpan={isIntl ? 6 : 5} className="text-right font-bold text-base">Grand Total:</TableCell>
                    {isIntl && <TableCell className="text-right font-bold text-base text-emerald-600 dark:text-emerald-400">{fmtUSD(grandTotalINR)}</TableCell>}
                    <TableCell className="text-right font-bold text-base text-emerald-600 dark:text-emerald-400">{fmtINR(grandTotalINR)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Notes ── */}
      {quote.notes && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
