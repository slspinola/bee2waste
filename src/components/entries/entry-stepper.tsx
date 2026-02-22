"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface EntryStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function EntryStepper({ steps, currentStep, onStepClick }: EntryStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && isCompleted;

          return (
            <li
              key={step.id}
              className={cn("relative flex-1", idx !== steps.length - 1 && "pr-4")}
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground cursor-pointer hover:bg-primary-hover",
                    isCurrent && "border-2 border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-2 border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </button>
                {idx !== steps.length - 1 && (
                  <div
                    className={cn(
                      "ml-2 h-0.5 w-full",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 block text-xs",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
