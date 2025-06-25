// src/components/ViewportToaster.tsx
'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export default function CustomToastContainer() {
    const [isInIframe, setIsInIframe] = useState(false);

    useEffect(() => {
        // Check if we're in an iframe
        const checkIframe = () => {
            try {
                return window.self !== window.top;
            } catch {
                return true;
            }
        };

        setIsInIframe(checkIframe());
    }, []);

    // Add custom CSS for iframe behavior
    useEffect(() => {
        if (!isInIframe) return;

        const style = document.createElement('style');
        style.textContent = `
            [data-sonner-toaster] {
                position: fixed !important;
                top: 16px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
            }
            
            [data-sonner-toaster][data-y-position="top"] {
                top: calc(16px + var(--viewport-scroll, 0px)) !important;
            }
        `;
        document.head.appendChild(style);

        let rafId: number;

        const updateScrollPosition = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            document.documentElement.style.setProperty('--viewport-scroll', `${scrollTop}px`);
        };

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateScrollPosition);
        };

        // Initial update
        updateScrollPosition();

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', handleScroll);
            document.head.removeChild(style);
            document.documentElement.style.removeProperty('--viewport-scroll');
        };
    }, [isInIframe]);

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
                },
                duration: 4000,
            }}
        />
    );
}