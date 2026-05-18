import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FilterTab {
  value: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterTabs({ tabs, value, onChange, className }: FilterTabsProps) {
  const layoutId = useId();

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative rounded-md px-3 py-1 text-xs font-medium',
            value === tab.value
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {value === tab.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-md bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
                  value === tab.value
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
