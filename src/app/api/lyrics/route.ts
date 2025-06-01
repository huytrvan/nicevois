import { NextRequest, NextResponse } from 'next/server';

// Fix: Update interface to match the actual API response
interface ExternalLyricsResponse {
    artist_name: string;
    track_name: string;
    track_id: number;
    search_engine: string;
    artwork_url: string;
    lyrics: string;
}

export async function GET(req: NextRequest) {
    const trackName = req.nextUrl.searchParams.get('track_name');
    const artistName = req.nextUrl.searchParams.get('artist_name');
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Parameter validation
    if (!trackName || !artistName) {
        console.error('Missing required parameter: track_name or artist_name');
        return new NextResponse(
            JSON.stringify({ error: 'The "track_name" and "artist_name" parameters are required' }),
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        // Encode parameters to handle special characters
        const encodedTrack = encodeURIComponent(trackName);
        const encodedArtist = encodeURIComponent(artistName);

        const apiUrl = `https://lyrics.lewdhutao.my.eu.org/musixmatch/lyrics-search?title=${encodedTrack}&artist=${encodedArtist}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`Failed to fetch lyrics: ${response.status} ${response.statusText}`);
            return new NextResponse(
                JSON.stringify({ error: 'Failed to fetch lyrics', status: response.status }),
                { status: response.status, headers: corsHeaders }
            );
        }

        // Parse the JSON response
        const data = await response.json() as ExternalLyricsResponse;

        // Return formatted response using the correct property names
        return new NextResponse(
            JSON.stringify({
                id: data.track_id,
                title: data.track_name,
                artist: data.artist_name,
                lyrics: data.lyrics,
                artwork_url: data.artwork_url,
                // search_engine: data.search_engine
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Unexpected error:', errorMessage);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
            { status: 500, headers: corsHeaders }
        );
    }
}