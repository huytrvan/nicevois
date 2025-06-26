// src/components/ViewportToaster.tsx (Ultra-Performance Optimized)
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Toaster } from 'sonner';

interface ParentViewportInfo {
    type: 'parent-scroll-info' | 'parent-resize-info';
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    iframeTop: number;
    iframeLeft: number;
    iframeHeight: number;
    iframeWidth: number;
    timestamp: number;
}

// Ultra-optimized constants
const POSITION_UPDATE_THRESHOLD = 8; // Slightly larger threshold
const POSITION_CACHE_DURATION = 32; // Longer cache duration
const RAF_THROTTLE_MS = 16; // 60fps cap

export default function ViewportToaster() {
    const [isInIframe, setIsInIframe] = useState(false);
    const [toasterOffset, setToasterOffset] = useState(16);

    // Ultra-performance refs - consolidated with proper types
    const stateRef = useRef({
        lastPositionUpdate: 0,
        cachedPosition: 16,
        lastViewportData: null as ParentViewportInfo | null,
        isCalculating: false,
        lastRAF: 0,
        messageQueue: [] as ParentViewportInfo[],
        isProcessing: false
    });

    const timersRef = useRef({
        raf: null as number | null,
        debounce: null as number | null, // Changed from NodeJS.Timeout to number
        batch: null as number | null
    });

    // Memoized iframe check (only runs once)
    const checkIframe = useMemo(() => {
        try {
            return window.self !== window.top;
        } catch {
            return true;
        }
    }, []);

    // Ultra-optimized position calculation with better caching
    const calculateToasterPosition = useCallback((viewportData: ParentViewportInfo): number => {
        const state = stateRef.current;
        const now = performance.now();

        // Enhanced cache check with fuzzy matching
        if (
            state.lastViewportData &&
            now - state.lastPositionUpdate < POSITION_CACHE_DURATION &&
            Math.abs(viewportData.iframeTop - state.lastViewportData.iframeTop) < POSITION_UPDATE_THRESHOLD &&
            Math.abs(viewportData.scrollTop - state.lastViewportData.scrollTop) < POSITION_UPDATE_THRESHOLD &&
            Math.abs(viewportData.viewportHeight - state.lastViewportData.viewportHeight) < 10
        ) {
            return state.cachedPosition;
        }

        const { viewportHeight, iframeTop, iframeHeight } = viewportData;

        // Optimized visibility calculation
        const visibleTop = Math.max(0, -iframeTop);
        const visibleBottom = Math.min(iframeHeight, viewportHeight - iframeTop);

        let newPosition: number;

        if (visibleBottom <= visibleTop) {
            // Completely out of view - use default
            newPosition = 16;
        } else {
            // Use faster integer math where possible
            const visibleHeight = visibleBottom - visibleTop;
            const centerOfVisible = visibleTop + (visibleHeight >> 1); // Bit shift for division by 2

            // Simplified constraints
            const maxOffset = Math.max(16, iframeHeight - 120);
            newPosition = Math.max(16, Math.min(maxOffset, centerOfVisible - 60));
        }

        // Update cache
        state.cachedPosition = newPosition;
        state.lastPositionUpdate = now;
        state.lastViewportData = viewportData;

        return newPosition;
    }, []);

    // Ultra-batched position update with RAF throttling
    const updateToasterPosition = useCallback((viewportData: ParentViewportInfo) => {
        const state = stateRef.current;
        const timers = timersRef.current;
        const now = performance.now();

        // RAF throttling - limit to 60fps
        if (now - state.lastRAF < RAF_THROTTLE_MS) {
            // Queue for next available frame
            state.messageQueue.push(viewportData);
            return;
        }

        if (state.isCalculating || state.isProcessing) return;

        // Cancel previous operations
        if (timers.raf) cancelAnimationFrame(timers.raf);
        if (timers.debounce) clearTimeout(timers.debounce);

        timers.raf = requestAnimationFrame(() => {
            if (state.isProcessing) return;

            state.isProcessing = true;
            state.lastRAF = performance.now();

            try {
                // Process latest message from queue or current
                const latestData = state.messageQueue.length > 0
                    ? state.messageQueue[state.messageQueue.length - 1]
                    : viewportData;

                state.messageQueue.length = 0; // Clear queue efficiently

                const newOffset = calculateToasterPosition(latestData);

                // Micro-optimization: use bitwise operation for threshold check
                if ((newOffset - toasterOffset) ** 2 >= POSITION_UPDATE_THRESHOLD ** 2) {
                    setToasterOffset(newOffset);
                }
            } finally {
                state.isProcessing = false;
                timers.raf = null;
            }
        });
    }, [calculateToasterPosition, toasterOffset]);

    // Setup iframe detection and initial message (runs once)
    useEffect(() => {
        setIsInIframe(checkIframe);

        if (checkIframe) {
            // Single postMessage with error handling
            const sendMessage = () => {
                try {
                    window.parent.postMessage({
                        type: 'request-scroll-updates',
                        source: 'ViewportToaster',
                        timestamp: performance.now()
                    }, '*');
                } catch {
                    // Silent fail - parent might not be accessible
                }
            };

            // Send immediately and as backup after 50ms
            sendMessage();
            setTimeout(sendMessage, 50);
        }
    }, [checkIframe]);

    // Ultra-optimized message handling with intelligent batching
    useEffect(() => {
        if (!isInIframe) return;

        // Capture timer ref at effect creation time
        const timers = timersRef.current;

        // Message batching system
        const messageBuffer = new Map<string, ParentViewportInfo>();

        const processBatch = () => {
            if (messageBuffer.size === 0) return;

            // Process only the latest message of each type
            const scrollInfo = messageBuffer.get('parent-scroll-info');
            const resizeInfo = messageBuffer.get('parent-resize-info');

            // Prioritize resize over scroll
            const dataToProcess = resizeInfo || scrollInfo;

            if (dataToProcess) {
                updateToasterPosition(dataToProcess);
            }

            messageBuffer.clear();
            timers.batch = null;
        };

        const handleMessage = (event: MessageEvent) => {
            const { data } = event;

            if (!data?.type || (data.type !== 'parent-scroll-info' && data.type !== 'parent-resize-info')) {
                return;
            }

            // Buffer the message
            messageBuffer.set(data.type, data as ParentViewportInfo);

            // Batch processing with RAF
            if (!timers.batch) {
                timers.batch = requestAnimationFrame(processBatch);
            }
        };

        // Use capture phase for better performance
        window.addEventListener('message', handleMessage, { passive: true, capture: true });

        return () => {
            window.removeEventListener('message', handleMessage, true);
            if (timers.batch) {
                cancelAnimationFrame(timers.batch);
                timers.batch = null;
            }
        };
    }, [isInIframe, updateToasterPosition]);

    // Optimized custom event handling (consolidated)
    useEffect(() => {
        if (!isInIframe) return;

        const state = stateRef.current;

        const handleViewportChange = (event: CustomEvent<ParentViewportInfo>) => {
            updateToasterPosition(event.detail);
        };

        const handleHeightChange = () => {
            // Only recalculate if we have recent data
            if (state.lastViewportData && performance.now() - state.lastPositionUpdate < 1000) {
                updateToasterPosition(state.lastViewportData);
            }
        };

        const options = { passive: true };
        window.addEventListener('parent-viewport-change', handleViewportChange as EventListener, options);
        window.addEventListener('iframe-height-changed', handleHeightChange, options);

        return () => {
            window.removeEventListener('parent-viewport-change', handleViewportChange as EventListener);
            window.removeEventListener('iframe-height-changed', handleHeightChange);
        };
    }, [isInIframe, updateToasterPosition]);

    // Memoized styles with CSS custom properties for better performance
    const toasterStyles = useMemo(() => {
        if (!isInIframe) return '';

        return `
            :root {
                --toaster-offset: ${toasterOffset}px;
                --toaster-transition: top 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            [data-sonner-toaster] {
                position: fixed !important;
                top: var(--toaster-offset) !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
                pointer-events: auto !important;
                transition: var(--toaster-transition) !important;
                will-change: top !important;
            }
            
            [data-sonner-toast] {
                position: relative !important;
                pointer-events: auto !important;
            }
            
            [data-sonner-toaster][data-theme="light"] {
                --normal-bg: oklch(0.971 0.013 17.38);
                --normal-border: oklch(0.89 0.013 17.38);
                --normal-text: oklch(0.396 0.141 25.723);
            }
        `;
    }, [isInIframe, toasterOffset]);

    // Ultra-optimized style injection with change detection
    useEffect(() => {
        if (!isInIframe) return;

        let styleElement = document.getElementById('iframe-toaster-fix') as HTMLStyleElement;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'iframe-toaster-fix';
            document.head.appendChild(styleElement);
        }

        // Micro-optimization: only update if content actually changed
        if (styleElement.textContent !== toasterStyles) {
            styleElement.textContent = toasterStyles;
        }

        // Return cleanup function that only runs on unmount
        return () => {
            const existingStyle = document.getElementById('iframe-toaster-fix');
            if (existingStyle && existingStyle.parentNode) {
                existingStyle.parentNode.removeChild(existingStyle);
            }
        };
    }, [isInIframe, toasterStyles]);

    // Static toast options (never changes)
    const toastOptions = useMemo(() => ({
        style: {
            padding: "16px",
            color: "oklch(0.396 0.141 25.723)",
            backgroundColor: "oklch(0.971 0.013 17.38)",
            fontSize: "1.15rem",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        },
        duration: 4000,
    }), []);

    // Comprehensive cleanup on unmount
    useEffect(() => {
        // Capture refs at effect creation time
        const timers = timersRef.current;
        const state = stateRef.current;

        return () => {
            // Use the captured refs from effect creation time
            // Clear all timers
            if (timers.raf) cancelAnimationFrame(timers.raf);
            if (timers.debounce) clearTimeout(timers.debounce);
            if (timers.batch) cancelAnimationFrame(timers.batch);

            // Clear state
            state.messageQueue.length = 0;
            state.isProcessing = false;
            state.isCalculating = false;
        };
    }, []);

    return (
        <Toaster
            position="top-center"
            expand={true}
            richColors
            closeButton
            toastOptions={toastOptions}
        />
    );
}