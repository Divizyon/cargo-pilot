import { useState, useRef, useEffect, useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertTriangle,
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { useItems } from '@/lib/api/useItems';
import { AddItemModal } from './AddItemModal';
import { UnfitItemsPanel } from './UnfitItemsPanel';
import type { Item } from '@/lib/types/item';

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

interface ConstraintMeta {
  key: string;
  label: string;
  Icon: ElementType;
  colorClass: string;
}

function getItemConstraints(item: Item): ConstraintMeta[] {
  const list: ConstraintMeta[] = [];
  if (item.fragility === 1)
    list.push({
      key: 'fragile',
      label: 'Kırılgan',
      Icon: AlertTriangle,
      colorClass: 'text-amber-500',
    });
  if (item.fragility >= 2)
    list.push({
      key: 'hazmat',
      label: 'Tehlikeli Madde',
      Icon: Flame,
      colorClass: 'text-rose-500',
    });
  if (!item.isStackable)
    list.push({ key: 'nostack', label: 'Yığılamaz', Icon: Layers, colorClass: 'text-purple-500' });
  if (!item.allowRotateX)
    list.push({
      key: 'noRotX',
      label: 'X ekseni kısıtlı',
      Icon: RotateCcw,
      colorClass: 'text-blue-500',
    });
  if (!item.allowRotateY)
    list.push({
      key: 'noRotY',
      label: 'Y ekseni kısıtlı',
      Icon: RotateCcw,
      colorClass: 'text-blue-500',
    });
  if (!item.allowRotateZ)
    list.push({
      key: 'noRotZ',
      label: 'Z ekseni kısıtlı',
      Icon: RotateCcw,
      colorClass: 'text-blue-500',
    });
  if (item.stackGroup?.trim())
    list.push({
      key: 'group',
      label: `Yük Grubu: ${item.stackGroup}`,
      Icon: Package,
      colorClass: 'text-zinc-400',
    });
  return list;
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
        isSelected ? 'bg-zinc-100 ring-1 ring-zinc-300' : 'hover:bg-zinc-50',
      )}
    >
      <div
        className={cn(
          'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isSelected ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300',
        )}
      >
        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </div>
      <TypeIcon className="w-3.5 h-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
      <span className="flex-1 min-w-0 text-xs text-zinc-800 truncate">{item.name}</span>
      <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">{item.sku}</span>
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
  onPlace: (qty: number) => void;
  onRemove?: () => void;
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
  onPlace,
  onRemove,
  onEdit,
  onAddToGroup,
  onClearStackGroup,
}: StoreItemRowProps) {
  const { item, quantity } = storeEntry;
  const [localQty, setLocalQty] = useState(quantity);
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;
  const constraints = getItemConstraints(item);
  const hasConstraints = constraints.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        indent && 'ml-4',
        isExpanded && 'ring-1 ring-zinc-200',
      )}
    >
      <div
        onClick={onToggleExpand}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors',
          isPlaced ? 'bg-zinc-50/80' : 'hover:bg-zinc-50',
          isExpanded && 'bg-zinc-50',
        )}
      >
        <TypeIcon
          className={cn('w-3.5 h-3.5 shrink-0', !iconColor && 'text-zinc-400')}
          style={iconColor ? { color: iconColor } : undefined}
          strokeWidth={1.5}
        />
        <span className="flex-1 min-w-0 text-xs text-zinc-800 truncate">{item.name}</span>
        <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">{item.sku}</span>
        {onEdit && (
          <button
            title="Düzenle"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'w-3 h-3 shrink-0 text-zinc-300 transition-transform duration-150',
            isExpanded && 'rotate-180',
          )}
        />
      </div>

      {isExpanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-zinc-50 border-t border-zinc-100 space-y-2">
          <p className="text-[11px] text-zinc-500 tabular-nums">
            {item.width}×{item.height}×{item.length} cm · {item.weight} kg
          </p>
          {hasConstraints && (
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1.5">
                {constraints.map((c) => (
                  <Tooltip key={c.key}>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        <c.Icon className={cn('w-3.5 h-3.5', c.colorClass)} strokeWidth={2} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {c.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
          {item.stackGroup?.trim() && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Package className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="text-zinc-400 shrink-0">Yük Grubu</span>
              <span className="text-zinc-700 font-medium truncate">{item.stackGroup}</span>
              {onClearStackGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearStackGroup();
                  }}
                  className="ml-auto shrink-0 text-zinc-300 hover:text-rose-500 transition-colors"
                  title="Yük grubundan çıkar"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {item.specialNotes?.trim() && (
            <p className="text-[11px] text-zinc-500 italic leading-snug">{item.specialNotes}</p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
            {!isPlaced ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400">Adet</span>
                  <div className="flex items-center rounded border border-zinc-200 overflow-hidden ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalQty((v) => Math.max(1, v - 1));
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 transition-colors"
                    >
                      <Minus className="w-2 h-2" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={localQty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1) setLocalQty(v);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 text-center text-[11px] tabular-nums text-zinc-700 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalQty((v) => v + 1);
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 transition-colors"
                    >
                      <Plus className="w-2 h-2" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {groups && groups.length > 0 && onAddToGroup && (
                    <DropdownMenu>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
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
                            <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: g.color }} />
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
                    className="h-6 text-[11px] px-2.5 bg-zinc-900 text-white hover:bg-zinc-700"
                  >
                    Ekle
                  </Button>
                </div>
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                  onToggleExpand();
                }}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-600 transition-colors ml-auto"
              >
                <PackageMinus className="w-3 h-3" />
                Çıkar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PlanLeftPanel ────────────────────────────────────────────────────────────

export function PlanLeftPanel() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<
    Array<{ id: string; ad: string; acik: boolean; itemIdler: string[]; color: string }>
  >([]);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeConstraints, setActiveConstraints] = useState<Set<ConstraintFilter>>(new Set());
  const [activeTab, setActiveTab] = useState<'unloaded' | 'loaded'>('unloaded');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Group management state
  const [groupSelectionMode, setGroupSelectionMode] = useState<string | null>(null);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());

  // stackGroup collapsible state for Ürün Listesi tab
  const [openStackGroups, setOpenStackGroups] = useState<Set<string>>(new Set());
  const [clearedStackGroups, setClearedStackGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const { data: itemsPage, isLoading: itemsLoading } = useItems({ pageSize: 100 });
  const apiItems = useMemo(() => itemsPage?.items ?? [], [itemsPage]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const placements = usePlanStore((s) => s.placements);
  const togglePlacement = usePlanStore((s) => s.togglePlacement);
  const addManualItem = usePlanStore((s) => s.addManualItem);
  const updateItem = usePlanStore((s) => s.updateItem);
  const initItems = usePlanStore((s) => s.initItems);
  const mockPlacements = usePlanStore((s) => s.mockPlacements);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);

  const canPlace = !!selectedVehicle;

  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);

  const placedIds = useMemo(() => new Set(placements.map((p) => p.itemId)), [placements]);

  const prevSelectedLenRef = useRef(selectedItems.length);
  useEffect(() => {
    if (prevSelectedLenRef.current > 0 && selectedItems.length === 0 && placements.length === 0) {
      setUngroupedIds([]);
    }
    prevSelectedLenRef.current = selectedItems.length;
  }, [selectedItems.length, placements.length]);

  useEffect(() => {
    if (ungroupedIds.length > 0) return;
    if (selectedItems.length > 0) {
      setUngroupedIds(selectedItems.map((si) => si.item.id));
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
      (item) =>
        !planIds.has(item.id) &&
        !placedIds.has(item.id) &&
        itemMatchesFilters(item, search, activeConstraints),
    );
  }, [apiItems, selectedItems, placedIds, activeTab, search, activeConstraints]);

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
      if (activeTab === 'unloaded' && isPlaced) continue;
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
      if (activeTab === 'unloaded' && isPlaced) continue;
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
    const planIds = new Set(selectedItems.map((si) => si.item.id));
    const catalogOnly = apiItems.filter(
      (item) => !planIds.has(item.id) && itemMatchesFilters(item, search, activeConstraints),
    );
    const planUnplaced = selectedItems.filter(
      (si) => !placedIds.has(si.item.id) && itemMatchesFilters(si.item, search, activeConstraints),
    );
    return [...planUnplaced.map((si) => si.item), ...catalogOnly];
  }, [groupSelectionMode, selectedItems, apiItems, placedIds, search, activeConstraints]);

  function lookupEntry(id: string) {
    return selectedItems.find((si) => si.item.id === id);
  }

  function toggleGroup(groupId: string, itemIds: string[]) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, acik: !g.acik } : g)));
    const isSameFocus =
      focusedGroupItemIds !== null &&
      focusedGroupItemIds.length === itemIds.length &&
      itemIds.every((id) => focusedGroupItemIds.includes(id));
    setFocusedGroupItemIds(isSameFocus ? null : itemIds);
  }

  function handleAddGroup() {
    const id = `g-${Date.now()}`;
    const num = groups.length + 1;
    const usedColors = groups.map((g) => g.color);
    const available = GROUP_ICON_COLORS.filter((c) => !usedColors.includes(c));
    const pool = available.length > 0 ? available : [...GROUP_ICON_COLORS];
    const color = pool[Math.floor(Math.random() * pool.length)];
    setGroups((prev) => [...prev, { id, ad: `Grup ${num}`, acik: true, itemIdler: [], color }]);
  }

  function handleStartGroupSelection(groupId: string) {
    setGroupSelectionMode(groupId);
    setSelectedForGroup(new Set());
    setActiveTab('unloaded');
  }

  function handleConfirmGroupSelection() {
    if (!groupSelectionMode) return;
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
          newItemIds.push(itemId);
        }
      }
    });

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupSelectionMode
          ? { ...g, itemIdler: [...new Set([...g.itemIdler, ...newItemIds])] }
          : g,
      ),
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
        togglePlacement(id);
      },
      onRemove: () => togglePlacement(id),
      onEdit: () => navigate(`/products/${id}/edit`),
      onAddToGroup: (groupId: string) => {
        if (!placedIds.has(id)) togglePlacement(id);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, itemIdler: [...new Set([...g.itemIdler, id])] } : g,
          ),
        );
      },
    };
  };

  const activeGroupName = groups.find((g) => g.id === groupSelectionMode)?.ad ?? 'Grup';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="text-sm text-zinc-800">Ürünler</span>
        <Button
          size="icon"
          title="Ürün Ekle"
          className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
          onClick={() => setShowItemModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-2 pt-2 shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unloaded' | 'loaded')}>
          <TabsList className="w-full h-7 bg-zinc-100">
            <TabsTrigger value="unloaded" className="flex-1 text-xs h-5.5">
              Ürün Listesi
              <span className="ml-1 text-[10px] tabular-nums text-zinc-400">
                {(() => {
                  const planUnloaded = selectedItems.filter(
                    (si) => !placedIds.has(si.item.id),
                  ).length;
                  const planIds = new Set(selectedItems.map((si) => si.item.id));
                  const catalogOnly = apiItems.filter(
                    (i) => !planIds.has(i.id) && !placedIds.has(i.id),
                  ).length;
                  return `(${planUnloaded + catalogOnly})`;
                })()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="loaded" className="flex-1 text-xs h-5.5">
              Yüklü Ürünler
              <span className="ml-1 text-[10px] tabular-nums text-zinc-400">
                ({placedIds.size})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search + Filter */}
      <div className="px-2 pt-1.5 pb-1 shrink-0 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya SKU ile ara…"
            className="h-7 pl-7 pr-7 text-xs bg-zinc-50 border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

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
          <div className="flex items-center justify-center py-8 text-zinc-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Ürünler yükleniyor…
          </div>
        )}

        {/* ── Yüklü Ürünler tab content ──────────────────────────────── */}
        {activeTab === 'loaded' && (
          <>
            {/* Grup Oluştur button */}
            {!groupSelectionMode && (
              <button
                onClick={handleAddGroup}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors self-start mb-0.5"
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

              return (
                <div key={g.id} className="flex flex-col gap-0.5">
                  {/* Group header row */}
                  <div
                    className={cn(
                      'group/grp flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors',
                      isFocused
                        ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100'
                        : 'hover:bg-zinc-50',
                    )}
                  >
                    {/* Expand toggle + icon + name */}
                    <button
                      onClick={() => toggleGroup(g.id, g.itemIdler)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-transform duration-150',
                          isFocused ? 'text-amber-500' : 'text-zinc-400',
                          g.acik && 'rotate-90',
                        )}
                      />
                      <Layers
                        className="w-4 h-4 shrink-0"
                        style={{ color: isFocused ? '#f59e0b' : g.color }}
                        strokeWidth={2}
                      />
                      {editingGroupId === g.id ? (
                        <input
                          value={editingGroupName}
                          autoFocus
                          className="flex-1 min-w-0 text-sm bg-transparent border-b border-zinc-400 outline-none text-zinc-700 px-0"
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={() => handleRenameGroup(g.id, editingGroupName)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(g.id, editingGroupName);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={cn(
                            'text-sm flex-1 text-left truncate cursor-text',
                            isFocused ? 'text-amber-700 font-medium' : 'text-zinc-700',
                          )}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupId(g.id);
                            setEditingGroupName(g.ad);
                          }}
                        >
                          {g.ad}
                        </span>
                      )}
                    </button>

                    <span className="text-xs text-zinc-400 shrink-0">{groupTotal} kalem</span>

                    {/* Add products to group */}
                    <button
                      title="Gruba Ürün Ekle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartGroupSelection(g.id);
                      }}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {g.acik &&
                    filteredGroupEntries.map((entry) => {
                      const id = entry.item.id;
                      const props = commonRowProps(id);
                      if (!props) return null;
                      return <StoreItemRow key={id} {...props} indent iconColor={g.color} />;
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg mb-1">
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-600 truncate">
                <span className="font-medium">{activeGroupName}</span> için ürün seçin
              </span>
            </div>

            {groupSelectionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                <Package className="w-5 h-5 text-zinc-200" />
                <p className="text-xs text-zinc-400">Eklenecek ürün bulunamadı</p>
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
                      <StoreItemRow {...props} iconColor={itemIconColorMap[id]} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-px">
                {flatDisplayItems.map((id) => {
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return <StoreItemRow key={id} {...props} iconColor={itemIconColorMap[id]} />;
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
                      setGroups((prev) =>
                        prev.map((g) =>
                          g.id === groupId
                            ? { ...g, itemIdler: [...new Set([...g.itemIdler, itemId])] }
                            : g,
                        ),
                      );
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
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors w-full text-left"
                  >
                    <ChevronRight
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
                        isOpen && 'rotate-90',
                      )}
                    />
                    <Package className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    <span className="text-xs text-zinc-700 flex-1 truncate">{groupName}</span>
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
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
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
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
                        setGroups((prev) =>
                          prev.map((g) =>
                            g.id === groupId
                              ? { ...g, itemIdler: [...new Set([...g.itemIdler, ref.id])] }
                              : g,
                          ),
                        );
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
              <Search className="w-5 h-5 text-zinc-200" />
              <p className="text-xs text-zinc-400">
                {search ? `"${search}" için` : 'Seçili kısıt filtresine göre'} sonuç bulunamadı
              </p>
            </div>
          )}
      </div>

      {/* Sticky "Gruba Ekle" panel — shown when in group selection mode */}
      {groupSelectionMode && (
        <div className="shrink-0 border-t border-zinc-100 px-3 py-2 flex items-center justify-between gap-2 bg-white">
          <span className="text-xs text-zinc-500 shrink-0">
            {selectedForGroup.size} ürün seçildi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGroupSelectionMode(null);
                setSelectedForGroup(new Set());
                setActiveTab('loaded');
              }}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-600 px-2 transition-colors"
            >
              İptal
            </button>
            <Button
              size="sm"
              disabled={selectedForGroup.size === 0}
              onClick={handleConfirmGroupSelection}
              className="h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              Gruba Ekle ({selectedForGroup.size})
            </Button>
          </div>
        </div>
      )}

      <UnfitItemsPanel />

      {import.meta.env.DEV && (
        <div className="shrink-0 border-t border-zinc-100 px-3 py-2 flex items-center gap-2">
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
              className="h-7 text-xs text-zinc-500"
              onClick={() => setPlacements([])}
              title="Tüm placements'ları temizle"
            >
              Temizle
            </Button>
          )}
        </div>
      )}

      <AddItemModal open={showItemModal} onOpenChange={setShowItemModal} />
    </div>
  );
}
