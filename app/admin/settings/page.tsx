'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import type { StandardMargins, ProjectMargins, ExchangeRate, CompanyInfo } from '@/types';

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [standardMargins, setStandardMargins] = useState<StandardMargins>({
    mfg_profit_pct: 25, bo_profit_pct: 15, neg_margin_pct: 5,
  });
  const [projectMargins, setProjectMargins] = useState<ProjectMargins>({
    mfg_profit_pct: 20, bo_profit_pct: 10, neg_margin_pct: 3,
  });
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({ usd_to_inr: 83.5 });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Unicorn Valves Pvt. Ltd.', address: '', gstin: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase.from('global_settings').select('*');
    if (data) {
      data.forEach((row) => {
        const val = row.value as Record<string, unknown>;
        switch (row.key) {
          case 'standard_margins': setStandardMargins(val as unknown as StandardMargins); break;
          case 'project_margins': setProjectMargins(val as unknown as ProjectMargins); break;
          case 'exchange_rate': setExchangeRate(val as unknown as ExchangeRate); break;
          case 'company_info': setCompanyInfo(val as unknown as CompanyInfo); break;
        }
      });
    }
    setLoading(false);
  }

  async function saveSetting(key: string, value: unknown) {
    setSaving(key);
    const { error } = await supabase
      .from('global_settings')
      .upsert({ key, value: value as Record<string, unknown>, updated_at: new Date().toISOString() });

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success(`${key.replace(/_/g, ' ')} saved successfully`);
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global pricing margins, exchange rate, and company information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Standard Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard Margins</CardTitle>
            <CardDescription>Applied to all quotes in Standard pricing mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Manufacturing Profit %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={standardMargins.mfg_profit_pct}
                onChange={(e) => setStandardMargins(p => ({ ...p, mfg_profit_pct: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bought-out Profit %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={standardMargins.bo_profit_pct}
                onChange={(e) => setStandardMargins(p => ({ ...p, bo_profit_pct: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Negotiation Margin %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={standardMargins.neg_margin_pct}
                onChange={(e) => setStandardMargins(p => ({ ...p, neg_margin_pct: Number(e.target.value) }))}
              />
            </div>
            <Button
              onClick={() => saveSetting('standard_margins', standardMargins)}
              disabled={saving === 'standard_margins'}
              className="w-full"
            >
              {saving === 'standard_margins' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Standard Margins
            </Button>
          </CardContent>
        </Card>

        {/* Project Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Margins</CardTitle>
            <CardDescription>Applied to quotes in Project (competitive) pricing mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Manufacturing Profit %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={projectMargins.mfg_profit_pct}
                onChange={(e) => setProjectMargins(p => ({ ...p, mfg_profit_pct: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bought-out Profit %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={projectMargins.bo_profit_pct}
                onChange={(e) => setProjectMargins(p => ({ ...p, bo_profit_pct: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Negotiation Margin %</Label>
              <Input type="number" min="0" max="99" step="0.01"
                value={projectMargins.neg_margin_pct}
                onChange={(e) => setProjectMargins(p => ({ ...p, neg_margin_pct: Number(e.target.value) }))}
              />
            </div>
            <Button
              onClick={() => saveSetting('project_margins', projectMargins)}
              disabled={saving === 'project_margins'}
              className="w-full"
            >
              {saving === 'project_margins' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Project Margins
            </Button>
          </CardContent>
        </Card>

        {/* Exchange Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exchange Rate</CardTitle>
            <CardDescription>USD to INR rate for international customer quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>1 USD = ₹</Label>
              <Input type="number" min="1" step="0.01"
                value={exchangeRate.usd_to_inr}
                onChange={(e) => setExchangeRate({ usd_to_inr: Number(e.target.value) })}
              />
            </div>
            <Button
              onClick={() => saveSetting('exchange_rate', exchangeRate)}
              disabled={saving === 'exchange_rate'}
              className="w-full"
            >
              {saving === 'exchange_rate' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Exchange Rate
            </Button>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
            <CardDescription>Used in PDF headers and formal documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input
                value={companyInfo.gstin}
                onChange={(e) => setCompanyInfo(p => ({ ...p, gstin: e.target.value }))}
              />
            </div>
            <Button
              onClick={() => saveSetting('company_info', companyInfo)}
              disabled={saving === 'company_info'}
              className="w-full"
            >
              {saving === 'company_info' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Company Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
