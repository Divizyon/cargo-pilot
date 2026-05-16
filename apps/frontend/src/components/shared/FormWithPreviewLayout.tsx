import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormWithPreviewLayoutProps {
  formContent: ReactNode;
  previewContent: ReactNode;
  className?: string;
}

export function FormWithPreviewLayout({
  formContent,
  previewContent,
  className,
}: FormWithPreviewLayoutProps) {
  return (
    <div className={cn('grid h-full grid-cols-5 gap-6', className)}>
      <div className="col-span-3 overflow-y-auto pr-1">{formContent}</div>
      <aside className="col-span-2 flex flex-col gap-3">
        <div className="min-h-0 flex-1">{previewContent}</div>
      </aside>
    </div>
  );
}
