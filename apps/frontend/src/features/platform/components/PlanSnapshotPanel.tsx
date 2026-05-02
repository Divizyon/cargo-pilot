import { ImageOff } from 'lucide-react';
import { useUIStore } from '@/lib/store/useUIStore';
import { useRecentPlans } from '@/lib/api/useRecentPlans';

export function PlanSnapshotPanel() {
  const selectedId = useUIStore((s) => s.selectedSnapshotPlanId);
  const { data: plans } = useRecentPlans();

  const plan = plans?.find((p) => p.id === selectedId) ?? null;

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted text-sm text-muted-foreground text-center px-4">
        Bir plan seçin
      </div>
    );
  }

  if (!plan.snapshotUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 bg-muted text-sm text-muted-foreground text-center px-4">
        <ImageOff className="size-8 text-muted-foreground" />
        <p>Bu plan için görsel önizleme henüz oluşturulmamış.</p>
      </div>
    );
  }

  return <img src={plan.snapshotUrl} alt="Plan görünümü" className="w-full h-auto object-cover" />;
}
