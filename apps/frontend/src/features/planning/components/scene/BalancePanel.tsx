import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import {
  calcCenterOfGravity,
  calcBalance,
  buildCogInputs,
  type BalanceLevel,
} from '@/lib/utils/calcCenterOfGravity';

// ─── Level config ─────────────────────────────────────────────────────────────

interface LevelConfig {
  panelClass: string;
  badgeClass: string;
  label: string;
  message: string;
  flash: boolean;
}

const LEVEL_CONFIG: Record<BalanceLevel, LevelConfig> = {
  ideal: {
    panelClass: 'bg-black/60',
    badgeClass: 'bg-emerald-500/80',
    label: 'İDEAL',
    message: 'Araç dengesi mükemmel.',
    flash: false,
  },
  dikkat: {
    panelClass: 'bg-yellow-600/80',
    badgeClass: 'bg-yellow-300/80 text-yellow-900',
    label: 'DİKKAT',
    message: 'Yük dağılımı asimetrik. Yakıt tüketimi artabilir.',
    flash: false,
  },
  riskli: {
    panelClass: 'bg-orange-600/80',
    badgeClass: 'bg-orange-200/80 text-orange-900',
    label: 'RİSKLİ',
    message: 'Denge sınırı aşılmak üzere! Sürüş güvenliği riskli.',
    flash: false,
  },
  kritik: {
    panelClass: 'bg-red-600/80',
    badgeClass: 'bg-white/20',
    label: 'KRİTİK',
    message: 'KRİTİK: Denge ihlali! Devrilme riski mevcut.',
    flash: true,
  },
};

function worstLevel(a: BalanceLevel, b: BalanceLevel): BalanceLevel {
  const order: BalanceLevel[] = ['ideal', 'dikkat', 'riskli', 'kritik'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoordRow({ label, value, level }: { label: string; value: number; level: BalanceLevel }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label}</span>
      <span className={cn('tabular-nums', level !== 'ideal' && 'font-bold')}>
        {Math.round(value)} cm
      </span>
    </div>
  );
}

function AxleRow({ label, share, level }: { label: string; share: number; level: BalanceLevel }) {
  const pct = (share * 100).toFixed(1);
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label} aks</span>
      <span className={cn('tabular-nums', level !== 'ideal' && 'font-bold')}>{pct}%</span>
    </div>
  );
}

// ─── BalancePanel ─────────────────────────────────────────────────────────────

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

  const { cog, frontAxleShare, rearAxleShare, lateralLevel, longitudinalLevel } = balance;

  const overallLevel = worstLevel(lateralLevel, longitudinalLevel);
  const cfg = LEVEL_CONFIG[overallLevel];

  return (
    <div>
      <div
        className={cn(
          'rounded-xl px-3 py-2.5 text-xs font-mono backdrop-blur-sm min-w-[200px] text-white',
          cfg.panelClass,
          cfg.flash && 'animate-pulse',
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="font-semibold text-[11px] uppercase tracking-wide opacity-70">
            Ağırlık Merkezi
          </span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', cfg.badgeClass)}>
            {cfg.label}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <CoordRow label="X" value={cog.x} level={lateralLevel} />
          <CoordRow label="Y" value={cog.y} level="ideal" />
          <CoordRow label="Z" value={cog.z} level={longitudinalLevel} />
        </div>

        <div className="mt-3 border-t border-white/20 pt-2 flex flex-col gap-1">
          <AxleRow label="Ön" share={frontAxleShare} level={longitudinalLevel} />
          <AxleRow label="Arka" share={rearAxleShare} level={longitudinalLevel} />
        </div>

        {overallLevel !== 'ideal' && (
          <p className="mt-2 text-[10px] opacity-90 leading-snug">{cfg.message}</p>
        )}
      </div>
    </div>
  );
}
