import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { calcCenterOfGravity, calcBalance, buildCogInputs } from '@/lib/utils/calcCenterOfGravity';

export function BalancePanel() {
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const showCog = useSceneStore((s) => s.showCog);

  const balance = useMemo(() => {
    if (!vehicle || placements.length === 0) return null;

    const weightByItemId: Record<string, number> = {};
    for (const { item } of selectedItems) {
      weightByItemId[item.id] = item.weight;
    }

    const inputs = buildCogInputs(placements, weightByItemId);
    const cog = calcCenterOfGravity(inputs);
    if (!cog) return null;

    return calcBalance(cog, vehicle.width, vehicle.length);
  }, [placements, selectedItems, vehicle]);

  if (!balance || !showCog) return null;

  const { cog, frontAxleShare, rearAxleShare, isLateralWarning, isLongitudinalWarning } = balance;
  const hasWarning = isLateralWarning || isLongitudinalWarning;

  return (
    <div>
      <div
        className={cn(
          'rounded-xl px-3 py-2.5 text-xs font-mono backdrop-blur-sm min-w-[180px]',
          hasWarning ? 'bg-red-600/80 text-white' : 'bg-black/60 text-white',
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="font-semibold text-[11px] uppercase tracking-wide opacity-70">
            Ağırlık Merkezi
          </span>
          {hasWarning && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">UYARI</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <CoordRow label="X" value={cog.x} warning={isLateralWarning} />
          <CoordRow label="Y" value={cog.y} warning={false} />
          <CoordRow label="Z" value={cog.z} warning={isLongitudinalWarning} />
        </div>

        <div className="mt-3 border-t border-white/20 pt-2 flex flex-col gap-1">
          <AxleRow label="Ön" share={frontAxleShare} warning={isLongitudinalWarning} />
          <AxleRow label="Arka" share={rearAxleShare} warning={isLongitudinalWarning} />
        </div>

        {hasWarning && (
          <p className="mt-2 text-[10px] opacity-80 leading-snug">
            {isLateralWarning && 'Sağ/sol dengesizlik kritik eşiği aşıyor. '}
            {isLongitudinalWarning && 'Ön/arka dengesizlik kritik eşiği aşıyor.'}
          </p>
        )}
      </div>
    </div>
  );
}

function CoordRow({ label, value, warning }: { label: string; value: number; warning: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label}</span>
      <span className={cn('tabular-nums', warning && 'font-bold')}>{Math.round(value)} cm</span>
    </div>
  );
}

function AxleRow({ label, share, warning }: { label: string; share: number; warning: boolean }) {
  const pct = (share * 100).toFixed(1);
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label} aks</span>
      <span className={cn('tabular-nums', warning && 'font-bold')}>{pct}%</span>
    </div>
  );
}
