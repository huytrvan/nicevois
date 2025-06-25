// src/app/review/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, PackageCheck, ShoppingCart, ChevronDown, ChevronUp, Download, ExternalLink } from 'lucide-react';
import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import { Toaster, toast } from "sonner";
import { StepIndicator, StepDivider, type StepProps } from "@/components/layouts/StepNavigation";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { stripHtmlAndSymbols, getDistinctChangedWords } from '../change-lyrics/utils'; // Import getDistinctChangedWords

// Type definitions
type ProductOption = {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    isSelected: boolean;
    type: "delivery" | "addon";
};

interface WordChange {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
    isTransformation?: boolean;
    isDeletion?: boolean;
    isAddition?: boolean;
    isSubstitution?: boolean;
    isExplicitDeletion?: boolean;
}

export type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

interface CheckoutButtonProps {
    handleCheckout: () => void;
    isLoading: boolean;
    calculateTotal: () => number;
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({ handleCheckout, isLoading, calculateTotal }) => {
    return (
        <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
            type="button"
        >
            <PackageCheck />
            {isLoading ? (
                "Processing..."
            ) : (
                <>
                    Checkout{" "}
                    <span className="font-bold text-lg">
                        US${calculateTotal().toFixed(2)}
                    </span>
                </>
            )}
            <ChevronRight className="-mr-1 size-4 md:size-5" />
        </button>
    );
};

function OrderReviewPageContent() {
    const router = useRouter();
    const [songTitle, setSongTitle] = useState("");
    const [songArtist, setSongArtist] = useState("");
    const [songImage, setSongImage] = useState("");
    const [songUrl, setSongUrl] = useState("");
    const [currentStep, setCurrentStep] = useState(3);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
    const [cost, setCost] = useState(0);
    const [specialRequests, setSpecialRequests] = useState("");
    const [productOptions, setProductOptions] = useState<ProductOption[]>([
        {
            id: "delivery-standard",
            title: "Standard Delivery",
            description: "2-7 business days",
            price: 0,
            isSelected: true,
            type: "delivery",
        },
        {
            id: "delivery-rush",
            title: "Rush Delivery",
            description: "1 business day",
            price: 15,
            originalPrice: 20,
            isSelected: false,
            type: "delivery",
        },
    ]);
    const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);

    // Memoize processed lyrics from lyricsData
    const lyrics = useMemo(() => {
        return lyricsData
            .map(line => {
                const countedPositions = new Set<number>();
                const filteredChanges = line.wordChanges.filter(change => {
                    if (!change.hasChanged) return false;
                    const originalWithoutPunctuation = (change.originalWord || '').replace(/[.,()[\]{}:;!?-]+/g, '');
                    const newWithoutPunctuation = (change.newWord || '').replace(/[.,()[\]{}:;!?-]+/g, '');
                    const isPunctuationChangeOnly =
                        originalWithoutPunctuation.toLowerCase() === newWithoutPunctuation.toLowerCase() &&
                        originalWithoutPunctuation.length > 0;
                    if (isPunctuationChangeOnly) return false;
                    if (change.originalWord) {
                        if (countedPositions.has(change.originalIndex)) return false;
                        countedPositions.add(change.originalIndex);
                    }
                    return true;
                });
                return { ...line, wordChanges: filteredChanges };
            })
            .filter(line => line.wordChanges.length > 0);
    }, [lyricsData]);

    // Compute distinct changed words using getDistinctChangedWords from utils.ts
    const distinctChangedWords = useMemo(() => {
        return getDistinctChangedWords(lyricsData);
    }, [lyricsData]);

    // Load data from localStorage
    useEffect(() => {
        try {
            setSongTitle(localStorage.getItem("songTitle") || "");
            setSongArtist(localStorage.getItem("songArtist") || "");
            const storedImage = localStorage.getItem("songImage") || "";
            setSongImage(storedImage ? decodeURIComponent(storedImage) : "");
            setSongUrl(localStorage.getItem("songUrl") || "");
            const storedLyrics = JSON.parse(localStorage.getItem("lyrics") || "[]");
            const storedCost = parseFloat(localStorage.getItem("cost") || "0");
            const storedSpecialRequests = localStorage.getItem("specialRequests") || "";

            setLyricsData(storedLyrics);
            setCost(storedCost);
            setSpecialRequests(storedSpecialRequests);
        } catch (error) {
            console.error("Error loading from localStorage:", error);
            toast.error("Failed to load order data");
        }
    }, []);

    const toggleProductSelection = (productId: string) => {
        setProductOptions((prevOptions) => {
            const updatedOptions = [...prevOptions];
            const productIndex = updatedOptions.findIndex((p) => p.id === productId);
            if (productIndex === -1) return prevOptions;

            const product = updatedOptions[productIndex];
            if (product.type === "delivery") {
                updatedOptions.forEach((p, i) => {
                    if (p.type === "delivery") {
                        updatedOptions[i] = { ...p, isSelected: false };
                    }
                });
            }

            updatedOptions[productIndex] = { ...product, isSelected: !product.isSelected };
            return updatedOptions;
        });
    };

    const calculateTotal = (): number => {
        const deliveryCost = productOptions
            .filter((product) => product.isSelected)
            .reduce((total, product) => total + product.price, 0);
        return cost + deliveryCost;
    };

    const handleCheckout = async () => {
        setIsLoading(true);

        if (distinctChangedWords.length < 1) {
            toast.error("No significant changes detected", {
                description: "You must modify at least one word to proceed with checkout.",
            });
            setIsLoading(false);
            return;
        }

        if (lyrics.filter(line => line.modified !== line.original).length === 0) {
            toast.error("No lyrics changes detected", {
                description: "You need to modify at least one line of lyrics to place an order.",
            });
            setIsLoading(false);
            return;
        }

        if (!songTitle && !songArtist && !songUrl) {
            toast.error("Missing song information", {
                description: "Please go back and select a song before checkout.",
            });
            setIsLoading(false);
            return;
        }

        // Add special requests validation
        const MAX_WORDS = 100;
        const countWords = (text: string): number => {
            return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        };
        const specialRequestsWordCount = specialRequests ? countWords(specialRequests) : 0;

        if (specialRequests && specialRequestsWordCount > MAX_WORDS) {
            toast.error("Special Request is too long", {
                description: `Please limit your 'Special Request' to ${MAX_WORDS} words (currently ${specialRequestsWordCount} words).`,
            });
            setIsLoading(false);
            return;
        }

        try {
            const sessionId = localStorage.getItem("sessionId") || Math.random().toString(36).substring(2, 15);
            localStorage.setItem("sessionId", sessionId);

            const deliveryType = productOptions.find((p) => p.isSelected && p.type === "delivery")?.id === "delivery-rush" ? "rush" : "standard";

            const lyricsChanges = lyrics
                .filter(line => line.modified !== line.original)
                .map(line => ({
                    id: line.id,
                    original: line.original,
                    modified: line.modified,
                }));

            const orderData = {
                sessionId,
                price: calculateTotal(),
                numWordChanged: distinctChangedWords.length,
                wordChanged: distinctChangedWords,
                songName: songTitle || undefined,
                artist: songArtist || undefined,
                songImage: songImage || undefined,
                songUrl: songUrl || undefined,
                deliveryType,
                lyrics: lyricsChanges,
                specialRequests: specialRequests
            };

            const response = await fetch("/api/shopify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    try {
                        if (window.top && window.top !== window) {
                            window.top.location.href = result.data.invoiceUrl;
                        } else {
                            window.parent.location.href = result.data.invoiceUrl;
                        }
                    } catch {
                        window.location.href = result.data.invoiceUrl;
                    }
                    return;
                } else {
                    const userMessage = result.userMessage || "Failed to create order";
                    toast.error("Checkout error", { description: userMessage });
                    throw new Error(userMessage);
                }
            } else {
                const errorText = await response.text();
                const errorMessage = `Error ${response.status}: ${response.statusText}`;
                toast.error("Server error", { description: errorText || errorMessage });
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Checkout failed", {
                description: `There was a problem processing your order: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // A snippet from src/app/review/page.tsx to generate the txt file
    const generateDownloadContent = (): string => {
        // Generate original lyrics text for reference
        const originalLyricsText = lyricsData.map(line => line.original).join('\n');

        // Generate modified lyrics text using stripHtmlAndSymbols
        const modifiedLyricsText = lyricsData.map(line => {
            if (line.markedText && line.markedText !== line.modified) {
                return stripHtmlAndSymbols(line.markedText);
            }
            return line.modified;
        }).join('\n');

        // Generate line-by-line changes
        const lineChanges = lyricsData
            .map((line, index) => {
                const hasChanges = line.wordChanges && line.wordChanges.some(change => change.hasChanged);
                if (hasChanges) {
                    const processedModified = line.markedText ? stripHtmlAndSymbols(line.markedText) : line.modified;
                    return `Line ${index + 1}: "${line.original}" -> "${processedModified}"`;
                }
                return null;
            })
            .filter(Boolean)
            .join('\n');

        const content = [
            `NICEVOIS SONG MODIFICATION PROGRESS`,
            `Generated on: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} (GMT+0)`,
            ``,
            `SONG INFORMATION:`,
            `Title: ${songTitle || 'N/A'}`,
            `Artist: ${songArtist || 'N/A'}`,
            `Image URL: ${songImage || 'N/A'}`,
            `URL: ${songUrl || 'N/A'}`,
            ``,
            `LYRICS CHANGES (${distinctChangedWords.length} words modified):`,
            `Changed Words: ${distinctChangedWords.join(', ')}`,
            ``,
            `LINE-BY-LINE CHANGES:`,
            lineChanges || 'No changes detected',
            ``,
            `ORIGINAL LYRICS:`,
            originalLyricsText,
            ``,
            `MODIFIED LYRICS:`,
            modifiedLyricsText,
            ``,
            `SPECIAL REQUESTS:`,
            specialRequests || 'None',
            ``,
            `To continue with your order, load this file on "https://nicevois.com/products/change-song-lyrics" and select the "Load checkout" tab.`,
            `Please keep this file safe, if lost, you will have to start the order process all over again!`
        ];

        return content.join('\n');
    };

    function safeForFilename(
        str: string | null | undefined,
        fallback: string
    ): string {
        // Use lowercase `string` type, not `String` object type.
        const candidate = str?.trim() ?? "";
        const base = candidate.length > 0 ? candidate : fallback;
        // Replace anything not A-Z, a-z, 0-9 with underscore.
        return base.replace(/[^a-zA-Z0-9]/g, "_");
    }

    const handleDownload = () => {
        const content = generateDownloadContent();
        const timestampUTC = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, '-');

        const filename = `nicevois_${safeForFilename(songTitle, 'song')}_${safeForFilename(songArtist, 'artist')}_${timestampUTC}.txt`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setHasDownloaded(true);
    };

    const handleSampleRequest = async () => {
        if (!hasDownloaded) {
            toast.error("Download required", {
                description: "Please download the checkout progress file first before requesting a sample."
            });
            return;
        }

        setIsLoading(true);

        // Same validation as handleCheckout
        if (distinctChangedWords.length < 1) {
            toast.error("No significant changes detected", {
                description: "You must modify at least one word to proceed with sample request.",
            });
            setIsLoading(false);
            return;
        }

        if (lyrics.filter(line => line.modified !== line.original).length === 0) {
            toast.error("No lyrics changes detected", {
                description: "You need to modify at least one line of lyrics to request a sample.",
            });
            setIsLoading(false);
            return;
        }

        if (!songTitle && !songArtist && !songUrl) {
            toast.error("Missing song information", {
                description: "Please go back and select a song before requesting a sample.",
            });
            setIsLoading(false);
            return;
        }

        try {
            const sessionId = localStorage.getItem("sessionId") || Math.random().toString(36).substring(2, 15);
            localStorage.setItem("sessionId", sessionId);

            const lyricsChanges = lyrics
                .filter(line => line.modified !== line.original)
                .map(line => ({
                    id: line.id,
                    original: line.original,
                    modified: line.modified,
                }));

            const sampleOrderData = {
                sessionId,
                price: 2.00,
                numWordChanged: distinctChangedWords.length,
                wordChanged: distinctChangedWords,
                songName: songTitle || undefined,
                artist: songArtist || undefined,
                songImage: songImage || undefined,
                songUrl: songUrl || undefined,
                lyrics: lyricsChanges,
                specialRequests: specialRequests,
                isSample: true
            };

            const response = await fetch("/api/shopify/request-sample", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sampleOrderData),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    try {
                        if (window.top && window.top !== window) {
                            window.top.location.href = result.data.invoiceUrl;
                        } else {
                            window.parent.location.href = result.data.invoiceUrl;
                        }
                    } catch {
                        window.location.href = result.data.invoiceUrl;
                    }
                    return;
                } else {
                    const userMessage = result.userMessage || "Failed to create sample request";
                    toast.error("Sample request error", { description: userMessage });
                    throw new Error(userMessage);
                }
            } else {
                const errorText = await response.text();
                const errorMessage = `Error ${response.status}: ${response.statusText}`;
                toast.error("Server error", { description: errorText || errorMessage });
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("Sample request error:", error);
            toast.error("Sample request failed", {
                description: `There was a problem processing your sample request: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const steps: StepProps[] = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: currentStep > 1 },
        { step: 2, label: "Change Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
        { step: 3, label: "Review Order", isActive: currentStep === 3, isComplete: false },
    ];

    return (
        <main className="min-h-0 w-full">
            <div className="w-full min-h-full">
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            marginTop: "7rem",
                            padding: "16px",
                            color: "oklch(0.396 0.141 25.723)",
                            backgroundColor: "oklch(0.971 0.013 17.38)",
                            fontSize: "1.15rem",
                        },
                    }}
                />
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    <nav className="w-full bg-transparent px-4 pb-4">
                        {/* <div className="container mx-auto flex justify-end"> */}
                        {/* <SignInToSaveButton /> */}
                        {/* </div> */}
                    </nav>

                    <Tabs.Root
                        value={`step-${currentStep}`}
                        className="flex flex-col space-y-4 md:space-y-6"
                        onValueChange={(value) => {
                            const step = parseInt(value.split("-")[1]);
                            if (step <= currentStep) {
                                setCurrentStep(step);
                                if (step === 2) router.push("/change-lyrics");
                                if (step === 1) router.push("/");
                            }
                        }}
                    >
                        <Tabs.List className="flex items-center gap-2 pointer-events-none">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.step}>
                                    <Tabs.Trigger value={`step-${step.step}`} asChild>
                                        <div>
                                            <StepIndicator
                                                step={step.step}
                                                label={step.label}
                                                isActive={step.isActive}
                                                isComplete={step.isComplete}
                                            />
                                        </div>
                                    </Tabs.Trigger>
                                    {index < steps.length - 1 && (
                                        <StepDivider isActive={index === 0 || currentStep > index + 1} />
                                    )}
                                </React.Fragment>
                            ))}
                        </Tabs.List>

                        <Tabs.Content value={`step-${currentStep}`} className="flex flex-1 flex-col space-y-2" style={{ opacity: 1 }}>
                            <h3 className="scroll-m-20 font-azbuka tracking-normal dark:text-white my-2 text-[22px] md:my-4 md:text-[28px] text-white duration-150 ease-in animate-in fade-in">
                                Review Your Order
                            </h3>

                            {/* Song Image, Title, and Artist Display */}
                            {(songImage || songTitle || songArtist) && (
                                <div className="p-4 bg-primary/10 rounded-lg mb-4 flex flex-col sm:flex-row items-center gap-4" style={{ marginBottom: '0.75rem' }}>
                                    {songImage && (
                                        <div className="relative w-40 h-40 flex-shrink-0" id="song-image-container">
                                            <Image
                                                src={decodeURIComponent(songImage)}
                                                alt={songTitle || "Song Image"}
                                                layout="fill"
                                                objectFit="cover"
                                                className="rounded-lg"
                                                onError={(e) => {
                                                    // When error occurs, find and remove the parent container
                                                    const container = document.getElementById('song-image-container');
                                                    if (container) {
                                                        container.style.display = 'none';
                                                    }
                                                    console.error(`Failed to load image: '${songImage}'. Error: '${e}'.`);
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center sm:items-start">
                                        {songTitle && (
                                            <h4 className="text-white font-azbuka text-lg">
                                                {songTitle}
                                            </h4>
                                        )}
                                        {songArtist && (
                                            <p className="text-white/80 font-roboto text-sm mt-1">
                                                by {songArtist}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Navigation Buttons */}
                            {!isLoading && (
                                <div className="flex flex-row items-center gap-2 py-0">
                                    <BackButton href="/change-lyrics" />
                                    <CheckoutButton handleCheckout={handleCheckout} isLoading={isLoading} calculateTotal={calculateTotal} />
                                </div>
                            )}

                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                orientation="horizontal"
                                style={{ marginBottom: '0.25rem' }}
                            />
                            <div className="text-foundation-foreground fixed bottom-0 left-0 right-0 w-full rounded-none border border-blue-300/50 bg-primary md:relative md:rounded-md md:bg-primary/80 mb-8 text-right text-white py-1">
                                <div className="p-4 flex">
                                    <ShoppingCart className="w-6 h-6 text-white mr-3 ml-1" />
                                    <p className="font-medium text-white md:block">
                                        Total: <span className="font-bold text-xl">US${calculateTotal().toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>

                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {!isLoading && (
                                <div className="flex flex-col space-y-2 overflow-y-auto md:h-auto lg:h-full">
                                    {/* Display Lyrics Summary */}
                                    <div className="space-y-2 my-3">
                                        <div className="pb-8 pt-4 px-4 bg-white">
                                            <h4 className="text-lg font-medium text-blue-800">Lyrics Changes ({distinctChangedWords.length} word{distinctChangedWords.length > 1 ? 's' : ''})</h4>
                                            {distinctChangedWords.length > 0 && (
                                                <p className=''>&quot;{distinctChangedWords.join(', ')}&quot;</p>
                                            )}
                                            {lyrics.filter(line => line.modified !== line.original).length > 0 ? (
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="min-w-full border border-gray-200">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Line #</th>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Original</th>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Modified</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {lyrics
                                                                .filter((line) => line.modified !== line.original)
                                                                .map((line) => (
                                                                    <tr key={line.id} className="odd:bg-white even:bg-gray-50">
                                                                        <td className="px-4 py-2 text-gray-500 font-mono border-b">{line.id}</td>
                                                                        <td className="px-4 py-2 text-gray-600 border-b">{line.original}</td>
                                                                        <td
                                                                            className="px-4 py-2 border-b"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: line.markedText || line.modified,
                                                                            }}
                                                                        />
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-red-500 mt-2">No lyrics have been changed yet. Please go back to modify lyrics before checkout.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Special Requests */}
                                    {specialRequests && (
                                        <div className="p-4 my-8 bg-white rounded-lg">
                                            <h4 className="text-lg font-medium text-blue-800">Special Requests</h4>
                                            <p className="text-sm text-gray-600">{specialRequests}</p>
                                        </div>
                                    )}


                                    {/* Delivery Options */}
                                    <div className="space-y-2" style={{ marginBottom: '1.25rem', marginTop: '0.75rem' }}>
                                        {productOptions
                                            .filter((product) => product.type === "delivery")
                                            .map((product) => (
                                                <label
                                                    key={product.id}
                                                    className={`mb-1 scroll-m-20 text-sm font-normal leading-normal tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white flex cursor-pointer items-center justify-between rounded-lg ${product.isSelected ? "border-2 border-primary" : "border"} bg-white p-4 hover:border-primary`}
                                                >
                                                    <div className="flex items-start gap-2 pr-2">
                                                        <button
                                                            type="button"
                                                            role="checkbox"
                                                            aria-checked={product.isSelected}
                                                            data-state={product.isSelected ? "checked" : "unchecked"}
                                                            value="on"
                                                            className="peer size-5 shrink-0 rounded-md border border-component-input bg-foundation shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-foundation disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-foundation-secondary"
                                                            id={product.id}
                                                            onClick={() => toggleProductSelection(product.id)}
                                                        >
                                                            {product.isSelected && (
                                                                <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: "none" }}>
                                                                    <Check className="size-5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                        <div className="ml-1 space-y-0.5">
                                                            <span className="relative -top-0.5 font-medium text-blue-800 text-lg">{product.title}</span>
                                                            <p className="text-sm text-gray-500">{product.description}</p>
                                                        </div>
                                                    </div>
                                                    {product.originalPrice !== undefined && (
                                                        <div className="flex gap-2 md:items-center">
                                                            <span className="font-bold text-gray-700">+US${product.price.toFixed(2)}</span>
                                                            <span className="font-bold text-gray-400 line-through">
                                                                US${product.originalPrice?.toFixed(2) ?? "0.00"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </label>
                                            ))}
                                    </div>

                                    {/* Request Sample */}
                                    <div className="border overflow-hidden rounded-sm bg-white/90" style={{ marginBottom: '1.25rem', marginTop: '0.75rem' }} >
                                        <button
                                            type="button"
                                            onClick={() => setIsDisclosureOpen(!isDisclosureOpen)}
                                            className="w-full p-4 flex items-center justify-between text-left transition-colors"
                                        >
                                            <span className="font-medium text-gray-500">Request Sample</span>
                                            {isDisclosureOpen ? (
                                                <ChevronUp className="size-5 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="size-5 text-gray-500" />
                                            )}
                                        </button>

                                        {isDisclosureOpen && (
                                            <div className="p-4 border-t bg-gray-50">
                                                <div className="space-y-6">
                                                    <p className="text-gray-700 leading-relaxed">
                                                        Not sure if the new lyric changes will meet your expectation? Request a 10–15 second sample audio preview for just US$2!
                                                    </p>

                                                    <div className="bg-yellow-50 border border-yellow-400 rounded-md p-4 leading-8">
                                                        <p className="text-gray-700 mb-2">
                                                            <strong>Important Notes:</strong>
                                                        </p>
                                                        <ul className="text-gray-700 space-y-1 list-disc list-inside">
                                                            <li>We will email you a 10-15 second preview based on the segment that best showcase the final lyric changes, within 2 days.</li>
                                                            <li>This US$2 fee is for the <span className="italic">Request Sample</span> service only and does <span className="text-red-600">not</span> apply toward your full song modification order.</li>
                                                            <li><span className="italic">Request Sample</span> is one-time purchase and is <span className="text-red-600">not</span> eligible for refund. Only a full song modification order is eligible for refund. For more details, please visit our <a href="https://nicevois.com/pages/refund-policy" className="text-blue-600 hover:text-blue-700 w-fit hover:underline inline-block" target="_blank" rel="noopener noreferrer" >
                                                                Refund Policy page
                                                                <ExternalLink className="w-3 h-3 ml-1 color-inherit inline" />
                                                            </a>.
                                                            </li>
                                                            <li>To learn how <span className="italic">Request Sample</span> works, please visit <a href="https://nicevois.com/pages/how-to-request-sample-audio" className="text-blue-600 hover:text-blue-700 w-fit hover:underline inline-block" target="_blank" rel="noopener noreferrer" >
                                                                How to request sample audio
                                                                <ExternalLink className="w-3 h-3 ml-1 color-inherit inline" />
                                                            </a>.
                                                            </li>
                                                        </ul>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {!hasDownloaded && (
                                                            <p className="text-center text-sm">Please <span className="italic">Download Checkout Progress (.txt)</span> file first before <span className="italic">Request Sample</span>.</p>
                                                        )}
                                                        <button
                                                            onClick={handleDownload}
                                                            className="w-full flex items-center justify-center gap-2 p-4 my-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors border border-gray-200"
                                                        >
                                                            <Download className="size-4" />
                                                            Download Checkout Progress (.txt)
                                                            {hasDownloaded && <span className="text-green-600 text-sm">(Downloaded ✓)</span>}
                                                        </button>

                                                        <button
                                                            onClick={handleSampleRequest}
                                                            disabled={isLoading}
                                                            className={`w-full flex items-center justify-center gap-2 p-4 my-2 rounded-md transition-colors bg-blue-600 text-white ${hasDownloaded
                                                                ? 'hover:bg-blue-700'
                                                                : 'opacity-30 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            {isLoading ? (
                                                                "Processing..."
                                                            ) : (
                                                                <>
                                                                    Request Sample US$2.00
                                                                    <ChevronRight className="size-4" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full bg-primary/10 my-3 md:my-4"
                                orientation="horizontal"
                            />
                            {/* Navigation Buttons */}
                            {!isLoading && (
                                <div className="flex flex-row items-center gap-2 py-0">
                                    <BackButton href="/change-lyrics" />
                                    <CheckoutButton handleCheckout={handleCheckout} isLoading={isLoading} calculateTotal={calculateTotal} />
                                </div>
                            )}
                        </Tabs.Content>
                    </Tabs.Root>
                </section>
            </div>
        </main >
    );
}

export default function ReviewPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            }
        >
            <OrderReviewPageContent />
        </Suspense>
    );
}