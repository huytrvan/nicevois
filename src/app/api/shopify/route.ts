import { NextRequest, NextResponse } from 'next/server';

// Shopify credentials (server-side only)
const SHOPIFY_STOREFRONT_API_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN!;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const CUSTOM_LYRICS_PRODUCT_ID = process.env.CUSTOM_LYRICS_PRODUCT_ID;

// Interface for the request payload
interface CartRequest {
    sessionId: string;
    price: number; // Price in dollars (e.g., 10.00)
    name?: string; // Optional buyer email
    email?: string; // Optional buyer email
    songName?: string; // Optional song name
    artist?: string; // Optional artist name
    songUrl?: string; // Optional song URL (fallback if name/artist not provided)
    deliveryType: 'standard' | 'rush'; // Delivery type (standard or rush)
    lyrics: { original: string; modified: string }[]; // Add lyrics array
}

type ShopifyError = {
    field?: string[];
    message: string;
};

// POST handler to create a Shopify checkout session
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const { sessionId, price, email, songName, artist, songUrl, deliveryType, lyrics }: CartRequest = await request.json();

        // Validate required fields
        if (!sessionId || price == null || !deliveryType || !lyrics) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required parameters',
                    userMessage: 'Please provide session ID, price, delivery type, and lyrics.',
                },
                { status: 400 }
            );
        }

        // Prepare attributes array
        const attributes = [
            { key: 'sessionId', value: sessionId },
            { key: 'deliveryType', value: deliveryType },
            { key: 'songName', value: songName || 'Not specified' },
            { key: 'artist', value: artist || 'Not specified' },
            ...(songUrl ? [{ key: 'songUrl', value: songUrl }] : []),
            // Add original and modified lyrics as attributes
            ...lyrics.map((line, index) => ({
                key: `Line ${index + 1}`,
                value: `Original: ${line.original} → Modified: ${line.modified}`,
            })),
        ];


        // Define cart line item for "Lyric Changer"
        const lineItems = [
            {
                merchandiseId: CUSTOM_LYRICS_PRODUCT_ID,
                quantity: 1,
                attributes: attributes,
            },
        ];

        // GraphQL mutation to create cart (unchanged)
        const createCartQuery = `
            mutation createCart($cartInput: CartInput!) {
                cartCreate(input: $cartInput) {
                    cart {
                        id
                        checkoutUrl
                        cost {
                            totalAmount { amount currencyCode }
                            subtotalAmount { amount currencyCode }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const cartInput = {
            lineItems,
            ...(email && { buyerIdentity: { email } }),
        };

        const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_API_TOKEN,
            },
            body: JSON.stringify({
                query: createCartQuery,
                variables: { cartInput },
            }),
        });

        if (!response.ok) {
            console.error(`Shopify API Error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                {
                    success: false,
                    error: `Network error (${response.status})`,
                    userMessage: 'Unable to connect to Shopify. Please try again later.',
                },
                { status: response.status }
            );
        }

        const json = await response.json();

        if (json.errors || json.data?.cartCreate?.userErrors?.length) {
            const errorDetails = (json.errors || json.data.cartCreate.userErrors as ShopifyError[])
                .map((e: ShopifyError) => e.message)
                .join(', ');
            console.error(`Shopify GraphQL Error: ${errorDetails}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'GraphQL error',
                    details: errorDetails,
                    userMessage: 'Failed to create your cart. Please try again.',
                },
                { status: 400 }
            );
        }

        const cart = json.data.cartCreate.cart;

        // Return cart details including checkout URL
        return NextResponse.json({
            success: true,
            data: {
                cartId: cart.id,
                checkoutUrl: cart.checkoutUrl,
                cost: cart.cost,
            },
        });
    } catch (error) {
        console.error('Error in cart creation:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                userMessage: 'Something went wrong. Please try again later.',
            },
            { status: 500 }
        );
    }
}