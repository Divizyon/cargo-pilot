import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Package2, Truck } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { StatsPanel } from '@/features/planning/components/StatsPanel';
import { cn } from '@/lib/utils';

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [statsCompact, setStatsCompact] = useState(true);

  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleStats() {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (!statsExpanded) {
      // Açılış: kartları önce göster, animasyon başlasın
      setStatsCompact(false);
      setStatsExpanded(true);
    } else {
      // Kapanış: animasyonu başlat, kartları 240ms sonra kaldır
      setStatsExpanded(false);
      collapseTimerRef.current = setTimeout(() => setStatsCompact(true), 240);
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      {/* ── Üst satır: şeritler + viewport + kayan paneller ─────────────── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Sol ikon şeridi — tıklanabilir alan */}
        <div
          role="button"
          tabIndex={0}
          title={leftOpen ? 'Ürünler panelini kapat' : 'Ürünler panelini aç'}
          onClick={() => setLeftOpen((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setLeftOpen((v) => !v)}
          className={cn(
            'relative z-20 w-12 shrink-0 flex flex-col items-center py-3 gap-2 cursor-pointer select-none',
            'bg-white border-r border-zinc-200 transition-colors',
            !leftOpen && 'hover:bg-zinc-50',
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              leftOpen ? 'bg-zinc-900 text-white' : 'text-zinc-400',
            )}
          >
            <Package2 className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {leftOpen ? (
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Sol kayan panel — üst satır içinde absolute, köşe/border temiz */}
        <div
          className={cn(
            'absolute inset-y-0 left-12 w-[280px] z-10',
            'transition-transform duration-[220ms] ease-out',
            leftOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Border sadece sağ kenarda — sol kenarda ikon şeridinin border'ı var */}
          <div className="h-full bg-white border-r border-zinc-200 shadow-[4px_0_20px_rgba(0,0,0,0.07)]">
            <PlanLeftPanel onClose={() => setLeftOpen(false)} />
          </div>
        </div>

        {/* Merkez — 3D Viewport */}
        <div className="flex-1 min-w-0 p-3 overflow-hidden">
          <div className="relative h-full rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <PlanCanvas snapshotRef={snapshotRef} />
            <CameraPresetButtons className="absolute right-3 top-3 z-10" />
          </div>
        </div>

        {/* Sağ kayan panel */}
        <div
          className={cn(
            'absolute inset-y-0 right-12 w-[280px] z-10',
            'transition-transform duration-[220ms] ease-out',
            rightOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="h-full bg-white border-l border-zinc-200 shadow-[-4px_0_20px_rgba(0,0,0,0.07)]">
            <PlanRightPanel
              onClose={() => setRightOpen(false)}
              getSnapshot={() => snapshotRef.current?.() ?? ''}
            />
          </div>
        </div>

        {/* Sağ ikon şeridi — tıklanabilir alan */}
        <div
          role="button"
          tabIndex={0}
          title={rightOpen ? 'Araçlar panelini kapat' : 'Araçlar panelini aç'}
          onClick={() => setRightOpen((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setRightOpen((v) => !v)}
          className={cn(
            'relative z-20 w-12 shrink-0 flex flex-col items-center py-3 gap-2 cursor-pointer select-none',
            'bg-white border-l border-zinc-200 transition-colors',
            !rightOpen && 'hover:bg-zinc-50',
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              rightOpen ? 'bg-zinc-900 text-white' : 'text-zinc-400',
            )}
          >
            <Truck className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {rightOpen ? (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>

      {/* ── Alt satır: stats — tıklanabilir dış şerit + animasyonlu içerik ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleStats}
        onKeyDown={(e) => e.key === 'Enter' && toggleStats()}
        className={cn(
          'shrink-0 px-3 pt-2 pb-3 overflow-hidden cursor-pointer select-none',
          'transition-[max-height] duration-[250ms] ease-in-out',
          statsExpanded ? 'max-h-[310px]' : 'max-h-[64px]',
        )}
      >
        <StatsPanel compact={statsCompact} />
      </div>
    </div>
  );
}
