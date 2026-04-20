'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Pencil, Trash2, Database, Search } from 'lucide-react';

// ---- Sheet/table definitions for preview ----
const PREVIEW_TABS = [
  { key: 'materials', label: 'Materials', table: 'materials', columns: [
    { header: 'Material Name', db: 'material_name' },
    { header: 'Material Group', db: 'material_group' },
    { header: 'Price / Kg (₹)', db: 'price_per_kg', type: 'number' },
  ]},
  { key: 'series', label: 'Series', table: 'series', columns: [
    { header: 'Series Number', db: 'series_number' },
    { header: 'Series Name', db: 'series_name' },
    { header: 'Product Type', db: 'product_type' },
    { header: 'Has Cage', db: 'has_cage', type: 'boolean' },
    { header: 'Has Seal Ring', db: 'has_seal_ring', type: 'boolean' },
  ]},
  { key: 'body_weights', label: 'Body Wt.', table: 'body_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'End Connect', db: 'end_connect_type' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'bonnet_weights', label: 'Bonnet Wt.', table: 'bonnet_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Bonnet Type', db: 'bonnet_type' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'plug_weights', label: 'Plug Wt.', table: 'plug_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'seat_weights', label: 'Seat Wt.', table: 'seat_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'cage_weights', label: 'Cage Wt.', table: 'cage_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'seal_ring_prices', label: 'Seal Ring', table: 'seal_ring_prices', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Seal Type', db: 'seal_type' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Price (₹)', db: 'fixed_price', type: 'number' },
  ]},
  { key: 'stem_weights', label: 'Stem Wt.', table: 'stem_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'actuator_models', label: 'Actuators', table: 'actuator_models', columns: [
    { header: 'Type', db: 'type' },
    { header: 'Series', db: 'series' },
    { header: 'Model', db: 'model' },
    { header: 'Std/Spcl', db: 'standard_special' },
    { header: 'Price (₹)', db: 'fixed_price', type: 'number' },
  ]},
  { key: 'handwheel_prices', label: 'Handwheel', table: 'handwheel_prices', columns: [
    { header: 'Type', db: 'type' },
    { header: 'Series', db: 'series' },
    { header: 'Model', db: 'model' },
    { header: 'Std/Spcl', db: 'standard_special' },
    { header: 'Price (₹)', db: 'fixed_price', type: 'number' },
  ]},
  { key: 'pilot_plug_weights', label: 'Pilot Plug', table: 'pilot_plug_weights', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Weight (kg)', db: 'weight_kg', type: 'number' },
  ]},
  { key: 'testing_presets', label: 'Testing', table: 'testing_presets', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Test Name', db: 'test_name' },
    { header: 'Price (₹)', db: 'price', type: 'number' },
  ]},
  { key: 'tubing_presets', label: 'Tubing', table: 'tubing_presets', columns: [
    { header: 'Series ID', db: 'series_id' },
    { header: 'Size', db: 'size' },
    { header: 'Rating', db: 'rating' },
    { header: 'Item Name', db: 'item_name' },
    { header: 'Price (₹)', db: 'price', type: 'number' },
  ]},
] as const;

type ColDef = { header: string; db: string; type?: string };
type TabDef = { key: string; label: string; table: string; columns: ColDef[] };
type TabKey = typeof PREVIEW_TABS[number]['key'];

// Allow accessing .type on cols without TS complaints
const tabs = PREVIEW_TABS as unknown as TabDef[];

export default function PricingPage() {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    errors?: Array<{ sheet: string; row: number; column: string; error: string }>;
  } | null>(null);

  // ---- Preview state ----
  const [activeTab, setActiveTab] = useState<TabKey>('materials');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // ---- Edit dialog state ----
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const activeConfig = tabs.find(t => t.key === activeTab)!;

  const loadPreview = useCallback(async (tab?: TabKey) => {
    const config = tabs.find(t => t.key === (tab ?? activeTab))!;
    setPreviewLoading(true);
    const { data, error } = await supabase
      .from(config.table)
      .select('*')
      .eq('is_active', true)
      .limit(500);
    if (error) console.error('Preview load error:', error.message);
    setPreviewData(data ?? []);
    setPreviewLoading(false);
  }, [activeTab]);

  useEffect(() => { loadPreview(); }, [activeTab]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setSearchQ('');
  }

  // ---- Upload ----
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will replace ALL pricing data. Continue?')) { e.target.value = ''; return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/pricing/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ success: true, message: data.message || 'Upload successful' });
        toast.success('Pricing data uploaded successfully');
        loadPreview();
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed', errors: data.details });
        toast.error('Upload failed — see errors below');
      }
    } catch { toast.error('Upload failed'); }
    setUploading(false);
    e.target.value = '';
  }

  // ---- Template ----
  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = '/api/pricing/template';
    a.download = 'pricing-data-template.xlsx';
    a.click();
    toast.success('Template downloading...');
  }

  // ---- Export ----
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/pricing/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricing-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Pricing data exported');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  }

  // ---- Inline edit ----
  function openEdit(row: any) {
    setEditRow(row);
    const f: Record<string, string> = {};
    for (const col of activeConfig.columns) {
      f[col.db] = row[col.db] != null ? String(row[col.db]) : '';
    }
    setEditForm(f);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditSaving(true);
    const updates: Record<string, unknown> = {};
    for (const col of activeConfig.columns) {
      const v = editForm[col.db];
      if (col.type === 'number') updates[col.db] = Number(v);
      else if (col.type === 'boolean') updates[col.db] = v === 'true';
      else updates[col.db] = v;
    }
    const { error } = await supabase.from(activeConfig.table).update(updates).eq('id', editRow.id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); loadPreview(); }
    setEditSaving(false);
    setEditOpen(false);
  }

  // ---- Delete single row ----
  async function handleDelete(id: string) {
    if (!confirm('Delete this row?')) return;
    try {
      const res = await fetch('/api/admin/delete-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeConfig.table, ids: [id] }),
      });
      const data = await res.json();
      if (!res.ok || data.failed > 0) toast.error(data.error || 'Delete failed');
      else { toast.success('Deleted'); loadPreview(); }
    } catch { toast.error('Network error'); }
  }

  // ---- Delete All rows in current tab ----
  async function handleDeleteAll() {
    const count = previewData.length;
    if (count === 0) { toast.info('No data to delete'); return; }
    if (!confirm(`Delete ALL ${count} rows from "${activeConfig.label}"?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/delete-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeConfig.table, ids: previewData.map(r => r.id) }),
      });
      const data = await res.json();
      if (data.failed > 0) toast.warning(`${data.deleted} deleted, ${data.failed} failed`);
      else toast.success(`Deleted all ${data.deleted} rows`);
      loadPreview();
    } catch { toast.error('Network error'); }
  }

  // ---- Filtered data ----
  const filtered = previewData.filter(row => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return activeConfig.columns.some(col => String(row[col.db] ?? '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing Data</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage material costs, weights, and pricing via Excel or inline editing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Template
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} className="hidden" />
            <Button variant="outline" size="sm" disabled={uploading} className="gap-1.5 pointer-events-none" type="button">
              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export
          </Button>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
          {uploadResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <AlertDescription>
            <p className="font-medium">{uploadResult.message}</p>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <ul className="mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                {uploadResult.errors.slice(0, 20).map((err, i) => (
                  <li key={i}>Sheet &quot;{err.sheet}&quot; row {err.row}: {err.error}</li>
                ))}
                {uploadResult.errors.length > 20 && <li>...and {uploadResult.errors.length - 20} more</li>}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key as TabKey)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">{activeConfig.label}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{filtered.length} rows</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              </div>
              <Button variant="destructive" size="sm" className="h-8 text-xs gap-1" onClick={handleDeleteAll}>
                <Trash2 className="w-3 h-3" /> Delete All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {searchQ ? 'No rows match your search' : 'No data uploaded yet — use Upload to import pricing data'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeConfig.columns.map(col => (
                      <TableHead key={col.db} className="text-xs">{col.header}</TableHead>
                    ))}
                    <TableHead className="text-xs text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map(row => (
                    <TableRow key={row.id}>
                      {activeConfig.columns.map(col => (
                        <TableCell key={col.db} className="text-xs py-1.5">
                          {col.type === 'boolean'
                            ? (row[col.db] ? '✓' : '—')
                            : col.type === 'number'
                            ? Number(row[col.db] ?? 0).toLocaleString('en-IN')
                            : (row[col.db] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right py-1.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(row)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 200 && (
                <p className="text-center text-xs text-muted-foreground py-2">Showing 200 of {filtered.length} rows. Export to view all.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit {activeConfig.label} Row</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {activeConfig.columns.map(col => (
              <div key={col.db} className="space-y-1">
                <Label className="text-xs">{col.header}</Label>
                {col.type === 'boolean' ? (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={editForm[col.db] ?? 'false'}
                    onChange={e => setEditForm(p => ({ ...p, [col.db]: e.target.value }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <Input
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={editForm[col.db] ?? ''}
                    onChange={e => setEditForm(p => ({ ...p, [col.db]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            ))}
            <Button onClick={saveEdit} disabled={editSaving} className="w-full" size="sm">
              {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
