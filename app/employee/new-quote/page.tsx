'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQuoteStore } from '@/stores/quoteStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Copy, Save, Loader2,
  Settings2, Package, Calculator, CheckCircle, FileText, AlertTriangle
} from 'lucide-react';
import { calculateProductPrice, calculateQuoteTotal, roundToNearest10, convertToUSD } from '@/lib/pricingEngine';
import type { Customer } from '@/types';

// REMOVED: const TRIM_TYPES and const SEAL_TYPES — now loaded from DB
const VALIDITY_OPTIONS = [15, 30, 45, 50, 60, 90];

type BodyWeightRow = { series_id: string; size: string; rating: string; end_connect_type: string };
type BonnetWeightRow = { series_id: string; size: string; rating: string; bonnet_type: string };
type ActuatorRow = { id: string; type: string; series: string; model: string; standard_special: string; fixed_price: number };
type HandwheelRow = { id: string; type: string; series: string; model: string; standard_special: string; fixed_price: number };
type TestingPresetRow = { id: string; series_id: string; size: string; rating: string; test_name: string; price: number };
type TubingPresetRow = { id: string; series_id: string; size: string; rating: string; item_name: string; price: number };
type SealRingRow = { series_id: string; seal_type: string; size: string; rating: string };
type MachiningTypeRow = { component: string; series_id: string; type_key: string; size: string; rating: string };

const STEPS = [
  { label: 'Customer & Project', icon: Settings2 },
  { label: 'Products', icon: Package },
  { label: 'Terms & Pricing', icon: FileText },
  { label: 'Review & Save', icon: CheckCircle },
];

export default function NewQuotePage() {
  const router = useRouter();
  const supabase = createClient();
  const store = useQuoteStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [series, setSeries] = useState<Array<{ id: string; series_number: string; series_name: string; product_type: string; has_cage: boolean; has_seal_ring: boolean }>>([]);
  const [materials, setMaterials] = useState<Record<string, Array<{ id: string; material_name: string; price_per_kg: number }>>>({});
  const [bodyWeights, setBodyWeights] = useState<BodyWeightRow[]>([]);
  const [bonnetWeights, setBonnetWeights] = useState<BonnetWeightRow[]>([]);
  const [actuatorModels, setActuatorModels] = useState<ActuatorRow[]>([]);
  const [handwheelPrices, setHandwheelPrices] = useState<HandwheelRow[]>([]);
  const [testingPresets, setTestingPresets] = useState<TestingPresetRow[]>([]);
  const [tubingPresets, setTubingPresets] = useState<TubingPresetRow[]>([]);
  const [sealRingRows, setSealRingRows] = useState<SealRingRow[]>([]);
  const [machiningTypeRows, setMachiningTypeRows] = useState<MachiningTypeRow[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Array<{ key: string; value: Record<string, number> }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(83.5);

  useEffect(() => {
    if (!store.edit_mode) {
      store.reset();
    }
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingData(true);
    const [custRes, seriesRes, matRes, settingsRes, bwRes, bnwRes, actRes, hwRes, testPresRes, tubePresRes, sealRes, machTypeRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('series').select('*').eq('is_active', true).order('series_number'),
      supabase.from('materials').select('*').eq('is_active', true),
      supabase.from('global_settings').select('*'),
      supabase.from('body_weights').select('series_id, size, rating, end_connect_type'),
      supabase.from('bonnet_weights').select('series_id, size, rating, bonnet_type'),
      supabase.from('actuator_models').select('id, type, series, model, standard_special, fixed_price').eq('is_active', true),
      supabase.from('handwheel_prices').select('id, type, series, model, standard_special, fixed_price').eq('is_active', true),
      supabase.from('testing_presets').select('*').eq('is_active', true),
      supabase.from('tubing_presets').select('*').eq('is_active', true),
      supabase.from('seal_ring_prices').select('series_id, seal_type, size, rating').eq('is_active', true),
      supabase.from('machining_prices').select('component, series_id, type_key, size, rating').eq('is_active', true),
    ]);

    setCustomers(custRes.data ?? []);
    setSeries(seriesRes.data ?? []);
    setBodyWeights((bwRes.data ?? []) as BodyWeightRow[]);
    setBonnetWeights((bnwRes.data ?? []) as BonnetWeightRow[]);
    setActuatorModels((actRes.data ?? []) as ActuatorRow[]);
    setHandwheelPrices((hwRes.data ?? []) as HandwheelRow[]);
    setTestingPresets((testPresRes.data ?? []) as TestingPresetRow[]);
    setTubingPresets((tubePresRes.data ?? []) as TubingPresetRow[]);
    setSealRingRows((sealRes.data ?? []) as SealRingRow[]);
    setMachiningTypeRows((machTypeRes.data ?? []) as MachiningTypeRow[]);

    // Group materials by group
    const grouped: Record<string, Array<{ id: string; material_name: string; price_per_kg: number }>> = {};
    (matRes.data ?? []).forEach((m: { material_group: string; id: string; material_name: string; price_per_kg: number }) => {
      if (!grouped[m.material_group]) grouped[m.material_group] = [];
      grouped[m.material_group].push(m);
    });
    setMaterials(grouped);

    // Load margins from settings
    const settings = settingsRes.data ?? [];
    setGlobalSettings(settings as Array<{ key: string; value: Record<string, number> }>);
    const mode = store.pricing_mode;
    const marginKey = mode === 'project' ? 'project_margins' : 'standard_margins';
    const marginSetting = settings.find(s => s.key === marginKey);
    if (marginSetting) {
      const v = marginSetting.value as { mfg_profit_pct: number; bo_profit_pct: number; neg_margin_pct: number };
      store.setMargins(v);
    }

    // Load exchange rate
    const exSetting = settings.find(s => s.key === 'exchange_rate');
    if (exSetting) {
      const v = exSetting.value as { usd_to_inr: number };
      setExchangeRate(v.usd_to_inr);
    }

    setLoadingData(false);
  }

  // ── Re-apply margins when pricing_mode changes ──
  useEffect(() => {
    if (globalSettings.length === 0) return; // Not loaded yet
    const marginKey = store.pricing_mode === 'project' ? 'project_margins' : 'standard_margins';
    const marginSetting = globalSettings.find(s => s.key === marginKey);
    if (marginSetting) {
      const v = marginSetting.value as { mfg_profit_pct: number; bo_profit_pct: number; neg_margin_pct: number };
      store.setMargins(v);
    }
  }, [store.pricing_mode, globalSettings]);

  async function lookupCosts(productId: string) {
    const product = store.products.find(p => p.id === productId);
    if (!product) { toast.error('Product not found'); return; }
    if (!product.series_id || !product.size || !product.rating) {
      toast.error('Please select Series, Size, and Rating before calculating');
      return;
    }
    if (!product.end_connect_type || !product.bonnet_type || !product.trim_type) {
      toast.error('Please select End Connect Type, Bonnet Type, and Trim Type');
      return;
    }
    if (!product.body_bonnet_material_id || !product.plug_material_id || !product.seat_material_id || !product.stem_material_id) {
      toast.error('Please select all required materials (Body/Bonnet, Plug, Seat, Stem)');
      return;
    }

    setCalculatingId(productId);
    try {
      // ============================================================
      // DIAGNOSTIC TRACKER — catches every silent zero
      // ============================================================
      const warnings: string[] = [];

      // ---- Weight lookups ----
      const { data: bodyW } = await supabase.from('body_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating)
        .eq('end_connect_type', product.end_connect_type).eq('is_active', true).limit(1).single();
      if (!bodyW) warnings.push(`⚠ Body weight not found (${product.size}, ${product.rating}, ${product.end_connect_type})`);

      const { data: bonnetW } = await supabase.from('bonnet_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating)
        .eq('bonnet_type', product.bonnet_type).eq('is_active', true).limit(1).single();
      if (!bonnetW) warnings.push(`⚠ Bonnet weight not found (${product.size}, ${product.rating}, ${product.bonnet_type})`);

      const { data: plugW } = await supabase.from('plug_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single();
      if (!plugW) warnings.push(`⚠ Plug weight not found (${product.size}, ${product.rating})`);

      const { data: seatW } = await supabase.from('seat_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single();
      if (!seatW) warnings.push(`⚠ Seat weight not found (${product.size}, ${product.rating})`);

      const { data: stemW } = product.stem_material_id ? await supabase.from('stem_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single() : { data: null };
      if (product.stem_material_id && !stemW) warnings.push(`⚠ Stem weight not found (${product.size}, ${product.rating})`);

      const { data: cageW } = product.cage_material_id ? await supabase.from('cage_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single() : { data: null };
      if (product.cage_material_id && !cageW) warnings.push(`⚠ Cage weight not found (${product.size}, ${product.rating})`);

      const { data: sealP } = product.seal_ring_type ? await supabase.from('seal_ring_prices')
        .select('fixed_price').eq('series_id', product.series_id)
        .eq('seal_type', product.seal_ring_type)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single() : { data: null };
      if (product.seal_ring_type && !sealP) warnings.push(`⚠ Seal ring price not found (${product.seal_ring_type}, ${product.size})`);

      const { data: pilotW } = product.has_pilot_plug ? await supabase.from('pilot_plug_weights')
        .select('weight_kg').eq('series_id', product.series_id)
        .eq('size', product.size).eq('rating', product.rating).eq('is_active', true).limit(1).single() : { data: null };
      if (product.has_pilot_plug && !pilotW) warnings.push(`⚠ Pilot plug weight not found (${product.size}, ${product.rating})`);

      const { data: actP } = product.actuator_model_id ? await supabase.from('actuator_models')
        .select('fixed_price').eq('id', product.actuator_model_id).limit(1).single() : { data: null };
      if (product.actuator_model_id && !actP) warnings.push(`⚠ Actuator price not found`);

      const { data: hwP } = product.handwheel_model_id ? await supabase.from('handwheel_prices')
        .select('fixed_price').eq('id', product.handwheel_model_id).limit(1).single() : { data: null };
      if (product.handwheel_model_id && !hwP) warnings.push(`⚠ Handwheel price not found`);

      // ---- Material lookups ----
      const bbMat = (materials['BodyBonnet'] ?? []).find(m => m.id === product.body_bonnet_material_id);
      const plugMat = (materials['Plug'] ?? []).find(m => m.id === product.plug_material_id);
      const seatMat = (materials['Seat'] ?? []).find(m => m.id === product.seat_material_id);
      const stemMat = (materials['Stem'] ?? []).find(m => m.id === product.stem_material_id);
      const cageMat = (materials['Cage'] ?? []).find(m => m.id === product.cage_material_id);

      if (!bbMat) warnings.push('⚠ Body/Bonnet material price not found');
      if (!plugMat) warnings.push('⚠ Plug material price not found');
      if (!seatMat) warnings.push('⚠ Seat material price not found');
      if (!stemMat && product.stem_material_id) warnings.push('⚠ Stem material price not found');
      if (!cageMat && product.cage_material_id) warnings.push('⚠ Cage material price not found');

      // ---- Machining cost lookups (THE CRITICAL PART) ----
      const machComponents: Array<{ comp: string; type_key: string; mat_id: string; label: string }> = [
        { comp: 'body', type_key: product.end_connect_type, mat_id: product.body_bonnet_material_id, label: 'Body' },
        { comp: 'bonnet', type_key: product.bonnet_type, mat_id: product.body_bonnet_material_id, label: 'Bonnet' },
        { comp: 'plug', type_key: product.trim_type, mat_id: product.plug_material_id, label: 'Plug' },
        { comp: 'seat', type_key: product.trim_type, mat_id: product.seat_material_id, label: 'Seat' },
        { comp: 'stem', type_key: product.trim_type, mat_id: product.stem_material_id, label: 'Stem' },
        { comp: 'cage', type_key: product.trim_type, mat_id: product.cage_material_id, label: 'Cage' },
      ];
      const machCosts: Record<string, number> = {};
      for (const mc of machComponents) {
        if (!mc.mat_id) { machCosts[mc.comp] = 0; continue; }
        let query = supabase.from('machining_prices')
          .select('fixed_price')
          .eq('component', mc.comp)
          .eq('series_id', product.series_id)
          .eq('size', product.size)
          .eq('rating', product.rating)
          .eq('material_id', mc.mat_id)
          .eq('is_active', true);
        if (mc.type_key) query = query.eq('type_key', mc.type_key);
        const { data: mp } = await query.limit(1).single();
        machCosts[mc.comp] = mp?.fixed_price ?? 0;
        if (!mp) {
          warnings.push(`⚠ ${mc.label} machining not found (type="${mc.type_key}", size=${product.size}, rating=${product.rating})`);
        }
      }

      // ---- Calculate component costs ----
      const bodyCost = (bodyW?.weight_kg ?? 0) * (bbMat?.price_per_kg ?? 0) + machCosts['body'];
      const bonnetCost = (bonnetW?.weight_kg ?? 0) * (bbMat?.price_per_kg ?? 0) + machCosts['bonnet'];
      const plugCost = (plugW?.weight_kg ?? 0) * (plugMat?.price_per_kg ?? 0) + machCosts['plug'];
      const seatCost = (seatW?.weight_kg ?? 0) * (seatMat?.price_per_kg ?? 0) + machCosts['seat'];
      const stemCost = (stemW?.weight_kg ?? 0) * (stemMat?.price_per_kg ?? 0) + machCosts['stem'];
      const cageCost = (cageW?.weight_kg ?? 0) * (cageMat?.price_per_kg ?? 0) + machCosts['cage'];
      const sealCost = sealP?.fixed_price ?? 0;
      const pilotCost = (pilotW?.weight_kg ?? 0) * (plugMat?.price_per_kg ?? 0);
      const actCost = actP?.fixed_price ?? 0;
      const hwCost = hwP?.fixed_price ?? 0;

      // ---- Log full cost breakdown to console for debugging ----
      console.table({
        body: { weight: bodyW?.weight_kg ?? 0, matRate: bbMat?.price_per_kg ?? 0, machining: machCosts['body'], total: bodyCost },
        bonnet: { weight: bonnetW?.weight_kg ?? 0, matRate: bbMat?.price_per_kg ?? 0, machining: machCosts['bonnet'], total: bonnetCost },
        plug: { weight: plugW?.weight_kg ?? 0, matRate: plugMat?.price_per_kg ?? 0, machining: machCosts['plug'], total: plugCost },
        seat: { weight: seatW?.weight_kg ?? 0, matRate: seatMat?.price_per_kg ?? 0, machining: machCosts['seat'], total: seatCost },
        stem: { weight: stemW?.weight_kg ?? 0, matRate: stemMat?.price_per_kg ?? 0, machining: machCosts['stem'], total: stemCost },
        cage: { weight: cageW?.weight_kg ?? 0, matRate: cageMat?.price_per_kg ?? 0, machining: machCosts['cage'], total: cageCost },
        sealRing: { total: sealCost }, pilotPlug: { total: pilotCost },
        actuator: { total: actCost }, handwheel: { total: hwCost },
      });

      // Get commission from store
      const commPct = store.agent_commission_pct;

      // Calculate using pricing engine
      const tubingTotal = product.tubing_items.reduce((s, t) => s + t.price, 0);
      const testingTotal = product.testing_items.reduce((s, t) => s + t.price, 0);
      const accessoriesTotal = product.accessories.reduce((s, a) => s + a.unit_price * a.quantity, 0);

      const costs = {
        body: bodyCost, bonnet: bonnetCost, plug: plugCost, seat: seatCost,
        stem: stemCost, cage: cageCost, sealRing: sealCost, pilotPlug: pilotCost,
        tubing: tubingTotal, testing: testingTotal,
        actuator: actCost, handwheel: hwCost, accessories: accessoriesTotal,
      };
      const params = {
        mfgProfitPct: store.mfg_profit_pct,
        boProfitPct: store.bo_profit_pct,
        negMarginPct: store.neg_margin_pct,
        commissionPct: commPct,
        discountPct: product.discount_pct,
        quantity: product.quantity,
      };
      const result = calculateProductPrice(costs, params);

      store.updateProduct(productId, {
        body_cost: bodyCost,
        bonnet_cost: bonnetCost,
        plug_cost: plugCost,
        seat_cost: seatCost,
        stem_cost: stemCost,
        cage_cost: cageCost,
        seal_ring_cost: sealCost,
        pilot_plug_cost: pilotCost,
        actuator_cost: actCost,
        handwheel_cost: hwCost,
        unit_price: result.unitPrice,
        line_total: result.lineTotal,
      });

      // ---- Check for critical errors (zero costs that shouldn't be zero) ----
      const criticalMissing: string[] = [];
      if (bodyCost === 0 && bodyW) criticalMissing.push('Body material price is ₹0');
      if (bonnetCost === 0 && bonnetW) criticalMissing.push('Bonnet material price is ₹0');
      if (!bodyW) criticalMissing.push('Body weight data missing');
      if (!bonnetW) criticalMissing.push('Bonnet weight data missing');
      if (machCosts['body'] === 0) criticalMissing.push('Body machining cost missing');
      if (machCosts['bonnet'] === 0) criticalMissing.push('Bonnet machining cost missing');
      if (machCosts['plug'] === 0 && product.plug_material_id) criticalMissing.push('Plug machining cost missing');
      if (machCosts['seat'] === 0 && product.seat_material_id) criticalMissing.push('Seat machining cost missing');

      const hasCritical = criticalMissing.length > 0;

      // Store warnings on the product for display
      store.updateProduct(productId, {
        pricing_warnings: [...warnings, ...criticalMissing],
        has_pricing_errors: hasCritical,
      });

      // ---- Show result with warnings ----
      if (hasCritical) {
        toast.error(
          `⚠️ PRICING DATA MISSING — Cannot use this price.\n${criticalMissing.join('\n')}\n\nPlease contact the administrator to add the missing pricing data.`,
          { duration: 15000 }
        );
      } else if (warnings.length > 0) {
        toast.warning(
          `Price: ₹${result.unitPrice.toLocaleString('en-IN')} — but ${warnings.length} data gap(s) found (used ₹0 for missing items)`,
          { duration: 8000, description: warnings.join('\n') }
        );
      } else {
        toast.success(`Price calculated: ₹${result.unitPrice.toLocaleString('en-IN')} per unit — all data found ✓`);
      }
    } catch (err: unknown) {
      console.error('Calculate price error:', err);
      toast.error(`Failed to calculate price: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalculatingId(null);
    }
  }

  async function handleSave() {
    // Validations per PRD
    if (!store.customer_id) { toast.error('Please select a customer'); return; }
    if (!store.project_name.trim()) { toast.error('Project Name is required'); return; }
    if (!store.enquiry_id.trim()) { toast.error('Enquiry ID is required'); return; }
    if (store.products.length === 0) { toast.error('Please add at least one product'); return; }
    // Check for pricing errors
    const errorProducts = store.products.filter(p => p.has_pricing_errors);
    if (errorProducts.length > 0) {
      toast.error(`${errorProducts.length} product(s) have pricing data errors. Please fix them or contact the administrator.`);
      return;
    }
    if (store.packing_price <= 0) { toast.error('Packing price is required and must be > 0'); return; }
    if (!store.delivery_text.trim()) { toast.error('Delivery timeline is required'); return; }
    if (store.pricing_type === 'for-site' && store.freight_price <= 0) { toast.error('Freight price is required for F.O.R. pricing'); return; }
    if (store.pricing_type === 'custom' && !store.custom_pricing_title.trim()) { toast.error('Custom pricing title is required'); return; }
    const paymentTotal = store.payment_advance_pct + store.payment_approval_pct + store.payment_despatch_pct;
    if (paymentTotal !== 100) { toast.error('Payment terms must total exactly 100%'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate or use custom quote number
      let quoteNumber = store.custom_quote_number.trim();
      if (!quoteNumber) {
        const fyCode = (await import('@/lib/quoteHelpers')).generateFYCode();
        const { data: seqData } = await supabase.rpc('get_next_quote_sequence', { p_fy_code: fyCode });
        const seq = seqData ?? 1;
        quoteNumber = (await import('@/lib/quoteHelpers')).formatQuoteNumber(fyCode, seq);
      }

      // Calculate totals
      const customer = customers.find(c => c.id === store.customer_id);
      const lineItems = store.products.map(p => ({ lineTotal: p.line_total }));
      const customItems = store.pricing_type === 'custom' && store.custom_pricing_title.trim()
        ? [{ name: store.custom_pricing_title, price: store.custom_pricing_price }]
        : [];
      const quoteTotal = calculateQuoteTotal(
        lineItems,
        store.pricing_type,
        store.freight_price,
        customItems,
        store.packing_price,
        customer?.is_international ?? false
      );

      const quotePayload = {
        quote_number: quoteNumber,
        customer_id: store.customer_id,
        created_by: user.id,
        pricing_mode: store.pricing_mode,
        project_name: store.project_name.trim() || null,
        enquiry_id: store.enquiry_id.trim() || null,
        validity_days: store.validity_days,
        delivery_text: store.delivery_text,
        payment_advance_pct: store.payment_advance_pct,
        payment_approval_pct: store.payment_approval_pct,
        payment_despatch_pct: store.payment_despatch_pct,
        warranty_shipment_months: store.warranty_shipment_months,
        warranty_installation_months: store.warranty_installation_months,
        pricing_type: store.pricing_type,
        custom_pricing_title: store.pricing_type === 'custom' ? store.custom_pricing_title.trim() : null,
        custom_pricing_price: store.pricing_type === 'custom' ? store.custom_pricing_price : 0,
        freight_price: store.freight_price,
        packing_price: store.packing_price,
        exchange_rate_snapshot: exchangeRate,
        notes: store.notes || null,
        subtotal_inr: quoteTotal.subtotal,
        tax_amount_inr: quoteTotal.taxAmount,
        grand_total_inr: quoteTotal.grandTotal,
      };

      let quote: { id: string } | null = null;

      if (store.edit_mode && store.edit_quote_id) {
        // ── EDIT MODE: Update existing quote ──
        const { error: updErr } = await supabase.from('quotes')
          .update(quotePayload)
          .eq('id', store.edit_quote_id);
        if (updErr) throw updErr;
        quote = { id: store.edit_quote_id };

        // Delete old products (cascade deletes tubing/testing/accessories)
        await supabase.from('quote_products').delete().eq('quote_id', store.edit_quote_id);
      } else {
        // ── CREATE MODE: Insert new quote ──
        const { data: newQuote, error: quoteErr } = await supabase.from('quotes')
          .insert(quotePayload)
          .select('id').single();
        if (quoteErr) throw quoteErr;
        quote = newQuote;
      }

      if (!quote) throw new Error('Failed to save quote');

      // Insert products
      for (let i = 0; i < store.products.length; i++) {
        const p = store.products[i];
        const tubingCost = p.tubing_items.reduce((s, t) => s + t.price, 0);
        const testingCost = p.testing_items.reduce((s, t) => s + t.price, 0);
        const accessoriesCost = p.accessories.reduce((s, a) => s + a.unit_price * a.quantity, 0);

        const { data: qp, error: qpErr } = await supabase.from('quote_products').insert({
          quote_id: quote!.id,
          sort_order: i,
          tag_number: p.tag_number || null,
          quantity: p.quantity,
          series_id: p.series_id,
          size: p.size,
          rating: p.rating,
          end_connect_type: p.end_connect_type,
          bonnet_type: p.bonnet_type,
          trim_type: p.trim_type,
          body_bonnet_material_id: p.body_bonnet_material_id || null,
          plug_material_id: p.plug_material_id || null,
          seat_material_id: p.seat_material_id || null,
          stem_material_id: p.stem_material_id || null,
          cage_material_id: p.cage_material_id || null,
          seal_ring_type: p.seal_ring_type || null,
          has_pilot_plug: p.has_pilot_plug,
          has_actuator: p.has_actuator,
          actuator_model_id: p.actuator_model_id || null,
          has_handwheel: p.has_handwheel,
          handwheel_model_id: p.handwheel_model_id || null,
          mfg_profit_pct: store.mfg_profit_pct,
          bo_profit_pct: store.bo_profit_pct,
          neg_margin_pct: store.neg_margin_pct,
          commission_pct: store.agent_commission_pct,
          discount_pct: p.discount_pct,
          body_cost: p.body_cost,
          bonnet_cost: p.bonnet_cost,
          plug_cost: p.plug_cost,
          seat_cost: p.seat_cost,
          stem_cost: p.stem_cost,
          cage_cost: p.cage_cost,
          seal_ring_cost: p.seal_ring_cost,
          pilot_plug_cost: p.pilot_plug_cost,
          actuator_cost: p.actuator_cost,
          handwheel_cost: p.handwheel_cost,
          mfg_total_cost: p.body_cost + p.bonnet_cost + p.plug_cost + p.seat_cost + p.stem_cost + p.cage_cost + p.seal_ring_cost + p.pilot_plug_cost + p.actuator_cost + p.handwheel_cost + tubingCost + testingCost,
          bo_total_cost: accessoriesCost,
          unit_price_inr: p.unit_price,
          line_total_inr: p.line_total,
          description: `${p.series_name} | ${p.size} | ${p.rating} | ${p.end_connect_type}`,
        }).select('id').single();

        if (qpErr) throw qpErr;

        // Insert line items
        if (p.tubing_items.length > 0) {
          await supabase.from('product_tubing_items').insert(
            p.tubing_items.map(t => ({ quote_product_id: qp!.id, ...t }))
          );
        }
        if (p.testing_items.length > 0) {
          await supabase.from('product_testing_items').insert(
            p.testing_items.map(t => ({ quote_product_id: qp!.id, ...t }))
          );
        }
        if (p.accessories.length > 0) {
          await supabase.from('product_accessories').insert(
            p.accessories.map(a => ({ quote_product_id: qp!.id, ...a }))
          );
        }
      }

      toast.success(store.edit_mode ? `Quote ${quoteNumber} updated!` : `Quote ${quoteNumber} created!`);
      store.reset();
      router.push(store.edit_mode ? `/employee/quotes/${store.edit_quote_id}` : '/employee/quotes');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // ── Step Validators ──
  function validateStep(step: number): boolean {
    // Step 0: Customer & Project
    if (step === 0) {
      if (!store.customer_id) { toast.error('Please select a customer'); return false; }
      if (!store.project_name.trim()) { toast.error('Project Name is required'); return false; }
      if (!store.enquiry_id.trim()) { toast.error('Enquiry ID is required'); return false; }
      return true;
    }
    // Step 1: Products
    if (step === 1) {
      if (store.products.length === 0) { toast.error('Please add at least one product'); return false; }
      for (let i = 0; i < store.products.length; i++) {
        const p = store.products[i];
        const label = `Product ${i + 1}${p.tag_number ? ` (${p.tag_number})` : ''}`;
        if (!p.series_id) { toast.error(`${label}: Please select a Series`); return false; }
        if (!p.size) { toast.error(`${label}: Please select a Size`); return false; }
        if (!p.rating) { toast.error(`${label}: Please select a Rating`); return false; }
        if (!p.end_connect_type) { toast.error(`${label}: Please select End Connect Type`); return false; }
        if (!p.bonnet_type) { toast.error(`${label}: Please select Bonnet Type`); return false; }
        if (!p.trim_type) { toast.error(`${label}: Please select Trim Type`); return false; }
        if (!p.body_bonnet_material_id) { toast.error(`${label}: Please select Body & Bonnet Material`); return false; }
        if (!p.plug_material_id) { toast.error(`${label}: Please select Plug Material`); return false; }
        if (!p.seat_material_id) { toast.error(`${label}: Please select Seat Material`); return false; }
        if (!p.stem_material_id) { toast.error(`${label}: Please select Stem Material`); return false; }
        if (p.quantity < 1) { toast.error(`${label}: Quantity must be at least 1`); return false; }
        if (p.has_actuator && !p.actuator_model_id) { toast.error(`${label}: Please complete all Actuator selections`); return false; }
        if (p.has_handwheel && !p.handwheel_model_id) { toast.error(`${label}: Please complete all Handwheel selections`); return false; }
        if (p.unit_price <= 0) { toast.error(`${label}: Please click "Calculate Price" before proceeding`); return false; }
        if (p.has_pricing_errors) { toast.error(`${label}: Has pricing data errors. Please fix or contact administrator.`); return false; }
      }
      return true;
    }
    // Step 2: Terms & Pricing
    if (step === 2) {
      if (store.packing_price <= 0) { toast.error('Packing price is required and must be > 0'); return false; }
      if (!store.delivery_text.trim()) { toast.error('Delivery timeline is required (e.g. "4-6 working weeks")'); return false; }
      if (store.pricing_type === 'for-site' && store.freight_price <= 0) { toast.error('Freight price is required for F.O.R. pricing'); return false; }
      if (store.pricing_type === 'custom' && !store.custom_pricing_title.trim()) { toast.error('Custom pricing title is required'); return false; }
      const paymentTotal = store.payment_advance_pct + store.payment_approval_pct + store.payment_despatch_pct;
      if (paymentTotal !== 100) { toast.error(`Payment terms must total 100% (currently ${paymentTotal}%)`); return false; }
      return true;
    }
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{store.edit_mode ? 'Edit Quote' : 'Create New Quote'}</h1>
          <p className="text-muted-foreground text-sm mt-1">Step {store.currentStep + 1} of {STEPS.length}{store.edit_mode && ` • Editing ${store.custom_quote_number}`}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === store.currentStep;
          const isDone = i < store.currentStep;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-primary' : 'bg-border'}`} />}
              <button
                onClick={() => {
                  // Only validate when going forward
                  if (i > store.currentStep) {
                    for (let s = store.currentStep; s < i; s++) {
                      if (!validateStep(s)) return;
                    }
                  }
                  store.setCurrentStep(i);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isDone ? 'bg-primary/10 text-primary' :
                  'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Step Content */}
      {store.currentStep === 0 && (
        <StepCustomerProject customers={customers} />
      )}
      {store.currentStep === 1 && (
        <StepProducts series={series} materials={materials} lookupCosts={lookupCosts} customers={customers} exchangeRate={exchangeRate} bodyWeights={bodyWeights} bonnetWeights={bonnetWeights} actuatorModels={actuatorModels} handwheelPrices={handwheelPrices} calculatingId={calculatingId} testingPresets={testingPresets} tubingPresets={tubingPresets} sealRingRows={sealRingRows} machiningTypeRows={machiningTypeRows} />
      )}
      {store.currentStep === 2 && (
        <StepTermsPricing customers={customers} />
      )}
      {store.currentStep === 3 && (
        <StepReview customers={customers} saving={saving} onSave={handleSave} exchangeRate={exchangeRate} />
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => store.setCurrentStep(Math.max(0, store.currentStep - 1))}
          disabled={store.currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {store.currentStep < STEPS.length - 1 ? (
          <Button onClick={() => {
            if (validateStep(store.currentStep)) {
              store.setCurrentStep(store.currentStep + 1);
            }
          }}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {store.edit_mode ? 'Update Quote' : 'Save Quote'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// STEP 1: Customer & Project
// ===================================================================

function StepCustomerProject({ customers }: { customers: Customer[] }) {
  const store = useQuoteStore();
  const selectedCustomer = customers.find(c => c.id === store.customer_id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Customer & Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select value={store.customer_id} onValueChange={(v) => {
              const c = customers.find(c => c.id === v);
              store.setQuoteSettings({
                customer_id: v ?? '',
                customer_name: c?.name ?? '',
                agent_commission_pct: c?.customer_type === 'dealer' ? (c?.commission_pct ?? 0) : 0,
              });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer">
                  {(() => { const c = customers.find(c => c.id === store.customer_id); return c ? `${c.name}${c.company ? ` (${c.company})` : ''}${c.is_international ? ' 🌍' : ''}` : 'Select customer'; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                    {c.is_international && ' 🌍'}
                    {c.customer_type === 'dealer' && ' 🤝'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{selectedCustomer.customer_type === 'dealer' ? 'Dealer' : 'Direct'}</Badge>
                <Badge variant="outline" className="text-xs">{selectedCustomer.is_international ? 'International (USD)' : 'India (INR)'}</Badge>
                {selectedCustomer.gstin && <Badge variant="outline" className="text-xs">GSTIN: {selectedCustomer.gstin}</Badge>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={store.project_name} onChange={(e) => store.setQuoteSettings({ project_name: e.target.value })} placeholder="e.g. IOCL Refinery" />
            </div>
            <div className="space-y-2">
              <Label>Enquiry ID *</Label>
              <Input value={store.enquiry_id} onChange={(e) => store.setQuoteSettings({ enquiry_id: e.target.value })} placeholder="e.g. ENQ-2026-001" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Custom Quote Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={store.custom_quote_number} onChange={(e) => store.setQuoteSettings({ custom_quote_number: e.target.value })} placeholder="Leave blank for auto-generated" />
            <p className="text-xs text-muted-foreground">If left empty, a quote number will be auto-generated on save.</p>
          </div>
          <div className="space-y-2">
            <Label>Pricing Mode</Label>
            <Select value={store.pricing_mode} onValueChange={(v) => store.setQuoteSettings({ pricing_mode: (v ?? 'standard') as 'standard' | 'project' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Standard uses default margins, Project uses project-specific margins.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// STEP 3: Terms & Pricing
// ===================================================================

function StepTermsPricing({ customers }: { customers: Customer[] }) {
  const store = useQuoteStore();
  const selectedCustomer = customers.find(c => c.id === store.customer_id);
  const isDealer = selectedCustomer?.customer_type === 'dealer';
  const paymentTotal = store.payment_advance_pct + store.payment_approval_pct + store.payment_despatch_pct;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column: Pricing & Charges */}
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Charges</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select value={store.pricing_type} onValueChange={(v) => store.setQuoteSettings({ pricing_type: (v ?? 'ex-works') as 'ex-works' | 'for-site' | 'custom' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ex-works">Ex-Works</SelectItem>
                  <SelectItem value="for-site">F.O.R. Site</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom pricing — single title + price */}
            {store.pricing_type === 'custom' && (
              <div className="rounded-lg border-2 border-violet-200 bg-violet-50/30 dark:bg-violet-950/10 p-4 space-y-3">
                <p className="text-xs font-bold text-violet-800 dark:text-violet-400 uppercase tracking-wider">Custom Pricing Item</p>
                <div className="space-y-2">
                  <Label className="text-xs">Title *</Label>
                  <Input value={store.custom_pricing_title} onChange={(e) => store.setQuoteSettings({ custom_pricing_title: e.target.value })} placeholder="e.g. Installation Charges, Supervision Charges" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Price (₹) *</Label>
                  <Input type="number" min="0" value={store.custom_pricing_price || ''} onChange={(e) => store.setQuoteSettings({ custom_pricing_price: e.target.value === '' ? 0 : Number(e.target.value) })} placeholder="0" />
                </div>
                {store.custom_pricing_title && store.custom_pricing_price > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {store.custom_pricing_title}: <strong>₹{store.custom_pricing_price.toLocaleString('en-IN')}</strong>
                  </p>
                )}
              </div>
            )}

            {isDealer && (
              <div className="space-y-2">
                <Label>Agent Commission %</Label>
                <Input type="number" min="0" max="100" value={store.agent_commission_pct || ''} onChange={(e) => store.setQuoteSettings({ agent_commission_pct: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {store.pricing_type !== 'ex-works' && (
                <div className="space-y-2">
                  <Label>Freight (₹) *</Label>
                  <Input type="number" min="0" value={store.freight_price || ''} onChange={(e) => store.setQuoteSettings({ freight_price: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Packing Charges (₹) *</Label>
                <Input type="number" min="0" value={store.packing_price || ''} onChange={(e) => store.setQuoteSettings({ packing_price: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column: Terms & Conditions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Validity (days)</Label>
              <Select value={String(store.validity_days)} onValueChange={(v) => store.setQuoteSettings({ validity_days: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map(d => (
                    <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery *</Label>
              <Input value={store.delivery_text} onChange={(e) => store.setQuoteSettings({ delivery_text: e.target.value })} placeholder="e.g. 4-6 working weeks" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payment Terms</Label>
              <Badge variant={paymentTotal === 100 ? 'default' : 'destructive'} className="text-xs">
                Total: {paymentTotal}% {paymentTotal === 100 ? '✓' : '≠ 100%'}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Advance %</Label>
                <Input type="number" min="0" max="100" value={store.payment_advance_pct || ''} onChange={(e) => store.setQuoteSettings({ payment_advance_pct: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">On Approval %</Label>
                <Input type="number" min="0" max="100" value={store.payment_approval_pct || ''} onChange={(e) => store.setQuoteSettings({ payment_approval_pct: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Before Despatch %</Label>
                <Input type="number" min="0" max="100" value={store.payment_despatch_pct || ''} onChange={(e) => store.setQuoteSettings({ payment_despatch_pct: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Warranty — Shipment (months)</Label>
              <Input type="number" min="0" value={store.warranty_shipment_months || ''} onChange={(e) => store.setQuoteSettings({ warranty_shipment_months: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Warranty — Installation (months)</Label>
              <Input type="number" min="0" value={store.warranty_installation_months || ''} onChange={(e) => store.setQuoteSettings({ warranty_installation_months: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={store.notes} onChange={(e) => store.setQuoteSettings({ notes: e.target.value })} placeholder="Internal notes (not shown on PDF)" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// STEP 2: Products
// ===================================================================

function StepProducts({
  series, materials, lookupCosts, customers, exchangeRate, bodyWeights, bonnetWeights, actuatorModels, handwheelPrices, calculatingId, testingPresets, tubingPresets, sealRingRows, machiningTypeRows,
}: {
  series: Array<{ id: string; series_number: string; series_name: string; product_type: string; has_cage: boolean; has_seal_ring: boolean }>;
  materials: Record<string, Array<{ id: string; material_name: string; price_per_kg: number }>>;
  lookupCosts: (id: string) => Promise<void>;
  customers: Customer[];
  exchangeRate: number;
  bodyWeights: BodyWeightRow[];
  bonnetWeights: BonnetWeightRow[];
  actuatorModels: ActuatorRow[];
  handwheelPrices: HandwheelRow[];
  calculatingId: string | null;
  testingPresets: TestingPresetRow[];
  tubingPresets: TubingPresetRow[];
  sealRingRows: SealRingRow[];
  machiningTypeRows: MachiningTypeRow[];
}) {
  const store = useQuoteStore();
  const customer = customers.find(c => c.id === store.customer_id);
  const isIntl = customer?.is_international ?? false;
  const sym = isIntl ? '$' : '₹';
  const fmt = (v: number) => isIntl
    ? `$${convertToUSD(v, exchangeRate).toLocaleString('en-US')}`
    : `₹${v.toLocaleString('en-IN')}`;

  // Helper: get material name by id and group
  const getMatName = (group: string, id: string) => {
    const m = (materials[group] ?? []).find(m => m.id === id);
    return m ? `${m.material_name} (₹${m.price_per_kg}/kg)` : 'Select';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{store.products.length} product(s) added</p>
        <Button onClick={() => store.addProduct()} variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {store.products.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products added yet</p>
            <Button onClick={() => store.addProduct()} variant="outline" size="sm" className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add First Product
            </Button>
          </CardContent>
        </Card>
      )}

      {store.products.map((product, idx) => {
        const selectedSeries = series.find(s => s.id === product.series_id);
        const hasCage = selectedSeries?.has_cage ?? false;
        const hasSealRing = selectedSeries?.has_seal_ring ?? false;

        return (
        <div key={product.id} className="space-y-4">
          {/* ── Product Header ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Product #{idx + 1}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { store.duplicateProduct(product.id); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => store.removeProduct(product.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Row: Series, Size, Rating, Qty ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Series *</Label>
                  <Select value={product.series_id} onValueChange={(v) => {
                    const s = series.find(s => s.id === v);
                    store.updateProduct(product.id, {
                      series_id: v ?? '', series_name: s?.series_name ?? '',
                      // Reset ALL downstream fields when series changes
                      size: '', rating: '', end_connect_type: '', bonnet_type: '', trim_type: '',
                      body_bonnet_material_id: '', body_bonnet_material_name: '',
                      plug_material_id: '', plug_material_name: '',
                      seat_material_id: '', seat_material_name: '',
                      stem_material_id: '', stem_material_name: '',
                      cage_material_id: '', cage_material_name: '',
                      seal_ring_type: '', has_pilot_plug: false,
                      unit_price: 0, line_total: 0,
                    });
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select">
                        {(() => { const s = series.find(s => s.id === product.series_id); return s ? `${s.series_number} — ${s.series_name}` : 'Select'; })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.series_number} — {s.series_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Size *</Label>
                  {(() => {
                    const sizesForSeries = [...new Set(bodyWeights.filter(bw => bw.series_id === product.series_id).map(bw => bw.size))];
                    return (
                  <Select value={product.size || ''} onValueChange={(v) => store.updateProduct(product.id, { size: v ?? '', rating: '', end_connect_type: '', bonnet_type: '', unit_price: 0, line_total: 0 })} disabled={!product.series_id}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={product.series_id ? 'Select' : 'Pick series first'} /></SelectTrigger>
                      <SelectContent>
                        {sizesForSeries.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rating *</Label>
                  {(() => {
                    const ratingsForSize = [...new Set(bodyWeights.filter(bw => bw.series_id === product.series_id && bw.size === product.size).map(bw => bw.rating))];
                    return (
                    <Select value={product.rating || ''} onValueChange={(v) => store.updateProduct(product.id, { rating: v ?? '', end_connect_type: '', bonnet_type: '', unit_price: 0, line_total: 0 })} disabled={!product.size}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={product.size ? 'Select' : 'Pick size first'} /></SelectTrigger>
                      <SelectContent>
                        {ratingsForSize.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qty</Label>
                  <Input className="h-9" type="number" min="1" value={product.quantity || ''} onChange={(e) => store.updateProduct(product.id, { quantity: e.target.value === '' ? 1 : Number(e.target.value) })} />
                </div>
              </div>

              {/* Trim Type (standalone) — from DB machining_prices type_key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trim Type</Label>
                {(() => {
                  // Get distinct trim type_keys from machining_prices for plug component matching this series
                  const trimTypes = [...new Set(machiningTypeRows.filter(m => m.component === 'plug' && m.series_id === product.series_id).map(m => m.type_key))];
                  return (
                  <Select value={product.trim_type || ''} onValueChange={(v) => store.updateProduct(product.id, { trim_type: v ?? '' })} disabled={!product.series_id}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.series_id ? 'Select trim type' : 'Pick series first'} /></SelectTrigger>
                    <SelectContent>
                      {trimTypes.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  );
                })()}
              </div>

              {/* Tag Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tag #</Label>
                <Input className="h-9" value={product.tag_number} onChange={(e) => store.updateProduct(product.id, { tag_number: e.target.value })} placeholder="Optional tag number" />
              </div>
            </CardContent>
          </Card>

          {/* ── Body Sub-Assembly ── */}
          {product.series_id && product.size && product.rating ? (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-4">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              🔧 Body Sub-Assembly
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Body */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Body</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Connect Type *</Label>
                  {(() => {
                    const endConnects = [...new Set(bodyWeights.filter(bw => bw.series_id === product.series_id && bw.size === product.size && bw.rating === product.rating).map(bw => bw.end_connect_type).filter(Boolean))];
                    return (
                    <Select value={product.end_connect_type || ''} onValueChange={(v) => store.updateProduct(product.id, { end_connect_type: v ?? '' })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={product.rating ? 'Select' : 'Pick rating first'} /></SelectTrigger>
                      <SelectContent>
                        {endConnects.map((ec: string) => (
                          <SelectItem key={ec} value={ec}>{ec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Material (Body & Bonnet) *</Label>
                  <Select value={product.body_bonnet_material_id} onValueChange={(v) => {
                    const m = (materials['BodyBonnet'] ?? []).find(m => m.id === v);
                    store.updateProduct(product.id, { body_bonnet_material_id: v ?? '', body_bonnet_material_name: m?.material_name ?? '' });
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select">
                        {getMatName('BodyBonnet', product.body_bonnet_material_id)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(materials['BodyBonnet'] ?? []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.material_name} (₹{m.price_per_kg}/kg)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bonnet */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bonnet</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bonnet Type *</Label>
                  {(() => {
                    const bonnetTypes = [...new Set(bonnetWeights.filter(bw => bw.series_id === product.series_id && bw.size === product.size && bw.rating === product.rating).map(bw => bw.bonnet_type).filter(Boolean))];
                    return (
                    <Select value={product.bonnet_type || ''} onValueChange={(v) => store.updateProduct(product.id, { bonnet_type: v ?? '' })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={product.rating ? 'Select' : 'Pick rating first'} /></SelectTrigger>
                      <SelectContent>
                        {bonnetTypes.map((bt: string) => (
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  })()}
                </div>
              </div>

              {/* Plug */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Plug</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plug Material *</Label>
                  <Select value={product.plug_material_id} onValueChange={(v) => {
                    const m = (materials['Plug'] ?? []).find(m => m.id === v);
                    store.updateProduct(product.id, { plug_material_id: v ?? '', plug_material_name: m?.material_name ?? '' });
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select">
                        {getMatName('Plug', product.plug_material_id)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(materials['Plug'] ?? []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.material_name} (₹{m.price_per_kg}/kg)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seat */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seat</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Seat Material *</Label>
                  <Select value={product.seat_material_id} onValueChange={(v) => {
                    const m = (materials['Seat'] ?? []).find(m => m.id === v);
                    store.updateProduct(product.id, { seat_material_id: v ?? '', seat_material_name: m?.material_name ?? '' });
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select">
                        {getMatName('Seat', product.seat_material_id)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(materials['Seat'] ?? []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.material_name} (₹{m.price_per_kg}/kg)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stem */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stem</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stem Material *</Label>
                  <Select value={product.stem_material_id} onValueChange={(v) => {
                    const m = (materials['Stem'] ?? []).find(m => m.id === v);
                    store.updateProduct(product.id, { stem_material_id: v ?? '', stem_material_name: m?.material_name ?? '' });
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select">
                        {getMatName('Stem', product.stem_material_id)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(materials['Stem'] ?? []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.material_name} (₹{m.price_per_kg}/kg)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cage */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cage</p>
                {hasCage ? (
                  <>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">✓ Cage available for this series</Badge>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cage Material *</Label>
                      <Select value={product.cage_material_id} onValueChange={(v) => {
                        const m = (materials['Cage'] ?? []).find(m => m.id === v);
                        store.updateProduct(product.id, { cage_material_id: v ?? '', cage_material_name: m?.material_name ?? '' });
                      }}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select">
                            {getMatName('Cage', product.cage_material_id)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(materials['Cage'] ?? []).map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.material_name} (₹{m.price_per_kg}/kg)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not applicable for this series</p>
                )}
              </div>

              {/* Seal Ring */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seal Ring</p>
                {hasSealRing ? (
                  <>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">✓ Seal Ring available for this series</Badge>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Seal Type *</Label>
                      {(() => {
                        const sealTypes = [...new Set(sealRingRows.filter(sr => sr.series_id === product.series_id && sr.size === product.size && sr.rating === product.rating).map(sr => sr.seal_type))];
                        return (
                        <Select value={product.seal_ring_type || ''} onValueChange={(v) => store.updateProduct(product.id, { seal_ring_type: v ?? '' })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder={sealTypes.length > 0 ? 'Select' : 'No seal types available'} /></SelectTrigger>
                          <SelectContent>
                            {sealTypes.map((s: string) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not applicable for this series</p>
                )}
              </div>

              {/* Pilot Plug */}
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilot Plug</p>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={product.has_pilot_plug} onChange={(e) => store.updateProduct(product.id, { has_pilot_plug: e.target.checked })} className="rounded border-gray-300" />
                    <span className="text-xs">Add Pilot Plug</span>
                  </label>
                </div>
                {product.has_pilot_plug ? (
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">✓ Pilot Plug included</Badge>
                    <p className="text-xs text-muted-foreground">
                     Material: <strong>{product.plug_material_id ? getMatName('Plug', product.plug_material_id) : '⚠ Select Plug Material first'}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground italic">Cost = Pilot Plug Weight × Plug Material Rate</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Check above to include (cost = weight × plug material rate)</p>
                )}
              </div>
            </div>
          </div>
          ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 dark:bg-gray-900/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">🔧 Select Series, Size, and Rating above to configure Body Sub-Assembly</p>
          </div>
          )}

          {/* ── Tubing & Fitting (Manufacturing Cost) ── */}
          <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/30 dark:bg-cyan-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-400 flex items-center gap-2">
                🔩 Tubing & Fitting
              </h3>
              <div className="flex items-center gap-1.5">
                {(() => { const mt = tubingPresets.filter(tp => tp.series_id === product.series_id && tp.size === product.size && tp.rating === product.rating); return mt.length > 0 ? (
                  <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => {
                    const presetItems = mt.map(tp => ({ item_name: tp.item_name, price: Number(tp.price), is_preset: true }));
                    store.updateProduct(product.id, { tubing_items: [...product.tubing_items, ...presetItems] });
                  }}>📋 Load Presets ({mt.length})</Button>
                ) : null; })()}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  store.updateProduct(product.id, { tubing_items: [...product.tubing_items, { item_name: '', price: 0, is_preset: false }] });
                }}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
            {product.tubing_items.length === 0 && <p className="text-xs text-muted-foreground italic">No tubing items added.</p>}
            {product.tubing_items.map((item, ti) => (
              <div key={ti} className="flex items-center gap-2">
                <Input className="h-8 text-xs flex-1" placeholder="Item name" value={item.item_name} onChange={(e) => {
                  const items = [...product.tubing_items]; items[ti] = { ...items[ti], item_name: e.target.value }; store.updateProduct(product.id, { tubing_items: items });
                }} />
                <Input className="h-8 text-xs w-28" type="number" min="0" placeholder="Price" value={item.price || ''} onChange={(e) => {
                  const items = [...product.tubing_items]; items[ti] = { ...items[ti], price: e.target.value === '' ? 0 : Number(e.target.value) }; store.updateProduct(product.id, { tubing_items: items });
                }} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                  const items = product.tubing_items.filter((_, j) => j !== ti); store.updateProduct(product.id, { tubing_items: items });
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {product.tubing_items.length > 0 && (
              <p className="text-xs text-right text-muted-foreground">Tubing Total: ₹{product.tubing_items.reduce((s, t) => s + t.price, 0).toLocaleString('en-IN')}</p>
            )}
          </div>

          {/* ── Testing (Manufacturing Cost) ── */}
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/30 dark:bg-teal-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-800 dark:text-teal-400 flex items-center gap-2">
                🧪 Testing
              </h3>
              <div className="flex items-center gap-1.5">
                {(() => { const mt = testingPresets.filter(tp => tp.series_id === product.series_id && tp.size === product.size && tp.rating === product.rating); return mt.length > 0 ? (
                  <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => {
                    const presetItems = mt.map(tp => ({ item_name: tp.test_name, price: Number(tp.price), is_preset: true }));
                    store.updateProduct(product.id, { testing_items: [...product.testing_items, ...presetItems] });
                  }}>📋 Load Presets ({mt.length})</Button>
                ) : null; })()}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  store.updateProduct(product.id, { testing_items: [...product.testing_items, { item_name: '', price: 0, is_preset: false }] });
                }}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
            {product.testing_items.length === 0 && <p className="text-xs text-muted-foreground italic">No testing items added.</p>}
            {product.testing_items.map((item, ti) => (
              <div key={ti} className="flex items-center gap-2">
                <Input className="h-8 text-xs flex-1" placeholder="Test name" value={item.item_name} onChange={(e) => {
                  const items = [...product.testing_items]; items[ti] = { ...items[ti], item_name: e.target.value }; store.updateProduct(product.id, { testing_items: items });
                }} />
                <Input className="h-8 text-xs w-28" type="number" min="0" placeholder="Price" value={item.price || ''} onChange={(e) => {
                  const items = [...product.testing_items]; items[ti] = { ...items[ti], price: e.target.value === '' ? 0 : Number(e.target.value) }; store.updateProduct(product.id, { testing_items: items });
                }} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                  const items = product.testing_items.filter((_, j) => j !== ti); store.updateProduct(product.id, { testing_items: items });
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {product.testing_items.length > 0 && (
              <p className="text-xs text-right text-muted-foreground">Testing Total: ₹{product.testing_items.reduce((s, t) => s + t.price, 0).toLocaleString('en-IN')}</p>
            )}
          </div>

          {/* ── Accessories (Bought-out Cost) ── */}
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                🧰 Accessories (Bought-out)
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                store.updateProduct(product.id, { accessories: [...product.accessories, { item_name: '', unit_price: 0, quantity: 1 }] });
              }}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            {product.accessories.length === 0 && <p className="text-xs text-muted-foreground italic">No accessories. Click "Add Item" to add.</p>}
            {product.accessories.map((item, ai) => (
              <div key={ai} className="flex items-center gap-2">
                <Input className="h-8 text-xs flex-1" placeholder="Item name" value={item.item_name} onChange={(e) => {
                  const items = [...product.accessories]; items[ai] = { ...items[ai], item_name: e.target.value }; store.updateProduct(product.id, { accessories: items });
                }} />
                <Input className="h-8 text-xs w-24" type="number" min="0" placeholder="Price" value={item.unit_price || ''} onChange={(e) => {
                  const items = [...product.accessories]; items[ai] = { ...items[ai], unit_price: e.target.value === '' ? 0 : Number(e.target.value) }; store.updateProduct(product.id, { accessories: items });
                }} />
                <Input className="h-8 text-xs w-16" type="number" min="1" placeholder="Qty" value={item.quantity || ''} onChange={(e) => {
                  const items = [...product.accessories]; items[ai] = { ...items[ai], quantity: e.target.value === '' ? 1 : Number(e.target.value) }; store.updateProduct(product.id, { accessories: items });
                }} />
                <span className="text-xs text-muted-foreground w-20 text-right">₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                  const items = product.accessories.filter((_, j) => j !== ai); store.updateProduct(product.id, { accessories: items });
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {product.accessories.length > 0 && (
              <p className="text-xs text-right text-muted-foreground">Accessories Total: ₹{product.accessories.reduce((s, a) => s + a.unit_price * a.quantity, 0).toLocaleString('en-IN')}</p>
            )}
          </div>

          {/* ── Actuator Sub-Assembly ── */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                ⚙️ Actuator Sub-Assembly
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={product.has_actuator} onChange={(e) => store.updateProduct(product.id, { has_actuator: e.target.checked, actuator_type: '', actuator_series: '', actuator_model_id: '', actuator_model_name: '', actuator_standard_special: '' })} className="rounded border-gray-300" />
                <span className="text-xs font-medium">Add Actuator</span>
              </label>
            </div>
            {product.has_actuator && (() => {
              const actTypes = [...new Set(actuatorModels.map(a => a.type))];
              const actSeries = [...new Set(actuatorModels.filter(a => a.type === product.actuator_type).map(a => a.series))];
              const actModels = [...new Set(actuatorModels.filter(a => a.type === product.actuator_type && a.series === product.actuator_series).map(a => a.model))];
              const actStdSpc = [...new Set(actuatorModels.filter(a => a.type === product.actuator_type && a.series === product.actuator_series && a.model === product.actuator_model_name).map(a => a.standard_special))];
              return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Actuator Type *</Label>
                  <Select value={product.actuator_type || ''} onValueChange={(v) => store.updateProduct(product.id, { actuator_type: v ?? '', actuator_series: '', actuator_model_id: '', actuator_model_name: '', actuator_standard_special: '' })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {actTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Actuator Series *</Label>
                  <Select value={product.actuator_series || ''} onValueChange={(v) => store.updateProduct(product.id, { actuator_series: v ?? '', actuator_model_id: '', actuator_model_name: '', actuator_standard_special: '' })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.actuator_type ? 'Select series...' : 'Pick type first'} /></SelectTrigger>
                    <SelectContent>
                      {actSeries.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Actuator Model *</Label>
                  <Select value={product.actuator_model_name || ''} onValueChange={(v) => {
                    const match = actuatorModels.find(a => a.type === product.actuator_type && a.series === product.actuator_series && a.model === v);
                    store.updateProduct(product.id, { actuator_model_name: v ?? '', actuator_model_id: match?.id ?? '', actuator_standard_special: '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.actuator_series ? 'Select model...' : 'Pick series first'} /></SelectTrigger>
                    <SelectContent>
                      {actModels.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Standard / Special *</Label>
                  <Select value={product.actuator_standard_special || ''} onValueChange={(v) => {
                    const match = actuatorModels.find(a => a.type === product.actuator_type && a.series === product.actuator_series && a.model === product.actuator_model_name && a.standard_special === v);
                    store.updateProduct(product.id, { actuator_standard_special: v ?? '', actuator_model_id: match?.id ?? '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.actuator_model_name ? 'Select...' : 'Pick model first'} /></SelectTrigger>
                    <SelectContent>
                      {actStdSpc.map(s => {
                        const m = actuatorModels.find(a => a.type === product.actuator_type && a.series === product.actuator_series && a.model === product.actuator_model_name && a.standard_special === s);
                        return <SelectItem key={s} value={s}>{s} {m ? `(₹${m.fixed_price.toLocaleString('en-IN')})` : ''}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              );
            })()}
          </div>

          {/* ── Handwheel (Optional) ── */}
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-purple-800 dark:text-purple-400 flex items-center gap-2">
                🎡 Handwheel (Optional)
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={product.has_handwheel} onChange={(e) => store.updateProduct(product.id, { has_handwheel: e.target.checked, handwheel_type: '', handwheel_series: '', handwheel_model_id: '', handwheel_model_name: '', handwheel_standard_special: '' })} className="rounded border-gray-300" />
                <span className="text-xs font-medium">Add Handwheel</span>
              </label>
            </div>
            {product.has_handwheel && (() => {
              const hwTypes = [...new Set(handwheelPrices.map(h => h.type))];
              const hwSeries = [...new Set(handwheelPrices.filter(h => h.type === product.handwheel_type).map(h => h.series))];
              const hwModels = [...new Set(handwheelPrices.filter(h => h.type === product.handwheel_type && h.series === product.handwheel_series).map(h => h.model))];
              const hwStdSpc = [...new Set(handwheelPrices.filter(h => h.type === product.handwheel_type && h.series === product.handwheel_series && h.model === product.handwheel_model_name).map(h => h.standard_special))];
              return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Handwheel Type *</Label>
                  <Select value={product.handwheel_type || ''} onValueChange={(v) => store.updateProduct(product.id, { handwheel_type: v ?? '', handwheel_series: '', handwheel_model_id: '', handwheel_model_name: '', handwheel_standard_special: '' })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Search type..." /></SelectTrigger>
                    <SelectContent>
                      {hwTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Handwheel Series *</Label>
                  <Select value={product.handwheel_series || ''} onValueChange={(v) => store.updateProduct(product.id, { handwheel_series: v ?? '', handwheel_model_id: '', handwheel_model_name: '', handwheel_standard_special: '' })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.handwheel_type ? 'Search series...' : 'Pick type first'} /></SelectTrigger>
                    <SelectContent>
                      {hwSeries.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Handwheel Model *</Label>
                  <Select value={product.handwheel_model_name || ''} onValueChange={(v) => {
                    const match = handwheelPrices.find(h => h.type === product.handwheel_type && h.series === product.handwheel_series && h.model === v);
                    store.updateProduct(product.id, { handwheel_model_name: v ?? '', handwheel_model_id: match?.id ?? '', handwheel_standard_special: '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.handwheel_series ? 'Search model...' : 'Pick series first'} /></SelectTrigger>
                    <SelectContent>
                      {hwModels.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Standard / Special *</Label>
                  <Select value={product.handwheel_standard_special || ''} onValueChange={(v) => {
                    const match = handwheelPrices.find(h => h.type === product.handwheel_type && h.series === product.handwheel_series && h.model === product.handwheel_model_name && h.standard_special === v);
                    store.updateProduct(product.id, { handwheel_standard_special: v ?? '', handwheel_model_id: match?.id ?? '' });
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={product.handwheel_model_name ? 'Select...' : 'Pick model first'} /></SelectTrigger>
                    <SelectContent>
                      {hwStdSpc.map(s => {
                        const m = handwheelPrices.find(h => h.type === product.handwheel_type && h.series === product.handwheel_series && h.model === product.handwheel_model_name && h.standard_special === s);
                        return <SelectItem key={s} value={s}>{s} {m ? `(₹${m.fixed_price.toLocaleString('en-IN')})` : ''}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              );
            })()}
          </div>

          {/* ── Discount + Calculate ── */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1.5 w-32">
                  <Label className="text-xs font-semibold">Discount %</Label>
                  <Input className="h-9" type="number" min="0" max="100" value={product.discount_pct || ''} onChange={(e) => store.updateProduct(product.id, { discount_pct: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => lookupCosts(product.id)} disabled={calculatingId === product.id}>
                  {calculatingId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                  {calculatingId === product.id ? 'Calculating...' : 'Calculate Price'}
                </Button>
                {product.unit_price > 0 && !product.has_pricing_errors && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">Unit Price</p>
                    <p className="text-lg font-bold">{fmt(product.unit_price)}</p>
                    {isIntl && <p className="text-xs text-muted-foreground">(₹{product.unit_price.toLocaleString('en-IN')} INR)</p>}
                    <p className="text-xs text-muted-foreground">Line Total: {fmt(product.line_total)}</p>
                    {isIntl && <p className="text-[10px] text-muted-foreground">(₹{product.line_total.toLocaleString('en-IN')} INR)</p>}
                  </div>
                )}
              </div>
              {/* Pricing error warnings */}
              {product.has_pricing_errors && product.pricing_warnings.length > 0 && (
                <div className="mt-3 rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950/20 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase">Pricing Data Missing — Cannot Save</p>
                  </div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                    {product.pricing_warnings.map((w, wi) => <li key={wi}>{w}</li>)}
                  </ul>
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mt-1">
                    ⚠️ Please contact the administrator to add the missing pricing data.
                  </p>
                </div>
              )}
              {/* Non-critical warnings */}
              {!product.has_pricing_errors && product.pricing_warnings.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠ {product.pricing_warnings.length} data gap(s) — ₹0 used for missing items</p>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                    {product.pricing_warnings.map((w, wi) => <li key={wi}>{w}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {idx < store.products.length - 1 && <Separator className="my-6" />}
        </div>
        );
      })}
    </div>
  );
}

// ===================================================================
// STEP 4: Review & Save
// ===================================================================

function StepReview({ customers, saving, onSave, exchangeRate }: { customers: Customer[]; saving: boolean; onSave: () => void; exchangeRate: number }) {
  const store = useQuoteStore();
  const customer = customers.find(c => c.id === store.customer_id);
  const isIntl = customer?.is_international ?? false;
  const taxPct = isIntl ? 0 : 18;
  const subtotal = store.products.reduce((s, p) => s + p.line_total, 0);
  const freight = store.pricing_type !== 'ex-works' ? store.freight_price : 0;
  const packing = store.packing_price;
  const customCharge = store.pricing_type === 'custom' ? store.custom_pricing_price : 0;
  const taxableAmount = subtotal + freight + packing + customCharge;
  const taxAmount = Math.round(taxableAmount * taxPct / 100);
  const grandTotal = taxableAmount + taxAmount;

  const fmt = (v: number) => isIntl
    ? `$${convertToUSD(v, exchangeRate).toLocaleString('en-US')}`
    : `₹${v.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Quote Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{customer?.name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span>{customer?.company ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{customer?.country}{isIntl && ' 🌍'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><Badge variant={isIntl ? 'default' : 'secondary'} className="text-[10px]">{isIntl ? 'USD ($)' : 'INR (₹)'}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="secondary" className="text-[10px]">{customer?.customer_type}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pricing Mode</span><Badge variant="outline" className="text-[10px] capitalize">{store.pricing_mode}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pricing Type</span><span className="capitalize">{store.pricing_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Validity</span><span>{store.validity_days} days</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{store.delivery_text}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Products ({store.products.length})</span><span>{fmt(subtotal)}</span></div>
            {freight > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Freight</span><span>{fmt(freight)}</span></div>}
            {packing > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Packing</span><span>{fmt(packing)}</span></div>}
            {store.pricing_type === 'custom' && store.custom_pricing_title && customCharge > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">{store.custom_pricing_title}</span><span>{fmt(customCharge)}</span></div>
            )}
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>{fmt(taxableAmount)}</span></div>
            {!isIntl && (
              <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>{fmt(taxAmount)}</span></div>
            )}
            {isIntl && (
              <div className="flex justify-between text-muted-foreground/60"><span>GST</span><span>N/A (International)</span></div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Grand Total</span>
              <span className="text-primary">{fmt(grandTotal)}</span>
            </div>
            {isIntl && (
              <p className="text-[10px] text-muted-foreground">Exchange Rate: 1 USD = ₹{exchangeRate}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Products</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {store.products.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.series_name || `Product #${i + 1}`}</p>
                  <p className="text-xs text-muted-foreground">{p.size} | {p.rating} | {p.end_connect_type} | Qty: {p.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(p.unit_price)}</p>
                  <p className="text-xs text-muted-foreground">Line: {fmt(p.line_total)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
