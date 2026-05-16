import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormWithPreviewLayoutProps {
  formContent: ReactNode;
  previewContent: ReactNode;
  actionBar?: ReactNode;
  className?: string;
}

export function FormWithPreviewLayout({
  formContent,
  previewContent,
  actionBar,
  className,
}: FormWithPreviewLayoutProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
        <div className="overflow-y-auto pr-1">{formContent}</div>
        <aside className="flex min-h-0 flex-col">{previewContent}</aside>
      </div>
      {actionBar && (
        <div className="flex justify-center py-4">
          {actionBar}
        </div>
      )}
    </div>
  );
}
