import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyAdminToken } from '@/lib/admin-auth';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

// Define protected routes
const protectedRoutes = ['/dashboard'];
const adminRoutes = ['/admin/dashboard'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for admin routes first
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isAdminRoute) {
    const adminToken = request.cookies.get('admin_jwt')?.value;

    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const admin = verifyAdminToken(adminToken);
    if (!admin) {
      // Token is invalid or expired, redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_jwt');
      return response;
    }

    // Token is valid, allow access
    return NextResponse.next();
  }

  // Check if the current path is protected (user routes)
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  try {
    const token = request.cookies.get('jwt')?.value;

    if (!token) {
      // No token, redirect to signin
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Optional: Check if user still exists in the database
    await dbConnect();
    const user = await User.findById(decoded.userId);

    if (!user) {
      // User doesn't exist, redirect to signin
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Token is valid and user exists, allow the request
    return NextResponse.next();
  } catch (error) {
    console.warn('Proxy authentication redirect due to invalid token', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
