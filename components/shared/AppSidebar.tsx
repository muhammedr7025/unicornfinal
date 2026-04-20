'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  DollarSign,
  Cpu,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Quotes', href: '/admin/quotes', icon: FileText },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Employees', href: '/admin/employees', icon: UserCog },
  { label: 'Pricing Data', href: '/admin/pricing', icon: DollarSign },
  { label: 'Machine Pricing', href: '/admin/machine-pricing', icon: Cpu },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'New Quote', href: '/employee/new-quote', icon: FileText },
  { label: 'My Quotes', href: '/employee/quotes', icon: FileText },
  { label: 'Customers', href: '/employee/customers', icon: Users },
];

interface AppSidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
}

export function AppSidebar({ role, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role === 'admin' ? adminNavItems : employeeNavItems;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href.endsWith('/dashboard')) return pathname === href;
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">Unicorn Valves</h2>
            <p className="text-[11px] text-white/50">Quote System</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <Separator className="bg-white/10 mx-3" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", active && "text-white")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-white/10 mx-3" />

      {/* User Section */}
      <div className="p-3">
        <div className={cn("flex items-center gap-3 px-3 py-2.5", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] py-0 px-1.5 border-0",
                    role === 'admin'
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-blue-400/20 text-blue-300"
                  )}
                >
                  {role}
                </Badge>
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full mt-1 text-white/60 hover:text-white hover:bg-white/10",
            collapsed && "px-0"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#1a1a3e] flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-md text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-[#1a1a3e] border-r border-white/5 sticky top-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
