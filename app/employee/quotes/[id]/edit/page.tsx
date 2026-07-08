'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuoteStore } from '@/stores/quoteStore';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Edit Quote Page
 *
 * Loads an existing quote into the Zustand store (via loadForEdit),
 * then redirects to /employee/new-quote where the wizard will
 * operate in edit mode. The quote's saved exchange_rate_snapshot is
 * the authoritative dollar rate; it can be changed in the wizard's
 * Terms & Conditions step.
 */
export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();
  const store = useQuoteStore();
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading quote for editing...</p>
      </div>
    );
  }

  return null;
}
