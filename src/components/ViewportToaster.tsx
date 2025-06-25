// src/components/ViewportToaster.tsx
'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export default function ViewportToaster() {
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

    useEffect(() => {
        if (!isInIframe) return;

        // Force the toaster to always appear at the top of the visible viewport
        const style = document.createElement('style');
        style.id = 'iframe-toaster-fix';
        style.textContent = `
            [data-sonner-toaster] {
                position: fixed !important;
                top: 16px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
            }
            
            [data-sonner-toast] {
                position: relative !important;
            }
        `;

        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById('iframe-toaster-fix');
            if (existingStyle) {
                existingStyle.remove();
            }
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