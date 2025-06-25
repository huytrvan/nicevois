// components/IframeToaster.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Toaster } from 'sonner';

export default function ViewportToaster() {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [parentScrollOffset, setParentScrollOffset] = useState(0);
    const [isInIframe, setIsInIframe] = useState(false);
    const [viewportHeight, setViewportHeight] = useState(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setViewportHeight(window.innerHeight);

        const updateScrollOffset = () => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            setScrollOffset(currentScroll);
        };

        // Try to get parent scroll information if in iframe
        const requestParentScrollInfo = () => {
            if (inIframe) {
                try {
                    window.parent.postMessage({
                        type: 'request-scroll-info',
                        source: 'ViewportToaster'
                    }, '*');
                } catch {
                    // Silently handle cross-origin restrictions
                }
            }
        };

        // Listen for parent scroll information
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'parent-scroll-info') {
                setParentScrollOffset(event.data.scrollTop || 0);
            }
        };

        // Throttled scroll handler for better performance
        const handleScroll = () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                updateScrollOffset();
                requestParentScrollInfo();
            }, 16); // ~60fps
        };

        const handleResize = () => {
            setViewportHeight(window.innerHeight);
            updateScrollOffset();
        };

        // Initial setup
        updateScrollOffset();
        requestParentScrollInfo();

        // Add event listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        if (inIframe) {
            window.addEventListener('message', handleMessage);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            if (inIframe) {
                window.removeEventListener('message', handleMessage);
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Calculate the dynamic top position based on various factors
    const calculateTopOffset = useCallback(() => {
        if (!isInIframe) return 16;

        // Base offset for iframe
        let offset = 16;

        // Add current scroll position to keep toast in viewport
        offset += scrollOffset;

        // If we have parent scroll info, factor that in too
        if (parentScrollOffset > 0) {
            offset += Math.min(parentScrollOffset, 50); // Cap parent scroll influence
        }

        // Ensure minimum offset and don't go too high
        return Math.max(16, Math.min(offset, scrollOffset + viewportHeight - 100));
    }, [isInIframe, scrollOffset, parentScrollOffset, viewportHeight]);

    const dynamicTopOffset = calculateTopOffset();

    return (
        <Toaster
            position="top-center"
            offset={dynamicTopOffset}
            expand={true}
            richColors
            closeButton
            toastOptions={{
                style: {
                    padding: "16px",
                    color: "oklch(0.396 0.141 25.723)",
                    backgroundColor: "oklch(0.971 0.013 17.38)",
                    fontSize: "1.15rem",
                    zIndex: 9999,
                    // Add some visual enhancement for iframe context
                    boxShadow: isInIframe
                        ? "0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)"
                        : undefined,
                },
                duration: 4000,
            }}
        />
    );
}