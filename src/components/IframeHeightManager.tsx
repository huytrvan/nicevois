// components/IframeHeightManager.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

const SHOP_ORIGINS = ['https://evjbcx-s0.myshopify.com', 'https://nicevois.com'];

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Check if we're embedded in the correct Shopify origin
    const isEmbeddedInShopify = useCallback(() => {
        try {
            return window.parent !== window;
        } catch (error) {
            console.log(error as string)
            // Cross-origin restrictions might prevent this check
            return window.parent !== window;
        }
    }, []);

    const getDocumentHeight = useCallback(() => {
        // Only run on client-side
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return 400; // Default height for SSR
        }

        const { body, documentElement: html } = document;
        return Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.scrollHeight,
            html.offsetHeight
        );
    }, []);

    const sendHeightToParent = useCallback((height: number) => {
        // Only run on client-side
        if (typeof window === 'undefined') {
            return;
        }

        // Only send if height has changed significantly (avoid spam)
        if (Math.abs(height - lastHeightRef.current) > 5) {
            lastHeightRef.current = height;

            // Send message to each allowed parent origin
            SHOP_ORIGINS.forEach(origin => {
                try {
                    window.parent.postMessage({
                        type: 'iframe-height',
                        height: height
                    }, origin);
                } catch (error) {
                    console.error('Failed to send message to parent:', error);
                }
            });
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
        // Only run on client-side
        if (typeof window === 'undefined') {
            return;
        }

        // Early return if not embedded in Shopify
        if (!isEmbeddedInShopify()) {
            return;
        }

        // Initial height calculation
        calculateAndSendHeight();

        // Set up ResizeObserver to watch for content changes
        if (window.ResizeObserver) {
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

    // Don't render anything if not on client-side or not embedded in Shopify
    if (typeof window === 'undefined' || !isEmbeddedInShopify()) {
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