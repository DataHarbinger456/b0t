import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * NextAuth.js Middleware
 *
 * This middleware protects routes that require authentication.
 * Configure which routes to protect in the `config.matcher` below.
 */

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Define public routes (no authentication required)
  const publicRoutes = ['/', '/auth/signin', '/auth/error', '/api/auth'];

  // In development, allow access to all pages for easier testing
  // Remove this check when you have OAuth credentials configured
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If route is not public and user is not authenticated, redirect to signin
  // Skip auth check in development mode
  if (!isPublicRoute && !isAuthenticated && !isDevelopment) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow the request to continue
  return NextResponse.next();
});

/**
 * Configure which routes the middleware should run on
 *
 * Options:
 * 1. Match all routes except static files and API routes:
 *    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
 *
 * 2. Match specific routes:
 *    matcher: ['/dashboard/:path*', '/profile/:path*']
 *
 * 3. Match all routes (current configuration):
 *    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
