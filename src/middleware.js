import { NextResponse } from 'next/server';

export function middleware(request) {
  const sessionCookie = request.cookies.get('fin_session');
  const { pathname } = request.nextUrl;

  const isProtected = 
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/sales') ||
    pathname.startsWith('/purchases') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/accounting') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/audit');

  if (isProtected && !sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && sessionCookie?.value) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/sales/:path*',
    '/purchases/:path*',
    '/inventory/:path*',
    '/accounting/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/audit/:path*',
    '/login'
  ],
};
