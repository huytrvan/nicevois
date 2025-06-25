// src/components/ViewportToaster.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster } from 'sonner';

export default function ViewportToaster() {
    const [isInIframe, setIsInIframe] = useState(false);
    const toasterRef = useRef<HTMLDivElement>(null);

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

        if (!inIframe) return;

        let rafId: number;

        const updateToasterPosition = () => {
            // Find the Sonner toast container
            const toastContainer = document.querySelector('[data-sonner-toaster]') as HTMLElement;

            if (toastContainer) {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const viewportHeight = window.innerHeight;

                // Position the toaster relative to the current viewport
                toastContainer.style.position = 'fixed';
                toastContainer.style.top = '16px';
                toastContainer.style.transform = `translateY(${Math.max(0, scrollTop)}px)`;
                toastContainer.style.zIndex = '9999';

                // Ensure it doesn't go beyond the viewport
                const maxTranslateY = Math.max(0, Math.min(scrollTop, document.documentElement.scrollHeight - viewportHeight));
                toastContainer.style.transform = `translateY(${maxTranslateY}px)`;
            }
        };

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateToasterPosition);
        };

        const handleResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateToasterPosition);
        };

        // Initial position update after a short delay to ensure Sonner is mounted
        const initialTimer = setTimeout(updateToasterPosition, 100);

        // Set up observers
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        // Also observe DOM changes to catch when toasts are added/removed
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const hasToastChanges = Array.from(mutation.addedNodes).some(
                        node => node instanceof Element && (
                            node.querySelector('[data-sonner-toast]') ||
                            node.hasAttribute('data-sonner-toast')
                        )
                    );

                    if (hasToastChanges) {
                        setTimeout(updateToasterPosition, 10);
                    }
                }
            });
        });

        // Start observing after a delay to ensure Sonner is ready
        setTimeout(() => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }, 200);

        return () => {
            clearTimeout(initialTimer);
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [isInIframe]);

    return (
        <div ref={toasterRef}>
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
                    },
                    duration: 4000,
                }}
            />
        </div>
    );
}