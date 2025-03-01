// pages/index.tsx or pages/search.tsx
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Search, Clock, X } from 'lucide-react';
import React from "react";
import { useRouter } from 'next/navigation'; // Add this for navigation

// Types
type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
};

type TabProps = {
    id: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
};

type Song = {
    id: string;
    title: string;
    artist: string;
}

// Components
const StepIndicator = ({ step, label, isActive }: StepProps) => (
    <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
        <button
            className="inline-flex items-center justify-center size-6 px-2 rounded-full
        bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50
        disabled:bg-white/80 disabled:text-primary disabled:opacity-10
        text-sm font-normal transition duration-150 peer"
            disabled={!isActive}
            type="button"
            role="tab"
        >
            {step}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-white 
      font-roboto leading-normal tracking-wide
      peer-disabled:font-normal peer-disabled:opacity-10">
            {label}
        </p>
    </div>
);

const StepDivider = () => (
    <div
        role="none"
        className="w-full h-[1.75px] -mt-6 flex-1 bg-white/5 dark:bg-gray-100/5 
      duration-1000 animate-in fade-in"
    />
);

const Tab = ({ id, label, icon, isActive, onClick }: TabProps) => (
    <button
        id={`tab-${id}`}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel-${id}`}
        data-state={isActive ? 'active' : 'inactive'}
        onClick={onClick}
        className={`inline-flex h-11 items-center justify-center rounded-full px-3 py-1.5
        whitespace-nowrap font-medium transition-all
        bg-primary/10 text-white text-xs md:text-sm
        hover:bg-primary/15 hover:ring hover:ring-secondary/20
        ${isActive ? "bg-primary font-semibold shadow-sm" : ""}`}
    >
        {icon}
        {label}
    </button>
);

const InfoCard = () => (
    <div className="relative w-full rounded-lg p-4 bg-primary/80 text-white/80 text-sm md:text-base dark:border-gray-100/5" role="alert">
        <div className="flex flex-col gap-2">
            <p className="font-roboto text-sm font-normal leading-5 md:leading-6 tracking-wide text-inherit">
                Choose how you want to add your song: <br />
                <span className="my-1.5 flex flex-row items-start gap-2">
                    <Search className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Quick Search:</strong> Search Genius database to automatically find and import lyrics
                    </span>
                </span>
                <span className="flex flex-row items-start gap-2">
                    <Clock className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Manual Entry:</strong> Paste a song URL and add lyrics from any source
                    </span>
                </span>
            </p>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col gap-5 md:gap-6 text-center max-w-md mx-auto mt-4">
        <Image
            src="/main.webp"
            alt="Lyric Changer Main Logo"
            width={250}
            height={250}
            className="mx-auto size-20 md:size-24"
            priority
        />
        <div>
            <h3 className="text-lg md:text-xl text-white font-azbuka tracking-normal">
                We await your Song Lyrics!
            </h3>
            <h5 className="text-sm md:text-base text-white font-roboto tracking-normal">
                Search for your song above.
            </h5>
        </div>
    </div>
);

// Loading indicator component
const LoadingIndicator = () => (
    <div className="absolute -right-5 top-1/2 -translate-y-1/2">
        <div className="loader-variant-equalizer text-primary scale-[0.45] rotate-180">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
);

// Search Results component
const SearchResults = ({ results, isLoading, onSelect }: { 
    results: Song[], 
    isLoading: boolean,
    onSelect: (song: Song) => void 
}) => {
    if (results.length === 0 && !isLoading) {
        return null;
    }

    return (
        <div dir="ltr" className="relative overflow-hidden flex-1 w-full rounded-md border bg-white max-h-[calc(100vh-20rem)] md:max-h-[calc(100vh-22rem)] overflow-y-auto" 
            style={{ position: 'relative', '--radix-scroll-area-corner-width': '0px', '--radix-scroll-area-corner-height': '0px' } as React.CSSProperties}>
            <style>
                {`[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
                [data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}`}
            </style>
            <div data-radix-scroll-area-viewport="" className="size-full rounded-[inherit]" style={{ overflow: 'hidden scroll' }}>
                <div style={{ minWidth: '100%', display: 'table' }}>
                    {results.map((song, index) => (
                        <React.Fragment key={song.id}>
                            <div className="relative cursor-pointer p-3 md:p-4 hover:bg-gray-200/20 transition-colors" onClick={() => onSelect(song)}>
                                <div className="pr-12">
                                    <h5 className="scroll-m-20 font-azbuka tracking-normal dark:text-white text-sm md:text-base text-primary truncate">
                                        {song.title}
                                    </h5>
                                    <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-xs md:text-sm text-muted truncate">
                                        {song.artist}
                                    </p>
                                </div>
                            </div>
                            {index < results.length - 1 && (
                                <div data-orientation="horizontal" role="none" className="shrink-0 bg-gray-200 dark:bg-gray-100/5 h-[1.5px] w-full"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SearchPanel = () => {
    const router = useRouter(); // Add router
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [showResults, setShowResults] = useState(false);

    // Function to search the Genius API
    const searchGenius = async (query: string) => {
        console.log("Searching for:", query);

        if (!query || !query.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsLoading(true);
        setShowResults(true);

        try {
            const response = await fetch(`/api/genius?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch songs: ${response.status}`);
            }

            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid API response format');
            }

            setSearchResults(data);
        } catch (error) {
            console.error("Error searching Genius API:", error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce the search to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            searchGenius(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSong = (song: Song) => {
        setSelectedSong(song);
        setShowResults(false);
        
        // Navigate to the modify page with query parameters
        router.push(`/modify?id=${song.id}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
    };

    return (
        <div className="py-6 mt-4 flex flex-1 flex-col gap-4">
            <p className="text-sm md:text-base text-white font-roboto font-normal tracking-wide">
                Search for your song below. Once selected, it may take a few seconds to load the lyrics.
            </p>

            <form onSubmit={(e) => e.preventDefault()}>
                <fieldset className="mb-3.5 flex flex-col gap-0.5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 md:size-5 text-gray-400" />
                    <input
                        className="flex w-full rounded-md border border-component-input
                        h-10 md:h-12 pl-10 pr-8 text-sm md:text-base text-primary
                        bg-foundation px-3 py-1 shadow-sm shadow-black/10 transition-colors text-gray-900
                        dark:bg-foundation-secondary dark:text-white dark:placeholder:text-muted/75
                        focus-visible:outline-none focus-visible:ring focus-visible:ring-secondary/50"
                        type="text"
                        placeholder="Search for a Song..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isLoading && <LoadingIndicator />}
                    {searchQuery && !isLoading && (
                        <button 
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => {
                                setSearchQuery('');
                                setShowResults(false);
                            }}
                        >
                            <X className="size-4 md:size-5 text-gray-400" />
                        </button>
                    )}
                </fieldset>
            </form>

            {showResults ? (
                <SearchResults 
                    results={searchResults} 
                    isLoading={isLoading} 
                    onSelect={handleSelectSong}
                />
            ) : selectedSong ? (
                <div className="flex flex-col gap-3">
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <h3 className="text-lg text-white font-azbuka tracking-normal">
                            {selectedSong.title}
                        </h3>
                        <p className="text-sm text-white/80 font-roboto tracking-wide">
                            {selectedSong.artist}
                        </p>
                    </div>
                    <p className="text-sm text-white font-roboto">
                        Loading lyrics...
                    </p>
                </div>
            ) : (
                <EmptyState />
            )}
        </div>
    );
};

const ManualEntryPanel = () => (
    <div className="py-6 mt-4">
        {/* Manual entry content will go here */}
        <p className="text-white">Add your song URL and lyrics manually here</p>
    </div>
);

export default function LyricChangerPage() {
    const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { step: 1, label: "Original" },
        { step: 2, label: "Your Ideas" },
        { step: 3, label: "Review" },
        { step: 4, label: "Add-Ons" }
    ];

    return (
        <main className="min-h-0 w-full">
            <div className="w-full" style={{ minHeight: '100%' }}>
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        <div className="container mx-auto flex justify-end">
                            <button
                                className="h-10 px-4 py-2 bg-primary hover:bg-primary/90 text-neutral-50
                                inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
                                text-sm font-medium transition-colors focus-visible:outline-none"
                                type="button"
                            >
                                Sign In to Save Lyrics
                            </button>
                        </div>
                    </nav>

                    {/* Step Indicators */}
                    <div className="flex flex-col space-y-4 md:space-y-6">
                        <section className="flex items-center gap-2">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.step}>
                                    <StepIndicator
                                        step={step.step}
                                        label={step.label}
                                        isActive={currentStep === step.step}
                                    />
                                    {index < steps.length - 1 && <StepDivider key={`divider-${index}`} />}
                                </React.Fragment>
                            ))}
                        </section>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-1 flex-col space-y-2">
                        <h3 className="my-2 md:my-4 text-[22px] md:text-[28px] text-white 
                        font-azbuka tracking-normal duration-1000 ease-in-out animate-in fade-in">
                            Add The Original Song
                        </h3>

                        <InfoCard />

                        {/* Tabs */}
                        <div className="flex-1">
                            <div className="h-12 my-2 -mb-3 grid w-full grid-cols-2 gap-2 rounded-full p-0
                            items-center justify-center text-muted-foreground bg-transparent
                            dark:bg-foundation-secondary"
                                role="tablist"
                            >
                                <Tab
                                    id="search"
                                    label="Quick Search"
                                    icon={<Search className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />}
                                    isActive={activeTab === 'search'}
                                    onClick={() => setActiveTab('search')}
                                />
                                <Tab
                                    id="manual"
                                    label="Manual Entry"
                                    icon={<Clock className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />}
                                    isActive={activeTab === 'manual'}
                                    onClick={() => setActiveTab('manual')}
                                />
                            </div>

                            {/* Tab Panels */}
                            <div role="tabpanel" aria-labelledby={`tab-${activeTab}`} id={`tabpanel-${activeTab}`}>
                                {activeTab === 'search' ? <SearchPanel /> : <ManualEntryPanel />}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}