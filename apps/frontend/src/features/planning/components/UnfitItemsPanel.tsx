import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Box,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Package,
  PackageMinus,
  RotateCcw,
} from 'lucide-react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { UnfitReason } from '@/lib/types/loadingPlan';
import type { UnfitItem } from '@/lib/types/loadingPlan';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  detectContaminationConflicts,
  computeGroupVolumes,
  type GroupVolume,
  type ContaminationConflict,
} from '@/lib/utils/contamination';

const REASON_LABEL: Record<UnfitReason, string> = {
  [UnfitReason.Volume]: 'Hacim Yetersiz',
  [UnfitReason.Weight]: 'Ağırlık Limiti Aşıldı',
  [UnfitReason.Stacking]: 'İstif Kısıtı İhlali',
  [UnfitReason.Contamination]: 'Uyumsuz Yük Grubu',
};

const REASON_CLASS: Record<UnfitReason, string> = {
  [UnfitReason.Volume]: 'bg-amber-50 text-amber-700 border border-amber-200',
  [UnfitReason.Weight]: 'bg-rose-50 text-rose-700 border border-rose-200',
  [UnfitReason.Stacking]: 'bg-orange-50 text-orange-700 border border-orange-200',
  [UnfitReason.Contamination]: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

function UnfitItemCard({
  unfitItem,
  isExpanded,
  onToggleExpand,
  onRetry,
  onRemove,
}: {
  unfitItem: UnfitItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { item, quantity, reason } = unfitItem;
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;

  return (
    <div className={cn('rounded-lg overflow-hidden', isExpanded && 'ring-1 ring-border')}>
      <div
        onClick={onToggleExpand}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors hover:bg-accent',
          isExpanded && 'bg-muted/40',
        )}
      >
        <TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1 min-w-0 text-xs text-foreground truncate">{item.name}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {quantity} adet
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="shrink-0 flex items-center justify-center"
        >
          <ChevronDown
            className={cn(
              'w-3 h-3 text-muted-foreground/50 transition-transform duration-150',
              isExpanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-muted/40 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {item.width}×{item.length}×{item.height} cm · {item.weight} kg
          </p>
          <span
            className={cn(
              'inline-block text-[9px] font-medium px-1.5 py-0.5 rounded',
              REASON_CLASS[reason],
            )}
          >
            {REASON_LABEL[reason]}
          </span>
          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
                onToggleExpand();
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Tekrar Dene
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-600 transition-colors ml-auto"
            >
              <PackageMinus className="w-3 h-3" />
              Çıkar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UnfitItemsPanelProps {
  onFullRemove?: (itemId: string) => void;
}

export function UnfitItemsPanel({ onFullRemove }: UnfitItemsPanelProps) {
  const [openReasons, setOpenReasons] = useState<Set<UnfitReason>>(
    new Set(Object.values(UnfitReason)),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingRetryContamination, setPendingRetryContamination] = useState<{
    pendingAction: () => void;
    groupVolumes: GroupVolume[];
    conflicts: ContaminationConflict[];
  } | null>(null);

  const unfitItems = usePlanStore((s) => s.unfitItems);
  const removeUnfitItem = usePlanStore((s) => s.removeUnfitItem);
  const retryUnfitItem = usePlanStore((s) => s.retryUnfitItem);

  const byReason = useMemo(() => {
    const map = new Map<UnfitReason, UnfitItem[]>();
    for (const u of unfitItems) {
      if (!map.has(u.reason)) map.set(u.reason, []);
      map.get(u.reason)!.push(u);
    }
    return map;
  }, [unfitItems]);

  function toggleReason(reason: UnfitReason) {
    setOpenReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  }

  function handleRetry(unfitItem: UnfitItem) {
    const doRetry = () => retryUnfitItem(unfitItem.item.id);
    const newGroup = unfitItem.item.stackGroup;
    if (newGroup) {
      const { placements, selectedItems } = usePlanStore.getState();
      const placedIds = new Set(placements.map((p) => p.itemId));
      const curPlaced = selectedItems.filter((si) => placedIds.has(si.item.id));
      const wouldBe = [...curPlaced, { item: unfitItem.item, quantity: unfitItem.quantity }];
      const conflicts = detectContaminationConflicts(wouldBe);
      const newGroupInConflict = conflicts.some(
        (c) => c.groupA === newGroup || c.groupB === newGroup,
      );
      if (newGroupInConflict) {
        const involvedGroups = [...new Set(conflicts.flatMap((c) => [c.groupA, c.groupB]))];
        const groupVolumes = computeGroupVolumes(wouldBe, involvedGroups);
        setPendingRetryContamination({ pendingAction: doRetry, groupVolumes, conflicts });
        return;
      }
    }
    doRetry();
  }

  return (
    <div className="flex flex-col gap-0.5">
      {[...byReason.entries()].map(([reason, items]) => {
        const isOpen = openReasons.has(reason);
        const totalQty = items.reduce((s, u) => s + u.quantity, 0);
        return (
          <div key={reason} className="flex flex-col gap-0.5">
            <button
              onClick={() => toggleReason(reason)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors w-full text-left"
            >
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
                  isOpen && 'rotate-90',
                )}
              />
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span className="text-xs text-foreground flex-1 truncate">{REASON_LABEL[reason]}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {totalQty} adet
              </span>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-px pl-2">
                {items.map((u) => (
                  <UnfitItemCard
                    key={u.item.id}
                    unfitItem={u}
                    isExpanded={expandedId === u.item.id}
                    onToggleExpand={() =>
                      setExpandedId((prev) => (prev === u.item.id ? null : u.item.id))
                    }
                    onRetry={() => handleRetry(u)}
                    onRemove={() => {
                      removeUnfitItem(u.item.id);
                      onFullRemove?.(u.item.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {pendingRetryContamination && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingRetryContamination(null);
          }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingRetryContamination.conflicts.length > 0
                  ? 'Uyumsuz Yük Grupları'
                  : 'Yük Grubu Seçimi'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-4 pt-1">
                  {pendingRetryContamination.conflicts.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {pendingRetryContamination.conflicts.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-rose-600">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="font-medium">{c.groupA}</span>
                          <span className="text-rose-400">ve</span>
                          <span className="font-medium">{c.groupB}</span>
                          <span className="text-muted-foreground">birlikte yüklenemez</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {pendingRetryContamination.groupVolumes.map((gv) => (
                      <div
                        key={gv.name}
                        className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-muted/40 text-left"
                      >
                        <span className="text-xs font-semibold text-foreground truncate">
                          {gv.name}
                        </span>
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          %{gv.pct}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {gv.volumeM3.toFixed(2)} m³
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Bu ürünü geri eklemek mevcut gruplarla çakışma yaratabilir.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full bg-foreground text-background hover:bg-foreground/80 text-xs h-8"
                onClick={() => {
                  const action = pendingRetryContamination.pendingAction;
                  setPendingRetryContamination(null);
                  action();
                }}
              >
                Yine de ekle
              </Button>
              <AlertDialogCancel className="w-full text-xs h-8 mt-0">İptal</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
