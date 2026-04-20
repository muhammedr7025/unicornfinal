'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Cpu, Search, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

interface MachiningPrice {
  id: string;
  component: string;
  series_id: string;
  size: string;
  rating: string;
  type_key: string;
  material_id: string;
  fixed_price: number;
  is_active: boolean;
  series?: { series_number: string; series_name: string };
  material?: { material_name: string };
}

const COMPONENTS = ['body', 'bonnet', 'plug', 'seat', 'stem', 'cage'];

export default function MachinePricingPage() {
  const supabase = createClient();
  const [prices, setPrices] = useState<MachiningPrice[]>([]);
  const [series, setSeries] = useState<Array<{ id: string; series_number: string; series_name: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; material_name: string; material_group: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterComponent, setFilterComponent] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MachiningPrice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    component: 'body',
    series_id: '',
    size: '',
    rating: '',
    type_key: '',
    material_id: '',
    fixed_price: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [priceRes, seriesRes, matRes] = await Promise.all([
      supabase.from('machining_prices').select('*, series:series(series_number, series_name), material:materials(material_name)').eq('is_active', true).order('component').order('size'),
      supabase.from('series').select('id, series_number, series_name').eq('is_active', true).order('series_number'),
      supabase.from('materials').select('id, material_name, material_group').eq('is_active', true),
    ]);
    setPrices(priceRes.data ?? []);
    setSeries(seriesRes.data ?? []);
    setMaterials(matRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ component: 'body', series_id: '', size: '', rating: '', type_key: '', material_id: '', fixed_price: 0 });
    setDialogOpen(true);
  }

  function openEdit(p: MachiningPrice) {
    setEditing(p);
    setForm({ component: p.component, series_id: p.series_id, size: p.size, rating: p.rating, type_key: p.type_key, material_id: p.material_id, fixed_price: p.fixed_price });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.series_id || !form.size || !form.rating || !form.material_id) {
      toast.error('Fill all required fields');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('machining_prices').update(form).eq('id', editing.id);
      if (error) toast.error(error.message); else { toast.success('Updated'); load(); }
    } else {
      const { error } = await supabase.from('machining_prices').insert(form);
      if (error) toast.error(error.message); else { toast.success('Added'); load(); }
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this row?')) return;
    try {
      const res = await fetch('/api/admin/delete-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'machining_prices', ids: [id] }),
      });
      const data = await res.json();
      if (!res.ok || data.failed > 0) toast.error(data.error || 'Delete failed');
      else { toast.success('Deleted'); load(); }
    } catch { toast.error('Network error'); }
  }

  async function handleDeleteAll() {
    const count = filtered.length;
    if (count === 0) { toast.info('No data to delete'); return; }
    if (!confirm(`Delete ALL ${count} machining entries?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/delete-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'machining_prices', ids: filtered.map(p => p.id) }),
      });
      const data = await res.json();
      if (data.failed > 0) toast.warning(`${data.deleted} deleted, ${data.failed} failed`);
      else toast.success(`Deleted all ${data.deleted} entries`);
      load();
    } catch { toast.error('Network error'); }
  }

  // ---------- Bulk operations ----------
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean; message: string;
    errors?: Array<{ row: number; column: string; error: string }>;
  } | null>(null);

  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = '/api/machining/template';
    a.download = 'machining-pricing-template.xlsx';
    a.click();
    toast.success('Template downloading...');
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will replace ALL machining pricing data. Continue?')) { e.target.value = ''; return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/machining/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ success: true, message: data.message || 'Upload successful' });
        toast.success('Machining data uploaded'); load();
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed', errors: data.details });
        toast.error('Upload failed — see errors below');
      }
    } catch { toast.error('Upload failed'); }
    setUploading(false);
    e.target.value = '';
  }

  async function handleBulkExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/machining/export');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `machining-prices-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  }

  const filtered = prices.filter(p => {
    if (filterComponent !== 'all' && p.component !== filterComponent) return false;
    if (search) {
      const q = search.toLowerCase();
      return [p.component, p.size, p.rating, p.type_key, p.series?.series_number, p.series?.series_name, p.material?.material_name]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machine Pricing</h1>
          <p className="text-muted-foreground text-sm mt-1">Machining cost per component, series, size, rating, and material</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Template
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} disabled={uploading} className="hidden" />
            <Button variant="outline" size="sm" disabled={uploading} className="gap-1.5 pointer-events-none" type="button">
              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleBulkExport} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</Button>
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
                  <li key={i}>Row {err.row}, "{err.column}": {err.error}</li>
                ))}
                {uploadResult.errors.length > 20 && <li>...and {uploadResult.errors.length - 20} more</li>}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterComponent} onValueChange={v => setFilterComponent(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            {COMPONENTS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} entries</Badge>
        <Button variant="destructive" size="sm" className="gap-1" onClick={handleDeleteAll}>
          <Trash2 className="w-3.5 h-3.5" /> Delete All
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Price (₹)</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />No machining entries found</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell><Badge variant="outline" className="capitalize text-[10px]">{p.component}</Badge></TableCell>
                  <TableCell className="text-sm">{p.series?.series_number} — {p.series?.series_name}</TableCell>
                  <TableCell className="text-sm">{p.size}</TableCell>
                  <TableCell className="text-sm">{p.rating}</TableCell>
                  <TableCell className="text-sm">{p.type_key || '—'}</TableCell>
                  <TableCell className="text-sm">{p.material?.material_name ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">₹{Number(p.fixed_price).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Machining Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Component *</Label>
                <Select value={form.component} onValueChange={v => setForm(f => ({ ...f, component: v ?? 'body' }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPONENTS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Series *</Label>
                <Select value={form.series_id} onValueChange={v => setForm(f => ({ ...f, series_id: v ?? '' }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {series.map(s => <SelectItem key={s.id} value={s.id}>{s.series_number} — {s.series_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Size *</Label>
                <Input className="h-9" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder='e.g. 1"' />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rating *</Label>
                <Input className="h-9" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder='e.g. 150#' />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type Key</Label>
                <Input className="h-9" value={form.type_key} onChange={e => setForm(f => ({ ...f, type_key: e.target.value }))} placeholder='e.g. Flanged' />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Material *</Label>
                <Select value={form.material_id} onValueChange={v => setForm(f => ({ ...f, material_id: v ?? '' }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.material_name} ({m.material_group})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fixed Price (₹) *</Label>
                <Input className="h-9" type="number" min="0" value={form.fixed_price} onChange={e => setForm(f => ({ ...f, fixed_price: Number(e.target.value) }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? 'Update' : 'Add'} Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
