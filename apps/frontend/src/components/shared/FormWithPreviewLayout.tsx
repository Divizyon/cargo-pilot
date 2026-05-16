import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormWithPreviewLayoutProps {
  formContent: ReactNode;
  previewContent: ReactNode;
  actionBar?: ReactNode;
  actionBarVisible?: boolean;
  className?: string;
}

export function FormWithPreviewLayout({
  formContent,
  previewContent,
  actionBar,
  actionBarVisible = true,
  className,
}: FormWithPreviewLayoutProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
        <div className="relative flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 pb-24">{formContent}</div>
          {actionBar && (
            <div
              className={cn(
                'absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 ease-out',
                actionBarVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0 pointer-events-none',
              )}
            >
              {actionBar}
            </div>
          )}
        </div>
        <aside className="flex min-h-0 flex-col">{previewContent}</aside>
      </div>
    </div>
  );
}
