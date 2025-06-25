// components/IframeToaster.tsx
'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';

export default function IframeToaster() {
    useEffect(() => {
        // Force recalculate position when component mounts
        const toaster = document.querySelector('[data-sonner-toaster]');
        if (toaster) {
            if (window.top !== window.self) {
                // If inside an iframe, move the toast container to the parent's body so fixed positioning follows the viewport
                window.top.document.body.appendChild(toaster);
            }
            (toaster as HTMLElement).style.position = 'fixed';
            (toaster as HTMLElement).style.top = '1rem';
            (toaster as HTMLElement).style.left = '50%';
            (toaster as HTMLElement).style.transform = 'translateX(-50%)';
            (toaster as HTMLElement).style.zIndex = '999999';
        }
    }, []);

    return (
        <Toaster
            position="top-center"
            offset={16}
            expand={true}
            richColors
            closeButton
            toastOptions={{
                style: {
                    padding: "16px",
                    color: "oklch(0.396 0.141 25.723)",
                    backgroundColor: "oklch(0.971 0.013 17.38)",
                    fontSize: "1.15rem"
                },
                duration: 4000,
            }}
        />
    );
}
