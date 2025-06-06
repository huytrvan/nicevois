// components/IframeHeightManager.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

const SHOP_ORIGINS = [
    'https://evjbcx-s0.myshopify.com',
    'https://nicevois.com',
    'https://nicevois-dev-test.vercel.app'
];

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isInitializedRef = useRef<boolean>(false);

    const isEmbeddedInShopify = useCallback(() => {
        if (typeof window === 'undefined') return false;

        try {
            const inIframe = window.parent !== window;
            const hasParent = window.top !== window;
            return inIframe || hasParent;
        } catch (error) {
            console.error(`Got this error: ${error as string}`);
            return true;
        }
    }, []);

    const getDocumentHeight = useCallback(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return 400;
        }

        if (document.readyState === 'loading') {
            return 400;
        }

        const { body, documentElement: html } = document;

        const heights = [
            body.scrollHeight,
            body.offsetHeight,
            body.clientHeight,
            html.scrollHeight,
            html.offsetHeight,
            html.clientHeight,
            window.innerHeight
        ].filter(h => h > 0);

        const maxHeight = Math.max(...heights);
        return Math.max(maxHeight, 200);
    }, []);

    const sendHeightToParent = useCallback((height: number) => {
        if (typeof window === 'undefined') return;

        const previousHeight = lastHeightRef.current;
        const isReduction = height < previousHeight;

        // CRITICAL: For reductions, always send even if very small difference
        // For increases, only send if difference is meaningful
        const threshold = isReduction ? 0 : 5; // No threshold for reductions, 5px for increases

        if (Math.abs(height - previousHeight) < threshold) return;

        lastHeightRef.current = height;

        const message = {
            type: 'iframe-height',
            height: height,
            timestamp: Date.now(),
            source: 'IframeHeightManager',
            forceUpdate: isReduction, // Force update for reductions
            previousHeight: previousHeight,
            isReduction: isReduction,
            heightDiff: height - previousHeight
        };

        const sendMessage = () => {
            SHOP_ORIGINS.forEach(origin => {
                try {
                    window.parent.postMessage(message, origin);
                    console.log(`Height ${isReduction ? 'REDUCTION' : 'increase'} sent to ${origin}: ${previousHeight} -> ${height} (${height - previousHeight > 0 ? '+' : ''}${height - previousHeight}px)`);
                } catch (error) {
                    console.warn(`Failed to send message to ${origin}:`, error);
                }
            });

            try {
                window.parent.postMessage(message, '*');
            } catch (error) {
                console.warn('Failed to send wildcard message:', error);
            }
        };

        // CRITICAL: Send reductions immediately, slight delay for increases
        if (isReduction) {
            sendMessage();
        } else {
            setTimeout(sendMessage, 16);
        }
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

        // More aggressive initial height calculations
        const initialDelays = [0, 50, 100, 200, 300, 500, 1000, 2000];
        const timeoutIds = initialDelays.map(delay =>
            setTimeout(calculateAndSendHeight, delay)
        );

        // Enhanced ResizeObserver with faster response for reductions
        if (window.ResizeObserver && !observerRef.current) {
            let resizeTimeout: NodeJS.Timeout | null = null;

            observerRef.current = new ResizeObserver(() => {
                // Clear any pending timeout
                if (resizeTimeout) clearTimeout(resizeTimeout);

                // Get current height to determine if it's a reduction
                const currentHeight = getDocumentHeight();
                const isReduction = currentHeight < lastHeightRef.current;

                // Immediate response for reductions, slight delay for increases
                const delay = isReduction ? 0 : 16;

                resizeTimeout = setTimeout(() => {
                    calculateAndSendHeight();
                }, delay);
            });

            if (document.body) {
                observerRef.current.observe(document.body);
            }
            if (document.documentElement) {
                observerRef.current.observe(document.documentElement);
            }
        }

        // Enhanced MutationObserver with better layout change detection
        if (!mutationObserverRef.current) {
            let mutationTimeout: NodeJS.Timeout | null = null;

            mutationObserverRef.current = new MutationObserver((mutations) => {
                const affectsLayout = mutations.some(mutation => {
                    if (mutation.type === 'childList') {
                        // Check for meaningful DOM changes
                        return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
                    }
                    if (mutation.type === 'attributes') {
                        const relevantAttributes = ['style', 'class', 'height', 'width', 'hidden'];
                        return relevantAttributes.includes(mutation.attributeName || '');
                    }
                    return false;
                });

                if (affectsLayout) {
                    if (mutationTimeout) clearTimeout(mutationTimeout);

                    // Check if this might be a reduction
                    const currentHeight = getDocumentHeight();
                    const isReduction = currentHeight < lastHeightRef.current;
                    const delay = isReduction ? 0 : 16;

                    mutationTimeout = setTimeout(() => {
                        calculateAndSendHeight();
                    }, delay);
                }
            });

            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'height', 'width', 'hidden']
            });
        }

        // Enhanced window resize handler
        let resizeThrottle: NodeJS.Timeout | null = null;
        const handleResize = () => {
            if (resizeThrottle) clearTimeout(resizeThrottle);

            const currentHeight = getDocumentHeight();
            const isReduction = currentHeight < lastHeightRef.current;
            const delay = isReduction ? 0 : 16;

            resizeThrottle = setTimeout(() => {
                calculateAndSendHeight();
            }, delay);
        };

        const handleLoad = () => {
            setTimeout(calculateAndSendHeight, 100);
        };

        const handleDOMContentLoaded = () => {
            setTimeout(calculateAndSendHeight, 50);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('load', handleLoad);
        document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

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
    }, [calculateAndSendHeight, isEmbeddedInShopify, getDocumentHeight]);

    // Enhanced React state change handler
    useEffect(() => {
        if (!isEmbeddedInShopify()) return;

        const currentHeight = getDocumentHeight();
        const isReduction = currentHeight < lastHeightRef.current;
        const delay = isReduction ? 0 : 16;

        const timer = setTimeout(calculateAndSendHeight, delay);
        return () => clearTimeout(timer);
    });

    return null;
}