// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get the origin from the request headers
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Add debug logging
    console.log('Middleware Debug:', {
        pathname,
        origin,
        referer,
        host,
        isApiRoute: pathname.startsWith('/api/')
    });

    // Get allowed shop origins from environment variable
    const shopOriginsEnv = process.env.NEXT_PUBLIC_SHOP_ORIGINS;

    if (!shopOriginsEnv) {
        console.error('NEXT_PUBLIC_SHOP_ORIGINS environment variable is not set');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    const allowedOrigins = shopOriginsEnv.split(',').map(origin => origin.trim());

    // Check if request is coming from an allowed origin
    const isAllowedOrigin = (url: string | null): boolean => {
        if (!url) return false;

        try {
            const requestOrigin = new URL(url).origin;
            return allowedOrigins.some(allowedOrigin => {
                return requestOrigin === allowedOrigin;
            });
        } catch (error) {
            console.error('Error parsing origin:', error);
            return false;
        }
    };

    // Check if the current host is a vercel.app domain
    const isVercelDomain = host?.endsWith('.vercel.app') || host === 'vercel.app';

    // Check if this is an API route
    const isApiRoute = pathname.startsWith('/api/');

    // For API routes, use simpler logic
    if (isApiRoute) {
        // Allow API calls if:
        // 1. Origin is from allowed origins
        // 2. Referer is from allowed origins  
        // 3. No origin/referer (server-side calls)
        // 4. Same host (same-origin calls)
        const isValidApiCall =
            isAllowedOrigin(origin) ||
            isAllowedOrigin(referer) ||
            (!origin && !referer) ||
            (origin && origin.includes(host || '')) ||
            (referer && referer.includes(host || ''));

        if (!isValidApiCall) {
            console.warn(`Blocked API request from unauthorized origin: ${origin || referer || 'unknown'} to ${pathname}`);
            return NextResponse.json(
                { error: 'Unauthorized API access' },
                { status: 403 }
            );
        }

        return NextResponse.next();
    }

    // For non-API routes (pages), check if direct access to Vercel domain should be blocked
    if (isVercelDomain) {
        // Block direct access to Vercel domains if there's an origin/referer that's not allowed
        if ((origin || referer) && !isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
            console.warn(`Blocked direct access to Vercel domain: ${host} from ${origin || referer || 'direct access'}`);
            return NextResponse.json(
                { error: 'Direct access not allowed. This app must be accessed through authorized channels.' },
                { status: 403 }
            );
        }
    }

    // For non-API routes, check origin authorization
    const isValidRequest = isAllowedOrigin(origin) || isAllowedOrigin(referer);
    const isIframeRequest = !origin && !referer;

    // Allow iframe requests or valid origin requests
    if (!isValidRequest && !isIframeRequest) {
        console.warn(`Blocked page request from unauthorized origin: ${origin || referer || 'unknown'} to ${pathname}`);
        return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
        );
    }

    // Set security headers for iframe embedding
    const response = NextResponse.next();

    // Only set CSP headers for HTML pages, not for API routes or static assets
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
        const frameAncestors = allowedOrigins.join(' ');
        response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors};`);
        response.headers.set('X-Frame-Options', 'DENY');
    }

    return response;
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * This will now protect ALL pages AND API routes
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};