import { useState, useRef, useEffect, type ElementType } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Box,
  ChevronRight,
  Cylinder,
  Eye,
  EyeOff,
  Flame,
  FlipHorizontal,
  FolderPlus,
  Layers,
  Loader2,
  Package,
  PackageMinus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { useItems } from '@/lib/api/useItems';
import { AddItemModal } from './AddItemModal';
import type { Item } from '@/lib/types/item';

// ─── Constraint metadata ──────────────────────────────────────────────────────

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

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
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;

  return (
    <div
      title={!canPlace && !isPlaced ? 'Yük eklemek için önce bir konteyner seçin' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group/item',
        clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
        isSelected
          ? 'bg-zinc-900 text-white'
          : isPlaced
            ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
            : clickable
              ? 'hover:bg-zinc-50 text-zinc-700'
              : '',
        indent && 'ml-5',
      )}
      onClick={() => {
        if (!clickable) return;
        onSelect();
        if (!isPlaced) onTogglePlace();
      }}
    >
      {/* Tip ikonu */}
      <TypeIcon
        className={cn('w-4 h-4 shrink-0', isSelected ? 'text-white' : 'text-zinc-400')}
        strokeWidth={1.5}
      />

      <div className="flex-1 min-w-0">
        {/* Satır 1: isim + adet */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              isSelected ? 'text-white' : isPlaced ? 'text-zinc-900 font-medium' : 'text-zinc-700',
            )}
          >
            {item.name}
          </span>
          <span
            className={cn(
              'text-[10px] shrink-0 tabular-nums',
              isSelected ? 'text-zinc-300' : 'text-zinc-400',
            )}
          >
            {quantity} adet
          </span>
        </div>
        {/* Satır 2: boyut · ağırlık · kısıt ikonları */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10px] mt-0.5',
            isSelected ? 'text-zinc-300' : 'text-zinc-400',
          )}
        >
          <span className="tabular-nums">
            {item.width}×{item.length}×{item.height} cm
          </span>
          <span>·</span>
          <span className="tabular-nums">{item.weight} kg</span>
          {kisitlar.map((k) => {
            const meta = KISIT_META[k];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <span
                key={k}
                title={meta.label}
                className={cn(
                  'inline-flex items-center px-1 py-px rounded',
                  isSelected ? 'bg-white/10 text-zinc-300' : 'bg-zinc-100 text-zinc-500',
                )}
              >
                <Icon className="w-2.5 h-2.5" />
              </span>
            );
          })}
        </div>
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
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center transition-colors',
            isSelected
              ? 'text-zinc-300 hover:text-white hover:bg-white/10'
              : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
          )}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          title="Sil"
          onClick={onDelete}
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center transition-colors',
            isSelected
              ? 'text-zinc-300 hover:text-white hover:bg-white/10'
              : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50',
          )}
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
                isSelected
                  ? 'text-zinc-300 hover:text-white hover:bg-white/10'
                  : isHidden
                    ? 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100',
              )}
            >
              {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              title="Kamyondan Çıkar"
              onClick={onTogglePlace}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center transition-colors',
                isSelected
                  ? 'text-zinc-300 hover:text-white hover:bg-white/10'
                  : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50',
              )}
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
  const [groups, setGroups] = useState<
    Array<{ id: string; ad: string; acik: boolean; itemIdler: string[] }>
  >([]);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const { data: itemsPage, isLoading: itemsLoading } = useItems({ pageSize: 100 });
  const apiItems = itemsPage?.items ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const placements = usePlanStore((s) => s.placements);
  const removeItem = usePlanStore((s) => s.removeItem);
  const togglePlacement = usePlanStore((s) => s.togglePlacement);
  const initItems = usePlanStore((s) => s.initItems);
  const mockPlacements = usePlanStore((s) => s.mockPlacements);
  const setPlacements = usePlanStore((s) => s.setPlacements);

  const canPlace = !!selectedVehicle;

  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const toggleHiddenItem = useSceneStore((s) => s.toggleHiddenItem);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);

  const placedIds = new Set(placements.map((p) => p.itemId));

  // Seed the store from API data
  useEffect(() => {
    if (apiItems.length > 0 && selectedItems.length === 0) {
      const colorMap: Record<string, string> = {};
      apiItems.forEach((item, i) => {
        colorMap[item.sku] = SCENE.COLORS.SKU_PALETTE[i % SCENE.COLORS.SKU_PALETTE.length];
      });
      initItems(
        apiItems.map((item) => ({ item, quantity: 1 })),
        colorMap,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUngroupedIds(apiItems.map((item) => item.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiItems]);

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
                g.itemIdler.map((id) => {
                  const entry = lookupEntry(id);
                  if (!entry) return null;
                  return (
                    <StoreItemRow
                      key={id}
                      storeEntry={entry}
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
            <div className="flex items-center gap-2 px-3 py-1.5">
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
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                Manuel Eklenen
              </span>
            </div>
            {extraItems.map((si) => (
              <StoreItemRow
                key={si.item.id}
                storeEntry={si}
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
