import { useUIStore } from '@/lib/store/useUIStore';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate } from '@/lib/utils/formatDate';
import {
  fromKilograms,
  type WeightUnitKey,
} from '@/features/data-management/schemas/productSchema';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { cn } from '@/lib/utils';

interface Props {
  plan: LoadingPlanListItem;
  isSelected: boolean;
}

const EPOCH_ISO = new Date(0).toISOString().slice(0, 10);

export function RecentPlanRow({ plan, isSelected }: Props) {
  const setSelectedSnapshotPlanId = useUIStore((s) => s.setSelectedSnapshotPlanId);
  const dateFormat = useUnitStore((s) => s.dateFormat);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const weightValue = fromKilograms(plan.totalWeightKg, weightUnit as WeightUnitKey);
  const weightLabel = `${weightValue % 1 === 0 ? weightValue : weightValue.toFixed(2)} ${weightUnit}`;
  const dateLabel = plan.createdAt.startsWith(EPOCH_ISO)
    ? '—'
    : formatDate(plan.createdAt, dateFormat, true);

  function handleSelect() {
    setSelectedSnapshotPlanId(plan.id);
  }

  return (
    <li
      onClick={handleSelect}
      className={cn(
        'grid items-center border-b last:border-b-0 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors text-sm',
        'grid-cols-[minmax(0,1fr)_140px_48px_88px_72px_88px_72px]',
        isSelected && 'bg-muted/40',
      )}
    >
      <span className="truncate font-medium text-foreground pr-3">{plan.planName}</span>
      <span className="truncate text-muted-foreground pr-2">{plan.vehicleName ?? '—'}</span>
      <span className="text-right text-muted-foreground tabular-nums">{plan.productCount}</span>
      <span className="text-right text-muted-foreground tabular-nums pr-2">{weightLabel}</span>
      <span className="text-right text-muted-foreground tabular-nums">
        {plan.volumeFillPercentage.toFixed(1)}%
      </span>
      <span className="text-muted-foreground text-xs pl-2">{dateLabel}</span>
      <div className="flex items-center justify-end gap-0.5" />
    </li>
  );
}
