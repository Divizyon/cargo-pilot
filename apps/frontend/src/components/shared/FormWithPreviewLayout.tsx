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
    <div className={cn('grid items-stretch gap-6 lg:grid-cols-5', className)}>
      <div className="lg:col-span-3">{formContent}</div>
      <aside className="lg:col-span-2">{previewContent}</aside>
    </div>
  );
}
