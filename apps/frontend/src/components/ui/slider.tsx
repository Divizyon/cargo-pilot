import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      'relative flex touch-none select-none items-center',
      orientation === 'vertical' ? 'h-full w-5 flex-col' : 'w-full',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative grow overflow-hidden rounded-full bg-zinc-200',
        orientation === 'vertical' ? 'w-1.5' : 'h-1.5',
      )}
    >
      <SliderPrimitive.Range
        className={cn('absolute bg-zinc-900', orientation === 'vertical' ? 'w-full' : 'h-full')}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-zinc-900 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
