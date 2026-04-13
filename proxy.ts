import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ── API routes that do NOT require authentication ──
const PUBLIC_API_PATHS = new Set([
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
  '/api/health',
  '/api/test/proxy', // admin-only route outside /api/admin/ — does its own auth via verifyAdminToken
]);

// Headers injected by proxy — stripped from incoming requests to prevent spoofing
const AUTH_HEADERS = [
  'x-user-id',
  'x-user-name',
  'x-user-first-name',
  'x-user-last-name',
  'x-admin-verified',
];

// Page routes that require authentication (redirect to signin if not authenticated)
const PROTECTED_PAGE_ROUTES = ['/dashboard'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: verify JWT and inject user info into headers ──
  if (pathname.startsWith('/api/')) {
    return handleApiAuth(request, pathname);
  }

  // ── Page routes: redirect unauthenticated users to signin ──
  return handlePageProtection(request, pathname);
}

// ═══════════════════════════════════════════════════════════════
// API Authentication — verifies JWT, injects decoded user info
// ═══════════════════════════════════════════════════════════════

async function handleApiAuth(request: NextRequest, pathname: string) {
  // Strip auth headers from all incoming requests (prevent client spoofing)
  const requestHeaders = new Headers(request.headers);
  for (const h of AUTH_HEADERS) {
    requestHeaders.delete(h);
  }

  // Public API routes — pass through with cleaned headers
  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Admin routes (/api/admin/* except /api/admin/auth/*) ──
  if (pathname.startsWith('/api/admin/')) {
    const adminToken = request.cookies.get('admin_jwt')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error('ADMIN_JWT_SECRET is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      const { payload } = await jwtVerify(
        adminToken,
        new TextEncoder().encode(secret),
        { algorithms: ['HS256'] }
      );
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      requestHeaders.set('x-admin-verified', 'true');
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      return NextResponse.json({ error: 'Invalid or expired admin token' }, { status: 401 });
    }
  }

  // ── User routes (everything else under /api/*) ──
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    );
    requestHeaders.set('x-user-id', (payload.userId as string) || '');
    requestHeaders.set('x-user-name', (payload.username as string) || '');
    requestHeaders.set('x-user-first-name', (payload.firstName as string) || '');
    requestHeaders.set('x-user-last-name', (payload.lastName as string) || '');
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
  }
}

// ═══════════════════════════════════════════════════════════════
// Page Protection — redirects unauthenticated users to signin
// ═══════════════════════════════════════════════════════════════

async function handlePageProtection(request: NextRequest, pathname: string) {
  const isProtectedRoute = PROTECTED_PAGE_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // JWT signature verification is sufficient for page protection.
    // Route handlers verify user existence when they hit the DB.
    await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    );

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    // API routes
    '/api/:path*',
    // Page routes (excludes static files, images, favicon)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
