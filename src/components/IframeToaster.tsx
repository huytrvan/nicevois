// components/IframeToaster.tsx
'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';

export default function IframeToaster() {
    useEffect(() => {
        // Function to reposition the toaster container
        function repositionToaster() {
            const toaster = document.querySelector('[data-sonner-toaster]');
            if (toaster) {
                if (window.top && window.top !== window.self) {
                    // If inside an iframe, move the toast container to the parent's body so fixed positioning follows the viewport
                    window.top.document.body.appendChild(toaster);
                }
                (toaster as HTMLElement).style.position = 'fixed';
                (toaster as HTMLElement).style.top = '1rem';
                (toaster as HTMLElement).style.left = '50%';
                (toaster as HTMLElement).style.transform = 'translateX(-50%)';
                (toaster as HTMLElement).style.zIndex = '999999';
            }
        }
        // Initial reposition on mount
        repositionToaster();
        // Repeat repositioning every 500ms for 3 seconds to catch late render adjustments
        const intervalId = setInterval(repositionToaster, 500);
        setTimeout(() => clearInterval(intervalId), 3000);

        // Add MutationObserver to reposition when new toast elements are added
        const toaster = document.querySelector('[data-sonner-toaster]');
        let observer: MutationObserver | null = null;
        if (toaster) {
            observer = new MutationObserver(() => repositionToaster());
            observer.observe(toaster, { childList: true });
        }
        // Add event listeners for window resize and parent's scroll to reposition toaster
        window.addEventListener('resize', repositionToaster);
        if (window.top && window.top !== window) {
            window.top.addEventListener('scroll', repositionToaster);
        }
        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener('resize', repositionToaster);
            if (window.top && window.top !== window) {
                window.top.removeEventListener('scroll', repositionToaster);
            }
            clearInterval(intervalId);
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
