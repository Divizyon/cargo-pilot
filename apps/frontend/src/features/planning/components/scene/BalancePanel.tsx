import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { calcCenterOfGravity, calcBalance, buildCogInputs } from '@/lib/utils/calcCenterOfGravity';

export function BalancePanel() {
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const showCog = useSceneStore((s) => s.showCog);
  const optimizationCount = usePlanStore((s) => s.optimizationCount);

  const [dismissedAtCount, setDismissedAtCount] = useState(-1);
  const dismissed = dismissedAtCount >= optimizationCount;

  const balance = useMemo(() => {
    if (!vehicle || placements.length === 0) return null;

    const weightByItemId: Record<string, number> = {};
    for (const { item } of selectedItems) {
      weightByItemId[item.id] = item.weight;
    }

    const inputs = buildCogInputs(
      placements.filter((p) => !p.isStagingArea),
      weightByItemId,
    );
    const cog = calcCenterOfGravity(inputs);
    if (!cog) return null;

    return calcBalance(cog, vehicle.width, vehicle.length);
  }, [placements, selectedItems, vehicle]);

  if (!balance || !showCog || dismissed) return null;

  const {
    lateralBias,
    longitudinalBias,
    lateralLevel,
    longitudinalLevel,
    isLateralWarning,
    isLongitudinalWarning,
  } = balance;
  const hasViolation = isLateralWarning || isLongitudinalWarning;

  const levelColor: Record<string, string> = {
    ideal: 'text-emerald-400',
    dikkat: 'text-yellow-400',
    riskli: 'text-orange-400',
    kritik: 'text-red-400',
  };

  return (
    <div className="relative rounded-xl bg-black/65 backdrop-blur-sm text-white text-xs font-mono px-3 py-2.5 min-w-[200px] pointer-events-auto">
      <button
        onClick={() => setDismissedAtCount(optimizationCount)}
        className="absolute top-1.5 right-1.5 text-white/50 hover:text-white transition-colors"
        title="Kapat"
      >
        <X className="w-3 h-3" />
      </button>

      <p className="font-semibold text-[11px] uppercase tracking-wide opacity-70 mb-2 pr-4">
        Araç Dengesi
      </p>

      <p className={hasViolation ? 'text-red-400 font-bold' : 'text-emerald-400'}>
        {hasViolation ? '⚠ Denge ihlali var' : '✓ Denge ihlali yok'}
      </p>

      <div className="mt-2 border-t border-white/20 pt-2 flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <span className="opacity-60">Sol-Sağ</span>
          <span className={`tabular-nums ${levelColor[lateralLevel]}`}>
            {(Math.abs(lateralBias) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-60">Ön-Arka</span>
          <span className={`tabular-nums ${levelColor[longitudinalLevel]}`}>
            {(Math.abs(longitudinalBias) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
