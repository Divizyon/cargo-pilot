import { useUIStore } from '@/lib/store/useUIStore';
import { useRecentPlans } from '@/lib/api/useRecentPlans';
import { useLoadingPlanListItem } from '@/lib/api/useLoadingPlans';

function resolveStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const publicBase = import.meta.env.VITE_MINIO_PUBLIC_URL;
  if (!publicBase) return url;
  return url.replace(/^https?:\/\/[^/]*minio[^/]*/i, publicBase);
}

function TruckPlaceholder() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg
        viewBox="0 0 160 80"
        className="w-36 opacity-20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="10" y="20" width="120" height="50" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="20" width="22" height="50" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="36" y="28" width="22" height="20" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <rect x="62" y="28" width="22" height="20" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <rect x="88" y="28" width="22" height="20" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <rect x="36" y="52" width="22" height="12" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <rect x="62" y="52" width="22" height="12" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <rect x="88" y="52" width="22" height="12" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="32" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="110" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="124" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">
        3D görünüm — yakında
      </span>
    </div>
  );
}

export function PlanSnapshotPanel() {
  const selectedId = useUIStore((s) => s.selectedSnapshotPlanId);
  const { data: plans } = useRecentPlans();
  const { data: planDetail } = useLoadingPlanListItem(selectedId ?? '');

  const plan = plans?.find((p) => p.id === selectedId) ?? null;
  const snapshotUrl = resolveStorageUrl(planDetail?.thumbnailUrl ?? plan?.thumbnailUrl);

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted/40 text-sm text-muted-foreground text-center px-4">
        Bir plan seçin
      </div>
    );
  }

  if (!snapshotUrl) {
    return (
      <div className="h-48 bg-muted/40">
        <TruckPlaceholder />
      </div>
    );
  }

  return <img src={snapshotUrl} alt="Plan görünümü" className="w-full h-auto object-cover" />;
}
