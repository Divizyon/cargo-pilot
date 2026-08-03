import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/lib/store/useUIStore';

export function GlobalSpinner() {
  const isGlobalLoading = useUIStore((s) => s.isGlobalLoading);
  if (!isGlobalLoading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
