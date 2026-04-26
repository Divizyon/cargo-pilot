import { create } from 'zustand';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type { OptimizationCriteria, PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';

export function assignSkuColor(sku: string, currentMap: Record<string, string>): Record<string, string> {
  if (currentMap[sku]) return currentMap;
  const palette = SCENE.COLORS.SKU_PALETTE;
  const usedColors = new Set(Object.values(currentMap));
  const nextColor =
    palette.find((c) => !usedColors.has(c)) ??
    palette[Object.keys(currentMap).length % palette.length];
  return { ...currentMap, [sku]: nextColor };
}

function buildPlacements(
  item: Item,
  qty: number,
  color: string,
  startZ: number,
): PlacementWithDimensions[] {
  return Array.from({ length: qty }, (_, i) => ({
    itemId: item.id,
    positionX: 0,
    positionY: 0,
    positionZ: startZ + i * item.length,
    rotation: 0,
    layer: 1,
    isViolation: false,
    width: item.width,
    height: item.height,
    depth: item.length,
    color,
  }));
}

interface PlanStore {
  selectedVehicle: Vehicle | null;
  selectedItems: Array<{ item: Item; quantity: number }>;
  skuColorMap: Record<string, string>;
  criteria: OptimizationCriteria;
  placements: PlacementWithDimensions[];
  setVehicle: (vehicle: Vehicle | null) => void;
  /** Seed the catalog without touching placements (called once on panel mount). */
  initItems: (items: Array<{ item: Item; quantity: number }>, colorMap: Record<string, string>) => void;
  addItem: (item: Item, qty: number) => void;
  /** Add item AND create placements in the 3-D scene. */
  addManualItem: (item: Item, qty: number, color: string) => void;
  /**
   * Edit an item.
   * - If the item already has placements → recreate them with new dimensions/qty.
   * - If not (catalog-only item) → update info only.
   */
  updateItem: (itemId: string, item: Item, qty: number, color: string) => void;
  removeItem: (itemId: string) => void;
  /**
   * Toggle placement for a catalog item.
   * Not placed → creates placements (box appears in 3D).
   * Already placed → removes placements (box removed from 3D).
   */
  togglePlacement: (itemId: string) => void;
  setSkuColor: (sku: string, color: string) => void;
  setCriteria: (c: OptimizationCriteria) => void;
  setPlacements: (placements: PlacementWithDimensions[]) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedItems: [],
  skuColorMap: {},
  criteria: 0,
  placements: [],

  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  initItems: (items, colorMap) =>
    set({ selectedItems: items, skuColorMap: colorMap }),

  addItem: (item, qty) =>
    set((s) => ({
      selectedItems: [...s.selectedItems, { item, quantity: qty }],
    })),

  addManualItem: (item, qty, color) =>
    set((s) => {
      const updatedColorMap = { ...s.skuColorMap, [item.sku]: color };
      const maxZ =
        s.placements.length > 0
          ? Math.max(...s.placements.map((p) => p.positionZ + p.depth))
          : 0;
      return {
        selectedItems: [...s.selectedItems, { item, quantity: qty }],
        skuColorMap: updatedColorMap,
        placements: [...s.placements, ...buildPlacements(item, qty, color, maxZ)],
      };
    }),

  updateItem: (itemId, item, qty, color) =>
    set((s) => {
      const updatedColorMap = { ...s.skuColorMap, [item.sku]: color };
      const hasExistingPlacements = s.placements.some((p) => p.itemId === itemId);

      const updatedItems = s.selectedItems.map((si) =>
        si.item.id === itemId ? { item, quantity: qty } : si,
      );

      if (!hasExistingPlacements) {
        return { selectedItems: updatedItems, skuColorMap: updatedColorMap };
      }

      const otherPlacements = s.placements.filter((p) => p.itemId !== itemId);
      const maxZ =
        otherPlacements.length > 0
          ? Math.max(...otherPlacements.map((p) => p.positionZ + p.depth))
          : 0;
      return {
        selectedItems: updatedItems,
        skuColorMap: updatedColorMap,
        placements: [...otherPlacements, ...buildPlacements(item, qty, color, maxZ)],
      };
    }),

  removeItem: (itemId) =>
    set((s) => ({
      selectedItems: s.selectedItems.filter((si) => si.item.id !== itemId),
      placements: s.placements.filter((p) => p.itemId !== itemId),
    })),

  togglePlacement: (itemId) =>
    set((s) => {
      const alreadyPlaced = s.placements.some((p) => p.itemId === itemId);
      if (alreadyPlaced) {
        return { placements: s.placements.filter((p) => p.itemId !== itemId) };
      }
      const entry = s.selectedItems.find((si) => si.item.id === itemId);
      if (!entry) return {};
      const color = s.skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
      const maxZ =
        s.placements.length > 0
          ? Math.max(...s.placements.map((p) => p.positionZ + p.depth))
          : 0;
      return {
        placements: [...s.placements, ...buildPlacements(entry.item, entry.quantity, color, maxZ)],
      };
    }),

  setSkuColor: (sku, color) =>
    set((s) => ({ skuColorMap: { ...s.skuColorMap, [sku]: color } })),

  setCriteria: (criteria) => set({ criteria }),
  setPlacements: (placements) => set({ placements }),
  reset: () =>
    set({ selectedVehicle: null, selectedItems: [], skuColorMap: {}, criteria: 0, placements: [] }),
}));
