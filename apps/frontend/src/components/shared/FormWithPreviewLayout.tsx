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
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Sol: form kartı — içeride scroll, %60 genişlik */}
        <div className="flex min-h-0 flex-[3] flex-col overflow-hidden rounded-xl bg-card">
          <div className="flex-1 overflow-y-auto p-5">{formContent}</div>
        </div>

        {/* Sağ: aksiyon + önizleme, %40 genişlik */}
        <aside className="flex min-h-0 flex-[2] flex-col gap-3">
          {actionBar && <div className="shrink-0">{actionBar}</div>}
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-card p-4">
            {previewContent}
          </div>
        </aside>
      </div>
    </div>
  );
}
