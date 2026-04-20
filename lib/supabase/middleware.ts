import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // Use getUser() instead — it validates the JWT against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/api/health'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If not authenticated and not on a public route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If authenticated and trying to access login, redirect to appropriate dashboard
  if (user && pathname === '/login') {
    // Fetch the user's profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
    return NextResponse.redirect(url);
  }

  // Route protection based on role
  if (user) {
    const isAdminRoute = pathname.startsWith('/admin');
    const isEmployeeRoute = pathname.startsWith('/employee');

    if (isAdminRoute || isEmployeeRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Profile not found — redirect to login
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }

      // Admin trying to access employee routes → redirect to admin dashboard
      if (isEmployeeRoute && profile.role === 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }

      // Employee trying to access admin routes → redirect to employee dashboard
      if (isAdminRoute && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/employee/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
