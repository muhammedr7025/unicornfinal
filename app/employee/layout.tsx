import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/shared/AppSidebar';

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  // Employees see employee layout; admins get redirected to admin layout
  if (profile.role === 'admin') redirect('/admin/dashboard');

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        role="employee"
        userName={profile.full_name}
        userEmail={profile.email}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
