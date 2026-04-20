import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch employee's own quotes
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, customer:customers(name, company)')
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false });

  const myQuotes = quotes ?? [];
  const draftCount = myQuotes.filter(q => q.status === 'draft').length;
  const sentCount = myQuotes.filter(q => q.status === 'sent').length;
  const approvedCount = myQuotes.filter(q => q.status === 'approved').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your quote activity overview</p>
        </div>
        <Link href="/employee/new-quote">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Quote
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Drafts', count: draftCount, color: 'text-gray-600 bg-gray-50' },
          { label: 'Sent', count: sentCount, color: 'text-blue-600 bg-blue-50' },
          { label: 'Approved', count: approvedCount, color: 'text-emerald-600 bg-emerald-50' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.count}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <FileText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Quotes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">My Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {myQuotes.length > 0 ? (
            <div className="space-y-3">
              {myQuotes.slice(0, 10).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/employee/quotes/${quote.id}`}
                  className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{quote.quote_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {(quote.customer as { name: string })?.name}
                    </p>
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
                        'secondary'
                      }
                      className="text-[10px] capitalize"
                    >
                      {quote.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No quotes yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Create your first quote to get started</p>
              <Link href="/employee/new-quote">
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Quote
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
