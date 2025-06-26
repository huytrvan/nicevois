// src/components/IframeHeightManager.tsx (Ultra-Performance Optimized)
"use client";
import { useEffect, useRef, useCallback } from "react";

if (process.env.NEXT_PUBLIC_SHOP_ORIGINS == undefined) {
    throw new Error("Missing SHOP_ORIGINS environment variable");
}

const SHOP_ORIGINS = String(process.env.NEXT_PUBLIC_SHOP_ORIGINS).split(',');

// Ultra-optimized performance constants
const PERF_CONFIG = {
    HEIGHT_THRESHOLD: 2,
    CRITICAL_HEIGHT_THRESHOLD: 8, // Reduced for better responsiveness
    DEBOUNCE_DELAY: 8, // Ultra-fast debouncing (~120fps)
    MUTATION_DEBOUNCE_DELAY: 32, // Reduced mutation delay
    RESIZE_DEBOUNCE_DELAY: 8, // Faster resize response
    CACHE_DURATION: 16, // Shorter cache for more accuracy
    RAF_THROTTLE_MS: 16 // ~60fps cap
};

interface MessageData {
    type: string;
    height?: number;
    timestamp?: number;
    source?: string;
    forceUpdate?: boolean;
    previousHeight?: number;
    isReduction?: boolean;
    heightDiff?: number;
    isCritical?: boolean;
    [key: string]: unknown;
}

export default function IframeHeightManager() {
    // Consolidated state in single ref for better performance
    const stateRef = useRef({
        lastHeight: 0,
        lastSentHeight: 0,
        isInitialized: false,
        isCalculating: false,
        cachedHeight: 0,
        lastCalculationTime: 0,
        isEmbedded: false,
        lastRAF: 0,
        messageQueue: [] as MessageData[],
        isProcessingQueue: false,
        pendingNotifications: new Set<string>(),
        readyMessagesSent: 0
    });

    // Consolidated timers ref
    const timersRef = useRef({
        debounce: null as NodeJS.Timeout | null,
        mutationDebounce: null as NodeJS.Timeout | null,
        resizeDebounce: null as NodeJS.Timeout | null,
        notificationBatch: null as number | null,
        raf: null as number | null,
        messageProcess: null as number | null
    });

    // Consolidated observers ref
    const observersRef = useRef({
        resize: null as ResizeObserver | null,
        mutation: null as MutationObserver | null
    });

    // Ultra-optimized embedded check (memoized)
    const checkEmbedded = useCallback(() => {
        if (stateRef.current.isEmbedded !== undefined) {
            return stateRef.current.isEmbedded;
        }

        try {
            const embedded = window.parent !== window || window.top !== window;
            stateRef.current.isEmbedded = embedded;
            return embedded;
        } catch {
            stateRef.current.isEmbedded = true;
            return true;
        }
    }, []);

    // Ultra-optimized height calculation with better caching strategy
    const getDocumentHeight = useCallback(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return 400;
        }

        const state = stateRef.current;
        const now = performance.now();

        // Enhanced caching with document state check
        if (document.readyState === "loading") {
            return state.cachedHeight || 400;
        }

        // Use cached value if very recent
        if (now - state.lastCalculationTime < PERF_CONFIG.CACHE_DURATION && state.cachedHeight > 0) {
            return state.cachedHeight;
        }

        const mainContent = document.getElementById("main-content");
        let height: number;

        if (mainContent) {
            // Ultra-optimized main content measurement
            const rect = mainContent.getBoundingClientRect();
            const style = window.getComputedStyle(mainContent);

            // Use parseFloat with fallback for better performance
            const marginTop = parseFloat(style.marginTop) || 0;
            const marginBottom = parseFloat(style.marginBottom) || 0;
            const padding = 100; // Static padding for performance

            height = Math.max(
                mainContent.scrollHeight + marginTop + marginBottom + padding,
                rect.height + marginTop + marginBottom + padding,
                200
            );
        } else {
            // Fallback measurement with optimized access
            const { body, documentElement } = document;
            height = Math.max(
                body.scrollHeight,
                documentElement.scrollHeight,
                body.offsetHeight,
                documentElement.offsetHeight,
                200
            );
        }

        // Update cache
        state.cachedHeight = height;
        state.lastCalculationTime = now;
        return height;
    }, []);

    // Ultra-batched notification system
    const notifyToastOfChanges = useCallback((eventType = 'height-change') => {
        const state = stateRef.current;
        const timers = timersRef.current;

        state.pendingNotifications.add(eventType);

        if (!timers.notificationBatch) {
            timers.notificationBatch = requestAnimationFrame(() => {
                if (state.pendingNotifications.size > 0) {
                    window.dispatchEvent(new CustomEvent('iframe-height-changed', {
                        detail: {
                            height: getDocumentHeight(),
                            timestamp: performance.now(),
                            batchedEvents: Array.from(state.pendingNotifications)
                        }
                    }));
                    state.pendingNotifications.clear();
                }
                timers.notificationBatch = null;
            });
        }
    }, [getDocumentHeight]);

    // Ultra-optimized message queue processing
    const processMessageQueue = useCallback(() => {
        const state = stateRef.current;
        const timers = timersRef.current;

        if (state.isProcessingQueue || state.messageQueue.length === 0) {
            return;
        }

        // RAF throttling for message processing
        const now = performance.now();
        if (now - state.lastRAF < PERF_CONFIG.RAF_THROTTLE_MS) {
            // Schedule for next available frame
            if (!timers.messageProcess) {
                timers.messageProcess = requestAnimationFrame(() => {
                    timers.messageProcess = null;
                    processMessageQueue();
                });
            }
            return;
        }

        state.isProcessingQueue = true;
        state.lastRAF = now;

        try {
            // Process latest message only (drop intermediates)
            const latestMessage = state.messageQueue[state.messageQueue.length - 1];
            state.messageQueue.length = 0; // Clear queue efficiently

            // Batch send to all origins
            const promises = SHOP_ORIGINS.map(origin => {
                try {
                    window.parent.postMessage(latestMessage, origin);
                    return Promise.resolve();
                } catch {
                    return Promise.reject();
                }
            });

            // Fire and forget - don't wait for completion
            Promise.allSettled(promises);
        } finally {
            state.isProcessingQueue = false;
        }
    }, []);

    // Ultra-optimized height sending with intelligent batching
    const sendHeightToParent = useCallback((height: number, force = false) => {
        if (!checkEmbedded()) return;

        const state = stateRef.current;
        const previousHeight = state.lastSentHeight;
        const heightDiff = Math.abs(height - previousHeight);

        // Enhanced skip logic
        if (!force && heightDiff < PERF_CONFIG.HEIGHT_THRESHOLD) {
            return;
        }

        state.lastSentHeight = height;
        const isReduction = height < previousHeight;
        const isCritical = heightDiff > PERF_CONFIG.CRITICAL_HEIGHT_THRESHOLD;

        const message: MessageData = {
            type: "iframe-height",
            height,
            timestamp: performance.now(),
            source: "IframeHeightManager",
            forceUpdate: isReduction || isCritical,
            previousHeight,
            isReduction,
            heightDiff: height - previousHeight,
            isCritical
        };

        // Notify toast system
        notifyToastOfChanges('height-update');

        if (isCritical || isReduction) {
            // Send critical updates immediately
            SHOP_ORIGINS.forEach(origin => {
                try {
                    window.parent.postMessage(message, origin);
                } catch {
                    // Silent fail for performance
                }
            });
        } else {
            // Queue non-critical updates
            state.messageQueue.push(message);
            processMessageQueue();
        }
    }, [checkEmbedded, notifyToastOfChanges, processMessageQueue]);

    // Ultra-optimized debounced height update with RAF integration
    const debouncedHeightUpdate = useCallback((force = false, source = 'unknown') => {
        if (!checkEmbedded()) return;

        const state = stateRef.current;
        const timers = timersRef.current;

        // Prevent multiple simultaneous calculations
        if (state.isCalculating && !force) {
            return;
        }

        // Clear previous operations
        if (timers.raf) cancelAnimationFrame(timers.raf);
        if (timers.debounce) clearTimeout(timers.debounce);

        const executeUpdate = () => {
            if (state.isCalculating && !force) return;

            state.isCalculating = true;

            try {
                const height = getDocumentHeight();
                const heightDiff = Math.abs(height - state.lastHeight);

                if (heightDiff >= PERF_CONFIG.HEIGHT_THRESHOLD || force) {
                    state.lastHeight = height;
                    sendHeightToParent(height, force);
                }
            } finally {
                state.isCalculating = false;
            }
        };

        if (force || source === 'resize') {
            // Execute immediately for critical updates
            timers.raf = requestAnimationFrame(executeUpdate);
        } else {
            // Micro-debounce for other updates
            timers.debounce = setTimeout(() => {
                timers.raf = requestAnimationFrame(executeUpdate);
            }, PERF_CONFIG.DEBOUNCE_DELAY);
        }
    }, [checkEmbedded, getDocumentHeight, sendHeightToParent]);

    // Ultra-optimized mutation handling
    const throttledMutationUpdate = useCallback(() => {
        const timers = timersRef.current;

        if (timers.mutationDebounce) {
            clearTimeout(timers.mutationDebounce);
        }

        timers.mutationDebounce = setTimeout(() => {
            debouncedHeightUpdate(false, 'mutation');
        }, PERF_CONFIG.MUTATION_DEBOUNCE_DELAY);
    }, [debouncedHeightUpdate]);

    // Ultra-optimized resize handling
    const throttledResizeUpdate = useCallback(() => {
        const timers = timersRef.current;
        const state = stateRef.current;

        if (timers.resizeDebounce) {
            clearTimeout(timers.resizeDebounce);
        }

        // Clear cache on resize for accuracy
        state.lastCalculationTime = 0;
        state.cachedHeight = 0;

        timers.resizeDebounce = setTimeout(() => {
            debouncedHeightUpdate(true, 'resize');
        }, PERF_CONFIG.RESIZE_DEBOUNCE_DELAY);
    }, [debouncedHeightUpdate]);

    // Ultra-optimized message handling with better buffering
    useEffect(() => {
        const messageBuffer = new Map<string, MessageData>();
        let bufferTimer: number | null = null;

        const processBuffer = () => {
            messageBuffer.forEach((data) => {
                if (data.type === 'parent-scroll-info' || data.type === 'parent-resize-info') {
                    window.dispatchEvent(new CustomEvent('parent-viewport-change', {
                        detail: data
                    }));
                }
            });
            messageBuffer.clear();
            bufferTimer = null;
        };

        const handleParentMessage = (event: MessageEvent) => {
            const { data } = event;
            if (!data?.type) return;

            // Enhanced message filtering
            if (data.type === 'parent-scroll-info' || data.type === 'parent-resize-info') {
                messageBuffer.set(data.type, data);

                if (!bufferTimer) {
                    bufferTimer = requestAnimationFrame(processBuffer);
                }
            } else if (data.type === 'request-scroll-updates') {
                // Limit ready message spam
                const state = stateRef.current;
                if (state.readyMessagesSent < 3) {
                    try {
                        window.parent.postMessage({
                            type: 'iframe-ready-for-scroll-updates',
                            source: 'IframeHeightManager',
                            timestamp: performance.now()
                        }, '*');
                        state.readyMessagesSent++;
                    } catch {
                        // Silent fail
                    }
                }
            }
        };

        window.addEventListener('message', handleParentMessage, { passive: true });

        return () => {
            if (bufferTimer) cancelAnimationFrame(bufferTimer);
            window.removeEventListener('message', handleParentMessage);
        };
    }, []);

    // Optimized initialization sequence
    useEffect(() => {
        const state = stateRef.current;

        if (state.isInitialized || !checkEmbedded()) {
            return;
        }

        state.isInitialized = true;

        // Staggered initial measurements with reduced delays
        const initialDelays = [0, 8, 50, 150];
        const timeoutIds = initialDelays.map((delay, index) =>
            setTimeout(() => debouncedHeightUpdate(index === 0, 'initial'), delay)
        );

        // Capture refs at effect creation time
        const timers = timersRef.current;
        const observers = observersRef.current;

        // Ultra-optimized ResizeObserver setup
        if (window.ResizeObserver) {
            const observer = new ResizeObserver((entries) => {
                // Only process if content actually changed
                const hasRelevantChange = entries.some(entry => entry.contentRect.height > 0);
                if (hasRelevantChange) {
                    throttledResizeUpdate();
                }
            });

            const targetElement = document.getElementById("main-content") || document.body;
            observer.observe(targetElement);
            observers.resize = observer;
        }

        // Ultra-optimized MutationObserver setup
        const mutationObserver = new MutationObserver((mutations) => {
            // Ultra-fast relevance check
            const hasLayoutChange = mutations.some(mutation => {
                if (mutation.type === 'childList') {
                    return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
                }
                if (mutation.type === 'attributes') {
                    const attr = mutation.attributeName;
                    return attr === 'style' || attr === 'class' || attr === 'height' || attr === 'hidden';
                }
                return false;
            });

            if (hasLayoutChange) {
                throttledMutationUpdate();
            }
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class", "height", "hidden"],
            attributeOldValue: false,
            characterData: false,
        });

        observers.mutation = mutationObserver;

        // Optimized event listeners
        const handleLoad = () => debouncedHeightUpdate(true, 'load');
        const handleDOMReady = () => debouncedHeightUpdate(true, 'dom-ready');
        const handleScroll = () => notifyToastOfChanges('scroll');

        const options = { passive: true };
        window.addEventListener("resize", throttledResizeUpdate, options);
        window.addEventListener("load", handleLoad, options);
        window.addEventListener("scroll", handleScroll, options);
        document.addEventListener("DOMContentLoaded", handleDOMReady, options);

        return () => {
            // Comprehensive cleanup
            timeoutIds.forEach(clearTimeout);

            // Clear all timers using captured refs
            Object.values(timers).forEach(timer => {
                if (typeof timer === 'number' && timer !== null) {
                    cancelAnimationFrame(timer);
                } else if (timer) {
                    clearTimeout(timer);
                }
            });

            // Disconnect observers using captured refs
            if (observers.resize) {
                observers.resize.disconnect();
                observers.resize = null;
            }
            if (observers.mutation) {
                observers.mutation.disconnect();
                observers.mutation = null;
            }

            // Remove event listeners
            window.removeEventListener("resize", throttledResizeUpdate);
            window.removeEventListener("load", handleLoad);
            window.removeEventListener("scroll", handleScroll);
            document.removeEventListener("DOMContentLoaded", handleDOMReady);

            // Reset state
            state.isInitialized = false;
        };
    }, [checkEmbedded, debouncedHeightUpdate, throttledMutationUpdate, throttledResizeUpdate, notifyToastOfChanges]);

    return null;
}