import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Box,
  ChevronRight,
  Cylinder,
  Lightbulb,
  Loader2,
  Package,
  RotateCcw,
  Trash2,
  Truck,
} from 'lucide-react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { UnfitReason } from '@/lib/types/loadingPlan';
import type { UnfitItem } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { useVehicles } from '@/lib/api/useVehicles';
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

function UnfitItemRow({
  unfitItem,
  onRetry,
  onRemove,
}: {
  unfitItem: UnfitItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { item, quantity, reason } = unfitItem;
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent group/unfit">
      <TypeIcon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm truncate text-foreground">{item.name}</span>
          <span className="text-[10px] shrink-0 tabular-nums text-muted-foreground">
            {quantity} adet
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', REASON_CLASS[reason])}
          >
            {REASON_LABEL[reason]}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {item.width}×{item.length}×{item.height} cm · {item.weight} kg
          </span>
        </div>
      </div>

      <div
        className="flex flex-col items-center gap-0.5 shrink-0 opacity-0 group-hover/unfit:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Tekrar Dene"
          onClick={onRetry}
          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          title="Listeden Çıkar"
          onClick={onRemove}
          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface UnfitItemsPanelProps {
  onFullRemove?: (itemId: string) => void;
  onAddSuggestedVehicle?: (vehicle: Vehicle) => Promise<void>;
}

export function UnfitItemsPanel({ onFullRemove, onAddSuggestedVehicle }: UnfitItemsPanelProps) {
  const [open, setOpen] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [pendingRetryContamination, setPendingRetryContamination] = useState<{
    pendingAction: () => void;
    groupVolumes: GroupVolume[];
    conflicts: ContaminationConflict[];
  } | null>(null);

  const unfitItems = usePlanStore((s) => s.unfitItems);
  const removeUnfitItem = usePlanStore((s) => s.removeUnfitItem);
  const retryUnfitItem = usePlanStore((s) => s.retryUnfitItem);

  const { data: vehiclesData } = useVehicles();

  const suggestedVehicle = useMemo(() => {
    const vehicles = vehiclesData?.items ?? [];
    if (unfitItems.length === 0 || vehicles.length === 0) return null;
    const totalVolumeCm3 = unfitItems.reduce(
      (s, u) => s + u.item.width * u.item.height * u.item.length * u.quantity,
      0,
    );
    const candidates = vehicles
      .filter((v) => v.width * v.height * v.length > totalVolumeCm3)
      .sort((a, b) => a.width * a.height * a.length - b.width * b.height * b.length);
    return candidates[0] ?? null;
  }, [unfitItems, vehiclesData]);

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

  if (unfitItems.length === 0) return null;

  const totalQty = unfitItems.reduce((s, u) => s + u.quantity, 0);
  const totalWeight = unfitItems.reduce((s, u) => s + u.item.weight * u.quantity, 0);
  const totalVolumeM3 =
    unfitItems.reduce((s, u) => s + u.item.width * u.item.height * u.item.length * u.quantity, 0) /
    1_000_000;

  return (
    <div className="border-t border-border shrink-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-rose-400 transition-transform duration-150',
            open && 'rotate-90',
          )}
        />
        <span className="text-sm text-foreground flex-1 text-left">Yüklenemeyen Ürünler</span>
        <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5 tabular-nums font-medium">
          {totalQty}
        </span>
      </button>

      {open && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-muted-foreground tabular-nums border-b border-border">
            <span>{unfitItems.length} ürün çeşidi</span>
            <span>·</span>
            <span>{totalVolumeM3.toFixed(3)} m³</span>
            <span>·</span>
            <span>{totalWeight.toFixed(1)} kg</span>
            <button
              onClick={() => setShowSuggestion((v) => !v)}
              className={cn(
                'ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors shrink-0',
                showSuggestion
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Lightbulb className="w-3 h-3" />
              Araç Öner
            </button>
          </div>

          {showSuggestion && (
            <div className="mx-2 mt-1.5 mb-0.5 p-2.5 rounded-lg border border-border bg-muted/30 flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Önerilen Araç
              </p>
              {suggestedVehicle ? (
                <div className="flex items-center gap-2">
                  <Truck
                    className="w-3.5 h-3.5 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{suggestedVehicle.name}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {suggestedVehicle.length}×{suggestedVehicle.width}×{suggestedVehicle.height}{' '}
                      cm ·{' '}
                      {(
                        (suggestedVehicle.width *
                          suggestedVehicle.height *
                          suggestedVehicle.length) /
                        1_000_000
                      ).toFixed(1)}{' '}
                      m³
                    </p>
                  </div>
                  {onAddSuggestedVehicle && (
                    <Button
                      size="sm"
                      disabled={isAddingVehicle}
                      onClick={async () => {
                        setIsAddingVehicle(true);
                        try {
                          await onAddSuggestedVehicle(suggestedVehicle);
                          setShowSuggestion(false);
                        } finally {
                          setIsAddingVehicle(false);
                        }
                      }}
                      className="h-6 text-[11px] px-2.5 bg-foreground text-background hover:bg-foreground/80 shrink-0"
                    >
                      {isAddingVehicle ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Ekle'
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Katalogda uygun araç bulunamadı.</p>
              )}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-1 flex flex-col gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {unfitItems.map((u) => (
              <UnfitItemRow
                key={u.item.id}
                unfitItem={u}
                onRetry={() => handleRetry(u)}
                onRemove={() => {
                  removeUnfitItem(u.item.id);
                  onFullRemove?.(u.item.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

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
