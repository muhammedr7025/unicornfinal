import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, DollarSign, Clock } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch summary stats
  const [quotesRes, customersRes] = await Promise.all([
    supabase.from('quotes').select('id, status, grand_total_inr, created_at', { count: 'exact' }),
    supabase.from('customers').select('id', { count: 'exact' }),
  ]);

  const quotes = quotesRes.data ?? [];
  const totalQuotes = quotesRes.count ?? 0;
  const totalCustomers = customersRes.count ?? 0;
  const draftCount = quotes.filter(q => q.status === 'draft').length;
  const sentCount = quotes.filter(q => q.status === 'sent').length;
  const approvedCount = quotes.filter(q => q.status === 'approved').length;
  const totalRevenue = quotes
    .filter(q => q.status === 'approved')
    .reduce((sum, q) => sum + (q.grand_total_inr ?? 0), 0);

  const stats = [
    { label: 'Total Quotes', value: totalQuotes, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Customers', value: totalCustomers, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'Approved Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pending Quotes', value: draftCount + sentCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
  ];

  // Recent quotes
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('*, customer:customers(name, company)')
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your quote management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold tracking-tight mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Draft', count: draftCount, variant: 'secondary' as const },
          { label: 'Sent', count: sentCount, variant: 'default' as const },
          { label: 'Approved', count: approvedCount, variant: 'default' as const },
          { label: 'Rejected', count: quotes.filter(q => q.status === 'rejected').length, variant: 'destructive' as const },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            <Badge variant={s.variant} className="text-xs">{s.count}</Badge>
          </Card>
        ))}
      </div>

      {/* Recent Quotes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQuotes && recentQuotes.length > 0 ? (
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{quote.quote_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(quote.customer as { name: string; company?: string })?.name}
                        {(quote.customer as { company?: string })?.company && ` · ${(quote.customer as { company?: string })?.company}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {quote.grand_total_inr && (
                      <span className="text-sm font-semibold">
                        ₹{Number(quote.grand_total_inr).toLocaleString('en-IN')}
                      </span>
                    )}
                    <Badge
                      variant={
                        quote.status === 'approved' ? 'default' :
                        quote.status === 'rejected' ? 'destructive' :
                        quote.status === 'sent' ? 'default' : 'secondary'
                      }
                      className="text-[10px] capitalize"
                    >
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No quotes yet</p>
              <p className="text-xs text-muted-foreground/70">Quotes will appear here once created</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
