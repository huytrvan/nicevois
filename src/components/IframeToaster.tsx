// components/IframeToaster.tsx
'use client';

import ReactDOM from 'react-dom';
import { Toaster } from 'sonner';

export default function IframeToaster() {

    if (typeof window !== 'undefined' && window.top && window.top !== window.self) {
         return ReactDOM.createPortal(
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
              />,
              window.top.document.body
         );
    }
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
