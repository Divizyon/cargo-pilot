import { useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { BalancePanel } from '@/features/planning/components/scene/BalancePanel';
import { StatsPanel } from '@/features/planning/components/StatsPanel';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const hasVehicle = !!usePlanStore((s) => s.selectedVehicle);
  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      {/* ── Üst satır: şeritler + viewport + kayan paneller ─────────────── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* BalancePanel — sağ panelin solunda, üste yapışık */}
        <div
          className={cn(
            'absolute top-3 z-20 pointer-events-none',
            'transition-[right] duration-[220ms] ease-out',
            rightOpen ? 'right-[320px]' : 'right-3',
          )}
        >
          <BalancePanel />
        </div>

        {/* Stats overlay — içerik only, toggle ayrı */}
        <div
          className={cn(
            'absolute bottom-3 z-20 transition-[left,right] duration-[220ms] ease-out',
            leftOpen ? 'left-[320px]' : 'left-3',
            rightOpen ? 'right-[320px]' : 'right-3',
          )}
        >
          <div
            className={cn(
              'overflow-hidden transition-[max-height] duration-[220ms] ease-out',
              statsOpen && hasVehicle ? 'max-h-[400px]' : 'max-h-0',
            )}
          >
            <div className="bg-zinc-100 rounded-2xl pt-3">
              <StatsPanel alwaysShowCards />
            </div>
          </div>
        </div>

        {/* Stats toggle butonu — sol/sağ toggle ile aynı mantık: panel dışında, bottom geçişi */}
        <button
          onClick={() => {
            if (hasVehicle) setStatsOpen((v) => !v);
          }}
          disabled={!hasVehicle}
          title={
            !hasVehicle
              ? 'İstatistikler için önce bir araç seçin'
              : statsOpen
                ? 'İstatistikleri gizle'
                : 'İstatistikleri göster'
          }
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-20',
            'h-6 w-6 flex items-center justify-center rounded-full',
            'border border-border bg-background shadow-sm',
            'transition-[bottom] duration-[220ms] ease-out',
            statsOpen && hasVehicle ? 'bottom-[154px]' : 'bottom-5',
            !hasVehicle
              ? 'text-zinc-300 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {!hasVehicle ? (
            <Lock className="h-3 w-3" />
          ) : statsOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </button>

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

        {/* Sağ panel toggle butonu */}
        <button
          onClick={() => setRightOpen((v) => !v)}
          title={rightOpen ? 'Araçlar panelini kapat' : 'Araçlar panelini aç'}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-20',
            'h-6 w-6 flex items-center justify-center rounded-full',
            'border border-border bg-background text-muted-foreground shadow-sm',
            'transition-[right] duration-[220ms] ease-out hover:text-foreground',
            rightOpen ? 'right-[296px]' : 'right-3',
          )}
        >
          {rightOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
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

        {/* Merkez — 3D Viewport */}
        <div className="flex-1 min-w-0 p-3 overflow-hidden">
          <div className="relative h-full rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <PlanCanvas snapshotRef={snapshotRef} />
            <CameraPresetButtons className="absolute top-3 left-1/2 -translate-x-1/2 z-10" />
          </div>
        </div>

        {/* Sağ kayan panel */}
        <div
          className={cn(
            'absolute top-3 bottom-3 right-0 w-[320px] z-10 px-3',
            'transition-transform duration-[220ms] ease-out',
            rightOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="h-full bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <PlanRightPanel getSnapshot={() => snapshotRef.current?.() ?? ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
