// components/IframeToaster.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

export default function IframeToaster() {
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.top && window.top !== window) {
            try {
                const parentDoc = window.top.document;
                let container = parentDoc.getElementById('portal-toaster-container');
                let didCreate = false;
                if (!container) {
                    container = parentDoc.createElement('div');
                    container.id = 'portal-toaster-container';
                    parentDoc.body.appendChild(container);
                    didCreate = true;
                }
                setPortalContainer(container);
                return () => {
                    // Remove the container if we created it
                    if (didCreate && container && container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                };
            } catch (error) {
                console.error("Error accessing parent's document:", error);
            }
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
