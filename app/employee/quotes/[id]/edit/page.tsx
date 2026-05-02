'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuoteStore } from '@/stores/quoteStore';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Edit Quote Page
 * 
 * Loads an existing quote into the Zustand store (via loadForEdit),
 * then redirects to /employee/new-quote where the wizard will
 * operate in edit mode.
 *
 * Before redirecting, it checks the exchange rate and shows a
 * warning popup if it has changed since the quote was created.
 */
export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();
  const store = useQuoteStore();
  const [loading, setLoading] = useState(true);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [oldRate, setOldRate] = useState(0);
  const [newRate, setNewRate] = useState(0);

  const loadQuoteForEdit = useCallback(async () => {
    setLoading(true);
    try {
      // Load quote + customer
      const { data: quote, error: quoteErr } = await supabase
        .from('quotes')
        .select('*, customer:customers(*)')
        .eq('id', id)
        .single();
      if (quoteErr || !quote) {
        toast.error('Quote not found');
        router.push('/employee/quotes');
        return;
      }

      // Only draft quotes can be edited
      if (quote.status !== 'draft') {
        toast.error(`Cannot edit this quote — status is "${quote.status}". Only draft quotes can be edited.`);
        router.push(`/employee/quotes/${id}`);
        return;
      }

      // Load products with their line items
      const { data: products } = await supabase
        .from('quote_products')
        .select('*')
        .eq('quote_id', id)
        .order('sort_order');

      // Load tubing, testing, accessories for each product
      const productIds = (products ?? []).map(p => p.id);
      const [tubingRes, testingRes, accessoriesRes] = await Promise.all([
        productIds.length > 0
          ? supabase.from('product_tubing_items').select('*').in('quote_product_id', productIds)
          : { data: [] },
        productIds.length > 0
          ? supabase.from('product_testing_items').select('*').in('quote_product_id', productIds)
          : { data: [] },
        productIds.length > 0
          ? supabase.from('product_accessories').select('*').in('quote_product_id', productIds)
          : { data: [] },
      ]);

      // Attach tubing/testing/accessories to products
      const enrichedProducts = (products ?? []).map(p => ({
        ...p,
        tubing_items: (tubingRes.data ?? []).filter(t => t.quote_product_id === p.id),
        testing_items: (testingRes.data ?? []).filter(t => t.quote_product_id === p.id),
        accessories: (accessoriesRes.data ?? []).filter(a => a.quote_product_id === p.id),
      }));

      // Get current exchange rate
      const { data: rateData } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'exchange_rate')
        .single();
      const currentRate = (rateData?.value as { usd_to_inr: number })?.usd_to_inr ?? 83.5;
      const snapshotRate = quote.exchange_rate_snapshot ? Number(quote.exchange_rate_snapshot) : null;

      // Load margins based on pricing mode
      const marginsKey = quote.pricing_mode === 'project' ? 'project_margins' : 'standard_margins';
      const { data: marginData } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', marginsKey)
        .single();
      const margins = marginData?.value as { mfg_profit_pct: number; bo_profit_pct: number; neg_margin_pct: number } | null;

      // Load into store
      store.loadForEdit({ quote, products: enrichedProducts });

      // Apply margins
      if (margins) {
        store.setMargins(margins);
      }

      // Check exchange rate change
      if (snapshotRate && snapshotRate !== currentRate) {
        setOldRate(snapshotRate);
        setNewRate(currentRate);
        setShowRateDialog(true);
        setLoading(false);
        return; // Don't redirect yet — wait for user choice
      }

      // No rate change — redirect to wizard
      setLoading(false);
      router.push('/employee/new-quote');
    } catch (err) {
      toast.error('Failed to load quote for editing');
      console.error(err);
      router.push('/employee/quotes');
    }
  }, [id]);

  useEffect(() => {
    loadQuoteForEdit();
  }, [loadQuoteForEdit]);

  function handleUseNewRate() {
    // Store new rate
    store.setQuoteSettings({ exchange_rate_snapshot: newRate } as any);
    setShowRateDialog(false);
    router.push('/employee/new-quote');
  }

  function handleKeepOldRate() {
    // Keep old rate — store snapshot stays
    setShowRateDialog(false);
    router.push('/employee/new-quote');
  }

  if (loading && !showRateDialog) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading quote for editing...</p>
      </div>
    );
  }

  // Exchange rate change dialog
  if (showRateDialog) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300">Exchange Rate Changed</h2>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  The USD to INR exchange rate has changed since this quote was created.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Original Rate</p>
                <p className="text-xl font-bold text-red-600">₹{oldRate}</p>
                <p className="text-[10px] text-muted-foreground">1 USD = ₹{oldRate}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-emerald-300">
                <p className="text-xs text-muted-foreground mb-1">Current Rate</p>
                <p className="text-xl font-bold text-emerald-600">₹{newRate}</p>
                <p className="text-[10px] text-muted-foreground">1 USD = ₹{newRate}</p>
              </div>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>We recommend using the latest rate</strong> for accurate pricing. 
              If you keep the old rate, the quote will continue using ₹{oldRate}.
            </p>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleUseNewRate} className="flex-1 gap-2">
                <RefreshCcw className="w-4 h-4" /> Use New Rate (₹{newRate})
              </Button>
              <Button variant="outline" onClick={handleKeepOldRate} className="flex-1 gap-2">
                <X className="w-4 h-4" /> Keep Old Rate (₹{oldRate})
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
