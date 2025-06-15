// src\app\api\lyrics\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { geolocation } from '@vercel/edge';

export interface ExternalLyricsResponse {
    title: string;
    artist: string;
    slug: string;
    lyrics: string;
}

function extractRequestOriginInfo(req: NextRequest) {
    // Get geo location info (Vercel Edge)
    const geo = geolocation(req);

    // Extract IP information
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const vercelForwardedFor = req.headers.get('x-vercel-forwarded-for');
    const clientIP = forwardedFor?.split(',')[0] || realIP || 'unknown';

    // Get Vercel-specific headers
    const vercelInfo = {
        deploymentUrl: req.headers.get('x-vercel-deployment-url'),
        vercelIP: req.headers.get('x-vercel-ip-country'),
        vercelCity: req.headers.get('x-vercel-ip-city'),
        vercelRegion: req.headers.get('x-vercel-ip-region'),
        vercelTimezone: req.headers.get('x-vercel-ip-timezone'),
    };

    // Get standard request headers
    const requestInfo = {
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
        host: req.headers.get('host'),
        acceptLanguage: req.headers.get('accept-language'),
        acceptEncoding: req.headers.get('accept-encoding'),
        connection: req.headers.get('connection'),
        secFetchDest: req.headers.get('sec-fetch-dest'),
        secFetchMode: req.headers.get('sec-fetch-mode'),
        secFetchSite: req.headers.get('sec-fetch-site'),
        secFetchUser: req.headers.get('sec-fetch-user'),
    };

    // Get custom headers if they exist (from your updated client)
    const customHeaders = {
        parentHost: req.headers.get('x-parent-host'),
        parentURL: req.headers.get('x-parent-url'),
        iframeContext: req.headers.get('x-iframe-context'),
        currentHost: req.headers.get('x-current-host'),
        requestSource: req.headers.get('x-request-source'),
        requestTimestamp: req.headers.get('x-request-timestamp'),
    };

    // Determine request context
    const isIframe = requestInfo.secFetchDest === 'iframe' ||
        customHeaders.iframeContext?.includes('iframe') ||
        requestInfo.secFetchMode === 'navigate';

    const isCrossOrigin = requestInfo.secFetchSite === 'cross-site';

    // URL information
    const url = req.nextUrl;
    const requestDetails = {
        method: req.method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams.entries()),
        fullUrl: url.toString(),
    };

    return {
        timestamp: new Date().toISOString(),
        geo: {
            country: geo.country || vercelInfo.vercelIP,
            city: geo.city || vercelInfo.vercelCity,
            region: geo.region || vercelInfo.vercelRegion,
            timezone: vercelInfo.vercelTimezone,
            latitude: geo.latitude,
            longitude: geo.longitude,
        },
        network: {
            clientIP,
            forwardedFor,
            realIP,
            vercelForwardedFor,
        },
        vercelInfo,
        requestInfo,
        customHeaders,
        context: {
            isIframe,
            isCrossOrigin,
            hasCustomHeaders: Object.values(customHeaders).some(Boolean),
        },
        requestDetails,
    };
}


export async function GET(req: NextRequest) {
    const title = req.nextUrl.searchParams.get('title');
    const artist = req.nextUrl.searchParams.get('artist');
    const slug = req.nextUrl.searchParams.get('slug');
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (!title || !artist || !slug) {
        return new NextResponse(
            JSON.stringify({
                error: "These parameters are required: ['title', 'artist', 'slug']",
            }),
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const encodedTitle = encodeURIComponent(title);
        const encodedArtist = encodeURIComponent(artist);
        const encodedSlug = encodeURIComponent(slug);
        const externalApiUrl = `${process.env.LYRICS_API_ADDRESS}/genius/lyrics?title=${encodedTitle}&artist=${encodedArtist}&slug=${encodedSlug}`;

        // console.log('Fetching from URL:', externalApiUrl);

        // Extract all available origin information
        const originInfo = extractRequestOriginInfo(req);

        // Add headers that mimic a browser request
        const response = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                // Forward origin context to your external server
                'X-Origin-Info': JSON.stringify(originInfo),
                'X-Client-IP': originInfo.network.clientIP || 'unknown',
                'X-Client-Country': originInfo.geo.country || 'unknown',
                'X-Client-City': originInfo.geo.city || 'unknown',
                'X-Request-Context': originInfo.context.isIframe ? 'iframe' : 'direct',
                'X-Vercel-Request': 'true',
                'X-Original-Referer': originInfo.requestInfo.referer || 'none',
                'X-Original-Origin': originInfo.requestInfo.origin || 'none',
                'X-Original-Host': originInfo.requestInfo.host || 'unknown',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch lyrics: ${response.status} ${response.statusText}`);
            console.error('Error response body:', errorText);

            return new NextResponse(
                JSON.stringify({
                    error: 'Failed to fetch lyrics',
                    status: response.status,
                    details: errorText
                }),
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json() as ExternalLyricsResponse;
        // console.log('Received data structure:', Object.keys(data));

        return new NextResponse(
            JSON.stringify({
                title: data.title,
                artist: data.artist,
                slug: data.slug,
                lyrics: data.lyrics,
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Unexpected error:', errorMessage);
        console.error('Full error:', error);

        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
            { status: 500, headers: corsHeaders }
        );
    }
}