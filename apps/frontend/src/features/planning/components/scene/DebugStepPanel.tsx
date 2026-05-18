import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { cn } from '@/lib/utils';

interface DebugStepPanelProps {
  groups: Array<{ id: string; name: string; color: string; itemIds: string[] }>;
}

export function DebugStepPanel({ groups }: DebugStepPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const animationMode = useSceneStore((s) => s.animationMode);
  const animationStep = useSceneStore((s) => s.animationStep);
  const placements = usePlanStore((s) => s.placements);

  if (animationMode === 'idle') return null;

  // itemId → group lookup
  const itemGroupMap = new Map<string, { name: string; color: string; order: number }>();
  groups.forEach((g, idx) => {
    g.itemIds.forEach((itemId) => {
      itemGroupMap.set(itemId, { name: g.name, color: g.color, order: idx + 1 });
    });
  });

  // placements sıralı: stepIndex'e göre sort (API zaten sıralı göndermeli, garantilemek için)
  const sorted = [...placements].sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
  const current = sorted.find((p) => (p.stepIndex ?? 0) === animationStep - 1);
  const upcomingSlice = sorted.filter((p) => (p.stepIndex ?? 0) >= animationStep).slice(0, 3);

  function fmt(n: number) {
    return n.toFixed(1);
  }

  return (
    <div className="absolute top-3 right-3 z-20 w-64 rounded-lg border border-zinc-200 bg-background/95 shadow-md backdrop-blur-sm text-xs">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100">
        <Bug className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-semibold text-zinc-700 flex-1">Yerleştirme Debugger</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2 p-3">
          {/* Mevcut adım */}
          {current ? (
            <div className="rounded-md bg-zinc-50 border border-zinc-200 p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-800 truncate max-w-[140px]">
                  {current.itemName ?? current.itemId.slice(0, 8)}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Adım {animationStep}/{sorted.length}
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500">
                ({fmt(current.positionX)}, {fmt(current.positionY)}, {fmt(current.positionZ)}) cm
              </div>
              <div className="font-mono text-[10px] text-zinc-500">
                {fmt(current.width)} × {fmt(current.height)} × {fmt(current.depth)} cm ·{' '}
                {current.weight} kg
              </div>
              {itemGroupMap.has(current.itemId) && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: itemGroupMap.get(current.itemId)!.color }}
                  />
                  <span className="text-[10px] text-zinc-600">
                    {itemGroupMap.get(current.itemId)!.name} — İniş{' '}
                    {itemGroupMap.get(current.itemId)!.order}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-400 text-center py-1">
              {animationStep === 0 ? 'Animasyon başlatılmadı' : 'Son adım'}
            </p>
          )}

          {/* Sonraki adımlar */}
          {upcomingSlice.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Sıradaki
              </span>
              {upcomingSlice.map((p) => {
                const grp = itemGroupMap.get(p.itemId);
                return (
                  <div
                    key={p.itemId + p.stepIndex}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-zinc-500',
                      'border border-zinc-100 bg-zinc-50',
                    )}
                  >
                    <span className="font-mono text-zinc-400 w-5 shrink-0">
                      {(p.stepIndex ?? 0) + 1}
                    </span>
                    <span className="truncate flex-1">{p.itemName ?? p.itemId.slice(0, 8)}</span>
                    {grp && (
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: grp.color }}
                        title={grp.name}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
