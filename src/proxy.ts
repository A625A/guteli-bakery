import { NextResponse, type NextRequest } from 'next/server';

import { buildContentSecurityPolicy } from '@/server/security/csp';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === 'development',
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', policy);
  response.headers.set(
    'permissions-policy',
    'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  );
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-xss-protection', '0');

  const isAdmin =
    request.nextUrl.pathname === '/admin' ||
    request.nextUrl.pathname.startsWith('/admin/') ||
    request.nextUrl.pathname === '/api/admin' ||
    request.nextUrl.pathname.startsWith('/api/admin/');
  response.headers.set(
    'referrer-policy',
    isAdmin ? 'no-referrer' : 'strict-origin-when-cross-origin',
  );
  if (isAdmin) {
    response.headers.set('cache-control', 'private, no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|api/media(?:/|$)|favicon.ico|.*\\.(?:avif|bmp|css|csv|eot|gif|ico|jpe?g|js|json|map|mp3|mp4|ogg|otf|pdf|png|svg|ttf|txt|wav|webm|webp|woff2?)$).*)',
  ],
};
