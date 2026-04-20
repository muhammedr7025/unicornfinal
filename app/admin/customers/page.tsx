'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Loader2, Users, Search } from 'lucide-react';
import type { Customer } from '@/types';

interface CustomerFormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  customer_type: 'normal' | 'dealer';
  commission_pct: number;
  gstin: string;
}

const defaultForm: CustomerFormState = {
  name: '', company: '', email: '', phone: '', address: '',
  country: 'India', customer_type: 'normal', commission_pct: 0, gstin: '',
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(defaultForm);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load customers');
    else setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  function openEdit(cust: Customer) {
    setEditing(cust);
    setForm({
      name: cust.name,
      company: cust.company || '',
      email: cust.email || '',
      phone: cust.phone || '',
      address: cust.address || '',
      country: cust.country,
      customer_type: cust.customer_type,
      commission_pct: cust.commission_pct,
      gstin: cust.gstin || '',
    });
    setDialogOpen(true);
  }

  function openNew() {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Enforce normal → 0 commission
    const data = { ...form };
    if (data.customer_type === 'normal') data.commission_pct = 0;

    try {
      if (editing) {
        const { error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', editing.id);

        if (error) throw error;
        toast.success('Customer updated');
      } else {
        // Get current user for created_by
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('customers')
          .insert({ ...data, created_by: user!.id });

        if (error) throw error;
        toast.success('Customer created');
      }
      setDialogOpen(false);
      loadCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">{customers.length} total customers</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((cust) => (
                  <TableRow key={cust.id}>
                    <TableCell className="font-medium">{cust.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cust.company || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={cust.customer_type === 'dealer' ? 'default' : 'secondary'} className="text-[10px]">
                        {cust.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cust.is_international && <Badge variant="outline" className="text-[10px] mr-1">Intl</Badge>}
                      {cust.country}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{!cust.is_international && cust.gstin ? cust.gstin : '—'}</TableCell>
                    <TableCell>{cust.commission_pct > 0 ? `${cust.commission_pct}%` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cust)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Customer' : 'New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.customer_type}
                  onValueChange={(v) => {
                    setForm(p => ({
                      ...p,
                      customer_type: v as 'normal' | 'dealer',
                      commission_pct: v === 'normal' ? 0 : p.commission_pct,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.customer_type === 'dealer' && (
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  step="0.01"
                  value={form.commission_pct}
                  onChange={(e) => setForm(p => ({ ...p, commission_pct: Number(e.target.value) }))}
                />
              </div>
            )}
            {form.country.toLowerCase() === 'india' && (
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  placeholder="e.g. 33AABCU9603R1ZM"
                  value={form.gstin}
                  onChange={(e) => setForm(p => ({ ...p, gstin: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">GST Identification Number (for Indian customers)</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Update Customer' : 'Create Customer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
