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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Container,
  GripVertical,
  Loader2,
  Package2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useDebounce } from '@/lib/utils/useDebounce';
import {
  VehicleType,
  type Vehicle,
  type VehicleType as VehicleTypeValue,
} from '@/lib/types/vehicle';
import { useVehicles } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
import { AddVehicleModal } from './AddVehicleModal';
import { SelectedBoxPanel } from './SelectedBoxPanel';

// ─── Vehicle type filter metadata ────────────────────────────────────────────

const VEHICLE_TYPE_META: Record<VehicleTypeValue, { label: string; icon: typeof Truck }> = {
  [VehicleType.Tir]: { label: 'Tır', icon: Truck },
  [VehicleType.Kamyon]: { label: 'Kamyon', icon: Truck },
  [VehicleType.Kamposet]: { label: 'Kamposet', icon: Truck },
  [VehicleType.Konteyner]: { label: 'Konteyner', icon: Container },
};

// ─── Vehicle edit schema ──────────────────────────────────────────────────────

const vehicleEditSchema = z.object({
  length: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  width: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  height: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  payload: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
});

type VehicleEditValues = z.infer<typeof vehicleEditSchema>;

// ─── VehicleListItem ──────────────────────────────────────────────────────────

interface VehicleListItemProps {
  vehicle: Vehicle;
  isSelected: boolean;
  dragHandleRef?: (el: HTMLElement | null) => void;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
  onSelect: (v: Vehicle) => void;
  onEdit: (v: Vehicle) => void;
  onDelete: (id: string) => void;
}

function VehicleListItem({
  vehicle,
  isSelected,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
  onSelect,
  onEdit,
  onDelete,
}: VehicleListItemProps) {
  const isContainer = vehicle.vehicleType === VehicleType.Konteyner;
  const iconClass = cn('w-4 h-4 shrink-0', isSelected ? 'text-white' : 'text-zinc-500');
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <div
      className={cn(
        'group/item flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors',
        isSelected ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-700',
      )}
    >
      {/* Drag handle */}
      {dragHandleRef && (
        <button
          ref={dragHandleRef}
          {...(dragHandleListeners as HTMLAttributes<HTMLButtonElement>)}
          {...(dragHandleAttributes as HTMLAttributes<HTMLButtonElement>)}
          className={cn(
            'shrink-0 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none',
            isSelected ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-200 hover:text-zinc-400',
          )}
          title="Sırasını değiştir"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={() => onSelect(vehicle)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        {isContainer ? (
          <Package2 className={iconClass} strokeWidth={2} />
        ) : (
          <Truck className={iconClass} strokeWidth={2} />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm truncate', isSelected ? 'text-white' : 'text-zinc-800')}>
            {vehicle.name}
          </p>
          <p
            className={cn(
              'text-[10px] tabular-nums mt-0.5',
              isSelected ? 'text-zinc-300' : 'text-zinc-400',
            )}
          >
            {vehicle.length}×{vehicle.width}×{vehicle.height} cm
            {' · '}
            {formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
          </p>
        </div>
      </button>
      <button
        onClick={() => onEdit(vehicle)}
        title="Düzenle"
        className={cn(
          'shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity',
          isSelected
            ? 'text-zinc-300 hover:text-white hover:bg-white/10'
            : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
        )}
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={() => onDelete(vehicle.id)}
        title="Sil"
        className={cn(
          'shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity',
          isSelected
            ? 'text-zinc-300 hover:text-white hover:bg-white/10'
            : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50',
        )}
      >
        <X className="w-3 h-3" />
      </button>
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

  // AC4: debounce 200ms so rapid quantity changes don't cause jank
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
        <span className="text-xs text-zinc-400">Araç seçilmedi</span>
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
          <span className="text-[10px] text-zinc-400">{r.label}</span>
          <span className="text-xs text-zinc-600">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── VehicleSpec ──────────────────────────────────────────────────────────────

function VehicleSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-700">{value}</span>
    </div>
  );
}

// ─── VehicleDetails ───────────────────────────────────────────────────────────

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onUpdate: (v: Vehicle) => void;
  defaultEditing?: boolean;
}

function VehicleDetails({ vehicle, onUpdate, defaultEditing = false }: VehicleDetailsProps) {
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const volumeM3 = ((vehicle.width * vehicle.height * vehicle.length) / 1_000_000).toFixed(1);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleEditValues>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: {
      length: vehicle.length,
      width: vehicle.width,
      height: vehicle.height,
      payload: vehicle.payload ?? vehicle.maxCargoWeight,
    },
  });

  function handleSave(values: VehicleEditValues) {
    onUpdate({
      ...vehicle,
      length: values.length,
      width: values.width,
      height: values.height,
      payload: values.payload,
      maxCargoWeight: values.payload,
    });
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit(handleSave)} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-700">{vehicle.name}</p>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">Uzunluk (cm)</Label>
            <Input {...register('length', { valueAsNumber: true })} className="h-7 text-xs" />
            {errors.length && (
              <p className="text-[10px] text-destructive">{errors.length.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">Genişlik (cm)</Label>
            <Input {...register('width', { valueAsNumber: true })} className="h-7 text-xs" />
            {errors.width && <p className="text-[10px] text-destructive">{errors.width.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">Yükseklik (cm)</Label>
            <Input {...register('height', { valueAsNumber: true })} className="h-7 text-xs" />
            {errors.height && (
              <p className="text-[10px] text-destructive">{errors.height.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">Maks. Yük (kg)</Label>
            <Input {...register('payload', { valueAsNumber: true })} className="h-7 text-xs" />
            {errors.payload && (
              <p className="text-[10px] text-destructive">{errors.payload.message}</p>
            )}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-700"
        >
          Kaydet
        </Button>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-700">{vehicle.name}</p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Düzenle"
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
      <VehicleSpec label="Uzunluk" value={`${vehicle.length} cm`} />
      <VehicleSpec label="Genişlik" value={`${vehicle.width} cm`} />
      <VehicleSpec label="Yükseklik" value={`${vehicle.height} cm`} />
      <VehicleSpec
        label="Maks. Yük"
        value={formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit)}
      />
      <VehicleSpec label="İç Hacim" value={`${volumeM3} m³`} />
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
}

export function PlanRightPanel({
  vehiclesOpen = true,
  onToggleVehicles,
  onOptimize,
  isOptimizing = false,
  canOptimize = true,
}: PlanRightPanelProps) {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);

  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const vehicles = useMemo(() => vehiclesData?.items ?? [], [vehiclesData]);
  const pendingSelectIdRef = useRef<string | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const hasAutoClosedRef = useRef(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [activeVehicleTypes, setActiveVehicleTypes] = useState<Set<VehicleTypeValue>>(new Set());
  // Local order state for drag-and-drop (server order is the initial order)
  const [vehicleOrder, setVehicleOrder] = useState<string[]>([]);

  // Initialize local order when vehicles load; keep in sync when server adds/removes vehicles
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

  // Sorted + filtered vehicle list
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

  // DnD sensors
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
      setVehicle(found);
      pendingSelectIdRef.current = null;
    }
  }, [vehicles, setVehicle]);

  function handleVehicleCreated(id: string | null) {
    if (id) pendingSelectIdRef.current = id;
  }

  function handleSelectVehicle(v: Vehicle) {
    setVehicle(v);
    setEditingVehicleId(null);
    if (!hasAutoClosedRef.current) {
      hasAutoClosedRef.current = true;
      onToggleVehicles?.();
    }
  }

  function handleEditVehicle(v: Vehicle) {
    setVehicle(v);
    setEditingVehicleId(v.id);
    if (!hasAutoClosedRef.current) {
      hasAutoClosedRef.current = true;
      onToggleVehicles?.();
    }
  }

  function handleDeleteVehicle(id: string) {
    if (selectedVehicle?.id === id) setVehicle(null);
    setVehicleOrder((prev) => prev.filter((oid) => oid !== id));
  }

  function handleUpdateVehicle(v: Vehicle) {
    setVehicle(v);
    setEditingVehicleId(null);
  }

  // DnD items list (use vehicleOrder IDs for SortableContext)
  const sortableIds = useMemo(() => {
    if (vehicleSearch.trim()) return displayedVehicles.map((v) => v.id);
    return vehicleOrder.length > 0 ? vehicleOrder : vehicles.map((v) => v.id);
  }, [vehicleOrder, vehicles, vehicleSearch, displayedVehicles]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ── Kutu 1: Araçlar — wrapper+toggle birlikte kayar */}
      <div
        className={cn(
          'relative flex-1 min-h-0',
          'transition-transform duration-[220ms] ease-out',
          !vehiclesOpen && 'translate-x-[calc(100%-0.75rem)]',
        )}
      >
        {/* Toggle butonu */}
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
            'h-full bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col',
            'transition-transform duration-[220ms] ease-out',
            !vehiclesOpen && 'translate-x-6',
          )}
        >
          <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-zinc-100">
            <span className="text-sm text-zinc-800">Araçlar</span>
            <Button
              size="icon"
              title="Araç Ekle"
              className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
              onClick={() => setShowVehicleModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Vehicle search + type filter */}
          <div className="px-2 pt-2 pb-1 shrink-0 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <Input
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Araç adı ile ara…"
                className="h-7 pl-8 pr-7 text-xs bg-zinc-50 border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300"
              />
              {vehicleSearch && (
                <button
                  onClick={() => setVehicleSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Vehicle type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  title="Araç tipine göre filtrele"
                  className={cn(
                    'h-7 w-7 shrink-0 border-zinc-200',
                    activeVehicleTypes.size > 0
                      ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-700 hover:border-zinc-700'
                      : 'bg-zinc-50 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide py-1">
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
                      <Icon className="w-3.5 h-3.5 text-zinc-500" />
                      {meta.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {activeVehicleTypes.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <button
                      onClick={() => setActiveVehicleTypes(new Set())}
                      className="w-full text-[10px] text-zinc-400 hover:text-zinc-700 px-2 py-1.5 text-left transition-colors"
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
              <div className="flex items-center justify-center py-8 text-zinc-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Araçlar yükleniyor…
              </div>
            ) : displayedVehicles.length === 0 && (vehicleSearch || activeVehicleTypes.size > 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Search className="w-6 h-6 text-zinc-200" />
                <p className="text-xs text-zinc-400">
                  {vehicleSearch
                    ? `"${vehicleSearch}" için araç bulunamadı`
                    : 'Seçili araç tipinde sonuç yok'}
                </p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Truck className="w-8 h-8 text-zinc-200" />
                <p className="text-xs text-zinc-400">Henüz araç eklenmemiş</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleVehicleDragEnd}
              >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {displayedVehicles.map((v) => (
                    <SortableVehicleListItem
                      key={v.id}
                      id={v.id}
                      vehicle={v}
                      isSelected={selectedVehicle?.id === v.id}
                      onSelect={handleSelectVehicle}
                      onEdit={handleEditVehicle}
                      onDelete={handleDeleteVehicle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* ── Kutu 2: Plan Özeti + aksiyonlar ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shrink-0 flex flex-col">
        <div className="px-3 py-2.5 border-b border-zinc-100 shrink-0">
          <span className="text-sm text-zinc-800">Plan Özeti</span>
        </div>

        <PlanSummaryPanel />

        {/* Seçili araç detayları — kutu seçili değilken göster */}
        {selectedVehicle && selectedInstanceId === null && (
          <div className="border-t border-zinc-100 px-3 py-3 overflow-y-auto max-h-[200px]">
            <VehicleDetails
              key={`${selectedVehicle.id}-${editingVehicleId}`}
              vehicle={selectedVehicle}
              onUpdate={handleUpdateVehicle}
              defaultEditing={editingVehicleId === selectedVehicle.id}
            />
          </div>
        )}

        {/* Araç seçilmemişse boş durum */}
        {!selectedVehicle && selectedInstanceId === null && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-4 border-t border-zinc-100">
            <Box className="w-8 h-8 text-zinc-200" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yükleme alanını görmek için
              <br />
              bir araç seçin
            </p>
          </div>
        )}

        {/* Seçili kutu bilgileri */}
        {selectedInstanceId !== null && (
          <div className="border-t border-zinc-100 overflow-y-auto shrink-0 max-h-[220px]">
            <SelectedBoxPanel />
          </div>
        )}

        <div className="px-3 py-3 border-t border-zinc-100 shrink-0">
          <Button
            className="w-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            disabled={!selectedVehicle || isOptimizing || !canOptimize}
            onClick={onOptimize}
          >
            {isOptimizing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Optimizasyonu Başlat
          </Button>
        </div>
      </div>

      <AddVehicleModal
        open={showVehicleModal}
        onOpenChange={setShowVehicleModal}
        onCreated={handleVehicleCreated}
      />
    </div>
  );
}
