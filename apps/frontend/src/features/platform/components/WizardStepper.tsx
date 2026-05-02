import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface WizardStep {
  step: number;
  label: string;
  icon: LucideIcon;
}

interface Props {
  steps: WizardStep[];
  activeStep?: number;
  onStepClick?: (step: WizardStep) => void;
}

export function WizardStepper({ steps, activeStep = 0, onStepClick }: Props) {
  return (
    <div className="flex items-start">
      {steps.map((s, idx) => {
        const isCompleted = s.step < activeStep;
        const isActive = s.step === activeStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={s.step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0 flex-1">
              <button
                onClick={() => onStepClick?.(s)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground',
                  !isCompleted && !isActive && 'bg-muted text-muted-foreground border border-border',
                )}
              >
                {isCompleted ? <Check size={14} /> : s.step}
              </button>
              <span className="text-xs text-muted-foreground mt-1.5 text-center leading-tight">
                {s.label}
              </span>
            </div>

            {!isLast && (
              <div className="flex-1 h-px bg-border mx-2 mt-[-14px] shrink" />
            )}
          </div>
        );
      })}
    </div>
  );
}
