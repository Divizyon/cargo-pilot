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
    <div className={cn('grid items-start gap-6 lg:grid-cols-5', className)}>
      <div className="order-2 lg:order-1 lg:col-span-3">{formContent}</div>
      <aside className="order-1 lg:order-2 lg:col-span-2 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        {previewContent}
      </aside>
    </div>
  );
}
