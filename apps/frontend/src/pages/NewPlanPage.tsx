import { useRef } from 'react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);

  return (
    <div className="flex h-full bg-zinc-100 overflow-hidden p-3 gap-3">
      {/* Sol panel — Ürünler */}
      <div className="w-[280px] shrink-0">
        <PlanLeftPanel />
      </div>

      {/* Merkez — 3D Viewport */}
      <div className="flex-1 overflow-hidden rounded-xl bg-white border border-zinc-200">
        <PlanCanvas snapshotRef={snapshotRef} />
      </div>

      {/* Sağ panel — ilerleyen tasklarda */}
      <div className="w-[280px] shrink-0 rounded-xl bg-white border border-zinc-200 flex items-center justify-center">
        <span className="text-xs text-zinc-400">Araç seçimi</span>
      </div>
    </div>
  );
}
