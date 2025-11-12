import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin/dashboard routes
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin_jwt')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      // Token is invalid or expired, redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_jwt');
      return response;
    }

    // Token is valid, allow access
    return NextResponse.next();
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
};
