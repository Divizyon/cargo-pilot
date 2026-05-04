import { useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { BalancePanel } from '@/features/planning/components/scene/BalancePanel';
import { cn } from '@/lib/utils';

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      {/* ── Üst satır: şeritler + viewport + kayan paneller ─────────────── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* BalancePanel — sağ panelin solunda */}
        <div className="absolute top-[68px] right-[320px] z-20 pointer-events-none">
          <BalancePanel />
        </div>

        {/* Sol panel toggle butonu — beyaz kart sağ sınırı (308px) üzerinde */}
        <button
          onClick={() => setLeftOpen((v) => !v)}
          title={leftOpen ? 'Ürünler panelini kapat' : 'Ürünler panelini aç'}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-20',
            'h-6 w-6 flex items-center justify-center rounded-full',
            'border border-border bg-background text-muted-foreground shadow-sm',
            'transition-[left] duration-[220ms] ease-out hover:text-foreground',
            leftOpen ? 'left-[296px]' : 'left-3',
          )}
        >
          {leftOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {/* Sol kayan panel */}
        <div
          className={cn(
            'absolute top-3 bottom-3 left-0 w-[320px] z-10 px-3',
            'transition-transform duration-[220ms] ease-out',
            leftOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="h-full bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <PlanLeftPanel />
          </div>
        </div>

        {/* Kamera presetleri — sağ üst */}
        <div className="absolute top-3 right-3 z-20">
          <CameraPresetButtons getSnapshot={() => snapshotRef.current?.() ?? ''} />
        </div>

        {/* Merkez — 3D Viewport */}
        <div className="flex-1 min-w-0 p-3 overflow-hidden">
          <div className="relative h-full rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <PlanCanvas snapshotRef={snapshotRef} />
          </div>
        </div>

        {/* Sağ panel — her zaman görünür, araç listesi toggle ile açılır/kapanır */}
        <div className="absolute top-[68px] bottom-3 right-0 w-[320px] z-10 px-3">
          <PlanRightPanel
            vehiclesOpen={rightOpen}
            onToggleVehicles={() => setRightOpen((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}
