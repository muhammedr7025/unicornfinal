'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Search, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function EmployeeQuotesPage() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('quotes')
      .select('*, customer:customers(name, company)')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });
    setQuotes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = quotes.filter(q =>
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    (q.customer?.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Quotes</h1>
          <p className="text-muted-foreground text-sm mt-1">{quotes.length} quotes</p>
        </div>
        <Link href="/employee/new-quote">
          <Button className="gap-2"><Plus className="w-4 h-4" />New Quote</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by quote number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{search ? 'No matches' : 'No quotes yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm font-medium">{q.quote_number}</TableCell>
                    <TableCell>{q.customer?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[q.status] || ''}`}>{q.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {q.grand_total_inr ? `₹${Number(q.grand_total_inr).toLocaleString('en-IN')}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/employee/quotes/${q.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5"><Eye className="w-3.5 h-3.5" />View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
