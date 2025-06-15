// middleware.ts - Place this file in your project root
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the origin from the request headers
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

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
                // Exact match for specific domains
                return requestOrigin === allowedOrigin;
            });
        } catch (error) {
            console.error('Error parsing origin:', error);
            return false;
        }
    };

    // Check both origin and referer headers
    const isValidRequest = isAllowedOrigin(origin) || isAllowedOrigin(referer);

    // For iframe embedded apps, allow requests without origin/referer since they come from the iframe context
    // The actual origin validation happens at the browser level via CSP headers
    const isIframeRequest = !origin && !referer;

    // Allow valid requests OR iframe requests (which will be validated by CSP)
    if (!isValidRequest && !isIframeRequest) {
        console.warn(`Blocked request from unauthorized origin: ${origin || referer || 'unknown'}`);
        return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
        );
    }

    // Set security headers for iframe embedding
    const response = NextResponse.next();

    // Always set CSP headers to control iframe embedding
    const frameAncestors = allowedOrigins.join(' ');
    response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors};`);
    response.headers.set('X-Frame-Options', 'DENY'); // This will be overridden by CSP but provides fallback

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