// src\components\ViewportToaster.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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

export default function ViewportToaster() {
    const [isInIframe, setIsInIframe] = useState(false);
    const [parentViewport, setParentViewport] = useState<ParentViewportInfo | null>(null);
    const [toasterOffset, setToasterOffset] = useState(16); // Default top offset

    useEffect(() => {
        // Check if we're in an iframe
        const checkIframe = () => {
            try {
                return window.self !== window.top;
            } catch {
                return true;
            }
        };

        const inIframe = checkIframe();
        setIsInIframe(inIframe);

        // Request scroll updates from parent if we're in iframe
        if (inIframe) {
            try {
                window.parent.postMessage({
                    type: 'request-scroll-updates',
                    source: 'ViewportToaster'
                }, '*');
            } catch {
                console.warn('Failed to request scroll updates from parent');
            }
        }
    }, []);

    const calculateToasterPosition = useCallback((viewportData: ParentViewportInfo) => {
        const { viewportHeight, iframeTop, iframeHeight } = viewportData;

        // Calculate how much of the iframe is visible in the parent viewport
        const visibleTop = Math.max(0, -iframeTop);
        const visibleBottom = Math.min(iframeHeight, viewportHeight - iframeTop);

        // If iframe is completely out of view, position at top of iframe
        if (visibleBottom <= 0 || visibleTop >= iframeHeight) {
            return 16;
        }

        // Calculate the center of the visible portion
        const visibleHeight = visibleBottom - visibleTop;
        const centerOfVisible = visibleTop + (visibleHeight / 2);

        // Ensure minimum distance from edges
        const minOffset = 16;
        const maxOffset = iframeHeight - 100; // Leave space for toast height

        return Math.max(minOffset, Math.min(maxOffset, centerOfVisible - 50)); // -50 to account for toast height
    }, []);

    // Listen for direct postMessage events from parent
    useEffect(() => {
        if (!isInIframe) return;

        const handleMessage = (event: MessageEvent) => {
            // Handle parent viewport messages directly
            if (event.data?.type === 'parent-scroll-info' || event.data?.type === 'parent-resize-info') {
                const viewportData = event.data as ParentViewportInfo;
                setParentViewport(viewportData);

                // Calculate new toaster position
                const newOffset = calculateToasterPosition(viewportData);
                setToasterOffset(newOffset);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [isInIframe, calculateToasterPosition]);

    // Also listen for custom events (backup method)
    useEffect(() => {
        if (!isInIframe) return;

        const handleParentViewportChange = (event: CustomEvent<ParentViewportInfo>) => {
            const viewportData = event.detail;
            setParentViewport(viewportData);

            // Calculate new toaster position
            const newOffset = calculateToasterPosition(viewportData);
            setToasterOffset(newOffset);
        };

        const handleIframeHeightChange = () => {
            // When iframe height changes, recalculate position if we have parent viewport data
            if (parentViewport) {
                const newOffset = calculateToasterPosition(parentViewport);
                setToasterOffset(newOffset);
            }
        };

        // Listen for parent viewport changes
        window.addEventListener('parent-viewport-change', handleParentViewportChange as EventListener);

        // Listen for iframe height changes
        window.addEventListener('iframe-height-changed', handleIframeHeightChange as EventListener);

        return () => {
            window.removeEventListener('parent-viewport-change', handleParentViewportChange as EventListener);
            window.removeEventListener('iframe-height-changed', handleIframeHeightChange as EventListener);
        };
    }, [isInIframe, parentViewport, calculateToasterPosition]);

    useEffect(() => {
        if (!isInIframe) return;

        // Create dynamic styles for iframe positioning
        const style = document.createElement('style');
        style.id = 'iframe-toaster-fix';
        style.textContent = `
            [data-sonner-toaster] {
                position: fixed !important;
                top: ${toasterOffset}px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
                pointer-events: auto !important;
            }
            
            [data-sonner-toast] {
                position: relative !important;
                pointer-events: auto !important;
            }
            
            /* Ensure toasts are always visible */
            [data-sonner-toaster][data-theme="light"] {
                --normal-bg: oklch(0.971 0.013 17.38);
                --normal-border: oklch(0.89 0.013 17.38);
                --normal-text: oklch(0.396 0.141 25.723);
            }
        `;

        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById('iframe-toaster-fix');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, [isInIframe, toasterOffset]);

    // Debug logging (remove in production)
    useEffect(() => {
        if (isInIframe && parentViewport) {
            console.log('Toast position updated:', {
                toasterOffset,
                iframeTop: parentViewport.iframeTop,
                viewportHeight: parentViewport.viewportHeight,
                scrollTop: parentViewport.scrollTop
            });
        }
    }, [isInIframe, toasterOffset, parentViewport]);

    return (
        <Toaster
            position="top-center"
            expand={true}
            richColors
            closeButton
            toastOptions={{
                style: {
                    padding: "16px",
                    color: "oklch(0.396 0.141 25.723)",
                    backgroundColor: "oklch(0.971 0.013 17.38)",
                    fontSize: "1.15rem",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                },
                duration: 4000,
            }}
        />
    );
}