import { useState, useRef, useEffect, useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Flame,
  FolderPlus,
  Layers,
  Loader2,
  Minus,
  Package,
  PackageMinus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { usePlanStore, type UnplacedEntry } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { useItems } from '@/lib/api/useItems';
import { AddItemModal } from './AddItemModal';
import type { Item } from '@/lib/types/item';

// Minimum item count to switch from DnD to virtual list rendering
const VIRTUAL_THRESHOLD = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

function itemMatchesFilters(
  item: Item,
  query: string,
  activeConstraints: ReadonlySet<string>,
): boolean {
  if (
    query &&
    !item.name.toLowerCase().includes(query.toLowerCase()) &&
    !item.sku.toLowerCase().includes(query.toLowerCase())
  )
    return false;
  void activeConstraints;
  return true;
}

// Derive a list of constraints from Item fields
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

// ─── StoreItemRow ─────────────────────────────────────────────────────────────

interface StoreItemRowProps {
  storeEntry: { item: Item; quantity: number };
  isPlaced: boolean;
  canPlace: boolean;
  isExpanded: boolean;
  indent?: boolean;
  onToggleExpand: () => void;
  onPlace: (qty: number) => void;
  onRemove?: () => void;
  onEdit?: () => void;
}

function StoreItemRow({
  storeEntry,
  isPlaced,
  canPlace,
  isExpanded,
  indent = false,
  onToggleExpand,
  onPlace,
  onRemove,
  onEdit,
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
      {/* ── Collapsed header ─────────────────────────────────────────── */}
      <div
        onClick={onToggleExpand}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors',
          isPlaced ? 'bg-zinc-50/80' : 'hover:bg-zinc-50',
          isExpanded && 'bg-zinc-50',
        )}
      >
        <TypeIcon className="w-3.5 h-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />

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

      {/* ── Expanded panel ────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-zinc-50 border-t border-zinc-100 space-y-2">
          {/* Dimensions + weight */}
          <p className="text-[11px] text-zinc-500 tabular-nums">
            {item.width}×{item.height}×{item.length} cm · {item.weight} kg
          </p>

          {/* Constraint icons with hover tooltips */}
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

          {/* Yük grubu */}
          {item.stackGroup?.trim() && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Package className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="text-zinc-400 shrink-0">Yük Grubu</span>
              <span className="text-zinc-700 font-medium truncate">{item.stackGroup}</span>
            </div>
          )}

          {/* Taşıma notu */}
          {item.specialNotes?.trim() && (
            <p className="text-[11px] text-zinc-500 italic leading-snug">{item.specialNotes}</p>
          )}

          {/* Action row */}
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
                    <span className="w-6 text-center text-[11px] tabular-nums text-zinc-700">
                      {localQty}
                    </span>
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
    Array<{ id: string; ad: string; acik: boolean; itemIdler: string[] }>
  >([]);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeConstraints] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'unloaded' | 'loaded'>('unloaded');

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
  const unplacedItems = usePlanStore((s) => s.unplacedItems);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);

  const canPlace = !!selectedVehicle;

  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);

  // Binary "has any placement" — drives tab filter, row visual style, 3D scene actions
  const placedIds = useMemo(() => new Set(placements.map((p) => p.itemId)), [placements]);

  // Reset ungroupedIds when store is fully cleared (e.g. PlanAutoLoader resets on navigate)
  const prevSelectedLenRef = useRef(selectedItems.length);
  useEffect(() => {
    if (prevSelectedLenRef.current > 0 && selectedItems.length === 0 && placements.length === 0) {
      setUngroupedIds([]);
    }
    prevSelectedLenRef.current = selectedItems.length;
  }, [selectedItems.length, placements.length]);

  // Seed ungroupedIds once:
  // • Existing plan (selectedItems pre-populated by PlanAutoLoader): seed from store
  // • New plan (selectedItems empty): seed from catalog API + call initItems
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

  // All known grouped IDs (for DnD context)
  const groupedIds = useMemo(() => new Set(groups.flatMap((g) => g.itemIdler)), [groups]);

  // Catalog items not in the plan at all → shown in "Yüklü Değil" tab only
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

  // Single deduplicated flat list — merges ungroupedIds order with any extras from selectedItems.
  // Explicit deduplication prevents double-rendering regardless of seeding timing.
  const flatDisplayItems = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    // First: items in ungroupedIds order (DnD order)
    for (const id of ungroupedIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (groupedIds.has(id)) continue; // belongs to a group, skip here
      const entry = selectedItems.find((si) => si.item.id === id);
      if (!entry) continue;
      const isPlaced = placedIds.has(id);
      if (activeTab === 'loaded' && !isPlaced) continue;
      if (activeTab === 'unloaded' && isPlaced) continue;
      if (!itemMatchesFilters(entry.item, search, activeConstraints)) continue;
      result.push(id);
    }

    // Then: any selectedItems not yet in ungroupedIds (e.g. just added via addManualItem)
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

  // Virtual list — activated when total flat item count reaches threshold
  const shouldVirtualize = flatDisplayItems.length >= VIRTUAL_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? flatDisplayItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

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

  const commonRowProps = (id: string) => {
    const entry = lookupEntry(id);
    if (!entry) return null;
    const isPlaced = placedIds.has(id);
    return {
      storeEntry: entry,
      isPlaced,
      canPlace,
      isExpanded: expandedId === id,
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
    };
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-800">Ürünler</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Grup Oluştur"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            title="Ürün Ekle"
            className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => setShowItemModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab — Yüklü / Yüklü Değil */}
      <div className="px-2 pt-2 shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unloaded' | 'loaded')}>
          <TabsList className="w-full h-7 bg-zinc-100">
            <TabsTrigger value="unloaded" className="flex-1 text-xs h-5.5">
              Yüklü Değil
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
              Yüklü
              <span className="ml-1 text-[10px] tabular-nums text-zinc-400">
                ({placedIds.size})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="px-2 pt-1.5 pb-1 shrink-0">
        <div className="relative">
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
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
        {itemsLoading && (
          <div className="flex items-center justify-center py-8 text-zinc-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Ürünler yükleniyor…
          </div>
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
          const groupTotal = groupEntries.reduce((s, e) => s + e.quantity, 0);
          const isFocused =
            focusedGroupItemIds !== null &&
            g.itemIdler.length === focusedGroupItemIds.length &&
            g.itemIdler.every((id) => focusedGroupItemIds.includes(id));

          return (
            <div key={g.id} className="flex flex-col gap-0.5">
              <button
                onClick={() => toggleGroup(g.id, g.itemIdler)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors',
                  isFocused
                    ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100'
                    : 'hover:bg-zinc-50',
                )}
              >
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-150',
                    isFocused ? 'text-amber-500' : 'text-zinc-400',
                    g.acik && 'rotate-90',
                  )}
                />
                <Layers
                  className={cn('w-4 h-4', isFocused ? 'text-amber-500' : 'text-zinc-400')}
                  strokeWidth={2}
                />
                <span
                  className={cn(
                    'text-sm flex-1 text-left',
                    isFocused ? 'text-amber-700 font-medium' : 'text-zinc-700',
                  )}
                >
                  {g.ad}
                </span>
                <span className="text-xs text-zinc-400">{groupTotal} kalem</span>
              </button>

              {g.acik &&
                filteredGroupEntries.map((entry) => {
                  const id = entry.item.id;
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return <StoreItemRow key={id} {...props} indent />;
                })}
            </div>
          );
        })}

        {/* Flat item list — single deduplicated source, no section headers */}
        {flatDisplayItems.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {shouldVirtualize ? (
              // Virtual list mode — no DnD (impractical at this scale)
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
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
                      <StoreItemRow {...props} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-px">
                {flatDisplayItems.map((id) => {
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return <StoreItemRow key={id} {...props} />;
                })}
              </div>
            )}
          </div>
        )}

        {/* Katalog — plan'a eklenmemiş tüm ürünler (sadece Yüklü Değil tabında) */}
        {filteredCatalogOnlyItems.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                Katalog
              </span>
            </div>
            {filteredCatalogOnlyItems.map((item) => {
              const color =
                SCENE.COLORS.SKU_PALETTE[
                  Object.keys(usePlanStore.getState().skuColorMap).length %
                    SCENE.COLORS.SKU_PALETTE.length
                ];
              return (
                <StoreItemRow
                  key={item.id}
                  storeEntry={{ item, quantity: 1 }}
                  isPlaced={false}
                  canPlace={canPlace}
                  isExpanded={expandedId === item.id}
                  onToggleExpand={() =>
                    setExpandedId((prev) => (prev === item.id ? null : item.id))
                  }
                  onPlace={(qty) => {
                    addManualItem(item, qty, color);
                    setUngroupedIds((prev) => [...prev, item.id]);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* No results */}
        {(search || activeConstraints.size > 0) &&
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

      {/* Araca sığmayanlar */}
      {unplacedItems.length > 0 && (
        <div className="shrink-0 border-t border-amber-100 bg-amber-50">
          <div className="px-3 py-2 flex items-center gap-1.5">
            <PackageMinus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-700">
              Araçta Yer Bulunamadı (
              {unplacedItems.reduce((s, u: UnplacedEntry) => s + u.quantity, 0)} adet)
            </span>
          </div>
          <div className="px-3 pb-2 flex flex-col gap-1">
            {unplacedItems.map((u: UnplacedEntry) => (
              <div key={u.itemId} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-amber-800 truncate flex-1">{u.name}</span>
                <span className="text-[11px] text-amber-600 shrink-0 tabular-nums">
                  {u.quantity} adet
                </span>
                <span className="text-[10px] text-amber-500 shrink-0">
                  {u.reason === 2 ? 'Ağırlık' : 'Yer yok'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dev-only stres testi (US-OPT-14): InstancedMesh render path FPS ölçümü için. */}
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
