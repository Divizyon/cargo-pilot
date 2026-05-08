import { create } from 'zustand';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type { OptimizationCriteria, PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';
import { computeViolations } from '@/lib/utils/geometry';
import {
  rotatedDimensions,
  isOrientationAllowed,
  type OrientationIndex,
} from '@/lib/utils/boxOrientations';
import { applyContainerOverflow } from '@/lib/utils/checkOrientationFit';
import { useUIStore } from '@/lib/store/useUIStore';

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

function applySurfaceViolations(
  placements: PlacementWithDimensions[],
  items: Array<{ item: Item; quantity: number }>,
): { result: PlacementWithDimensions[]; violatingNames: string[] } {
  const violatingNames: string[] = [];
  const result = placements.map((p) => {
    const entry = items.find((si) => si.item.id === p.itemId);
    if (!entry) return p;
    if (!isOrientationAllowed(entry.item, p.orientationIndex as OrientationIndex)) {
      if (!p.isViolation) violatingNames.push(entry.item.name);
      return { ...p, isViolation: true };
    }
    return p;
  });
  return { result, violatingNames };
}

function buildPlacements(
  item: Item,
  qty: number,
  color: string,
  vehicle: Vehicle,
  existingPlacements: PlacementWithDimensions[],
): PlacementWithDimensions[] {
  const w = item.width;
  const h = item.height;
  const d = item.length;

  // Start cursor after the last occupied Z in existing placements
  let curX = 0;
  let curY = 0;
  let curZ =
    existingPlacements.length > 0
      ? Math.max(...existingPlacements.map((p) => p.positionZ + p.depth))
      : 0;
  let rowMaxDepth = d;

  const result: PlacementWithDimensions[] = [];

  for (let i = 0; i < qty; i++) {
    // X overflow → wrap to next row
    if (curX + w > vehicle.width) {
      curX = 0;
      curZ += rowMaxDepth;
      rowMaxDepth = d;
    }

    // Z overflow → new layer (only if stackable)
    if (curZ + d > vehicle.length) {
      if (!item.isStackable || curY + h * 2 > vehicle.height) {
        // No space left: mark remaining as violations placed at origin
        result.push({
          itemId: item.id,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          orientationIndex: 0,
          layer: 1,
          isViolation: true,
          width: w,
          height: h,
          depth: d,
          weight: item.weight,
          color,
        });
        continue;
      }
      curY += h;
      curX = 0;
      curZ = 0;
      rowMaxDepth = d;
    }

    rowMaxDepth = Math.max(rowMaxDepth, d);

    result.push({
      itemId: item.id,
      positionX: curX,
      positionY: curY,
      positionZ: curZ,
      orientationIndex: 0,
      layer: Math.round(curY / h) + 1,
      isViolation: false,
      width: w,
      height: h,
      depth: d,
      weight: item.weight,
      color,
    });

    curX += w;
  }

  return result;
}

interface PlanStore {
  selectedVehicle: Vehicle | null;
  selectedItems: Array<{ item: Item; quantity: number }>;
  skuColorMap: Record<string, string>;
  criteria: OptimizationCriteria;
  placements: PlacementWithDimensions[];
  previewItemId: string | null;
  previewPlacements: PlacementWithDimensions[];
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
  reorderItems: (activeId: string, overId: string) => void;
  setPreview: (itemId: string, item: Item, qty: number, color: string) => void;
  clearPreview: () => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedItems: [],
  skuColorMap: {},
  criteria: 0,
  placements: [],
  previewItemId: null,
  previewPlacements: [],

  setVehicle: (vehicle) =>
    set((s) => {
      if (!vehicle) return { selectedVehicle: null, placements: [] };
      // Araç değişince tüm placed item'ları yeni araç boyutlarına göre yeniden yerleştir
      const placedItemIds = [...new Set(s.placements.map((p) => p.itemId))];
      if (placedItemIds.length === 0) return { selectedVehicle: vehicle };
      let rebuilt: PlacementWithDimensions[] = [];
      for (const itemId of placedItemIds) {
        const entry = s.selectedItems.find((si) => si.item.id === itemId);
        if (!entry) continue;
        const color = s.skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
        rebuilt = [
          ...rebuilt,
          ...buildPlacements(entry.item, entry.quantity, color, vehicle, rebuilt),
        ];
      }
      return { selectedVehicle: vehicle, placements: computeViolations(rebuilt) };
    }),

  initItems: (items, colorMap) => set({ selectedItems: items, skuColorMap: colorMap }),

  addItem: (item, qty) =>
    set((s) => ({
      selectedItems: [...s.selectedItems, { item, quantity: qty }],
    })),

  addManualItem: (item, qty, color) =>
    set((s) => {
      if (!s.selectedVehicle)
        return { selectedItems: [...s.selectedItems, { item, quantity: qty }] };
      const updatedColorMap = { ...s.skuColorMap, [item.sku]: color };
      const newBoxes = buildPlacements(item, qty, color, s.selectedVehicle, s.placements);
      const overflowCount = newBoxes.filter((p) => p.isViolation).length;
      if (overflowCount > 0) {
        const fitsCount = qty - overflowCount;
        useUIStore.getState().addNotification({
          variant: 'warning',
          message:
            fitsCount > 0
              ? `${item.name}: ${fitsCount} adet yerleştirildi, ${overflowCount} adet araca sığmadı.`
              : `${item.name}: ${qty} adet araca sığmadı.`,
        });
      }
      const next = [...s.placements, ...newBoxes];
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

      if (!hasExistingPlacements || !s.selectedVehicle) {
        return { selectedItems: updatedItems, skuColorMap: updatedColorMap };
      }

      const otherPlacements = s.placements.filter((p) => p.itemId !== itemId);
      const newBoxes = buildPlacements(item, qty, color, s.selectedVehicle, otherPlacements);
      const next = [...otherPlacements, ...newBoxes];
      const withCollisions = computeViolations(next);
      const { result: withSurface, violatingNames } = applySurfaceViolations(
        withCollisions,
        updatedItems,
      );
      if (violatingNames.length > 0) {
        useUIStore.getState().addNotification({
          variant: 'warning',
          message: `${violatingNames[0]} için yüzey kısıtı ihlali: izin verilmeyen yüzey üzerinde.`,
        });
      }
      return {
        selectedItems: updatedItems,
        skuColorMap: updatedColorMap,
        placements: withSurface,
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
      if (!s.selectedVehicle) return {};
      const entry = s.selectedItems.find((si) => si.item.id === itemId);
      if (!entry) return {};
      const color = s.skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
      const newBoxes = buildPlacements(
        entry.item,
        entry.quantity,
        color,
        s.selectedVehicle,
        s.placements,
      );
      const next = [...s.placements, ...newBoxes];
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

  reorderItems: (activeId, overId) =>
    set((s) => {
      const items = [...s.selectedItems];
      const oldIdx = items.findIndex((si) => si.item.id === activeId);
      const newIdx = items.findIndex((si) => si.item.id === overId);
      if (oldIdx === -1 || newIdx === -1) return {};
      const [removed] = items.splice(oldIdx, 1);
      items.splice(newIdx, 0, removed);
      return { selectedItems: items };
    }),

  setPreview: (itemId, item, qty, color) =>
    set((s) => {
      if (!s.selectedVehicle) return {};
      const existing = s.placements.filter((p) => p.itemId === itemId);
      const others = s.placements.filter((p) => p.itemId !== itemId);

      let previewBoxes: PlacementWithDimensions[];
      if (existing.length > 0) {
        // Editing: keep current positions, just update dimensions/color
        previewBoxes = existing.slice(0, qty).map((p) => ({
          ...p,
          width: item.width,
          height: item.height,
          depth: item.length,
          weight: item.weight,
          color,
        }));
        // If qty increased, append extra boxes after existing ones
        if (qty > existing.length) {
          previewBoxes = [
            ...previewBoxes,
            ...buildPlacements(item, qty - existing.length, color, s.selectedVehicle, [
              ...others,
              ...previewBoxes,
            ]),
          ];
        }
      } else {
        previewBoxes = buildPlacements(item, qty, color, s.selectedVehicle, others);
      }

      const allChecked = computeViolations([...others, ...previewBoxes]);
      return {
        previewItemId: itemId,
        previewPlacements: allChecked.filter((p) => p.itemId === itemId),
      };
    }),

  clearPreview: () => set({ previewItemId: null, previewPlacements: [] }),

  reset: () =>
    set({
      selectedVehicle: null,
      selectedItems: [],
      skuColorMap: {},
      criteria: 0,
      placements: [],
      previewItemId: null,
      previewPlacements: [],
    }),
}));
