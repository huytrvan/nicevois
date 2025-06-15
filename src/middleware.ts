// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get headers
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Debug logging
    console.log('Middleware Debug:', {
        pathname,
        origin,
        referer,
        host,
        isApiRoute: pathname.startsWith('/api/')
    });

    // Load allowed origins from environment
    const shopOriginsEnv = process.env.NEXT_PUBLIC_SHOP_ORIGINS;
    if (!shopOriginsEnv) {
        console.error('NEXT_PUBLIC_SHOP_ORIGINS environment variable is not set');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }
    const allowedOrigins = shopOriginsEnv.split(',').map(origin => origin.trim());

    // Function to check if a URL’s origin is allowed
    const isAllowedOrigin = (url: string | null): boolean => {
        if (!url) return false;
        try {
            const requestOrigin = new URL(url).origin;
            return allowedOrigins.some(allowedOrigin => requestOrigin === allowedOrigin);
        } catch (error) {
            console.error('Error parsing origin:', error);
            return false;
        }
    };

    // Check if this is an API route
    const isApiRoute = pathname.startsWith('/api/');

    // Handle API routes
    if (isApiRoute) {
        const appOrigin = `https://${host}`;
        const isSameOrigin = referer && referer.startsWith(appOrigin);
        const isValidApiCall =
            isAllowedOrigin(origin) ||           // Cross-origin from allowed origin
            isAllowedOrigin(referer) ||          // Referer origin is allowed
            (!origin && !referer) ||             // Server-side calls
            isSameOrigin;                        // Same-origin calls from iframe

        if (!isValidApiCall) {
            console.warn(`Blocked API request from unauthorized origin: ${origin || referer || 'unknown'} to ${pathname}`);
            return NextResponse.json(
                { error: 'Unauthorized API access' },
                { status: 403 }
            );
        }
        return NextResponse.next();
    }

    // Handle non-API routes (pages)
    const isVercelDomain = host?.endsWith('.vercel.app') || host === 'vercel.app';
    if (isVercelDomain) {
        // Block direct access unless from an allowed origin
        if ((origin || referer) && !isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
            console.warn(`Blocked direct access to Vercel domain: ${host} from ${origin || referer || 'direct access'}`);
            return NextResponse.json(
                { error: 'Direct access not allowed. This app must be accessed through authorized channels.' },
                { status: 403 }
            );
        }
    }

    // Allow iframe embedding or valid requests
    const isValidRequest = isAllowedOrigin(origin) || isAllowedOrigin(referer);
    const isIframeRequest = !origin && !referer;
    if (!isValidRequest && !isIframeRequest) {
        console.warn(`Blocked page request from unauthorized origin: ${origin || referer || 'unknown'} to ${pathname}`);
        return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
        );
    }

    // Set security headers for non-API routes
    const response = NextResponse.next();
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
        const frameAncestors = allowedOrigins.join(' ');
        response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors};`);
        response.headers.set('X-Frame-Options', 'DENY');
    }

    return response;
}

// Middleware configuration
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};