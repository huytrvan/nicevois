// src\components\BackButton.tsx
"use client"; // Ensure this is a client component

import { useRouter } from "next/navigation"; // Use useRouter for programmatic navigation
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    enableReloadProtection?: boolean; // Optional prop to control reload protection
}

const BackButton: React.FC<BackButtonProps> = ({
    href,
    enableReloadProtection = true
}) => {
    const router = useRouter();

    useEffect(() => {
        if (!enableReloadProtection) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Check if this is a programmatic navigation vs actual page leave
            if (window.performance?.navigation?.type === 0) { // Navigate (not reload)
                return; // Let PostHog handle it
            }

            // Only prevent for actual reloads/close
            e.preventDefault();
            e.returnValue = "";
            return "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [enableReloadProtection]);

    const handleBackClick = () => {
        // Check if the href is "/" to show a reset warning
        if (href === "/") {
            const shouldNavigate = window.confirm(
                "Are you sure you want to go back? All progress will be reset."
            );

            if (!shouldNavigate) return;
        }
        // Navigate back without any warning if href is not "/"
        router.push(href);
    };

    return (
        <button
            onClick={handleBackClick}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white/90 hover:bg-white hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:ring-0 dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15  px-5 rounded-md text-sm md:text-base h-10 md:h-12"
        >
            <ChevronLeft className="-ml-1 size-4 md:size-5" /> Previous
        </button>
    );
};

export default BackButton;