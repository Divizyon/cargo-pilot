import { create } from 'zustand';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type { OptimizationCriteria, PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';
import { computeViolations } from '@/lib/utils/geometry';
import { rotatedDimensions, type OrientationIndex } from '@/lib/utils/boxOrientations';
import { applyContainerOverflow } from '@/lib/utils/checkOrientationFit';

export function assignSkuColor(
  sku: string,
  currentMap: Record<string, string>,
): Record<string, string> {
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
    orientationIndex: 0,
    layer: 1,
    isViolation: false,
    width: item.width,
    height: item.height,
    depth: item.length,
    weight: item.weight,
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
  initItems: (
    items: Array<{ item: Item; quantity: number }>,
    colorMap: Record<string, string>,
  ) => void;
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
  /**
   * Seçili instance için yeni face-down orientation uygular.
   * Effective W/H/L yeniden hesaplanır, violation pipeline tetiklenir.
   */
  setOrientation: (instanceId: number, idx: OrientationIndex) => void;
  /**
   * Dev-only: 500+ kutuyu sahneye enjekte eder (US-OPT-14 stres testi).
   * Optimizasyon algoritmasını bypass eder, sadece render yükü oluşturur.
   * Gereksinim: en az 1 selectedItem ve selectedVehicle olmalı.
   */
  mockPlacements: (count: number) => void;
  updatePlacementPosition: (idx: number, x: number, y: number, z: number) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedItems: [],
  skuColorMap: {},
  criteria: 0,
  placements: [],

  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  initItems: (items, colorMap) => set({ selectedItems: items, skuColorMap: colorMap }),

  addItem: (item, qty) =>
    set((s) => ({
      selectedItems: [...s.selectedItems, { item, quantity: qty }],
    })),

  addManualItem: (item, qty, color) =>
    set((s) => {
      const updatedColorMap = { ...s.skuColorMap, [item.sku]: color };
      const maxZ =
        s.placements.length > 0 ? Math.max(...s.placements.map((p) => p.positionZ + p.depth)) : 0;
      const next = [...s.placements, ...buildPlacements(item, qty, color, maxZ)];
      return {
        selectedItems: [...s.selectedItems, { item, quantity: qty }],
        skuColorMap: updatedColorMap,
        placements: computeViolations(next),
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
      const next = [...otherPlacements, ...buildPlacements(item, qty, color, maxZ)];
      return {
        selectedItems: updatedItems,
        skuColorMap: updatedColorMap,
        placements: computeViolations(next),
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
        s.placements.length > 0 ? Math.max(...s.placements.map((p) => p.positionZ + p.depth)) : 0;
      const next = [...s.placements, ...buildPlacements(entry.item, entry.quantity, color, maxZ)];
      return { placements: computeViolations(next) };
    }),

  setSkuColor: (sku, color) => set((s) => ({ skuColorMap: { ...s.skuColorMap, [sku]: color } })),

  setCriteria: (criteria) => set({ criteria }),
  setPlacements: (placements) => set({ placements: computeViolations(placements) }),

  mockPlacements: (count) =>
    set((s) => {
      const v = s.selectedVehicle;
      const items = s.selectedItems;
      if (!v || items.length === 0) return {};
      const placements: PlacementWithDimensions[] = [];
      for (let i = 0; i < count; i++) {
        const entry = items[i % items.length];
        const item = entry.item;
        const color = s.skuColorMap[item.sku] ?? SCENE.COLORS.NORMAL_STR;
        // Pseudo-random pozisyon — overlap normal, isViolation pipeline yakalar.
        const x = Math.random() * Math.max(0, v.width - item.width);
        const y = Math.random() * Math.max(0, v.height - item.height);
        const z = Math.random() * Math.max(0, v.length - item.length);
        placements.push({
          itemId: item.id,
          positionX: x,
          positionY: y,
          positionZ: z,
          orientationIndex: 0,
          layer: 1,
          isViolation: false,
          width: item.width,
          height: item.height,
          depth: item.length,
          weight: item.weight,
          color,
        });
      }
      return { placements };
    }),

  setOrientation: (instanceId, idx) =>
    set((s) => {
      const target = s.placements[instanceId];
      if (!target) return {};
      // rotatedDimensions involutory: ilk uygulama base'i geri verir, ikincisi yeni effective'i.
      const base = rotatedDimensions(
        target.width,
        target.height,
        target.depth,
        target.orientationIndex,
      );
      const next = rotatedDimensions(base.width, base.height, base.depth, idx);
      const updated: PlacementWithDimensions = {
        ...target,
        orientationIndex: idx,
        width: next.width,
        height: next.height,
        depth: next.depth,
      };
      const placements = s.placements.map((p, i) => (i === instanceId ? updated : p));
      const collisionChecked = computeViolations(placements);
      return { placements: applyContainerOverflow(collisionChecked, s.selectedVehicle) };
    }),

  updatePlacementPosition: (idx, x, y, z) =>
    set((s) => {
      const next = s.placements.map((p, i) =>
        i === idx ? { ...p, positionX: x, positionY: y, positionZ: z } : p,
      );
      return { placements: computeViolations(next) };
    }),

  reset: () =>
    set({ selectedVehicle: null, selectedItems: [], skuColorMap: {}, criteria: 0, placements: [] }),
}));
