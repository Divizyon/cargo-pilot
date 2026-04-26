import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QueryStateWrapperProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  skeletonClassName?: string;
  skeletonCount?: number;
  children: ReactNode;
}

export function QueryStateWrapper({
  isLoading,
  isError,
  errorMessage = 'Veri yüklenirken hata oluştu.',
  skeletonClassName,
  skeletonCount = 3,
  children,
}: QueryStateWrapperProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className={cn('h-10 w-full', skeletonClassName)} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  return <>{children}</>;
}
