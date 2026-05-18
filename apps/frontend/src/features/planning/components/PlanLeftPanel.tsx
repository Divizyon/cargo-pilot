import { useState, useRef, useEffect, useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Droplets,
  Flame,
  FlaskConical,
  FolderPlus,
  Layers,
  Leaf,
  Loader2,
  Minus,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  Utensils,
  Wind,
  Wine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { SearchInput } from '@/components/shared/SearchInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import type { InlineGroup } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { useItems } from '@/lib/api/useItems';
import { useDeletePlanGroup } from '@/lib/api/useLoadingPlans';
import { UnfitItemsPanel } from './UnfitItemsPanel';
import { useReadOnly } from '../ReadOnlyContext';
import type { Item } from '@/lib/types/item';
import { ConstraintIcons } from '@/features/data-management/components/ConstraintIcons';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  detectContaminationConflicts,
  computeGroupVolumes,
  type GroupVolume,
  type ContaminationConflict,
} from '@/lib/utils/contamination';

const VIRTUAL_THRESHOLD = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

const GROUP_ICON_COLORS = [
  '#2DD4BF',
  '#FB923C',
  '#FBBF24',
  '#818CF8',
  '#FB7185',
  '#34D399',
  '#0EA5E9',
  '#A855F7',
  '#64748B',
  '#E11D48',
  '#84CC16',
  '#D97706',
  '#4338CA',
  '#A7F3D0',
  '#334155',
] as const;

type ConstraintFilter =
  | 'fragile'
  | 'liquid'
  | 'corrosive'
  | 'odor'
  | 'food'
  | 'dry'
  | 'chemical'
  | 'organic'
  | 'stackable'
  | 'rotationLocked';

const FRAGILITY_FILTER_VALUE: Partial<Record<ConstraintFilter, number>> = {
  fragile: 1,
  liquid: 2,
  corrosive: 5,
  odor: 6,
  food: 7,
  dry: 8,
  chemical: 9,
  organic: 10,
};

const CONSTRAINT_FILTER_OPTIONS: {
  value: ConstraintFilter;
  label: string;
  Icon: ElementType;
  className: string;
}[] = [
  { value: 'fragile', label: 'Kırılgan', Icon: Wine, className: 'text-amber-600' },
  { value: 'liquid', label: 'Sıvı İçerir', Icon: Droplets, className: 'text-blue-600' },
  { value: 'corrosive', label: 'Aşındırıcı', Icon: Flame, className: 'text-orange-600' },
  { value: 'odor', label: 'Kokuya Hassas', Icon: Wind, className: 'text-green-600' },
  { value: 'food', label: 'Gıda Teması', Icon: Utensils, className: 'text-green-600' },
  { value: 'dry', label: 'Kuru', Icon: Sun, className: 'text-muted-foreground' },
  { value: 'chemical', label: 'Kimyasal', Icon: FlaskConical, className: 'text-purple-600' },
  { value: 'organic', label: 'Organik', Icon: Leaf, className: 'text-green-600' },
  { value: 'stackable', label: 'İstiflenebilir', Icon: Layers, className: 'text-muted-foreground' },
  {
    value: 'rotationLocked',
    label: 'Rotasyon Kısıtlı',
    Icon: RotateCcw,
    className: 'text-muted-foreground',
  },
];

function matchesConstraintFilter(item: Item, filter: ConstraintFilter): boolean {
  const fragilityVal = FRAGILITY_FILTER_VALUE[filter];
  if (fragilityVal !== undefined) return item.fragility === fragilityVal;
  if (filter === 'stackable') return item.isStackable;
  if (filter === 'rotationLocked')
    return !item.allowRotateX || !item.allowRotateY || !item.allowRotateZ;
  return false;
}

function itemMatchesFilters(
  item: Item,
  query: string,
  activeConstraints: ReadonlySet<ConstraintFilter>,
): boolean {
  if (
    query &&
    !item.name.toLowerCase().includes(query.toLowerCase()) &&
    !item.sku.toLowerCase().includes(query.toLowerCase())
  )
    return false;
  if (activeConstraints.size > 0) {
    const matches = [...activeConstraints].some((f) => matchesConstraintFilter(item, f));
    if (!matches) return false;
  }
  return true;
}

// ─── GroupSelectionRow ────────────────────────────────────────────────────────

interface GroupSelectionRowProps {
  item: Item;
  isSelected: boolean;
  onToggle: () => void;
}

function GroupSelectionRow({ item, isSelected, onToggle }: GroupSelectionRowProps) {
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-muted ring-1 ring-border' : 'hover:bg-accent',
      )}
    >
      <div
        className={cn(
          'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isSelected ? 'bg-foreground border-foreground' : 'border-border',
        )}
      >
        {isSelected && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
      </div>
      <TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <span className="flex-1 min-w-0 text-xs text-foreground truncate">{item.name}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{item.sku}</span>
    </button>
  );
}

// ─── StoreItemRow ─────────────────────────────────────────────────────────────

interface GroupOption {
  id: string;
  ad: string;
  color: string;
}

interface StoreItemRowProps {
  storeEntry: { item: Item; quantity: number };
  isPlaced: boolean;
  canPlace: boolean;
  isExpanded: boolean;
  indent?: boolean;
  iconColor?: string;
  groups?: GroupOption[];
  onToggleExpand: () => void;
  onToggleVisibility?: () => void;
  isHidden?: boolean;
  onPlace: (qty: number) => void;
  onRemove?: () => void;
  onRemoveFromGroup?: () => void;
  onEdit?: () => void;
  onAddToGroup?: (groupId: string) => void;
  onClearStackGroup?: () => void;
}

function StoreItemRow({
  storeEntry,
  isPlaced,
  canPlace,
  isExpanded,
  indent = false,
  iconColor,
  groups,
  onToggleExpand,
  onToggleVisibility,
  isHidden = false,
  onPlace,
  onRemove,
  onRemoveFromGroup,
  onEdit,
  onAddToGroup,
  onClearStackGroup,
}: StoreItemRowProps) {
  const readOnly = useReadOnly();
  const { item, quantity } = storeEntry;
  const [localQty, setLocalQty] = useState(quantity);
  const [inputValue, setInputValue] = useState(String(quantity));
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        indent && 'ml-4',
        isExpanded && 'ring-1 ring-border',
      )}
    >
      <div
        onClick={onToggleVisibility ?? onToggleExpand}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors',
          isPlaced ? 'bg-muted/40' : 'hover:bg-accent',
          isExpanded && 'bg-muted/40',
          isHidden && 'opacity-40',
        )}
      >
        <TypeIcon
          className={cn('w-3.5 h-3.5 shrink-0', !iconColor && 'text-muted-foreground')}
          style={iconColor ? { color: iconColor } : undefined}
          strokeWidth={1.5}
        />
        <span className="flex-1 min-w-0 text-xs text-foreground truncate">{item.name}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{item.sku}</span>
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
            {item.width}×{item.height}×{item.length} cm · {item.weight} kg
          </p>
          <ConstraintIcons
            fragility={item.fragility}
            isStackable={item.isStackable}
            allowRotateX={item.allowRotateX}
            allowRotateY={item.allowRotateY}
            allowRotateZ={item.allowRotateZ}
            constraintIds={item.constraintIds}
          />
          {item.stackGroup?.trim() && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Package className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">Yük Grubu</span>
              <span className="text-foreground font-medium truncate">{item.stackGroup}</span>
              {onClearStackGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearStackGroup();
                  }}
                  className="ml-auto shrink-0 text-muted-foreground/50 hover:text-rose-500 transition-colors"
                  title="Yük grubundan çıkar"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {item.specialNotes?.trim() && (
            <p className="text-[11px] text-muted-foreground italic leading-snug">
              {item.specialNotes}
            </p>
          )}
          {!readOnly && (
            <div className="flex flex-col gap-0.5 pt-1.5 border-t border-border">
              <div className="flex items-center justify-between gap-2">
                {/* Adet */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Adet</span>
                  <div className="flex items-center rounded border border-border overflow-hidden ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = Math.max(1, localQty - 1);
                        setLocalQty(v);
                        setInputValue(String(v));
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Minus className="w-2 h-2" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={inputValue}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setInputValue(raw);
                        const parsed = parseInt(raw, 10);
                        if (!isNaN(parsed) && parsed >= 1) setLocalQty(parsed);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 text-center text-[11px] tabular-nums text-foreground bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = localQty + 1;
                        setLocalQty(v);
                        setInputValue(String(v));
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Plus className="w-2 h-2" />
                    </button>
                  </div>
                </div>

                {/* Aksiyon butonları */}
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button
                      title="Düzenle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {!isPlaced ? (
                    <>
                      {groups && groups.length > 0 && onAddToGroup && (
                        <DropdownMenu>
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors"
                                  >
                                    <FolderPlus className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Gruba Ekle
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenuContent side="top" align="end" className="w-44 p-1">
                            {groups.map((g) => (
                              <DropdownMenuItem
                                key={g.id}
                                className="flex items-center gap-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToGroup(g.id);
                                }}
                              >
                                <Layers
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: g.color }}
                                />
                                <span className="truncate">{g.ad}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        size="sm"
                        disabled={!canPlace}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlace(localQty);
                          onToggleExpand();
                        }}
                        className="h-6 text-[11px] px-2.5 bg-foreground text-background hover:bg-foreground/80"
                      >
                        Ekle
                      </Button>
                    </>
                  ) : onRemoveFromGroup ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          <PackageMinus className="w-3 h-3" />
                          Çıkar
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="end" className="min-w-0 w-auto p-0">
                        <DropdownMenuItem
                          className="text-[10px] px-2 py-0.5 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromGroup();
                            onToggleExpand();
                          }}
                        >
                          Gruptan Çıkar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[10px] px-2 py-0.5 cursor-pointer text-rose-600 focus:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.();
                            onToggleExpand();
                          }}
                        >
                          Yüklüden Çıkar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                        onToggleExpand();
                      }}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-600 transition-colors"
                    >
                      <PackageMinus className="w-3 h-3" />
                      Çıkar
                    </button>
                  )}
                </div>
              </div>

              {inputValue === '' && (
                <span className="text-[10px] text-rose-500 pl-0.5">boş olamaz</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlanLeftPanel ────────────────────────────────────────────────────────────

interface PlanLeftPanelProps {
  planId?: string;
}

export function PlanLeftPanel({ planId }: PlanLeftPanelProps) {
  const readOnly = useReadOnly();
  const navigate = useNavigate();
  const { mutateAsync: deleteGroupApi } = useDeletePlanGroup();
  const [groups, setGroups] = useState<
    Array<{ id: string; ad: string; acik: boolean; itemIdler: string[]; color: string }>
  >([]);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeConstraints, setActiveConstraints] = useState<Set<ConstraintFilter>>(new Set());
  const [activeTab, setActiveTab] = useState<'unloaded' | 'loaded'>(
    readOnly ? 'loaded' : 'unloaded',
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Group management state
  const [groupSelectionMode, setGroupSelectionMode] = useState<string | null>(null);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());
  const [groupSelectionCurrentOnly, setGroupSelectionCurrentOnly] = useState(false);
  const [groupSelectionAction, setGroupSelectionAction] = useState<'add' | 'remove'>('add');

  // stackGroup collapsible state for Ürün Listesi tab
  const [openStackGroups, setOpenStackGroups] = useState<Set<string>>(new Set());
  const [clearedStackGroups, setClearedStackGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const [pendingPlaceContamination, setPendingPlaceContamination] = useState<{
    pendingAction: () => void;
    groupVolumes: GroupVolume[];
    conflicts: ContaminationConflict[];
  } | null>(null);

  const { data: itemsPage, isLoading: itemsLoading } = useItems({ pageSize: 100 });
  const apiItems = useMemo(() => itemsPage?.items ?? [], [itemsPage]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const placements = usePlanStore((s) => s.placements);
  const removeItem = usePlanStore((s) => s.removeItem);
  const togglePlacement = usePlanStore((s) => s.togglePlacement);
  const addManualItem = usePlanStore((s) => s.addManualItem);
  const updateItem = usePlanStore((s) => s.updateItem);
  const initItems = usePlanStore((s) => s.initItems);
  const mockPlacements = usePlanStore((s) => s.mockPlacements);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);

  const canPlace = !!selectedVehicle;

  const inlineGroupsFromStore = usePlanStore((s) => s.inlineGroups);
  const setInlineGroups = usePlanStore((s) => s.setInlineGroups);

  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setHiddenItemIds = useSceneStore((s) => s.setHiddenItemIds);
  const toggleHiddenItem = useSceneStore((s) => s.toggleHiddenItem);

  // Mevcut plan yüklendiğinde store'dan grupları geri yükle
  useEffect(() => {
    if (groups.length > 0) return;
    if (inlineGroupsFromStore.length === 0) return;
    setGroups(
      inlineGroupsFromStore.map((g) => ({
        id: g.id,
        ad: g.name,
        acik: false,
        itemIdler: g.itemIds,
        color: g.color,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineGroupsFromStore]);

  // Lokal grup state'ini store ile senkronize et
  useEffect(() => {
    const mapped: InlineGroup[] = groups.map((g) => ({
      id: g.id,
      name: g.ad,
      color: g.color,
      itemIds: g.itemIdler,
    }));
    setInlineGroups(mapped);
  }, [groups, setInlineGroups]);

  const placedIds = useMemo(() => new Set(placements.map((p) => p.itemId)), [placements]);

  const prevSelectedLenRef = useRef(selectedItems.length);
  useEffect(() => {
    if (prevSelectedLenRef.current > 0 && selectedItems.length === 0 && placements.length === 0) {
      setUngroupedIds([]);
      setGroups([]);
      useSceneStore.getState().setHiddenItemIds([]);
    }
    prevSelectedLenRef.current = selectedItems.length;
  }, [selectedItems.length, placements.length]);

  const prevPlanIdRef = useRef<string | undefined>(planId);
  useEffect(() => {
    if (prevPlanIdRef.current === planId) return;
    prevPlanIdRef.current = planId;
    setGroups([]);
    setUngroupedIds([]);
    useSceneStore.getState().setHiddenItemIds([]);
  }, [planId]);

  useEffect(() => {
    if (ungroupedIds.length > 0) return;
    if (selectedItems.length > 0) {
      setUngroupedIds(selectedItems.map((si) => si.item.id));
      // apiItems hazırsa, plan API'sinden gelen item'larda eksik kalan constraintIds'i doldur
      if (apiItems.length > 0) {
        const fullItemMap = new Map(apiItems.map((item) => [item.id, item]));
        selectedItems.forEach(({ item, quantity }) => {
          const full = fullItemMap.get(item.id);
          if (
            full &&
            (!item.constraintIds || item.constraintIds.length === 0) &&
            full.constraintIds &&
            full.constraintIds.length > 0
          ) {
            updateItem(
              item.id,
              { ...item, constraintIds: full.constraintIds },
              quantity,
              usePlanStore.getState().skuColorMap[item.sku] ?? SCENE.COLORS.NORMAL_STR,
            );
          }
        });
      }
      return;
    }
    if (apiItems.length > 0) {
      const colorMap: Record<string, string> = {};
      apiItems.forEach((item, i) => {
        colorMap[item.sku] = SCENE.COLORS.SKU_PALETTE[i % SCENE.COLORS.SKU_PALETTE.length];
      });
      initItems(
        apiItems.map((item) => ({ item, quantity: 1 })),
        colorMap,
      );
      setUngroupedIds(apiItems.map((item) => item.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiItems, selectedItems, ungroupedIds.length]);

  useEffect(() => {
    if (!showFilterPanel) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setShowFilterPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  const hasActiveFilters = activeConstraints.size > 0;

  function toggleConstraintFilter(value: ConstraintFilter) {
    setActiveConstraints((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const groupedIds = useMemo(() => new Set(groups.flatMap((g) => g.itemIdler)), [groups]);

  const itemIconColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      for (const id of g.itemIdler) {
        map[id] = g.color;
      }
    }
    let idx = 0;
    for (const id of ungroupedIds) {
      if (!map[id]) {
        map[id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    for (const si of selectedItems) {
      if (!map[si.item.id]) {
        map[si.item.id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    for (const item of apiItems) {
      if (!map[item.id]) {
        map[item.id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [groups, ungroupedIds, selectedItems, apiItems]);

  const filteredCatalogOnlyItems = useMemo(() => {
    if (activeTab !== 'unloaded') return [];
    const planIds = new Set(selectedItems.map((si) => si.item.id));
    return apiItems.filter(
      (item) => !planIds.has(item.id) && itemMatchesFilters(item, search, activeConstraints),
    );
  }, [apiItems, selectedItems, activeTab, search, activeConstraints]);

  const unloadedCount = useMemo(() => {
    const planIds = new Set(selectedItems.map((si) => si.item.id));
    return selectedItems.length + apiItems.filter((i) => !planIds.has(i.id)).length;
  }, [selectedItems, apiItems]);

  const flatDisplayItems = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const id of ungroupedIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (groupedIds.has(id)) continue;
      const entry = selectedItems.find((si) => si.item.id === id);
      if (!entry) continue;
      const isPlaced = placedIds.has(id);
      if (activeTab === 'loaded' && !isPlaced) continue;
      if (!itemMatchesFilters(entry.item, search, activeConstraints)) continue;
      result.push(id);
    }

    for (const si of selectedItems) {
      const id = si.item.id;
      if (seen.has(id)) continue;
      seen.add(id);
      if (groupedIds.has(id)) continue;
      const isPlaced = placedIds.has(id);
      if (activeTab === 'loaded' && !isPlaced) continue;
      if (!itemMatchesFilters(si.item, search, activeConstraints)) continue;
      result.push(id);
    }

    return result;
  }, [ungroupedIds, selectedItems, groupedIds, placedIds, activeTab, search, activeConstraints]);

  type ItemRef = { id: string; isCatalog: boolean };

  const groupedUnloadedSections = useMemo(() => {
    if (activeTab !== 'unloaded' || groupSelectionMode) return null;
    const groupMap = new Map<string, ItemRef[]>();
    const noGroupPlan: ItemRef[] = [];
    const noGroupCatalog: ItemRef[] = [];

    for (const id of flatDisplayItems) {
      const entry = selectedItems.find((si) => si.item.id === id);
      if (!entry) continue;
      const sg = clearedStackGroups.has(id) ? null : entry.item.stackGroup?.trim() || null;
      if (sg) {
        if (!groupMap.has(sg)) groupMap.set(sg, []);
        groupMap.get(sg)!.push({ id, isCatalog: false });
      } else {
        noGroupPlan.push({ id, isCatalog: false });
      }
    }

    for (const item of filteredCatalogOnlyItems) {
      const sg = clearedStackGroups.has(item.id) ? null : item.stackGroup?.trim() || null;
      if (sg) {
        if (!groupMap.has(sg)) groupMap.set(sg, []);
        groupMap.get(sg)!.push({ id: item.id, isCatalog: true });
      } else {
        noGroupCatalog.push({ id: item.id, isCatalog: true });
      }
    }

    return { groupMap, noGroupPlan, noGroupCatalog };
  }, [
    activeTab,
    groupSelectionMode,
    flatDisplayItems,
    filteredCatalogOnlyItems,
    clearedStackGroups,
    selectedItems,
  ]);

  const shouldVirtualize = flatDisplayItems.length >= VIRTUAL_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? flatDisplayItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  // All items available for group selection (plan items + catalog items in Ürün Listesi)
  const groupSelectionItems = useMemo(() => {
    if (!groupSelectionMode) return [];

    if (groupSelectionCurrentOnly) {
      const currentIds = new Set(groups.find((g) => g.id === groupSelectionMode)?.itemIdler ?? []);
      return selectedItems
        .filter(
          (si) =>
            currentIds.has(si.item.id) && itemMatchesFilters(si.item, search, activeConstraints),
        )
        .map((si) => si.item);
    }

    const planIds = new Set(selectedItems.map((si) => si.item.id));
    const catalogOnly = apiItems.filter(
      (item) => !planIds.has(item.id) && itemMatchesFilters(item, search, activeConstraints),
    );
    const planUnplaced = selectedItems.filter(
      (si) => !placedIds.has(si.item.id) && itemMatchesFilters(si.item, search, activeConstraints),
    );
    return [...planUnplaced.map((si) => si.item), ...catalogOnly];
  }, [
    groupSelectionMode,
    groupSelectionCurrentOnly,
    groups,
    selectedItems,
    apiItems,
    placedIds,
    search,
    activeConstraints,
  ]);

  function lookupEntry(id: string) {
    return selectedItems.find((si) => si.item.id === id);
  }

  function toggleGroup(groupId: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, acik: !g.acik } : g)));
  }

  function toggleGroupVisibility(itemIdler: string[]) {
    if (itemIdler.length === 0) return;
    const allHidden = itemIdler.every((id) => hiddenItemIds.includes(id));
    if (allHidden) {
      setHiddenItemIds(hiddenItemIds.filter((id) => !itemIdler.includes(id)));
    } else {
      setHiddenItemIds([...new Set([...hiddenItemIds, ...itemIdler])]);
    }
  }

  function addItemToGroup(
    prev: Array<{ id: string; ad: string; acik: boolean; itemIdler: string[]; color: string }>,
    itemId: string,
    targetGroupId: string,
  ) {
    return prev.map((g) => {
      if (g.id === targetGroupId)
        return { ...g, itemIdler: [...new Set([...g.itemIdler, itemId])] };
      return { ...g, itemIdler: g.itemIdler.filter((id) => id !== itemId) };
    });
  }

  function handleAddGroup() {
    const id = crypto.randomUUID();
    const num = groups.length + 1;
    const usedColors = groups.map((g) => g.color);
    const available = GROUP_ICON_COLORS.filter((c) => !usedColors.includes(c));
    const pool = available.length > 0 ? available : [...GROUP_ICON_COLORS];
    const color = pool[Math.floor(Math.random() * pool.length)];
    setGroups((prev) => [...prev, { id, ad: `Grup ${num}`, acik: true, itemIdler: [], color }]);
  }

  async function handleDeleteGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    const dbId = inlineGroupsFromStore.find((g) => g.id === groupId)?.dbId;
    if (planId && dbId) {
      await deleteGroupApi({ planId, groupId: dbId });
    }
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (group) {
      setUngroupedIds((prev) => [...prev, ...group.itemIdler.filter((id) => !prev.includes(id))]);
    }
    if (focusedGroupItemIds?.some((id) => group?.itemIdler.includes(id))) {
      setFocusedGroupItemIds(null);
    }
  }

  function handleStartGroupSelection(
    groupId: string,
    options?: { preSelected?: Set<string>; currentOnly?: boolean; action?: 'add' | 'remove' },
  ) {
    setGroupSelectionMode(groupId);
    setSelectedForGroup(options?.preSelected ?? new Set());
    setGroupSelectionCurrentOnly(options?.currentOnly ?? false);
    setGroupSelectionAction(options?.action ?? 'add');
    setActiveTab('unloaded');
  }

  function handleConfirmGroupSelection() {
    if (!groupSelectionMode) return;
    setGroupSelectionCurrentOnly(false);

    if (groupSelectionAction === 'remove') {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupSelectionMode
            ? { ...g, itemIdler: g.itemIdler.filter((id) => !selectedForGroup.has(id)) }
            : g,
        ),
      );
      setGroupSelectionMode(null);
      setSelectedForGroup(new Set());
      setGroupSelectionAction('add');
      setActiveTab('loaded');
      return;
    }

    const newItemIds: string[] = [];

    selectedForGroup.forEach((itemId) => {
      const planEntry = selectedItems.find((si) => si.item.id === itemId);
      if (planEntry) {
        if (!placedIds.has(itemId)) togglePlacement(itemId);
        newItemIds.push(itemId);
      } else {
        const catalogItem = apiItems.find((i) => i.id === itemId);
        if (catalogItem) {
          const color =
            SCENE.COLORS.SKU_PALETTE[
              Object.keys(skuColorMap).length % SCENE.COLORS.SKU_PALETTE.length
            ];
          addManualItem(catalogItem, 1, color);
          setUngroupedIds((prev) => [...prev, itemId]);
          usePlanStore.getState().togglePlacement(itemId);
          newItemIds.push(itemId);
        }
      }
    });

    setGroups((prev) =>
      newItemIds.reduce((acc, itemId) => addItemToGroup(acc, itemId, groupSelectionMode), prev),
    );
    setGroupSelectionMode(null);
    setSelectedForGroup(new Set());
    setActiveTab('loaded');
  }

  function handleRenameGroup(groupId: string, name: string) {
    if (name.trim()) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ad: name.trim() } : g)));
    }
    setEditingGroupId(null);
  }

  const groupOptions: GroupOption[] = groups.map((g) => ({ id: g.id, ad: g.ad, color: g.color }));

  const commonRowProps = (id: string) => {
    const entry = lookupEntry(id);
    if (!entry) return null;
    const isPlaced = placedIds.has(id);
    return {
      storeEntry: entry,
      isPlaced,
      canPlace,
      isExpanded: expandedId === id,
      groups: groupOptions,
      onToggleExpand: () => setExpandedId((prev) => (prev === id ? null : id)),
      onPlace: (qty: number) => {
        if (qty !== entry.quantity) {
          const color = skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
          updateItem(id, entry.item, qty, color);
        }
        const doPlace = () => togglePlacement(id);
        const newGroup = entry.item.stackGroup;
        if (newGroup) {
          const { placements: cur, selectedItems: si } = usePlanStore.getState();
          const curPlacedIds = new Set(cur.map((p) => p.itemId));
          const curPlaced = si.filter((s) => curPlacedIds.has(s.item.id));
          const wouldBe = [...curPlaced, { item: entry.item, quantity: qty }];
          const conflicts = detectContaminationConflicts(wouldBe);
          const newGroupInConflict = conflicts.some(
            (c) => c.groupA === newGroup || c.groupB === newGroup,
          );
          if (newGroupInConflict) {
            const involvedGroups = [...new Set(conflicts.flatMap((c) => [c.groupA, c.groupB]))];
            const groupVolumes = computeGroupVolumes(wouldBe, involvedGroups);
            setPendingPlaceContamination({ pendingAction: doPlace, groupVolumes, conflicts });
            return;
          }
        }
        doPlace();
      },
      onRemove: () => removeItem(id),
      onEdit: readOnly ? undefined : () => navigate(`/products/${id}/edit`),
      onAddToGroup: (groupId: string) => {
        if (!placedIds.has(id)) togglePlacement(id);
        setGroups((prev) => addItemToGroup(prev, id, groupId));
      },
    };
  };

  const activeGroupName = groups.find((g) => g.id === groupSelectionMode)?.ad ?? 'Grup';

  const allGroupItemsSelected =
    groupSelectionItems.length > 0 &&
    groupSelectionItems.every((item) => selectedForGroup.has(item.id));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-border">
        <span className="text-sm text-foreground">
          {readOnly ? `Yüklü Ürünler (${placedIds.size})` : 'Ürünler'}
        </span>
        {!readOnly && (
          <Button
            size="icon"
            title="Ürün Ekle"
            className="h-7 w-7 bg-foreground text-background hover:bg-foreground/80"
            onClick={() => navigate('/products/new')}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Tabs — read-only modda gizle */}
      {!readOnly && (
        <div className="px-2 pt-2 shrink-0">
          <FilterTabs
            className="w-full"
            fullWidth
            tabs={[
              { value: 'unloaded', label: 'Ürün Listesi', count: unloadedCount },
              { value: 'loaded', label: 'Yüklü Ürünler', count: placedIds.size },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'unloaded' | 'loaded')}
          />
        </div>
      )}

      {/* Search + Filter */}
      <div className="px-2 pt-1.5 pb-1 shrink-0 flex items-center gap-1.5">
        <SearchInput size="sm" placeholder="İsim veya SKU ile ara…" onSearch={setSearch} />

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-7 gap-1 px-2 text-xs',
              hasActiveFilters && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeConstraints.size}
              </span>
            )}
            <ChevronDown
              className={cn('w-3 h-3 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kısıt Filtresi
                </p>
                <div className="space-y-2">
                  {CONSTRAINT_FILTER_OPTIONS.map(({ value, label, Icon, className }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={activeConstraints.has(value)}
                        onCheckedChange={() => toggleConstraintFilter(value)}
                      />
                      <Icon className={cn('h-3.5 w-3.5', className)} />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-3 h-auto p-0 text-[11px] text-muted-foreground"
                    onClick={() => setActiveConstraints(new Set())}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
        {itemsLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Ürünler yükleniyor…
          </div>
        )}

        {/* ── Yüklü Ürünler tab content ──────────────────────────────── */}
        {activeTab === 'loaded' && (
          <>
            {/* Grup Oluştur button */}
            {!readOnly && !groupSelectionMode && (
              <button
                onClick={handleAddGroup}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors self-start mb-0.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Grup Oluştur</span>
              </button>
            )}

            {/* Groups */}
            {groups.map((g) => {
              const groupEntries = g.itemIdler
                .map(lookupEntry)
                .filter((e): e is { item: Item; quantity: number } => e !== undefined);
              const hasFilter = search.trim() || activeConstraints.size > 0;
              const filteredGroupEntries = hasFilter
                ? groupEntries.filter((e) => itemMatchesFilters(e.item, search, activeConstraints))
                : groupEntries;
              const groupTotal = groupEntries.length;
              const isFocused =
                focusedGroupItemIds !== null &&
                g.itemIdler.length === focusedGroupItemIds.length &&
                g.itemIdler.every((id) => focusedGroupItemIds.includes(id));

              const groupWeight = groupEntries.reduce(
                (sum, e) => sum + e.item.weight * e.quantity,
                0,
              );
              const groupVolumeCm3 = groupEntries.reduce(
                (sum, e) => sum + e.item.width * e.item.height * e.item.length * e.quantity,
                0,
              );
              const vehicleVolumeCm3 = selectedVehicle
                ? selectedVehicle.width * selectedVehicle.height * selectedVehicle.length
                : 0;
              const volumePct =
                vehicleVolumeCm3 > 0 ? (groupVolumeCm3 / vehicleVolumeCm3) * 100 : 0;

              const isGroupHidden =
                g.itemIdler.length > 0 && g.itemIdler.every((id) => hiddenItemIds.includes(id));

              return (
                <div key={g.id} className="flex flex-col gap-0.5">
                  {/* Group header row */}
                  <TooltipProvider delayDuration={600}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => toggleGroupVisibility(g.itemIdler)}
                          className={cn(
                            'group/grp flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                            isGroupHidden && 'opacity-50',
                            isFocused
                              ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100'
                              : 'hover:bg-accent',
                          )}
                        >
                          {/* Expand — only the arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(g.id);
                            }}
                            className="shrink-0 flex items-center justify-center"
                          >
                            <ChevronRight
                              className={cn(
                                'w-3.5 h-3.5 transition-transform duration-150',
                                isFocused ? 'text-amber-500' : 'text-muted-foreground',
                                g.acik && 'rotate-90',
                              )}
                            />
                          </button>

                          <Layers
                            className="w-4 h-4 shrink-0"
                            style={{ color: isFocused ? '#f59e0b' : g.color }}
                            strokeWidth={2}
                          />

                          {editingGroupId === g.id ? (
                            <input
                              value={editingGroupName}
                              autoFocus
                              className="flex-1 min-w-0 text-sm bg-transparent border-b border-border outline-none text-foreground px-0"
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onBlur={() => handleRenameGroup(g.id, editingGroupName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameGroup(g.id, editingGroupName);
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <span
                                className={cn(
                                  'text-sm flex-1 text-left truncate',
                                  isFocused ? 'text-amber-700 font-medium' : 'text-foreground',
                                )}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroupId(g.id);
                                  setEditingGroupName(g.ad);
                                }}
                              >
                                {g.ad}
                              </span>
                              <div
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroupId(g.id);
                                  setEditingGroupName(g.ad);
                                }}
                                className="shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </div>
                            </>
                          )}

                          <span className="text-xs text-muted-foreground shrink-0">
                            {groupTotal} ürün
                          </span>

                          {/* Add/remove products from group */}
                          {!readOnly && (
                            <>
                              <button
                                title="Gruba Ürün Ekle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartGroupSelection(g.id);
                                }}
                                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                              </button>

                              <button
                                title="Gruptakileri Seç"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartGroupSelection(g.id, {
                                    currentOnly: true,
                                    action: 'remove',
                                  });
                                }}
                                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <PackageMinus className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete group */}
                              <button
                                title="Grubu Sil"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteGroup(g.id);
                                }}
                                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 hover:bg-accent"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </TooltipTrigger>
                      {groupEntries.length > 0 && (
                        <TooltipContent
                          side="right"
                          align="center"
                          className="p-1.5 w-24 space-y-1"
                        >
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Hacim
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-medium tabular-nums">
                                {volumePct.toFixed(1)}%
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {(groupVolumeCm3 / 1_000_000).toFixed(2)} m³
                              </span>
                            </div>
                            <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-foreground/70 rounded-full"
                                style={{ width: `${Math.min(volumePct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Ağırlık
                            </p>
                            <span className="text-xs font-medium tabular-nums">
                              {groupWeight.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg
                            </span>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  {g.acik &&
                    filteredGroupEntries.map((entry) => {
                      const id = entry.item.id;
                      const props = commonRowProps(id);
                      if (!props) return null;
                      return (
                        <StoreItemRow
                          key={id}
                          {...props}
                          indent
                          iconColor={g.color}
                          onToggleVisibility={() => toggleHiddenItem(id)}
                          isHidden={hiddenItemIds.includes(id)}
                          onRemoveFromGroup={() =>
                            setGroups((prev) =>
                              prev.map((grp) =>
                                grp.id === g.id
                                  ? { ...grp, itemIdler: grp.itemIdler.filter((gid) => gid !== id) }
                                  : grp,
                              ),
                            )
                          }
                        />
                      );
                    })}
                </div>
              );
            })}
          </>
        )}

        {/* ── Ürün Listesi tab: group selection mode ──────────────────── */}
        {activeTab === 'unloaded' && groupSelectionMode && (
          <>
            {/* Banner */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg mb-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{activeGroupName}</span> için ürün seçin
              </span>
            </div>

            {groupSelectionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                <Package className="w-5 h-5 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Eklenecek ürün bulunamadı</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {groupSelectionItems.map((item) => (
                  <GroupSelectionRow
                    key={item.id}
                    item={item}
                    isSelected={selectedForGroup.has(item.id)}
                    onToggle={() =>
                      setSelectedForGroup((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Loaded tab: flat item list (no group selection mode) ───── */}
        {!groupSelectionMode && activeTab === 'loaded' && flatDisplayItems.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {shouldVirtualize ? (
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const id = flatDisplayItems[virtualItem.index];
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <StoreItemRow
                        {...props}
                        iconColor={itemIconColorMap[id]}
                        onToggleVisibility={() => toggleHiddenItem(id)}
                        isHidden={hiddenItemIds.includes(id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-px">
                {flatDisplayItems.map((id) => {
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return (
                    <StoreItemRow
                      key={id}
                      {...props}
                      iconColor={itemIconColorMap[id]}
                      onToggleVisibility={() => toggleHiddenItem(id)}
                      isHidden={hiddenItemIds.includes(id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Unloaded tab: grouped by stackGroup ─────────────────────── */}
        {!groupSelectionMode && activeTab === 'unloaded' && groupedUnloadedSections && (
          <>
            {[...groupedUnloadedSections.groupMap.entries()].map(([groupName, refs]) => {
              const isOpen = openStackGroups.has(groupName);
              const renderCatalogRow = (itemId: string) => {
                const catalogItem = apiItems.find((i) => i.id === itemId);
                if (!catalogItem) return null;
                const color =
                  SCENE.COLORS.SKU_PALETTE[
                    Object.keys(usePlanStore.getState().skuColorMap).length %
                      SCENE.COLORS.SKU_PALETTE.length
                  ];
                return (
                  <StoreItemRow
                    key={itemId}
                    storeEntry={{ item: catalogItem, quantity: 1 }}
                    isPlaced={false}
                    canPlace={canPlace}
                    isExpanded={expandedId === itemId}
                    iconColor={itemIconColorMap[itemId]}
                    groups={groupOptions}
                    onToggleExpand={() =>
                      setExpandedId((prev) => (prev === itemId ? null : itemId))
                    }
                    onPlace={(qty) => {
                      addManualItem(catalogItem, qty, color);
                      setUngroupedIds((prev) => [...prev, itemId]);
                    }}
                    onAddToGroup={(groupId) => {
                      addManualItem(catalogItem, 1, color);
                      setUngroupedIds((prev) => [...prev, itemId]);
                      setGroups((prev) => addItemToGroup(prev, itemId, groupId));
                    }}
                    onClearStackGroup={() =>
                      setClearedStackGroups((prev) => {
                        const next = new Set(prev);
                        next.add(itemId);
                        return next;
                      })
                    }
                  />
                );
              };

              return (
                <div key={groupName} className="flex flex-col gap-0.5">
                  <button
                    onClick={() =>
                      setOpenStackGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(groupName)) next.delete(groupName);
                        else next.add(groupName);
                        return next;
                      })
                    }
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors w-full text-left"
                  >
                    <ChevronRight
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
                        isOpen && 'rotate-90',
                      )}
                    />
                    <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-foreground flex-1 truncate">{groupName}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {refs.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-px pl-2">
                      {refs.map((ref) => {
                        if (!ref.isCatalog) {
                          const props = commonRowProps(ref.id);
                          if (!props) return null;
                          return (
                            <StoreItemRow
                              key={ref.id}
                              {...props}
                              iconColor={itemIconColorMap[ref.id]}
                              onClearStackGroup={() =>
                                setClearedStackGroups((prev) => {
                                  const next = new Set(prev);
                                  next.add(ref.id);
                                  return next;
                                })
                              }
                            />
                          );
                        }
                        return renderCatalogRow(ref.id);
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped plan items */}
            {groupedUnloadedSections.noGroupPlan.length > 0 && (
              <div className="flex flex-col gap-px">
                {groupedUnloadedSections.noGroupPlan.map((ref) => {
                  const props = commonRowProps(ref.id);
                  if (!props) return null;
                  return (
                    <StoreItemRow key={ref.id} {...props} iconColor={itemIconColorMap[ref.id]} />
                  );
                })}
              </div>
            )}

            {/* Ungrouped catalog items */}
            {groupedUnloadedSections.noGroupCatalog.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Katalog
                  </span>
                </div>
                {groupedUnloadedSections.noGroupCatalog.map((ref) => {
                  const catalogItem = apiItems.find((i) => i.id === ref.id);
                  if (!catalogItem) return null;
                  const color =
                    SCENE.COLORS.SKU_PALETTE[
                      Object.keys(usePlanStore.getState().skuColorMap).length %
                        SCENE.COLORS.SKU_PALETTE.length
                    ];
                  return (
                    <StoreItemRow
                      key={ref.id}
                      storeEntry={{ item: catalogItem, quantity: 1 }}
                      isPlaced={false}
                      canPlace={canPlace}
                      isExpanded={expandedId === ref.id}
                      iconColor={itemIconColorMap[ref.id]}
                      groups={groupOptions}
                      onToggleExpand={() =>
                        setExpandedId((prev) => (prev === ref.id ? null : ref.id))
                      }
                      onPlace={(qty) => {
                        addManualItem(catalogItem, qty, color);
                        setUngroupedIds((prev) => [...prev, ref.id]);
                      }}
                      onAddToGroup={(groupId) => {
                        addManualItem(catalogItem, 1, color);
                        setUngroupedIds((prev) => [...prev, ref.id]);
                        setGroups((prev) => addItemToGroup(prev, ref.id, groupId));
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* No results */}
        {(search || activeConstraints.size > 0) &&
          !groupSelectionMode &&
          flatDisplayItems.length === 0 &&
          filteredCatalogOnlyItems.length === 0 &&
          !itemsLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
              <Search className="w-5 h-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {search ? `"${search}" için` : 'Seçili kısıt filtresine göre'} sonuç bulunamadı
              </p>
            </div>
          )}
      </div>

      {/* Sticky "Gruba Ekle" panel — shown when in group selection mode */}
      {groupSelectionMode && (
        <div className="shrink-0 border-t border-border px-3 py-2 flex items-center justify-between gap-2 bg-background">
          <span className="text-xs text-muted-foreground shrink-0">
            {selectedForGroup.size} ürün seçildi
          </span>
          <div className="flex items-center gap-2">
            {groupSelectionItems.length > 0 && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (allGroupItemsSelected) {
                          setSelectedForGroup(new Set());
                        } else {
                          setSelectedForGroup(new Set(groupSelectionItems.map((i) => i.id)));
                        }
                      }}
                      className={cn(
                        'w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
                        allGroupItemsSelected
                          ? 'bg-foreground border-foreground'
                          : 'border-border hover:border-muted-foreground',
                      )}
                    >
                      {allGroupItemsSelected && (
                        <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {allGroupItemsSelected ? 'Tüm seçimi kaldır' : 'Tümünü gruba ekle'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <button
              onClick={() => {
                setGroupSelectionMode(null);
                setSelectedForGroup(new Set());
                setGroupSelectionCurrentOnly(false);
                setGroupSelectionAction('add');
                setActiveTab('loaded');
              }}
              className="h-7 text-xs text-muted-foreground hover:text-muted-foreground px-2 transition-colors"
            >
              İptal
            </button>
            <Button
              size="sm"
              disabled={selectedForGroup.size === 0}
              onClick={handleConfirmGroupSelection}
              className="h-7 text-xs bg-foreground text-background hover:bg-foreground/80 disabled:opacity-40"
            >
              {groupSelectionAction === 'remove'
                ? `Gruptan Çıkar (${selectedForGroup.size})`
                : `Gruba Ekle (${selectedForGroup.size})`}
            </Button>
          </div>
        </div>
      )}

      <UnfitItemsPanel
        onFullRemove={(itemId) => {
          removeItem(itemId);
          setGroups((prev) =>
            prev.map((g) => ({ ...g, itemIdler: g.itemIdler.filter((id) => id !== itemId) })),
          );
        }}
      />

      {import.meta.env.DEV && (
        <div className="shrink-0 border-t border-border px-3 py-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => mockPlacements(500)}
            title="500 random kutu enjekte et (yalnızca dev)"
          >
            Stres Testi (500)
          </Button>
          {placements.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setPlacements([])}
              title="Tüm placements'ları temizle"
            >
              Temizle
            </Button>
          )}
        </div>
      )}

      {pendingPlaceContamination && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingPlaceContamination(null);
          }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingPlaceContamination.conflicts.length > 0
                  ? 'Uyumsuz Yük Grupları'
                  : 'Yük Grubu Seçimi'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-4 pt-1">
                  {pendingPlaceContamination.conflicts.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {pendingPlaceContamination.conflicts.map((c, i) => (
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
                    {pendingPlaceContamination.groupVolumes.map((gv) => (
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
                    Bu ürünü eklemek mevcut gruplarla çakışma yaratabilir.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full bg-foreground text-background hover:bg-foreground/80 text-xs h-8"
                onClick={() => {
                  const action = pendingPlaceContamination.pendingAction;
                  setPendingPlaceContamination(null);
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
