"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, TicketPercent } from "lucide-react";
import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from "sonner";
import { StepIndicator, StepDivider, type StepProps } from "@/components/layouts/StepNavigation";
import BackButton from "@/components/BackButton";

// src/app/review/page.tsx

// Shopify Storefront API Configuration
const SHOPIFY_STOREFRONT_API_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "your-store.myshopify.com";

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

type Variables = Record<string, unknown>;

interface ShopifyError {
    message: string;
    locations?: { line: number; column: number }[];
    path?: string[];
    extensions?: Record<string, unknown>;
}

// GraphQL Queries and Mutations
const FETCH_PRODUCTS_QUERY = `
  query fetchProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

const CREATE_CART_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function shopifyFetch(query: string, variables: Variables) {
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_TOKEN!,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        toast.error(`Network error (${response.status} ${response.statusText})`);
        throw new Error(`Network error (${response.status} ${response.statusText})`);
    }
    const json = await response.json();
    if (json.errors) {
        toast.error(`GraphQL error: ${json.errors.map((e: ShopifyError) => e.message).join(", ")}`);
        throw new Error(json.errors.map((e: ShopifyError) => e.message).join(", "));
    }
    return json.data;
}

function OrderReviewPageContent() {
    const searchParams = useSearchParams();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const songId = searchParams.get("id");
    const songTitle = searchParams.get("title");
    const songArtist = searchParams.get("artist");
    const songUrl = searchParams.get("url");
    const isManualEntry = searchParams.get("manualEntry") === "true";

    const [currentStep, setCurrentStep] = useState(3);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [formValues, setFormValues] = useState({
        songUrl: songUrl || "",
        lyrics: "",
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [productOptions, setProductOptions] = useState<ProductOption[]>([
        {
            id: "gid://shopify/ProductVariant/50091649270053", // Standard Delivery variant ID
            title: "Standard Delivery",
            description: "5 business days",
            price: 0, // Will be fetched from Shopify
            originalPrice: undefined,
            isSelected: true,
            type: "delivery",
        },
        {
            id: "gid://shopify/ProductVariant/50091649302821", // Rush Delivery variant ID
            title: "Rush Delivery",
            description: "Rush - 1 business day",
            price: 0, // Will be calculated as 150% of Standard Delivery
            originalPrice: undefined,
            isSelected: false,
            type: "delivery",
        },
    ]);

    // Fetch Standard Delivery price and calculate Rush Delivery price
    useEffect(() => {
        const fetchProductPrices = async () => {
            setIsLoading(true);
            try {
                const standardDeliveryId = productOptions.find((p) => p.title === "Standard Delivery")?.id;
                if (!standardDeliveryId) {
                    throw new Error("Standard Delivery ID not found");
                }

                const data = await shopifyFetch(FETCH_PRODUCTS_QUERY, { ids: [standardDeliveryId] });
                const variant = data.nodes[0];

                if (!variant) {
                    throw new Error("Standard Delivery variant not found");
                }

                const standardPrice = parseFloat(variant.price.amount);
                const rushPrice = standardPrice * 1.5;

                setProductOptions((prevOptions) =>
                    prevOptions.map((option) => {
                        if (option.title === "Standard Delivery") {
                            return {
                                ...option,
                                price: standardPrice,
                                originalPrice: variant.compareAtPrice
                                    ? parseFloat(variant.compareAtPrice.amount)
                                    : undefined,
                            };
                        }
                        if (option.title === "Rush Delivery") {
                            return {
                                ...option,
                                price: rushPrice,
                                originalPrice: standardPrice,
                            };
                        }
                        return option;
                    })
                );
            } catch (error) {
                toast.error(`Failed to load product prices. \n${String(error).toLowerCase() !== "error" && error ? String(error) : ""}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductPrices();
    }, [productOptions]);

    useEffect(() => {
        const loadLyrics = async () => {
            try {
                if (isManualEntry) {
                    const savedLyrics = localStorage.getItem("manualEntryLyrics");
                    if (savedLyrics) {
                        setFormValues((prev) => ({ ...prev, lyrics: savedLyrics }));
                    }
                }
            } catch (error) {
                toast.error(`Failed to load lyrics data. \n${String(error).toLowerCase() !== "error" && error ? String(error) : ""}`);

            }
        };

        loadLyrics();
    }, [isManualEntry]);


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
        return productOptions
            .filter((product) => product.isSelected)
            .reduce((total, product) => total + product.price, 0);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        const isValid = true;
        setFormErrors(errors);
        return isValid;
    };

    const prepareCartItems = () => {
        return productOptions
            .filter((product) => product.isSelected)
            .map((product) => ({
                variantId: product.id,
                quantity: 1,
            }));
    };

    const handleCheckout = async () => {
        setIsLoading(true);

        try {
            // Validate form before proceeding
            if (!validateForm()) {
                toast.dismiss();
                toast.error('Invalid input', {
                    description: 'Please fix the errors in the form before proceeding.',
                });
                setIsLoading(false);
                return;
            }

            const cartInput = {
                lines: prepareCartItems(),
            };

            const data = await shopifyFetch(CREATE_CART_MUTATION, { input: cartInput });
            const checkoutUrl = data.cartCreate.cart.checkoutUrl;

            if (!checkoutUrl) {
                throw new Error('Failed to create checkout URL');
            }

            window.location.href = checkoutUrl;
        } catch (error) {
            toast.dismiss();
            toast.error('Checkout failed', {
                description: `There was a problem processing your order.\nPlease try again.\n${String(error).toLowerCase() !== "error" && error ? String(error) : ""}`,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const steps: StepProps[] = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: currentStep > 1 },
        { step: 2, label: "Change The Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
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
                        <div className="container mx-auto flex justify-end">
                            <SignInToSaveButton />
                        </div>
                    </nav>

                    <Tabs.Root
                        value={`step-${currentStep}`}
                        className="flex flex-col space-y-4 md:space-y-6"
                        onValueChange={(value) => {
                            const step = parseInt(value.split("-")[1]);
                            if (step <= currentStep) {
                                setCurrentStep(step);
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
                                Select Delivery Options
                            </h3>

                            {(songTitle || songArtist) && (
                                <div className="p-3 bg-primary/10 rounded-lg mb-2">
                                    {songTitle && (
                                        <h4 className="text-white font-azbuka text-lg">{songTitle}</h4>
                                    )}
                                    {songArtist && (
                                        <p className="text-white/80 font-roboto text-sm mt-1">by {songArtist}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-row items-center gap-2 py-0">
                                <BackButton href="change-lyrics" />
                                <button
                                    onClick={handleCheckout}
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                    type="button"
                                >
                                    {isLoading ? "Processing..." : "Checkout"} <ChevronRight className="-mr-1 size-4 md:size-5" />
                                </button>
                            </div>

                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                orientation="horizontal"
                            />

                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {!isLoading && (
                                <div className="relative w-full rounded-lg p-4 dark:border-gray-100/5 bg-primary/80 text-white/80" role="alert">
                                    <div className="flex flex-row gap-2 text-sm md:text-base md:items-center">
                                        <TicketPercent />
                                        <strong>You can add discount codes at checkout.</strong>
                                    </div>
                                </div>
                            )}

                            {!isLoading && (
                                <div className="flex flex-col space-y-2 overflow-y-auto md:h-auto lg:h-full">
                                    <div className="space-y-2 my-6">
                                        {productOptions
                                            .filter((product) => product.type === "delivery")
                                            .map((product) => (
                                                <label
                                                    key={product.id}
                                                    className={`mb-1 scroll-m-20 text-sm font-normal leading-normal tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white flex cursor-pointer items-center justify-between rounded-lg ${product.isSelected ? "border-2 border-primary" : "border"
                                                        } bg-white p-4 hover:border-primary`}
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
                                                    <div className="flex gap-2 md:items-center">
                                                        <span className="font-bold">+${product.price.toFixed(2)}</span>
                                                        {product.originalPrice && (
                                                            <span className="font-bold text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                    </div>

                                    <div className="text-foundation-foreground fixed bottom-0 left-0 right-0 w-full rounded-none border-t bg-primary md:relative md:rounded-md md:bg-primary/80">
                                        <div className="flex items-center justify-between p-4">
                                            <span className="font-medium text-white md:block">
                                                Total: <span className="font-bold">${calculateTotal().toFixed(2)}</span>
                                            </span>
                                            <button
                                                className="inline-flex items-center justify-center gap-2 font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 h-10 px-5 text-base rounded-md ml-auto whitespace-nowrap md:hidden"
                                                type="button"
                                                onClick={handleCheckout}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "Processing..." : "Checkout"} <ChevronRight />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Tabs.Content>
                    </Tabs.Root>
                </section>
            </div>
        </main>
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