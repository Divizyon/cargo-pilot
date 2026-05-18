import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, ArrowDownUp, BarChart3, Check, GripVertical, Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { usePlanStore, type InlineGroup } from '@/lib/store/usePlanStore';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import {
  detectContaminationConflicts,
  computeGroupVolumes,
  type GroupVolume,
} from '@/lib/utils/contamination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContaminationState {
  conflicts: { groupA: string; groupB: string }[];
  groupVolumes: GroupVolume[];
  placedItems: Array<{ item: Item; quantity: number }>;
}

// ─── SortableGroupRow ─────────────────────────────────────────────────────────

interface SortableGroupRowProps {
  group: InlineGroup;
}

function SortableGroupRow({ group }: SortableGroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background text-sm select-none',
        isDragging && 'opacity-50 shadow-lg z-10',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: group.color }}
      />
      <span className="text-xs truncate text-foreground">{group.name}</span>
    </div>
  );
}

// ─── OptimizationModal props ──────────────────────────────────────────────────

interface OptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isOptimizing?: boolean;
  disabled?: boolean;
}

// ─── Modal content ────────────────────────────────────────────────────────────

interface ModalContentProps {
  onConfirm: () => void;
  isOptimizing: boolean;
  disabled: boolean;
}

function ModalContent({ onConfirm, isOptimizing, disabled }: ModalContentProps) {
  const [localCriteria, setLocalCriteria] = useState<OptimizationCriteria>(
    () => usePlanStore.getState().criteria,
  );
  const [localClusterGroups, setLocalClusterGroups] = useState(
    () => usePlanStore.getState().clusterGroups,
  );
  const [localGroupOrder, setLocalGroupOrder] = useState<InlineGroup[]>(
    () => usePlanStore.getState().inlineGroups,
  );
  const [contamination, setContamination] = useState<ContaminationState | null>(null);
  const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalGroupOrder((items) => {
      const oldIdx = items.findIndex((g) => g.id === active.id);
      const newIdx = items.findIndex((g) => g.id === over.id);
      return arrayMove(items, oldIdx, newIdx);
    });
  }

  function commitAndConfirm(excludeGroups: string[] = []) {
    const {
      setCriteria,
      setClusterGroups,
      setInlineGroups,
      placements,
      selectedItems,
      setPlacements,
    } = usePlanStore.getState();
    setCriteria(localCriteria);
    setClusterGroups(localClusterGroups);
    setInlineGroups(localGroupOrder);

    if (excludeGroups.length > 0) {
      const excludedIds = new Set(
        selectedItems
          .filter((si) => excludeGroups.includes(si.item.stackGroup ?? ''))
          .map((si) => si.item.id),
      );
      setPlacements(placements.filter((p) => !excludedIds.has(p.itemId)));
    }

    onConfirm();
  }

  function handleStartClick() {
    const { selectedItems, placements } = usePlanStore.getState();
    const placedIds = new Set(placements.map((p) => p.itemId));
    const placedItems = selectedItems.filter((si) => placedIds.has(si.item.id));
    const conflicts = detectContaminationConflicts(placedItems);

    if (conflicts.length > 0) {
      const involvedGroups = [...new Set(conflicts.flatMap((c) => [c.groupA, c.groupB]))];
      const groupVolumes = computeGroupVolumes(placedItems, involvedGroups);
      setContamination({ conflicts, groupVolumes, placedItems });
      setSelectedGroupNames(new Set(involvedGroups));
      return;
    }

    commitAndConfirm();
  }

  const algorithms = [
    {
      value: OptimizationCriteria.VolumeFirst,
      icon: BarChart3,
      label: 'Hacim',
      title: 'Hacim algoritması',
    },
    {
      value: OptimizationCriteria.WeightBalance,
      icon: Scale,
      label: 'Ağırlık',
      title: 'Ağırlık algoritması',
    },
    {
      value: OptimizationCriteria.Lifo,
      icon: ArrowDownUp,
      label: 'LIFO',
      title: 'Kapı önceliklendirmesi',
    },
  ] as const;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm">Yükleme Optimizasyonu</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-1">
        {/* Algorithm selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-muted-foreground px-0.5">Algoritma</span>
          <div className="grid grid-cols-3 gap-1">
            {algorithms.map(({ value, icon: Icon, label, title }) => {
              const isSelected = localCriteria === value;
              return (
                <button
                  key={value}
                  onClick={() => setLocalCriteria(value)}
                  title={title}
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] border transition-colors',
                    isSelected
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground/40 border-border opacity-50 hover:opacity-80 hover:bg-accent',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LIFO group ordering */}
        {localCriteria === OptimizationCriteria.Lifo && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" />
              <p className="text-[10px] text-amber-700 leading-relaxed">
                LIFO algoritması için grupları önceliklendirmeniz gerekiyor. Kapıdan{' '}
                <strong>ilk inecek grubu en üste</strong> sürükleyin.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground px-0.5">Grup Önceliklendirme</span>
            {localGroupOrder.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-0.5 py-2">
                Henüz grup oluşturulmamış
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localGroupOrder.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1">
                    {localGroupOrder.map((group) => (
                      <SortableGroupRow key={group.id} group={group} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Checkboxes */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id="cluster-groups"
              checked={localClusterGroups}
              onCheckedChange={(v) => setLocalClusterGroups(Boolean(v))}
              className="mt-0.5"
            />
            <Label htmlFor="cluster-groups" className="text-xs leading-snug cursor-pointer">
              Aynı grup içerisindeki ürünleri bir arada yükle
            </Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          className="w-full bg-foreground text-background hover:bg-foreground/80 disabled:opacity-40"
          disabled={isOptimizing || disabled}
          onClick={handleStartClick}
        >
          {isOptimizing && (
            <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
          )}
          Yükleme Optimizasyonunu Başlat
        </Button>
      </DialogFooter>

      {/* Contamination group-choice dialog */}
      <AlertDialog
        open={contamination !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContamination(null);
            setSelectedGroupNames(new Set());
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Uyumsuz Yük Grupları</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-4 pt-1">
                {/* Aktif çakışmalar — seçili gruplar arasındaki çakışmaları göster */}
                {(() => {
                  const activeConflicts = (contamination?.conflicts ?? []).filter(
                    (c) => selectedGroupNames.has(c.groupA) && selectedGroupNames.has(c.groupB),
                  );
                  return activeConflicts.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {activeConflicts.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-rose-600">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="font-medium">{c.groupA}</span>
                          <span className="text-rose-400">ve</span>
                          <span className="font-medium">{c.groupB}</span>
                          <span className="text-muted-foreground">birlikte yüklenemez</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Seçili gruplar arasında çakışma yok</span>
                    </div>
                  );
                })()}

                {/* Çoklu seçim kartları */}
                <div className="grid grid-cols-2 gap-2">
                  {contamination?.groupVolumes.map((gv) => {
                    const isSelected = selectedGroupNames.has(gv.name);
                    const conflictsWith = (contamination?.conflicts ?? [])
                      .filter(
                        (c) =>
                          (c.groupA === gv.name && selectedGroupNames.has(c.groupB)) ||
                          (c.groupB === gv.name && selectedGroupNames.has(c.groupA)),
                      )
                      .map((c) => (c.groupA === gv.name ? c.groupB : c.groupA));
                    return (
                      <button
                        key={gv.name}
                        onClick={() =>
                          setSelectedGroupNames((prev) => {
                            const next = new Set(prev);
                            if (next.has(gv.name)) next.delete(gv.name);
                            else next.add(gv.name);
                            return next;
                          })
                        }
                        className={cn(
                          'flex flex-col gap-1 p-3 rounded-lg border transition-colors text-left',
                          isSelected
                            ? conflictsWith.length > 0
                              ? 'border-rose-300 bg-rose-50'
                              : 'border-foreground/20 bg-accent'
                            : 'border-border bg-muted/20 opacity-40',
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'w-3 h-3 rounded border-2 flex items-center justify-center shrink-0',
                              isSelected
                                ? 'bg-foreground border-foreground'
                                : 'border-muted-foreground',
                            )}
                          >
                            {isSelected && (
                              <Check className="w-2 h-2 text-background" strokeWidth={3} />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {gv.name}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          %{gv.pct}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {gv.volumeM3.toFixed(2)} m³
                        </span>
                        {isSelected && conflictsWith.length > 0 && (
                          <span className="text-[9px] text-rose-600 mt-0.5 leading-tight">
                            ⚠ {conflictsWith.join(', ')} ile çakışıyor
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Göndermek istediğin grupları seç. Seçilmeyen gruplar optimizasyona dahil edilmez.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-foreground text-background hover:bg-foreground/80 text-xs h-8"
              disabled={selectedGroupNames.size === 0}
              onClick={() => {
                const involvedGroupNames = (contamination?.groupVolumes ?? []).map((gv) => gv.name);
                const excludeGroups = involvedGroupNames.filter((n) => !selectedGroupNames.has(n));
                setContamination(null);
                setSelectedGroupNames(new Set());
                commitAndConfirm(excludeGroups);
              }}
            >
              Seçilenleri Gönder
            </Button>
            <AlertDialogCancel className="w-full text-xs h-8 mt-0">İptal</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── OptimizationModal ────────────────────────────────────────────────────────

export function OptimizationModal({
  open,
  onOpenChange,
  onConfirm,
  isOptimizing = false,
  disabled = false,
}: OptimizationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && (
          <ModalContent onConfirm={onConfirm} isOptimizing={isOptimizing} disabled={disabled} />
        )}
      </DialogContent>
    </Dialog>
  );
}
