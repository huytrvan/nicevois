// components/IframeHeightManager.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

const SHOP_ORIGINS = [
    'https://evjbcx-s0.myshopify.com',
    'https://nicevois.com',
    'https://nicevois-dev-test.vercel.app' // Add your dev URL
];

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isInitializedRef = useRef<boolean>(false);

    // Enhanced check for iframe embedding
    const isEmbeddedInShopify = useCallback(() => {
        if (typeof window === 'undefined') return false;

        try {
            // Check if we're in an iframe
            const inIframe = window.parent !== window;

            // Additional check using window.top
            const hasParent = window.top !== window;

            return inIframe || hasParent;
        } catch (error) {
            console.error(`Got this error: ${error as string}`);
            // Cross-origin restrictions - assume we're embedded
            return true;
        }
    }, []);

    const getDocumentHeight = useCallback(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return 400;
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            return 400;
        }

        const { body, documentElement: html } = document;

        // Get all possible height measurements
        const heights = [
            body.scrollHeight,
            body.offsetHeight,
            body.clientHeight,
            html.scrollHeight,
            html.offsetHeight,
            html.clientHeight,
            window.innerHeight
        ].filter(h => h > 0);

        // Return the maximum height, with a reasonable minimum
        const maxHeight = Math.max(...heights);
        return Math.max(maxHeight, 200);
    }, []);

    const sendHeightToParent = useCallback((height: number) => {
        if (typeof window === 'undefined') return;

        // CRITICAL: Always send height changes, including reductions
        // Only skip if the height is exactly the same
        if (height === lastHeightRef.current) return;

        const previousHeight = lastHeightRef.current;
        lastHeightRef.current = height;

        // Enhanced message sending with error handling
        const message = {
            type: 'iframe-height',
            height: height,
            timestamp: Date.now(),
            source: 'IframeHeightManager',
            forceUpdate: true,
            previousHeight: previousHeight // Send previous height for comparison
        };

        // Send message function
        const sendMessage = () => {
            // Try sending to all possible parent origins
            SHOP_ORIGINS.forEach(origin => {
                try {
                    window.parent.postMessage(message, origin);
                    console.log(`Height message sent to ${origin}: ${previousHeight} -> ${height}`);
                } catch (error) {
                    console.warn(`Failed to send message to ${origin}:`, error);
                }
            });

            // Also try sending to '*' as fallback
            try {
                window.parent.postMessage(message, '*');
            } catch (error) {
                console.warn('Failed to send wildcard message:', error);
            }
        };

        // Always send immediately - let the parent handle throttling if needed
        sendMessage();
    }, []);

    const calculateAndSendHeight = useCallback(() => {
        if (!isEmbeddedInShopify()) return;

        // Use requestAnimationFrame for smoother timing
        requestAnimationFrame(() => {
            const height = getDocumentHeight();
            sendHeightToParent(height);
        });
    }, [isEmbeddedInShopify, getDocumentHeight, sendHeightToParent]);

    // Initialize height management
    useEffect(() => {
        if (typeof window === 'undefined' || isInitializedRef.current) return;
        if (!isEmbeddedInShopify()) return;

        isInitializedRef.current = true;

        // Initial height calculation with multiple attempts
        const initialDelays = [0, 100, 300, 500, 1000, 2000];
        const timeoutIds = initialDelays.map(delay =>
            setTimeout(calculateAndSendHeight, delay)
        );

        // Set up ResizeObserver with throttling
        if (window.ResizeObserver && !observerRef.current) {
            let resizeTimeout: NodeJS.Timeout | null = null;

            observerRef.current = new ResizeObserver(() => {
                // Throttle resize events to prevent excessive calls
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    calculateAndSendHeight();
                }, 16); // ~60fps
            });

            // Observe both body and document element
            if (document.body) {
                observerRef.current.observe(document.body);
            }
            if (document.documentElement) {
                observerRef.current.observe(document.documentElement);
            }
        }

        // Set up MutationObserver for DOM changes with throttling
        if (!mutationObserverRef.current) {
            let mutationTimeout: NodeJS.Timeout | null = null;

            mutationObserverRef.current = new MutationObserver((mutations) => {
                // Check if any mutation actually affects layout
                const affectsLayout = mutations.some(mutation =>
                    mutation.type === 'childList' ||
                    (mutation.type === 'attributes' &&
                        ['style', 'class', 'height', 'width'].includes(mutation.attributeName || ''))
                );

                if (affectsLayout) {
                    // Throttle mutation events
                    if (mutationTimeout) clearTimeout(mutationTimeout);
                    mutationTimeout = setTimeout(() => {
                        calculateAndSendHeight();
                    }, 16); // ~60fps
                }
            });

            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'height', 'width']
            });
        }

        // Window resize handler with throttling
        let resizeThrottle: NodeJS.Timeout | null = null;
        const handleResize = () => {
            if (resizeThrottle) clearTimeout(resizeThrottle);
            resizeThrottle = setTimeout(() => {
                calculateAndSendHeight();
            }, 16); // ~60fps
        };

        // Window load handler
        const handleLoad = () => {
            setTimeout(calculateAndSendHeight, 100);
        };

        // DOM content loaded handler
        const handleDOMContentLoaded = () => {
            setTimeout(calculateAndSendHeight, 50);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('load', handleLoad);
        document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

        // Cleanup function
        return () => {
            timeoutIds.forEach(id => clearTimeout(id));

            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }

            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
                mutationObserverRef.current = null;
            }

            window.removeEventListener('resize', handleResize);
            window.removeEventListener('load', handleLoad);
            document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);

            isInitializedRef.current = false;
        };
    }, [calculateAndSendHeight, isEmbeddedInShopify]);

    // Handle React state changes that might affect height with throttling
    useEffect(() => {
        if (!isEmbeddedInShopify()) return;

        // Throttle state change updates
        const timer = setTimeout(calculateAndSendHeight, 16); // ~60fps
        return () => clearTimeout(timer);
    });

    // Don't render anything
    return null;
}