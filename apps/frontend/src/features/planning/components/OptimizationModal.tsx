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
import { AlertCircle, ArrowDownUp, BarChart3, GripVertical, Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { usePlanStore, type InlineGroup } from '@/lib/store/usePlanStore';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import { INCOMPATIBLE_BY_GROUP } from '@/lib/api/itemMappers';

function detectContaminationConflicts(
  items: Array<{ item: Item; quantity: number }>,
): { groupA: string; groupB: string }[] {
  const presentGroups = new Set(
    items.map((si) => si.item.stackGroup).filter((g): g is string => !!g),
  );
  if (presentGroups.size < 2) return [];

  const seen = new Set<string>();
  const conflicts: { groupA: string; groupB: string }[] = [];

  for (const si of items) {
    const { stackGroup } = si.item;
    if (!stackGroup) continue;

    // Use explicitly set incompatibleGroups, fall back to hardcoded mapping
    const incompatible =
      (si.item.incompatibleGroups ?? []).length > 0
        ? si.item.incompatibleGroups!
        : (INCOMPATIBLE_BY_GROUP[stackGroup] ?? []);

    for (const other of incompatible) {
      if (!presentGroups.has(other)) continue;
      const key = [stackGroup, other].sort().join('||');
      if (!seen.has(key)) {
        seen.add(key);
        conflicts.push({ groupA: stackGroup, groupB: other });
      }
    }
  }
  return conflicts;
}

interface OptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isOptimizing?: boolean;
  disabled?: boolean;
}

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

// ─── Modal content (mounts fresh on each open — useState initializers run from store) ──

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<{ groupA: string; groupB: string }[]>(
    [],
  );

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

  function commitAndConfirm() {
    const { setCriteria, setClusterGroups, setInlineGroups } = usePlanStore.getState();
    setCriteria(localCriteria);
    setClusterGroups(localClusterGroups);
    setInlineGroups(localGroupOrder);
    onConfirm();
  }

  function handleStartClick() {
    const { selectedItems, placements } = usePlanStore.getState();
    const placedIds = new Set(placements.map((p) => p.itemId));
    const placedItems = selectedItems.filter((si) => placedIds.has(si.item.id));
    const conflicts = detectContaminationConflicts(placedItems);
    if (conflicts.length > 0) {
      setPendingConflicts(conflicts);
      setConfirmOpen(true);
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

      {/* Contamination confirmation — separate AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uyumsuz Yük Grupları</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Seçili ürünler arasında birlikte yüklenemeyen gruplar tespit edildi. Devam
                  ederseniz uyumsuz gruplardan biri yüklenemeyecek ve sığmayan ürünler listesine
                  eklenecek.
                </p>
                <div className="flex flex-col gap-1">
                  {pendingConflicts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-xs"
                    >
                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="font-medium text-rose-700">{c.groupA}</span>
                      <span className="text-rose-400">ve</span>
                      <span className="font-medium text-rose-700">{c.groupB}</span>
                      <span className="text-rose-500">birlikte yüklenemez</span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-foreground text-background hover:bg-foreground/80"
              onClick={commitAndConfirm}
            >
              Yine de Devam Et
            </AlertDialogAction>
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
