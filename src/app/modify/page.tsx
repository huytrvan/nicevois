"use client";

import { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Delete } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
};

const StepIndicator = ({ step, label, isActive, isComplete }: StepProps) => (
    <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
        <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 size-6 rounded-full p-0 active:scale-90 peer font-roboto disabled:bg-white/80 disabled:text-primary disabled:opacity-10"
            type="button"
            role="tab"
            disabled={!isActive && !isComplete}
        >
            {isComplete ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                    <path d="M20 6 9 17l-5-5"></path>
                </svg>
            ) : (
                step
            )}
        </button>
        <p className="scroll-m-20 font-roboto text-sm leading-normal tracking-wide dark:text-white mt-2 text-center font-semibold text-white peer-disabled:font-normal peer-disabled:opacity-10">
            {label}
        </p>
    </div>
);

const StepDivider = ({ isActive }: { isActive: boolean }) => (
    <div
        data-orientation="horizontal"
        role="none"
        className={`dark:bg-gray-100/5 w-full -mt-6 h-[1.75px] flex-1 duration-1000 animate-in fade-in ${isActive ? "bg-primary/30" : "bg-white/5"}`}
    />
);

export default function ModifyLyricsPage() {
    // Remove the unused router variable
    const searchParams = useSearchParams();
    
    const songId = searchParams.get('id');
    const songTitle = searchParams.get('title');
    const songArtist = searchParams.get('artist');
    
    const [lyrics, setLyrics] = useState<string>(`He seemed impressed by the way you came in
"Tell us a story, I know you're not boring"
I was afraid that you would not insist
"You sound so sleepy, just take this, now leave me"
I said: "Please don't slow me down if I'm going too fast"
You're in a strange part of our town

Yeah, the night's not over
You're not trying hard enough
Our lives are changing lanes
You ran me off the road
The wait is over
I'm now taking over
You're no longer laughing
I'm not drowning fast enough

Now every time that I look at myself
"I thought I told you, this world is not for you"
The room is on fire as she's fixing her hair
"You sound so angry, just calm down you found me"
I said: "Please don't slow me down if I'm going too fast"
You're in a strange part of our town

Yeah, the night's not over
You're not trying hard enough
Our lives are changing lanes
You ran me off the road
The wait is over
I'm now taking over
You're no longer laughing
I'm not drowning fast enough`);

    const [currentStep, setCurrentStep] = useState(2); // We're on step 2 - "Your Ideas"

    // Fetch lyrics based on song ID (if needed)
    useEffect(() => {
        if (songId) {
            // You could fetch the actual lyrics here
            console.log(`Fetching lyrics for song ID: ${songId}`);
            // Example: fetchLyrics(songId).then(data => setLyrics(data.lyrics));
        }
    }, [songId]);

    const handleClearLyrics = () => {
        setLyrics('');
    };

    const handleNextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const steps = [
        { step: 1, label: "Original", isActive: currentStep === 1, isComplete: true },
        { step: 2, label: "Your Ideas", isActive: currentStep === 2, isComplete: false },
        { step: 3, label: "Review", isActive: currentStep === 3, isComplete: false },
        { step: 4, label: "Add-Ons", isActive: currentStep === 4, isComplete: false }
    ];

    return (
        <main className="min-h-0 w-full">
            <div className="w-full" style={{ minHeight: '100%' }}>
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        <div className="container mx-auto flex justify-end">
                            <button
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90 h-10 px-4 py-2 bg-primary hover:bg-primary/90"
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
                                        isActive={step.isActive}
                                        isComplete={step.isComplete}
                                    />
                                    {index < steps.length - 1 && (
                                        <StepDivider isActive={index === 0 || (currentStep > index + 1)} />
                                    )}
                                </React.Fragment>
                            ))}
                        </section>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-1 flex-col space-y-2" style={{ opacity: 1 }}>
                        <h3 className="scroll-m-20 font-azbuka tracking-normal dark:text-white my-2 text-[22px] md:my-4 md:text-[28px] text-white duration-150 ease-in animate-in fade-in">
                            Describe Your Lyric Change
                        </h3>

                        {/* Song Title and Artist display */}
                        {(songTitle || songArtist) && (
                            <div className="p-3 bg-primary/10 rounded-lg mb-2">
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
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex flex-row items-center gap-2 py-0">
                            <Link href="/" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white hover:text-black hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:bg-gray-200 active:ring-0 dark:border-gray-100/25 dark:text-white dark:hover:bg-gray-100/15 dark:hover:text-white dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15 dark:active:bg-gray-100/25 px-5 rounded-md text-sm md:text-base h-10 md:h-12">
                                <ChevronLeft className="-ml-1 size-4 md:size-5" /> Back
                            </Link>
                            <button
                                onClick={handleNextStep}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                type="button"
                            >
                                Next <ChevronRight className="-mr-1 size-4 md:size-5" />
                            </button>
                        </div>

                        <div data-orientation="horizontal" role="none" className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"></div>

                        {/* Instructions and Clear Button */}
                        <div className="flex w-full flex-col sm:flex-row items-start gap-3 sm:items-center">
                            <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-sm md:text-base text-white flex-1">
                                Please describe your ideas for our AI writer OR paste the original lyrics and modify them.
                            </p>
                            <button
                                onClick={handleClearLyrics}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:ring-destructive/50 focus-visible:ring focus-visible:ring-destructive/50 active:bg-destructive/75 active:ring-0 px-4 rounded-md w-full sm:w-auto text-sm md:text-base h-10 md:h-12"
                                type="button"
                            >
                                <Delete className="size-4 md:size-5" /> Clear
                            </button>
                        </div>

                        {/* Lyrics Textarea */}
                        <form className="flex flex-1 flex-col gap-4">
                            <fieldset className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative flex-1">
                                <textarea
                                    className="flex rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary dark:text-white text-sm md:text-base text-primary min-h-[200px] md:min-h-[300px] resize-y w-full"
                                    placeholder="Change it to be about our family's move to California and new adventures..."
                                    rows={15}
                                    value={lyrics}
                                    onChange={(e) => setLyrics(e.target.value)}
                                ></textarea>
                            </fieldset>
                        </form>

                        {/* Tip Box */}
                        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start gap-3 rounded-lg bg-[#4B5EAA]/20 p-3 md:p-4">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4B5EAA] text-lg flex-shrink-0">
                                💡
                            </div>
                            <div className="flex flex-col space-y-1 flex-1">
                                <p className="scroll-m-20 font-roboto tracking-wide dark:text-white text-sm md:text-base font-semibold text-white">
                                    Tip: Want to save time and money?
                                </p>
                                <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-xs md:text-sm text-white/80 leading-relaxed">
                                    Tell the AI how many words to change! You can ask to modify less than 60 or less than 100 words instead of rewriting the whole song. You can always edit the lyrics later if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}