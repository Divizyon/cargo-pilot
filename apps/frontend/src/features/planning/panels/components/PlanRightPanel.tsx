import { useMemo, useState, useEffect, useRef, type HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Container,
  GripVertical,
  Loader2,
  Package2,
  Plus,
  Printer,
  Search,
  Share2,
  SlidersHorizontal,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { SearchInput } from '@/components/shared/SearchInput';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { OptimizationModal } from './OptimizationModal';
import { AddVehicleModal } from './AddVehicleModal';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { exportPlanToPdf } from '@/lib/utils/export/exportPlanToPdf';
import {
  VehicleType,
  type Vehicle,
  type VehicleType as VehicleTypeValue,
  type DoorDirection,
} from '@/lib/types/vehicle';
import { useVehicles } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/format/unitConversion';
import { ShareLinkDialog } from '@/features/planning/sharing/components/ShareLinkDialog';
import { useReadOnly } from '@/features/planning/ReadOnlyContext';

// ─── Vehicle type filter metadata ────────────────────────────────────────────

const VEHICLE_TYPE_META: Record<VehicleTypeValue, { label: string; icon: typeof Truck }> = {
  [VehicleType.Tir]: { label: 'Tır', icon: Truck },
  [VehicleType.Kamyon]: { label: 'Kamyon', icon: Truck },
  [VehicleType.Kamposet]: { label: 'Kamposet', icon: Truck },
  [VehicleType.Konteyner]: { label: 'Konteyner', icon: Container },
};

const DOOR_LABEL: Record<DoorDirection, string> = {
  front: 'Ön',
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
  rearAndSide: 'Arka + Yan',
};

// ─── VehicleListItem ──────────────────────────────────────────────────────────

interface VehicleListItemProps {
  vehicle: Vehicle;
  dragHandleRef?: (el: HTMLElement | null) => void;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
  onAddToSelected: (v: Vehicle) => void;
  isSelected?: boolean;
}

function VehicleListItem({
  vehicle,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
  onAddToSelected,
  isSelected = false,
}: VehicleListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isContainer = vehicle.vehicleType === VehicleType.Konteyner;
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const volumeM3 = ((vehicle.width * vehicle.height * vehicle.length) / 1_000_000).toFixed(1);
  const VehicleIcon = isContainer ? Package2 : Truck;

  return (
    <div className={cn('rounded-lg overflow-hidden', expanded && 'ring-1 ring-border')}>
      {/* Header — StoreItemRow ile aynı yapı */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors hover:bg-accent',
          expanded && 'bg-muted/40',
        )}
      >
        {dragHandleRef && (
          <button
            ref={dragHandleRef}
            {...(dragHandleListeners as HTMLAttributes<HTMLButtonElement>)}
            {...(dragHandleAttributes as HTMLAttributes<HTMLButtonElement>)}
            className="shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground"
            title="Sırasını değiştir"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="relative shrink-0">
          <VehicleIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          {isSelected && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-1 h-1 text-white" strokeWidth={3} />
            </span>
          )}
        </div>

        <span className="flex-1 min-w-0 text-xs text-foreground truncate">{vehicle.name}</span>

        {vehicle.plate?.trim() && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-mono uppercase">
            {vehicle.plate}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="shrink-0 flex items-center justify-center"
        >
          <ChevronDown
            className={cn(
              'w-3 h-3 text-muted-foreground/50 transition-transform duration-150',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Expanded panel — StoreItemRow ile aynı yapı */}
      {expanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-muted/40 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {vehicle.length}×{vehicle.width}×{vehicle.height} cm
            {' · '}
            {formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
          </p>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">İç Hacim</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{volumeM3} m³</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">Araç Tipi</span>
              <span className="text-[11px] text-muted-foreground">{vehicle.vehicleType}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">Kapı Yönü</span>
              <span className="text-[11px] text-muted-foreground">
                {DOOR_LABEL[vehicle.doorDirection] ?? vehicle.doorDirection}
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToSelected(vehicle);
              }}
              title="Plana ekle"
              className={cn(
                'flex items-center gap-1.5 text-[11px] transition-colors',
                isSelected
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              disabled={isSelected}
            >
              <span className="relative inline-flex">
                <VehicleIcon className="w-3 h-3" strokeWidth={1.5} />
                <Plus className="absolute -top-1 -right-1 w-2 h-2" strokeWidth={3} />
              </span>
              <span>{isSelected ? 'Eklendi' : 'Ekle'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SortableVehicleListItem ──────────────────────────────────────────────────

interface SortableVehicleListItemProps extends Omit<
  VehicleListItemProps,
  'dragHandleRef' | 'dragHandleListeners' | 'dragHandleAttributes'
> {
  id: string;
  showDragHandle?: boolean;
}

function SortableVehicleListItem({
  id,
  showDragHandle = true,
  ...itemProps
}: SortableVehicleListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40 z-50 relative')}
    >
      <VehicleListItem
        {...itemProps}
        dragHandleRef={showDragHandle ? setActivatorNodeRef : undefined}
        dragHandleListeners={showDragHandle ? (listeners as Record<string, unknown>) : undefined}
        dragHandleAttributes={
          showDragHandle ? (attributes as unknown as Record<string, unknown>) : undefined
        }
      />
    </div>
  );
}

// ─── SortableSelectedVehicleCard ─────────────────────────────────────────────

interface SortableSelectedVehicleCardProps extends Omit<
  SelectedVehicleCardProps,
  'dragHandleRef' | 'dragHandleListeners' | 'dragHandleAttributes'
> {
  id: string;
}

function SortableSelectedVehicleCard({ id, ...props }: SortableSelectedVehicleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40 z-50 relative')}
    >
      <SelectedVehicleCard
        {...props}
        dragHandleRef={setActivatorNodeRef}
        dragHandleListeners={listeners as Record<string, unknown>}
        dragHandleAttributes={attributes as unknown as Record<string, unknown>}
      />
    </div>
  );
}

// ─── PlanSummaryPanel ─────────────────────────────────────────────────────────

function PlanSummaryPanel() {
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedVehicles = usePlanStore((s) => s.selectedVehicles);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const debouncedPlacements = useDebounce(placements, 200);

  const stats = useMemo(() => {
    if (!selectedVehicle) return null;

    const vehicleVol = selectedVehicle.width * selectedVehicle.height * selectedVehicle.length;
    const vehicleVolM3 = parseFloat((vehicleVol / 1_000_000).toFixed(2));
    const maxWeight = selectedVehicle.payload ?? selectedVehicle.maxCargoWeight ?? 0;

    const insidePlacements = debouncedPlacements.filter((p) => !p.isStagingArea);
    const weightMap = new Map(selectedItems.map(({ item }) => [item.id, item.weight]));

    const cargoVolCm3 = insidePlacements.reduce((s, p) => s + p.width * p.height * p.length, 0);
    const totalWeight = insidePlacements.reduce((s, p) => s + (weightMap.get(p.itemId) ?? 0), 0);

    const volumePct =
      vehicleVol > 0 ? Math.min(100, Math.round((cargoVolCm3 / vehicleVol) * 100)) : 0;
    const weightPct =
      maxWeight > 0 ? Math.min(100, Math.round((totalWeight / maxWeight) * 100)) : 0;

    const placedCount = insidePlacements.length;
    const totalCount = selectedItems.reduce((s, i) => s + i.quantity, 0);

    const usedVehicleCount = insidePlacements.length > 0 ? 1 : 0;
    const totalVehicleCount = selectedVehicles.length;

    return {
      vehicleVolM3,
      maxWeight,
      volumePct,
      weightPct,
      totalWeight,
      placedCount,
      totalCount,
      usedVehicleCount,
      totalVehicleCount,
    };
  }, [debouncedPlacements, selectedVehicle, selectedVehicles, selectedItems]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-5">
        <span className="text-xs text-muted-foreground">Araç seçilmedi</span>
      </div>
    );
  }

  const rows = [
    { label: 'Kullanılabilir hacim', value: `${stats.vehicleVolM3} m³` },
    { label: 'Yüklenebilir ağırlık', value: formatWeightDisplay(stats.maxWeight, weightUnit) },
    { label: 'Hacim oranı', value: `%${stats.volumePct}` },
    { label: 'Ağırlık oranı', value: `%${stats.weightPct}` },
    {
      label: 'Yerleştirilen ürün',
      value: `${stats.placedCount} / ${stats.totalCount} adet`,
    },
    {
      label: 'Kullanılan araç',
      value: `${stats.usedVehicleCount} / ${stats.totalVehicleCount}`,
    },
  ];

  return (
    <div className="px-3 py-2 flex flex-col gap-0.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1">
          <span className="text-xs text-muted-foreground">{r.label}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SelectedVehicleCard ──────────────────────────────────────────────────────

interface SelectedVehicleCardProps {
  instanceId: string;
  vehicle: Vehicle;
  label: string;
  index: number;
  isPrimary: boolean;
  dragHandleRef?: (el: HTMLElement | null) => void;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
  onMakeActive: () => void;
  onDeselect: (instanceId: string) => void;
  onAddInstance: () => void;
}

function SelectedVehicleCard({
  instanceId,
  vehicle,
  label,
  index,
  isPrimary,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
  onMakeActive,
  onDeselect,
  onAddInstance,
}: SelectedVehicleCardProps) {
  const readOnly = useReadOnly();
  const [expanded, setExpanded] = useState(false);
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const volumeM3 = ((vehicle.width * vehicle.height * vehicle.length) / 1_000_000).toFixed(1);

  return (
    <div className={cn('rounded-lg overflow-hidden', expanded && 'ring-1 ring-border')}>
      {/* Header */}
      <div
        onClick={() => {
          if (!isPrimary) {
            onMakeActive();
          } else {
            setExpanded((v) => !v);
          }
        }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors hover:bg-accent',
          isPrimary && 'bg-muted/40',
          expanded && 'bg-muted/40',
        )}
      >
        {/* Drag handle */}
        {dragHandleRef && (
          <button
            ref={dragHandleRef}
            {...(dragHandleListeners as HTMLAttributes<HTMLButtonElement>)}
            {...(dragHandleAttributes as HTMLAttributes<HTMLButtonElement>)}
            className="shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground"
            title="Sırayı değiştir"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 w-4 text-right">
          {index + 1}.
        </span>
        <Truck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1 min-w-0 text-xs text-foreground truncate">{label}</span>
        {vehicle.plate?.trim() && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-mono uppercase">
            {vehicle.plate}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="shrink-0 flex items-center justify-center"
        >
          <ChevronDown
            className={cn(
              'w-3 h-3 text-muted-foreground/50 transition-transform duration-150',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Expanded panel — StoreItemRow ile aynı yapı */}
      {expanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-muted/40 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {vehicle.length}×{vehicle.width}×{vehicle.height} cm
            {' · '}
            {formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
          </p>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">İç Hacim</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{volumeM3} m³</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">Araç Tipi</span>
              <span className="text-[11px] text-muted-foreground">{vehicle.vehicleType}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-muted-foreground">Kapı Yönü</span>
              <span className="text-[11px] text-muted-foreground">
                {DOOR_LABEL[vehicle.doorDirection] ?? vehicle.doorDirection}
              </span>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddInstance();
                }}
                title="Bir tane daha ekle"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="relative inline-flex">
                  <Truck className="w-3 h-3" />
                  <Plus className="absolute -top-1 -right-1 w-2 h-2" strokeWidth={3} />
                </span>
                <span>Ekle</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeselect(instanceId);
                }}
                title="Listeden çıkar"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-600 transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Çıkar</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlanRightPanel ───────────────────────────────────────────────────────────

interface PlanRightPanelProps {
  vehiclesOpen?: boolean;
  onToggleVehicles?: () => void;
  onOptimize?: () => void;
  isOptimizing?: boolean;
  canOptimize?: boolean;
  getSnapshot?: () => string;
  planId?: string;
  planName?: string;
}

export function PlanRightPanel({
  vehiclesOpen = true,
  onToggleVehicles,
  onOptimize,
  isOptimizing = false,
  canOptimize = true,
  planId,
  planName,
  getSnapshot,
}: PlanRightPanelProps) {
  const readOnly = useReadOnly();
  const navigate = useNavigate();
  const addVehicle = usePlanStore((s) => s.addVehicle);
  const removeVehicle = usePlanStore((s) => s.removeVehicle);
  const setActiveVehicle = usePlanStore((s) => s.setActiveVehicle);
  const reorderVehicles = usePlanStore((s) => s.reorderVehicles);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedVehicles = usePlanStore((s) => s.selectedVehicles);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const vehicles = useMemo(() => vehiclesData?.items ?? [], [vehiclesData]);
  const pendingSelectIdRef = useRef<string | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [activeVehicleTab, setActiveVehicleTab] = useState<'list' | 'selected'>('list');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [activeVehicleTypes, setActiveVehicleTypes] = useState<Set<VehicleTypeValue>>(new Set());
  const [vehicleOrder, setVehicleOrder] = useState<string[]>([]);

  // Analysis & export state
  const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    if (vehicles.length === 0) return;
    const serverIds = vehicles.map((v) => v.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVehicleOrder((prev) => {
      if (prev.length === 0) return serverIds;
      const prevSet = new Set(prev);
      const newIds = serverIds.filter((id) => !prevSet.has(id));
      const retained = prev.filter((id) => serverIds.includes(id));
      return [...retained, ...newIds];
    });
  }, [vehicles]);

  const displayedVehicles = useMemo(() => {
    const ordered =
      vehicleOrder.length > 0
        ? vehicleOrder
            .map((id) => vehicles.find((v) => v.id === id))
            .filter((v): v is Vehicle => v !== undefined)
        : vehicles;
    return ordered.filter((v) => {
      if (vehicleSearch.trim() && !v.name.toLowerCase().includes(vehicleSearch.toLowerCase()))
        return false;
      if (activeVehicleTypes.size > 0 && !activeVehicleTypes.has(v.vehicleType)) return false;
      return true;
    });
  }, [vehicles, vehicleOrder, vehicleSearch, activeVehicleTypes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleVehicleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setVehicleOrder((ids) => {
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      return arrayMove(ids, oldIndex, newIndex);
    });
  }

  async function handlePdfExport() {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      await exportPlanToPdf({
        planId: crypto.randomUUID(),
        placements,
        items: selectedItems.map((si) => si.item),
        vehicle: selectedVehicle,
        snapshotDataUrl: getSnapshot?.(),
      });
    } finally {
      setIsPdfLoading(false);
    }
  }

  function handleVehicleCreated(id: string | null) {
    if (id) pendingSelectIdRef.current = id;
  }

  function handleSelectVehicle(v: Vehicle) {
    addVehicle(v);
    setActiveVehicleTab('selected');
  }

  function handleDeselectVehicle(instanceId: string) {
    removeVehicle(instanceId);
    if (selectedVehicles.length === 1) setActiveVehicleTab('list');
  }

  function handleAddInstance(v: Vehicle) {
    addVehicle(v);
  }

  // IDs of vehicle models currently in the selected list (for filtering Araç Listesi)
  const selectedVehicleIds = useMemo(
    () => new Set(selectedVehicles.map((e) => e.vehicle.id)),
    [selectedVehicles],
  );

  const listTabVehicles = displayedVehicles;

  const listSortableIds = useMemo(() => {
    if (vehicleSearch.trim()) return listTabVehicles.map((v) => v.id);
    return vehicleOrder.length > 0 ? vehicleOrder : listTabVehicles.map((v) => v.id);
  }, [vehicleOrder, vehicleSearch, listTabVehicles]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ── Kutu 1: Araçlar */}
      <div
        className={cn(
          'relative flex-1 min-h-0',
          'transition-transform duration-[220ms] ease-out',
          !vehiclesOpen && 'translate-x-[calc(100%-0.75rem)]',
        )}
      >
        {onToggleVehicles && (
          <button
            onClick={onToggleVehicles}
            title={vehiclesOpen ? 'Araç listesini kapat' : 'Araç listesini aç'}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -left-3 z-20',
              'h-6 w-6 flex items-center justify-center rounded-full',
              'border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground',
            )}
          >
            {vehiclesOpen ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        )}

        <div
          className={cn(
            'h-full bg-background rounded-xl border border-border overflow-hidden flex flex-col',
            'transition-transform duration-[220ms] ease-out',
            !vehiclesOpen && 'translate-x-6',
          )}
        >
          <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-border">
            <span className="text-sm text-foreground">Araçlar</span>
            {!readOnly && (
              <Button
                size="icon"
                title="Araç Ekle"
                className="h-7 w-7 bg-foreground text-background hover:bg-foreground/80"
                onClick={() => navigate('/vehicles/new')}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Vehicle tabs — edit modda göster */}
          {!readOnly && (
            <div className="px-2 pt-2 shrink-0">
              <FilterTabs
                className="w-full"
                fullWidth
                tabs={[
                  { value: 'selected', label: 'Seçili Araç', count: selectedVehicles.length },
                  { value: 'list', label: 'Araç Listesi', count: vehicles.length },
                ]}
                value={activeVehicleTab}
                onChange={(v) => setActiveVehicleTab(v as 'list' | 'selected')}
              />
            </div>
          )}

          {/* Search + Filter — edit modda her tab'da göster */}
          {!readOnly && (
            <div className="px-2 pt-1.5 pb-1 shrink-0 flex items-center gap-1.5">
              <SearchInput size="sm" placeholder="Araç adı ile ara…" onSearch={setVehicleSearch} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Araç tipine göre filtrele"
                    className={cn(
                      'h-7 shrink-0 gap-1 px-2 text-xs',
                      activeVehicleTypes.size > 0 &&
                        'border-primary text-primary ring-1 ring-primary/30',
                    )}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    {activeVehicleTypes.size > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {activeVehicleTypes.size}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">
                    Araç Tipi
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    Object.entries(VEHICLE_TYPE_META) as [
                      VehicleTypeValue,
                      { label: string; icon: typeof Truck },
                    ][]
                  ).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={activeVehicleTypes.has(key)}
                        onCheckedChange={(checked: boolean) => {
                          setActiveVehicleTypes((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(key);
                            else next.delete(key);
                            return next;
                          });
                        }}
                        onSelect={(e: Event) => e.preventDefault()}
                        className="text-xs gap-2"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {meta.label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  {activeVehicleTypes.size > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <button
                        onClick={() => setActiveVehicleTypes(new Set())}
                        className="w-full text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 text-left transition-colors"
                      >
                        Filtreleri temizle
                      </button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Tab: Seçili Araç içeriği */}
          {(readOnly || activeVehicleTab === 'selected') && (
            <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {selectedVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center py-8">
                  <Truck className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Henüz araç seçilmedi</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    reorderVehicles(active.id as string, over.id as string);
                  }}
                >
                  <SortableContext
                    items={selectedVehicles.map((e) => e.instanceId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-2 flex flex-col gap-0.5">
                      {selectedVehicles.map((entry, idx) => {
                        const sameVehicles = selectedVehicles.filter(
                          (e) => e.vehicle.id === entry.vehicle.id,
                        );
                        const instanceNum =
                          sameVehicles.length > 1
                            ? sameVehicles.findIndex((e) => e.instanceId === entry.instanceId) + 1
                            : 0;
                        const label =
                          instanceNum > 0
                            ? `${entry.vehicle.name} #${instanceNum}`
                            : entry.vehicle.name;

                        return (
                          <SortableSelectedVehicleCard
                            key={entry.instanceId}
                            id={entry.instanceId}
                            instanceId={entry.instanceId}
                            vehicle={entry.vehicle}
                            label={label}
                            index={idx}
                            isPrimary={selectedVehicle?.id === entry.vehicle.id}
                            onMakeActive={() => setActiveVehicle(entry.instanceId)}
                            onDeselect={handleDeselectVehicle}
                            onAddInstance={() => handleAddInstance(entry.vehicle)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {/* Tab: Araç Listesi içeriği */}
          {!readOnly && activeVehicleTab === 'list' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {vehiclesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Araçlar yükleniyor…
                </div>
              ) : listTabVehicles.length === 0 && (vehicleSearch || activeVehicleTypes.size > 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <Search className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    {vehicleSearch
                      ? `"${vehicleSearch}" için araç bulunamadı`
                      : 'Seçili araç tipinde sonuç yok'}
                  </p>
                </div>
              ) : listTabVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <Truck className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Henüz araç eklenmemiş</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleVehicleDragEnd}
                >
                  <SortableContext items={listSortableIds} strategy={verticalListSortingStrategy}>
                    {listTabVehicles.map((v) => (
                      <SortableVehicleListItem
                        key={v.id}
                        id={v.id}
                        vehicle={v}
                        isSelected={selectedVehicleIds.has(v.id)}
                        onAddToSelected={handleSelectVehicle}
                        showDragHandle={false}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kutu 2: Plan Özeti + aksiyonlar */}
      <div className="bg-background rounded-xl border border-border overflow-hidden shrink-0 flex flex-col">
        <div className="px-3 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
          <span className="text-sm text-foreground">Plan Özeti</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!planId) {
                  toast.info('Planı paylaşmak için önce "Optimizasyonu Başlat" ile kaydedin.', {
                    position: 'bottom-right',
                  });
                  return;
                }
                setShareDialogOpen(true);
              }}
              disabled={placements.length === 0}
              title="Paylaş"
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePdfExport}
              disabled={isPdfLoading || placements.length === 0}
              title="PDF Al"
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPdfLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <PlanSummaryPanel />

        {!selectedVehicle && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-4 border-t border-border">
            <Box className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yükleme alanını görmek için
              <br />
              bir araç seçin
            </p>
          </div>
        )}

        <div className="px-3 pt-3 pb-3 border-t border-border shrink-0 flex flex-col gap-2">
          {!readOnly && (
            <Button
              className="w-full bg-foreground text-background hover:bg-foreground/80 disabled:opacity-40"
              disabled={!selectedVehicle || !canOptimize}
              onClick={() => setOptimizationModalOpen(true)}
            >
              <Zap className="mr-2 h-3.5 w-3.5" />
              Yüklemeyi Başlat
            </Button>
          )}
        </div>
      </div>

      <OptimizationModal
        open={optimizationModalOpen}
        onOpenChange={setOptimizationModalOpen}
        onConfirm={() => {
          setOptimizationModalOpen(false);
          onOptimize?.();
        }}
        isOptimizing={isOptimizing}
        disabled={!selectedVehicle}
      />

      <AddVehicleModal
        open={showVehicleModal}
        onOpenChange={setShowVehicleModal}
        onCreated={handleVehicleCreated}
      />

      {planId && (
        <ShareLinkDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          planId={planId}
          planName={planName ?? selectedVehicle?.name ?? 'Plan'}
        />
      )}
    </div>
  );
}
