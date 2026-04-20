'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Loader2, Users, Search } from 'lucide-react';
import type { Customer } from '@/types';

const defaultForm = {
  name: '', company: '', email: '', phone: '', address: '',
  country: 'India', customer_type: 'normal' as 'normal' | 'dealer', commission_pct: 0,
};

export default function EmployeeCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const data = { ...form };
    if (data.customer_type === 'normal') data.commission_pct = 0;

    const { error } = await supabase.from('customers').insert({ ...data, created_by: user!.id });
    if (error) toast.error(error.message);
    else { toast.success('Customer created'); setDialogOpen(false); setForm(defaultForm); loadCustomers(); }
    setSaving(false);
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">View and create customer records</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{search ? 'No matches' : 'No customers yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company || '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{c.customer_type}</Badge></TableCell>
                    <TableCell>{c.country}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm(p => ({ ...p, country: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.customer_type} onValueChange={(v) => setForm(p => ({ ...p, customer_type: v as 'normal' | 'dealer', commission_pct: v === 'normal' ? 0 : p.commission_pct }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.customer_type === 'dealer' && (
              <div className="space-y-2"><Label>Commission %</Label><Input type="number" min="0" max="99" value={form.commission_pct} onChange={(e) => setForm(p => ({ ...p, commission_pct: Number(e.target.value) }))} /></div>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Customer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
