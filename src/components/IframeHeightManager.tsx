'use client';

import { useEffect, useRef, useCallback } from 'react';

const SHOP_ORIGIN = 'https://my-cool-shop.myshopify.com';
const NEXT_APP_ORIGIN = 'https://my-next-app.vercel.app';

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Check if we're embedded in the correct Shopify origin
    const isEmbeddedInShopify = useCallback(() => {
        try {
            return window.parent !== window &&
                window.location.origin === NEXT_APP_ORIGIN;
        } catch (error) {
            // Cross-origin restrictions might prevent this check
            console.error(error as string);
            return window.parent !== window;
        }
    }, []);

    const getDocumentHeight = useCallback(() => {
        const { body, documentElement: html } = document;
        return Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.scrollHeight,
            html.offsetHeight
        );
    }, []);

    const sendHeightToParent = useCallback((height: number) => {
        // Only send if height has changed significantly (avoid spam)
        if (Math.abs(height - lastHeightRef.current) > 5) {
            lastHeightRef.current = height;

            // Send message to parent window with specific origin
            window.parent.postMessage({
                type: 'iframe-height',
                height: height
            }, SHOP_ORIGIN);
        }
    }, []);

    const calculateAndSendHeight = useCallback(() => {
        // Only proceed if we're embedded in Shopify
        if (!isEmbeddedInShopify()) {
            return;
        }

        const height = getDocumentHeight();
        sendHeightToParent(height);
    }, [isEmbeddedInShopify, getDocumentHeight, sendHeightToParent]);

    useEffect(() => {
        // Early return if not embedded in Shopify
        if (!isEmbeddedInShopify()) {
            return;
        }

        // Initial height calculation
        calculateAndSendHeight();

        // Set up ResizeObserver to watch for content changes
        if (typeof window !== 'undefined' && window.ResizeObserver) {
            observerRef.current = new ResizeObserver(() => {
                calculateAndSendHeight();
            });

            // Observe the body element
            observerRef.current.observe(document.body);
        }

        // Fallback: use MutationObserver for additional content changes
        const mutationObserver = new MutationObserver(() => {
            setTimeout(calculateAndSendHeight, 100);
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Listen for window resize
        const handleResize = () => {
            setTimeout(calculateAndSendHeight, 100);
        };

        window.addEventListener('resize', handleResize);

        // Listen for load event
        const handleLoad = () => {
            setTimeout(calculateAndSendHeight, 200);
        };

        window.addEventListener('load', handleLoad);

        // Cleanup
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            mutationObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('load', handleLoad);
        };
    }, [calculateAndSendHeight, isEmbeddedInShopify]);

    // Trigger height calculation when component mounts
    useEffect(() => {
        if (!isEmbeddedInShopify()) {
            return;
        }

        // Multiple attempts to ensure we catch the final height
        const timeouts = [100, 300, 500, 1000];

        const timeoutIds = timeouts.map(delay =>
            setTimeout(calculateAndSendHeight, delay)
        );

        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
        };
    }, [calculateAndSendHeight, isEmbeddedInShopify]);

    // Don't render anything if not embedded in Shopify
    if (!isEmbeddedInShopify()) {
        return null;
    }

    return (
        <div
            ref={rootRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1
            }}
        />
    );
}