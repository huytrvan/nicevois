// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get the origin from the request headers
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Get allowed shop origins from environment variable
    const shopOriginsEnv = process.env.NEXT_PUBLIC_SHOP_ORIGINS;

    if (!shopOriginsEnv) {
        console.error('NEXT_PUBLIC_SHOP_ORIGINS environment variable is not set');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    // const allowedOrigins = shopOriginsEnv.split(',').map(origin => origin.trim());
    const allowedOrigins = ["Google.com", 'Amazon.com'];

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

    // Check if this is a same-origin request (from your own domain)
    const isSameOrigin = (): boolean => {
        if (!host) return false;

        // Check if origin matches the current host
        if (origin) {
            try {
                const originUrl = new URL(origin);
                return originUrl.host === host;
            } catch {
                return false;
            }
        }

        // Check if referer matches the current host
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                return refererUrl.host === host;
            } catch {
                return false;
            }
        }

        return false;
    };

    // Check both origin and referer headers
    const isValidRequest = isAllowedOrigin(origin) || isAllowedOrigin(referer);

    // For iframe embedded apps, allow requests without origin/referer since they come from the iframe context
    const isIframeRequest = !origin && !referer;

    // Allow same-origin requests (your own site making requests to itself)
    const isSameOriginRequest = isSameOrigin();

    // Allow valid requests OR iframe requests OR same-origin requests
    if (!isValidRequest && !isIframeRequest && !isSameOriginRequest) {
        console.warn(`Blocked request from unauthorized origin: ${origin || referer || 'unknown'} to ${pathname}`);
        return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
        );
    }

    // Set security headers for iframe embedding
    const response = NextResponse.next();

    // Only set CSP headers for HTML pages, not for API routes or static assets
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
        // Always set CSP headers to control iframe embedding
        const frameAncestors = allowedOrigins.join(' ');
        response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors};`);
        response.headers.set('X-Frame-Options', 'DENY'); // This will be overridden by CSP but provides fallback
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