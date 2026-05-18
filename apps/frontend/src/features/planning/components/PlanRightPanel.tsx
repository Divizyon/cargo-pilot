import { useMemo, useState, useEffect, useRef, type HTMLAttributes } from 'react';
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
  ArrowDownUp,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Container,
  Crosshair,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Loader2,
  Package2,
  Plus,
  Printer,
  Scale,
  Search,
  Share2,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { toast } from 'sonner';
import { SCENE } from '@/lib/config/scene-config';
import { useDebounce } from '@/lib/utils/useDebounce';
import { exportPlanToPdf } from '@/lib/utils/exportPlanToPdf';
import {
  VehicleType,
  type Vehicle,
  type VehicleType as VehicleTypeValue,
  type DoorDirection,
} from '@/lib/types/vehicle';
import { useVehicles } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
import { AddVehicleModal } from './AddVehicleModal';
import { SelectedBoxPanel } from './SelectedBoxPanel';
import { ShareLinkDialog } from './ShareLinkDialog';
import { useReadOnly } from '../ReadOnlyContext';

// ─── Vehicle type filter metadata ────────────────────────────────────────────

const VEHICLE_TYPE_META: Record<VehicleTypeValue, { label: string; icon: typeof Truck }> = {
  [VehicleType.Tir]: { label: 'Tır', icon: Truck },
  [VehicleType.Kamyon]: { label: 'Kamyon', icon: Truck },
  [VehicleType.Kamposet]: { label: 'Kamposet', icon: Truck },
  [VehicleType.Konteyner]: { label: 'Konteyner', icon: Container },
};

const DOOR_LABEL: Record<DoorDirection, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

// ─── VehicleListItem ──────────────────────────────────────────────────────────

interface VehicleListItemProps {
  vehicle: Vehicle;
  dragHandleRef?: (el: HTMLElement | null) => void;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
  onAddToSelected: (v: Vehicle) => void;
  onPreview: (v: Vehicle) => void;
}

function VehicleListItem({
  vehicle,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
  onAddToSelected,
  onPreview,
}: VehicleListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isContainer = vehicle.vehicleType === VehicleType.Konteyner;
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const volumeM3 = ((vehicle.width * vehicle.height * vehicle.length) / 1_000_000).toFixed(1);

  return (
    <div className={cn('rounded-lg overflow-hidden', expanded && 'ring-1 ring-border')}>
      <div
        onClick={() => onPreview(vehicle)}
        className="group/item flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors hover:bg-accent text-foreground cursor-pointer"
      >
        {dragHandleRef && (
          <button
            ref={dragHandleRef}
            {...(dragHandleListeners as HTMLAttributes<HTMLButtonElement>)}
            {...(dragHandleAttributes as HTMLAttributes<HTMLButtonElement>)}
            className="shrink-0 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground"
            title="Sırasını değiştir"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isContainer ? (
            <Package2 className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          ) : (
            <Truck className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-foreground">{vehicle.name}</p>
            <p className="text-[10px] tabular-nums mt-0.5 text-muted-foreground">
              {vehicle.length}×{vehicle.width}×{vehicle.height} cm
              {' · '}
              {formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
            </p>
          </div>
        </div>

        <button
          title="Araç Seç"
          onClick={(e) => {
            e.stopPropagation();
            onAddToSelected(vehicle);
          }}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <span className="relative">
            <Truck className="w-3.5 h-3.5" />
            <Plus className="absolute -top-1 -right-1 w-2 h-2" strokeWidth={3} />
          </span>
        </button>

        <ChevronDown
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn(
            'w-3.5 h-3.5 shrink-0 cursor-pointer transition-transform duration-150 text-muted-foreground/50',
            expanded && 'rotate-180',
          )}
        />
      </div>

      {expanded && (
        <div className="px-3 pt-1.5 pb-2.5 bg-muted/40 border-t border-border">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">İç Hacim</span>
              <span className="text-xs text-muted-foreground">{volumeM3} m³</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">Araç Tipi</span>
              <span className="text-xs text-muted-foreground">{vehicle.vehicleType}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">Kapı Yönü</span>
              <span className="text-xs text-muted-foreground">
                {DOOR_LABEL[vehicle.doorDirection] ?? vehicle.doorDirection}
              </span>
            </div>
            {vehicle.plate?.trim() && (
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] text-muted-foreground">Plaka</span>
                <span className="text-xs text-muted-foreground font-mono uppercase">
                  {vehicle.plate}
                </span>
              </div>
            )}
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
}

function SortableVehicleListItem({ id, ...itemProps }: SortableVehicleListItemProps) {
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
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const debouncedPlacements = useDebounce(placements, 200);

  const stats = useMemo(() => {
    if (!selectedVehicle) return null;
    const vehicleVol = selectedVehicle.width * selectedVehicle.height * selectedVehicle.length;
    const weightMap = new Map(selectedItems.map(({ item }) => [item.id, item.weight]));
    const cargoVolCm3 = debouncedPlacements.reduce((s, p) => s + p.width * p.height * p.depth, 0);
    const totalWeight = debouncedPlacements.reduce((s, p) => s + (weightMap.get(p.itemId) ?? 0), 0);
    const volumePct =
      vehicleVol > 0 ? Math.min(100, Math.round((cargoVolCm3 / vehicleVol) * 100)) : 0;
    const remainingM3 = parseFloat(Math.max(0, (vehicleVol - cargoVolCm3) / 1_000_000).toFixed(2));
    return { volumePct, totalWeight, remainingM3, placedCount: debouncedPlacements.length };
  }, [debouncedPlacements, selectedVehicle, selectedItems]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-5">
        <span className="text-xs text-muted-foreground">Araç seçilmedi</span>
      </div>
    );
  }

  const rows = [
    { label: 'Hacim doluluk', value: `%${stats.volumePct}` },
    { label: 'Ağırlık', value: formatWeightDisplay(stats.totalWeight, weightUnit) },
    { label: 'Yerleştirilen kutu', value: `${stats.placedCount} adet` },
    { label: 'Kalan boş hacim', value: `${stats.remainingM3} m³` },
  ];

  return (
    <div className="px-3 py-2 flex flex-col gap-0.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1">
          <span className="text-[10px] text-muted-foreground">{r.label}</span>
          <span className="text-xs text-muted-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SelectedVehicleCard ──────────────────────────────────────────────────────

interface SelectedVehicleCardProps {
  instanceId: string;
  vehicle: Vehicle;
  isPrimary: boolean;
  onMakeActive: () => void;
  onDeselect: (instanceId: string) => void;
  onAddInstance: () => void;
}

function SelectedVehicleCard({
  instanceId,
  vehicle,
  isPrimary,
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
      <div
        onClick={() => {
          if (!isPrimary) onMakeActive();
        }}
        className={cn(
          'group/item flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-foreground',
          isPrimary ? 'bg-muted ring-1 ring-border' : 'hover:bg-accent cursor-pointer',
          expanded && 'bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Truck className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-foreground">{vehicle.name}</p>
            <p className="text-[10px] tabular-nums mt-0.5 text-muted-foreground">
              {vehicle.length}×{vehicle.width}×{vehicle.height} cm
              {' · '}
              {formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
            </p>
          </div>
        </div>
        {!readOnly && (
          <>
            <button
              title="Bir tane daha ekle"
              onClick={(e) => {
                e.stopPropagation();
                onAddInstance();
              }}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <span className="relative">
                <Truck className="w-3.5 h-3.5" />
                <Plus className="absolute -top-1 -right-1 w-2 h-2" strokeWidth={3} />
              </span>
            </button>
            <button
              title="Listeden çıkar"
              onClick={(e) => {
                e.stopPropagation();
                onDeselect(instanceId);
              }}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
        <ChevronDown
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn(
            'w-3.5 h-3.5 shrink-0 cursor-pointer transition-transform duration-150 text-muted-foreground/50',
            expanded && 'rotate-180',
          )}
        />
      </div>

      {expanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-muted/40 border-t border-border">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">İç Hacim</span>
              <span className="text-xs text-muted-foreground">{volumeM3} m³</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">Araç Tipi</span>
              <span className="text-xs text-muted-foreground">{vehicle.vehicleType}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-muted-foreground">Kapı Yönü</span>
              <span className="text-xs text-muted-foreground">
                {DOOR_LABEL[vehicle.doorDirection] ?? vehicle.doorDirection}
              </span>
            </div>
            {vehicle.plate?.trim() && (
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] text-muted-foreground">Plaka</span>
                <span className="text-xs text-muted-foreground font-mono uppercase">
                  {vehicle.plate}
                </span>
              </div>
            )}
          </div>
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
  onLoadAnimation?: () => void;
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
  onLoadAnimation,
  isOptimizing = false,
  canOptimize = true,
  planId,
  planName,
  getSnapshot,
}: PlanRightPanelProps) {
  const readOnly = useReadOnly();
  const addVehicle = usePlanStore((s) => s.addVehicle);
  const peekVehicle = usePlanStore((s) => s.peekVehicle);
  const removeVehicle = usePlanStore((s) => s.removeVehicle);
  const setActiveVehicle = usePlanStore((s) => s.setActiveVehicle);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedVehicles = usePlanStore((s) => s.selectedVehicles);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const criteria = usePlanStore((s) => s.criteria);
  const setCriteria = usePlanStore((s) => s.setCriteria);
  const clusterGroups = usePlanStore((s) => s.clusterGroups);
  const setClusterGroups = usePlanStore((s) => s.setClusterGroups);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const showCog = useSceneStore((s) => s.showCog);
  const toggleShowCog = useSceneStore((s) => s.toggleShowCog);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const toggleXRayMode = useSceneStore((s) => s.toggleXRayMode);
  const setActiveLayer = useSceneStore((s) => s.setActiveLayer);

  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const vehicles = useMemo(() => vehiclesData?.items ?? [], [vehiclesData]);
  const pendingSelectIdRef = useRef<string | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [activeVehicleTab, setActiveVehicleTab] = useState<'list' | 'selected'>('list');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [activeVehicleTypes, setActiveVehicleTypes] = useState<Set<VehicleTypeValue>>(new Set());
  const [vehicleOrder, setVehicleOrder] = useState<string[]>([]);

  // Analysis & export state
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [xrayPanelOpen, setXrayPanelOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const xrayPanelRef = useRef<HTMLDivElement>(null);
  const debouncedSlider = useDebounce(sliderValue, 80);
  const sliderMax = selectedVehicle?.length ?? 100;
  const sliderPct = sliderMax > 0 ? Math.round((sliderValue / sliderMax) * 100) : 0;

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

  useEffect(() => {
    if (!pendingSelectIdRef.current) return;
    const found = vehicles.find((v) => v.id === pendingSelectIdRef.current);
    if (found) {
      addVehicle(found);
      setActiveVehicleTab('selected');
      pendingSelectIdRef.current = null;
    }
  }, [vehicles, addVehicle]);

  useEffect(() => {
    setActiveLayer(debouncedSlider);
  }, [debouncedSlider, setActiveLayer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSliderValue(0);
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (!xrayPanelOpen) return;
    function handleOutside(e: MouseEvent) {
      if (xrayPanelRef.current && !xrayPanelRef.current.contains(e.target as Node)) {
        setXrayPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [xrayPanelOpen]);

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

  const listTabVehicles = useMemo(
    () => displayedVehicles.filter((v) => !selectedVehicleIds.has(v.id)),
    [displayedVehicles, selectedVehicleIds],
  );

  const listSortableIds = useMemo(() => {
    if (vehicleSearch.trim()) return listTabVehicles.map((v) => v.id);
    const filtered = vehicleOrder.filter((id) => !selectedVehicleIds.has(id));
    return filtered.length > 0 ? filtered : listTabVehicles.map((v) => v.id);
  }, [vehicleOrder, vehicleSearch, listTabVehicles, selectedVehicleIds]);

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
                onClick={() => setShowVehicleModal(true)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Vehicle tabs — edit modda göster */}
          {!readOnly && (
            <div className="px-2 pt-2 shrink-0">
              <Tabs
                value={activeVehicleTab}
                onValueChange={(v) => setActiveVehicleTab(v as 'list' | 'selected')}
              >
                <TabsList className="w-full h-7 bg-muted">
                  <TabsTrigger value="selected" className="flex-1 text-xs h-6">
                    Seçili Araç
                    <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                      ({selectedVehicles.length})
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex-1 text-xs h-6">
                    Araç Listesi
                    <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                      ({vehicles.filter((v) => !selectedVehicleIds.has(v.id)).length})
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Tab: Seçili Araç — read-only modda doğrudan göster */}
          {(readOnly || activeVehicleTab === 'selected') && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {selectedVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center py-8">
                  <Truck className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Henüz araç seçilmedi</p>
                </div>
              ) : (
                <div className="p-2 flex flex-col gap-0.5">
                  {selectedVehicles.map((entry) => (
                    <SelectedVehicleCard
                      key={entry.instanceId}
                      instanceId={entry.instanceId}
                      vehicle={entry.vehicle}
                      isPrimary={selectedVehicles[0]?.instanceId === entry.instanceId}
                      onMakeActive={() => setActiveVehicle(entry.instanceId)}
                      onDeselect={handleDeselectVehicle}
                      onAddInstance={() => handleAddInstance(entry.vehicle)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Araç Listesi — read-only modda gizle */}
          {!readOnly && activeVehicleTab === 'list' && (
            <>
              <div className="px-2 pt-1.5 pb-1 shrink-0 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    placeholder="Araç adı ile ara…"
                    className="h-7 pl-8 pr-7 text-xs bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-border"
                  />
                  {vehicleSearch && (
                    <button
                      onClick={() => setVehicleSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Araç tipine göre filtrele"
                      className={cn(
                        'h-7 w-7 shrink-0 border-border',
                        activeVehicleTypes.size > 0
                          ? 'bg-foreground text-background border-foreground hover:bg-foreground/80 hover:border-foreground/80'
                          : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
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

              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
                {vehiclesLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Araçlar yükleniyor…
                  </div>
                ) : listTabVehicles.length === 0 &&
                  (vehicleSearch || activeVehicleTypes.size > 0) ? (
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
                    <p className="text-xs text-muted-foreground">
                      {vehicles.length === 0 ? 'Henüz araç eklenmemiş' : 'Tüm araçlar seçili'}
                    </p>
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
                          onAddToSelected={handleSelectVehicle}
                          onPreview={peekVehicle}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Kutu 2: Plan Özeti + aksiyonlar */}
      <div className="bg-background rounded-xl border border-border overflow-hidden shrink-0 flex flex-col">
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <span className="text-sm text-foreground">Plan Özeti</span>
        </div>

        <PlanSummaryPanel />

        {!selectedVehicle && selectedInstanceId === null && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-4 border-t border-border">
            <Box className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yükleme alanını görmek için
              <br />
              bir araç seçin
            </p>
          </div>
        )}

        {selectedInstanceId !== null && (
          <div className="border-t border-border overflow-y-auto shrink-0 max-h-[220px]">
            <SelectedBoxPanel />
          </div>
        )}

        <div className="px-3 pt-3 pb-3 border-t border-border shrink-0 flex flex-col gap-2">
          {/* Analysis & export row */}
          <div className="relative" ref={xrayPanelRef}>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={toggleShowCog}
                title="Ağırlık Merkezi"
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors',
                  showCog
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent',
                )}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="leading-tight text-center">
                  Ağırlık
                  <br />
                  Merkezi
                </span>
              </button>

              <button
                onClick={() => setXrayPanelOpen((v) => !v)}
                title="X-Ray Modu"
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors',
                  xRayMode || xrayPanelOpen
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent',
                )}
              >
                {xRayMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>X-Ray</span>
              </button>

              {!readOnly && (
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
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors bg-background text-muted-foreground border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Paylaş</span>
                </button>
              )}

              <button
                onClick={handlePdfExport}
                disabled={isPdfLoading || placements.length === 0}
                title="PDF Al"
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors bg-background text-muted-foreground border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                <span>PDF Al</span>
              </button>
            </div>

            {/* X-Ray floating panel */}
            {xrayPanelOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 rounded-xl border border-border bg-background shadow-lg p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">X-Ray Modu</span>
                  <button
                    type="button"
                    onClick={toggleXRayMode}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors',
                      xRayMode
                        ? 'bg-foreground text-background border-foreground hover:bg-foreground/80'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent',
                    )}
                  >
                    {xRayMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {xRayMode ? 'Kapat' : 'Aç'}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Derinlik Filtresi</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {sliderPct > 0 ? `${sliderPct}%` : 'Hepsi'}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={sliderMax}
                    step={SCENE.LEVEL_FILTER_STEP_CM}
                    value={[sliderValue]}
                    onValueChange={(values: number[]) => setSliderValue(values[0])}
                    disabled={!selectedVehicle}
                  />
                  {!selectedVehicle && (
                    <p className="text-[10px] text-muted-foreground">
                      Araç seçilmeden kullanılamaz
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Optimizasyon modu seçici — gizle: read-only modda */}
          {!readOnly && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground px-0.5">Yerleştirme Modu</span>
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    {
                      value: OptimizationCriteria.Lifo,
                      icon: ArrowDownUp,
                      label: 'LIFO',
                      title: 'Son giren ilk çıkar',
                    },
                    {
                      value: OptimizationCriteria.WeightBalance,
                      icon: Scale,
                      label: 'Ağırlık Dengesi',
                      title: 'Ağırlık dengesi',
                    },
                  ] as const
                ).map(({ value, icon: Icon, label, title }) => (
                  <button
                    key={value}
                    onClick={() => setCriteria(value)}
                    title={title}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors',
                      criteria === value
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!readOnly && (
            <>
              {/* Grup kümeleme modu */}
              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    'text-[10px] px-0.5',
                    criteria === OptimizationCriteria.Lifo
                      ? 'text-muted-foreground/40'
                      : 'text-muted-foreground',
                  )}
                >
                  Grup Yerleştirme
                  {criteria === OptimizationCriteria.Lifo && (
                    <span className="ml-1 text-[9px]">(LIFO ile kilitli)</span>
                  )}
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setClusterGroups(true)}
                    disabled={criteria === OptimizationCriteria.Lifo}
                    title={
                      criteria === OptimizationCriteria.Lifo
                        ? 'LIFO modunda grup kümeleme devre dışı'
                        : 'Gruplu ürünler bir arada kümelenir'
                    }
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors',
                      criteria === OptimizationCriteria.Lifo
                        ? 'opacity-40 cursor-not-allowed bg-background text-muted-foreground border-border'
                        : clusterGroups
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-muted-foreground border-border hover:bg-accent',
                    )}
                  >
                    <span>Kümeleli</span>
                  </button>
                  <button
                    onClick={() => setClusterGroups(false)}
                    disabled={criteria === OptimizationCriteria.Lifo}
                    title={
                      criteria === OptimizationCriteria.Lifo
                        ? 'LIFO modunda grup kümeleme devre dışı'
                        : 'Tüm ürünler optimizasyon kriterine göre karışık yerleşir'
                    }
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-colors',
                      criteria === OptimizationCriteria.Lifo
                        ? 'opacity-40 cursor-not-allowed bg-background text-muted-foreground border-border'
                        : !clusterGroups
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-muted-foreground border-border hover:bg-accent',
                    )}
                  >
                    <span>Karma</span>
                  </button>
                </div>
              </div>

              <Button
                className="w-full bg-foreground text-background hover:bg-foreground/80 disabled:opacity-40"
                disabled={!selectedVehicle || isOptimizing || !canOptimize}
                onClick={onOptimize}
              >
                {isOptimizing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Optimizasyonu Başlat
              </Button>
            </>
          )}
          {placements.length > 0 && (
            <Button variant="outline" className="w-full" onClick={onLoadAnimation}>
              Yükleme Animasyonunu Başlat
            </Button>
          )}
        </div>
      </div>

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
