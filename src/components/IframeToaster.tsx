// components/IframeToaster.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

export default function IframeToaster() {
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let container = null;
            try {
                if (window.top && window.top !== window) {
                    container = window.top.document.getElementById('portal-toaster-container');
                }
            } catch (error) {
                console.error("Accessing parent's document failed:", error);
            }
            if (!container) {
                container = document.getElementById('portal-toaster-container');
            }
            if (!container) {
                console.error("Portal container not found. Ensure that a div with id 'portal-toaster-container' exists in your layout.");
            }
            setPortalContainer(container);
        }
    }, []);

    const toaster = (
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

    if (portalContainer) {
        return createPortal(toaster, portalContainer);
    }
    return toaster;
}
