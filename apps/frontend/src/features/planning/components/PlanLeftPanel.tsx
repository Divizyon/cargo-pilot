import { useState, useRef, useEffect, type ElementType } from 'react';
import { LevelControls } from '@/features/planning/components/scene/LevelControls';
import {
  AlertTriangle,
  ArrowDownToLine,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  FlipHorizontal,
  FolderPlus,
  GripVertical,
  Layers,
  PackageMinus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { AddItemModal } from './AddItemModal';
import type { Item } from '@/lib/types/item';

// ─── Static group structure (item IDs only) ───────────────────────────────────

const MOCK_IDS = {
  U1: '00000000-0000-0000-0000-000000000001',
  U2: '00000000-0000-0000-0000-000000000002',
  U3: '00000000-0000-0000-0000-000000000003',
  U4: '00000000-0000-0000-0000-000000000004',
  U5: '00000000-0000-0000-0000-000000000005',
  U6: '00000000-0000-0000-0000-000000000006',
} as const;

const INITIAL_GROUPS: Array<{ id: string; ad: string; acik: boolean; itemIdler: string[] }> = [
  { id: 'G1', ad: 'Grup A', acik: true, itemIdler: [MOCK_IDS.U1, MOCK_IDS.U2] },
  { id: 'G2', ad: 'Grup B', acik: false, itemIdler: [MOCK_IDS.U4, MOCK_IDS.U5] },
];

const INITIAL_UNGROUPED = [MOCK_IDS.U3, MOCK_IDS.U6];

// ─── Seed catalog ─────────────────────────────────────────────────────────────

type CatalogEntry = { item: Item; quantity: number; color: string };

const CATALOG_SEED: CatalogEntry[] = [
  {
    item: {
      id: MOCK_IDS.U1,
      name: 'Elektronik Aksam',
      sku: 'SKU-001',
      productType: 'koli',
      width: 80,
      height: 40,
      length: 60,
      weight: 180,
      isStackable: false,
      maxStackCount: 1,
      maxWeightOnTop: null,
      fragility: 1,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: false,
      allowFaceBottom: true,
      allowFaceTop: true,
      allowFaceFront: true,
      allowFaceBack: true,
      allowFaceLeft: false,
      allowFaceRight: false,
    },
    quantity: 18,
    color: '#6366f1',
  },
  {
    item: {
      id: MOCK_IDS.U2,
      name: 'Tekstil Paketleri',
      sku: 'SKU-002',
      productType: 'koli',
      width: 60,
      height: 30,
      length: 40,
      weight: 80,
      isStackable: true,
      maxStackCount: 3,
      maxWeightOnTop: null,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      allowFaceBottom: true,
      allowFaceTop: true,
      allowFaceFront: true,
      allowFaceBack: true,
      allowFaceLeft: true,
      allowFaceRight: true,
    },
    quantity: 24,
    color: '#0ea5e9',
  },
  {
    item: {
      id: MOCK_IDS.U3,
      name: 'Plastik Bileşenler',
      sku: 'SKU-003',
      productType: 'koli',
      width: 100,
      height: 60,
      length: 80,
      weight: 240,
      isStackable: false,
      maxStackCount: 1,
      maxWeightOnTop: null,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: false,
      allowRotateZ: true,
      allowFaceBottom: true,
      allowFaceTop: true,
      allowFaceFront: true,
      allowFaceBack: true,
      allowFaceLeft: true,
      allowFaceRight: true,
    },
    quantity: 12,
    color: '#f59e0b',
  },
  {
    item: {
      id: MOCK_IDS.U4,
      name: 'Metal Profiller',
      sku: 'SKU-004',
      productType: 'palet',
      width: 200,
      height: 10,
      length: 10,
      weight: 550,
      isStackable: false,
      maxStackCount: 1,
      maxWeightOnTop: null,
      fragility: 0,
      allowRotateX: false,
      allowRotateY: true,
      allowRotateZ: false,
      allowFaceBottom: true,
      allowFaceTop: false,
      allowFaceFront: false,
      allowFaceBack: false,
      allowFaceLeft: false,
      allowFaceRight: false,
    },
    quantity: 8,
    color: '#f43f5e',
  },
  {
    item: {
      id: MOCK_IDS.U5,
      name: 'Kimyasal Variller',
      sku: 'SKU-005',
      productType: 'varil',
      width: 60,
      height: 90,
      length: 60,
      weight: 900,
      isStackable: false,
      maxStackCount: 1,
      maxWeightOnTop: null,
      fragility: 2,
      allowRotateX: false,
      allowRotateY: false,
      allowRotateZ: false,
      allowFaceBottom: true,
      allowFaceTop: false,
      allowFaceFront: false,
      allowFaceBack: false,
      allowFaceLeft: false,
      allowFaceRight: false,
    },
    quantity: 6,
    color: '#8b5cf6',
  },
  {
    item: {
      id: MOCK_IDS.U6,
      name: 'Ahşap Kasalar',
      sku: 'SKU-006',
      productType: 'koli',
      width: 80,
      height: 60,
      length: 80,
      weight: 120,
      isStackable: true,
      maxStackCount: 4,
      maxWeightOnTop: null,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      allowFaceBottom: true,
      allowFaceTop: true,
      allowFaceFront: true,
      allowFaceBack: true,
      allowFaceLeft: true,
      allowFaceRight: true,
    },
    quantity: 15,
    color: '#fb923c',
  },
];

// ─── Constraint metadata ──────────────────────────────────────────────────────

const KISIT_META: Record<string, { icon: ElementType; label: string }> = {
  fragile: { icon: AlertTriangle, label: 'Kırılgan' },
  heavy_side: { icon: FlipHorizontal, label: 'Yan Yükleme' },
  bottom_only: { icon: ArrowDownToLine, label: 'Alt Katman' },
  hazmat: { icon: Flame, label: 'Tehlikeli Mad.' },
};

function getConstraints(item: Item): string[] {
  const k: string[] = [];
  if (item.fragility === 1) k.push('fragile');
  if (item.fragility === 2) k.push('hazmat');
  return k;
}

// ─── StoreItemRow ─────────────────────────────────────────────────────────────

interface StoreItemRowProps {
  storeEntry: { item: Item; quantity: number };
  dotColor: string;
  isPlaced: boolean;
  isSelected: boolean;
  isHidden: boolean;
  canPlace: boolean;
  indent?: boolean;
  onTogglePlace: () => void;
  onSelect: () => void;
  onToggleHide: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StoreItemRow({
  storeEntry,
  dotColor,
  isPlaced,
  isSelected,
  isHidden,
  canPlace,
  indent = false,
  onTogglePlace,
  onSelect,
  onToggleHide,
  onEdit,
  onDelete,
}: StoreItemRowProps) {
  const { item, quantity } = storeEntry;
  const kisitlar = getConstraints(item);
  const clickable = isPlaced || canPlace;

  return (
    <div
      title={!canPlace && !isPlaced ? 'Yük eklemek için önce bir konteyner seçin' : undefined}
      className={cn(
        'flex items-start gap-2 px-2 py-2 rounded-lg transition-colors group/item',
        clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
        isSelected
          ? 'bg-amber-50 ring-1 ring-amber-300'
          : isPlaced
            ? 'bg-zinc-50 hover:bg-zinc-100'
            : clickable
              ? 'hover:bg-zinc-50'
              : '',
        indent && 'ml-5',
      )}
      onClick={() => {
        if (!clickable) return;
        onSelect();
        if (!isPlaced) onTogglePlace();
      }}
    >
      <GripVertical
        className="w-3.5 h-3.5 text-zinc-300 group-hover/item:text-zinc-400 shrink-0 cursor-grab mt-0.5"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Color dot + placed indicator */}
      <div className="relative shrink-0 mt-1">
        <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: dotColor }} />
        {isPlaced && (
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-sm truncate',
              isPlaced ? 'text-zinc-900 font-medium' : 'text-zinc-700',
            )}
          >
            {item.name}
          </span>
          <span className="text-xs text-zinc-400 shrink-0">{quantity} adet</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5">
          <span className="font-mono bg-zinc-100 px-1 rounded">{item.sku}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>
            {item.width}×{item.length}×{item.height} cm
          </span>
          <span>·</span>
          <span>{item.weight} kg</span>
        </div>
        {kisitlar.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {kisitlar.map((k) => {
              const meta = KISIT_META[k];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <span
                  key={k}
                  title={meta.label}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px]"
                >
                  <Icon className="w-2.5 h-2.5" />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions — visible on hover (always visible if hidden), stop propagation so row click doesn't fire */}
      <div
        className={cn(
          'flex flex-col items-center gap-0.5 shrink-0 transition-opacity',
          isHidden ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Düzenle"
          onClick={onEdit}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          title="Sil"
          onClick={onDelete}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        {isPlaced && (
          <>
            <button
              title={isHidden ? 'Göster' : 'Gizle'}
              onClick={onToggleHide}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center transition-colors',
                isHidden
                  ? 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100',
              )}
            >
              {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              title="Kamyondan Çıkar"
              onClick={onTogglePlace}
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <PackageMinus className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PlanLeftPanel ────────────────────────────────────────────────────────────

export function PlanLeftPanel() {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>(INITIAL_UNGROUPED);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);
  const placements = usePlanStore((s) => s.placements);
  const removeItem = usePlanStore((s) => s.removeItem);
  const togglePlacement = usePlanStore((s) => s.togglePlacement);
  const initItems = usePlanStore((s) => s.initItems);
  const mockPlacements = usePlanStore((s) => s.mockPlacements);
  const setPlacements = usePlanStore((s) => s.setPlacements);

  const vehicleId = selectedVehicle?.id;
  const canPlace = !!selectedVehicle;

  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const toggleHiddenItem = useSceneStore((s) => s.toggleHiddenItem);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);

  const placedIds = new Set(placements.map((p) => p.itemId));

  // Seed the store once
  useEffect(() => {
    if (selectedItems.length === 0) {
      const colorMap: Record<string, string> = {};
      CATALOG_SEED.forEach(({ item, color }) => {
        colorMap[item.sku] = color;
      });
      initItems(
        CATALOG_SEED.map(({ item, quantity }) => ({ item, quantity })),
        colorMap,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All known grouped IDs
  const groupedIds = new Set(groups.flatMap((g) => g.itemIdler));

  // Items in store not yet assigned to any group or ungrouped list
  const allKnownIds = new Set([...groupedIds, ...ungroupedIds]);
  const extraItems = selectedItems.filter((si) => !allKnownIds.has(si.item.id));

  function lookupEntry(id: string) {
    return selectedItems.find((si) => si.item.id === id);
  }

  function toggleGroup(groupId: string, itemIds: string[]) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, acik: !g.acik } : g)));
    // Aynı grup zaten fokuslanmışsa fokus kaldır, değilse bu grubu fokusla
    const isSameFocus =
      focusedGroupItemIds !== null &&
      focusedGroupItemIds.length === itemIds.length &&
      itemIds.every((id) => focusedGroupItemIds.includes(id));
    setFocusedGroupItemIds(isSameFocus ? null : itemIds);
  }

  function handleDelete(itemId: string) {
    removeItem(itemId);
    setGroups((prev) =>
      prev.map((g) => ({ ...g, itemIdler: g.itemIdler.filter((id) => id !== itemId) })),
    );
    setUngroupedIds((prev) => prev.filter((id) => id !== itemId));
  }

  function openEdit(itemId: string) {
    setEditingItemId(itemId);
    setShowItemModal(true);
  }

  const editingEntry = editingItemId
    ? selectedItems.find((si) => si.item.id === editingItemId)
    : undefined;

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
            onClick={() => {
              setEditingItemId(null);
              setShowItemModal(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable area */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-3 flex flex-col gap-2">
          {/* Groups */}
          {groups.map((g) => {
            const groupEntries = g.itemIdler
              .map(lookupEntry)
              .filter((e): e is { item: Item; quantity: number } => e !== undefined);
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
                    'w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors',
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
                  g.itemIdler.map((id) => {
                    const entry = lookupEntry(id);
                    if (!entry) return null;
                    return (
                      <StoreItemRow
                        key={id}
                        storeEntry={entry}
                        dotColor={skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR}
                        isPlaced={placedIds.has(id)}
                        isSelected={selectedItemId === id}
                        isHidden={hiddenItemIds.includes(id)}
                        canPlace={canPlace}
                        indent
                        onTogglePlace={() => togglePlacement(id)}
                        onSelect={() => setSelectedItemId(selectedItemId === id ? null : id)}
                        onToggleHide={() => toggleHiddenItem(id)}
                        onEdit={() => openEdit(id)}
                        onDelete={() => handleDelete(id)}
                      />
                    );
                  })}
              </div>
            );
          })}

          {/* Ungrouped */}
          {ungroupedIds.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Grupsuz
                </span>
              </div>
              {ungroupedIds.map((id) => {
                const entry = lookupEntry(id);
                if (!entry) return null;
                return (
                  <StoreItemRow
                    key={id}
                    storeEntry={entry}
                    dotColor={skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR}
                    isPlaced={placedIds.has(id)}
                    isSelected={selectedItemId === id}
                    isHidden={hiddenItemIds.includes(id)}
                    canPlace={canPlace}
                    onTogglePlace={() => togglePlacement(id)}
                    onSelect={() => setSelectedItemId(selectedItemId === id ? null : id)}
                    onToggleHide={() => toggleHiddenItem(id)}
                    onEdit={() => openEdit(id)}
                    onDelete={() => handleDelete(id)}
                  />
                );
              })}
            </div>
          )}

          {/* New items added via form (not in any group yet) */}
          {extraItems.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                  Manuel Eklenen
                </span>
              </div>
              {extraItems.map((si) => (
                <StoreItemRow
                  key={si.item.id}
                  storeEntry={si}
                  dotColor={skuColorMap[si.item.sku] ?? SCENE.COLORS.NORMAL_STR}
                  isPlaced={placedIds.has(si.item.id)}
                  isSelected={selectedItemId === si.item.id}
                  isHidden={hiddenItemIds.includes(si.item.id)}
                  canPlace={canPlace}
                  onTogglePlace={() => togglePlacement(si.item.id)}
                  onSelect={() =>
                    setSelectedItemId(selectedItemId === si.item.id ? null : si.item.id)
                  }
                  onToggleHide={() => toggleHiddenItem(si.item.id)}
                  onEdit={() => openEdit(si.item.id)}
                  onDelete={() => handleDelete(si.item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* X-Ray / Derinlik filtresi */}
      <div className="shrink-0 border-t border-zinc-100 px-3 py-2">
        <LevelControls key={vehicleId} />
      </div>

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

      <AddItemModal
        open={showItemModal}
        onOpenChange={(open) => {
          setShowItemModal(open);
          if (!open) setEditingItemId(null);
        }}
        editTarget={
          editingItemId && editingEntry
            ? { itemId: editingItemId, item: editingEntry.item, quantity: editingEntry.quantity }
            : undefined
        }
      />
    </div>
  );
}
