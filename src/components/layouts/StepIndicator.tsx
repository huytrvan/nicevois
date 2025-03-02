// src/components/StepIndicator.tsx
"use client";

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Separator from '@radix-ui/react-separator';

export type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
    onClick?: () => void;
};

export const StepIndicator = ({ step, label, isActive, isComplete, onClick }: StepProps) => (
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
                    <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 size-6 rounded-full p-0 active:scale-90 peer font-roboto disabled:bg-white/80 disabled:text-primary disabled:opacity-10"
                        type="button"
                        role="tab"
                        disabled={!isActive && !isComplete}
                        onClick={onClick}
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
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="bg-black/90 text-white px-3 py-1.5 rounded text-sm"
                    sideOffset={5}
                >
                    {label}
                    <Tooltip.Arrow className="fill-black/90" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
);

export const StepDivider = ({ isActive }: { isActive: boolean }) => (
    <Separator.Root
        orientation="horizontal"
        className={`dark:bg-gray-100/5 w-full -mt-6 h-[1.75px] flex-1 duration-1000 animate-in fade-in ${isActive ? "bg-primary/30" : "bg-white/5"}`}
    />
);

export interface StepsConfig {
    step: number;
    label: string;
    isActive: boolean;
    isComplete: boolean;
}

export interface StepIndicatorsProps {
    steps: StepsConfig[];
    currentStep: number;
    onStepChange?: (step: number) => void;
}

export const StepIndicators: React.FC<StepIndicatorsProps> = ({
    steps,
    currentStep,
    onStepChange
}) => {
    const handleStepClick = (stepNumber: number) => {
        if (onStepChange && stepNumber <= currentStep) {
            onStepChange(stepNumber);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {steps.map((step, index) => (
                <React.Fragment key={step.step}>
                    <StepIndicator
                        step={step.step}
                        label={step.label}
                        isActive={step.isActive}
                        isComplete={step.isComplete}
                        onClick={() => handleStepClick(step.step)}
                    />
                    {index < steps.length - 1 && (
                        <StepDivider isActive={index === 0 || (currentStep > index + 1)} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default StepIndicators;