import { create } from 'zustand';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type {
  OptimizationCriteria,
  PlacementWithDimensions,
  UnfitItem,
  UnfitReason,
} from '@/lib/types/loadingPlan';
import { UnfitReason as UnfitReasonConst } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';
import { computeViolations } from '@/lib/utils/geometry';
import {
  rotatedDimensions,
  isOrientationAllowed,
  type OrientationIndex,
} from '@/lib/utils/boxOrientations';
import { applyContainerOverflow, fitsInVehicle } from '@/lib/utils/checkOrientationFit';
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

interface BuildResult {
  placed: PlacementWithDimensions[];
  unfitByReason: Partial<Record<UnfitReason, number>>;
}

function gravityY(
  x: number,
  z: number,
  w: number,
  d: number,
  others: PlacementWithDimensions[],
): number {
  let maxY = 0;
  for (const o of others) {
    const xOv = x < o.positionX + o.width && o.positionX < x + w;
    const zOv = z < o.positionZ + o.depth && o.positionZ < z + d;
    if (xOv && zOv) {
      const top = o.positionY + o.height;
      if (top > maxY) maxY = top;
    }
  }
  return maxY;
}

function maxZInLayer(placements: PlacementWithDimensions[], y: number): number {
  let max = 0;
  for (const p of placements) {
    if (!p.isViolation && p.positionY === y) {
      const zEnd = p.positionZ + p.depth;
      if (zEnd > max) max = zEnd;
    }
  }
  return max;
}

// Bir katmandaki en uzun kutunun üst kenarını döndürür.
// Bu değer yeni katmanın başlangıç Y'si olur — alttaki en büyük kutuya göre.
function maxTopInLayer(placements: PlacementWithDimensions[], y: number): number {
  let max = y;
  for (const p of placements) {
    if (!p.isViolation && p.positionY === y) {
      const top = p.positionY + p.height;
      if (top > max) max = top;
    }
  }
  return max;
}

function buildPlacements(
  item: Item,
  qty: number,
  color: string,
  vehicle: Vehicle,
  existingPlacements: PlacementWithDimensions[],
): BuildResult {
  const w = item.width;
  const h = item.height;
  const d = item.length;

  // Violation'ları hariç tut — cursor hesabı için sadece geçerli yerleşimler
  const valid = existingPlacements.filter((p) => !p.isViolation);

  // En üst katmandan devam et
  const curY_init = valid.length > 0 ? Math.max(...valid.map((p) => p.positionY)) : 0;
  const curZ_init = maxZInLayer(valid, curY_init);

  let curX = 0;
  let curY = curY_init;
  let curZ = curZ_init;
  let rowMaxDepth = d;

  const unfitByReason: Partial<Record<UnfitReason, number>> = {};
  function addUnfit(reason: UnfitReason) {
    unfitByReason[reason] = (unfitByReason[reason] ?? 0) + 1;
  }

  // Mevcut yerleşimlerin toplam ağırlığından başla
  let cumulativeWeight = valid.reduce((sum, p) => sum + p.weight, 0);

  const result: PlacementWithDimensions[] = [];

  for (let i = 0; i < qty; i++) {
    // Ağırlık kontrolü önce — limit aşılırsa geometri denenmez
    if (vehicle.maxCargoWeight > 0 && cumulativeWeight + item.weight > vehicle.maxCargoWeight) {
      addUnfit(UnfitReasonConst.Weight);
      continue;
    }

    // Z overflow → new layer (only if stackable)
    if (curZ + d > vehicle.length) {
      if (!item.isStackable) {
        addUnfit(UnfitReasonConst.Stacking);
        continue;
      }
      const allSoFar = [...valid, ...result.filter((p) => !p.isViolation)];
      const newLayerY = maxTopInLayer(allSoFar, curY);
      if (newLayerY + h > vehicle.height) {
        addUnfit(UnfitReasonConst.Volume);
        continue;
      }
      curY = newLayerY;
      curX = 0;
      curZ = maxZInLayer(allSoFar, curY);
      rowMaxDepth = d;
    }

    rowMaxDepth = Math.max(rowMaxDepth, d);

    const soFar = [...valid, ...result.filter((p) => !p.isViolation)];
    const posY = gravityY(curX, curZ, w, d, soFar);

    if (!fitsInVehicle(curX, posY, curZ, w, h, d, vehicle)) {
      addUnfit(UnfitReasonConst.Volume);
      continue;
    }

    result.push({
      itemId: item.id,
      positionX: curX,
      positionY: posY,
      positionZ: curZ,
      orientationIndex: 0,
      layer: Math.round(posY / h) + 1,
      isViolation: false,
      width: w,
      height: h,
      depth: d,
      weight: item.weight,
      color,
      productType: item.productType,
    });

    cumulativeWeight += item.weight;
    curX += w;
    if (curX + w > vehicle.width) {
      curX = 0;
      curZ += rowMaxDepth;
      rowMaxDepth = d;
    }
  }

  return { placed: result, unfitByReason };
}

function primaryUnfitReason(unfitByReason: Partial<Record<UnfitReason, number>>): UnfitReason {
  if (unfitByReason[UnfitReasonConst.Weight]) return UnfitReasonConst.Weight;
  if (unfitByReason[UnfitReasonConst.Stacking]) return UnfitReasonConst.Stacking;
  return UnfitReasonConst.Volume;
}

function mergeUnfitItem(
  existing: UnfitItem[],
  item: Item,
  unfitByReason: Partial<Record<UnfitReason, number>>,
): UnfitItem[] {
  const total = Object.values(unfitByReason).reduce((s: number, v) => s + (v ?? 0), 0);
  const filtered = existing.filter((u) => u.item.id !== item.id);
  if (total === 0) return filtered;
  return [...filtered, { item, quantity: total, reason: primaryUnfitReason(unfitByReason) }];
}

interface PlanStore {
  selectedVehicle: Vehicle | null;
  selectedVehicles: Array<{ instanceId: string; vehicle: Vehicle }>;
  selectedItems: Array<{ item: Item; quantity: number }>;
  skuColorMap: Record<string, string>;
  criteria: OptimizationCriteria;
  placements: PlacementWithDimensions[];
  unfitItems: UnfitItem[];
  previewItemId: string | null;
  previewPlacements: PlacementWithDimensions[];
  setVehicle: (vehicle: Vehicle | null) => void;
  /** Show vehicle in 3D without adding to selectedVehicles list. */
  peekVehicle: (vehicle: Vehicle) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (instanceId: string) => void;
  setActiveVehicle: (instanceId: string) => void;
  updateVehicle: (instanceId: string, vehicle: Vehicle) => void;
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
  removeUnfitItem: (itemId: string) => void;
  retryUnfitItem: (itemId: string) => void;
  setPreview: (itemId: string, item: Item, qty: number, color: string) => void;
  clearPreview: () => void;
  reset: () => void;
}

function rebuildForVehicle(
  vehicle: Vehicle,
  s: {
    selectedItems: Array<{ item: Item; quantity: number }>;
    placements: PlacementWithDimensions[];
    skuColorMap: Record<string, string>;
  },
): { placements: PlacementWithDimensions[]; unfitItems: UnfitItem[] } | null {
  const placedItemIds = [...new Set(s.placements.map((p) => p.itemId))];
  if (placedItemIds.length === 0) return null;
  let rebuilt: PlacementWithDimensions[] = [];
  let newUnfitItems: UnfitItem[] = [];
  for (const itemId of placedItemIds) {
    const entry = s.selectedItems.find((si) => si.item.id === itemId);
    if (!entry) continue;
    const color = s.skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
    const { placed, unfitByReason } = buildPlacements(
      entry.item,
      entry.quantity,
      color,
      vehicle,
      rebuilt,
    );
    rebuilt = [...rebuilt, ...placed];
    newUnfitItems = mergeUnfitItem(newUnfitItems, entry.item, unfitByReason);
  }
  return { placements: computeViolations(rebuilt), unfitItems: newUnfitItems };
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedVehicles: [],
  selectedItems: [],
  skuColorMap: {},
  criteria: 0,
  placements: [],
  unfitItems: [],
  previewItemId: null,
  previewPlacements: [],

  setVehicle: (vehicle) =>
    set((s) => {
      if (!vehicle)
        return { selectedVehicle: null, selectedVehicles: [], placements: [], unfitItems: [] };
      const instanceId = `${vehicle.id}_${Date.now()}`;
      const entry = { instanceId, vehicle };
      const rebuild = rebuildForVehicle(vehicle, s);
      const base = { selectedVehicle: vehicle, selectedVehicles: [entry] };
      return rebuild ? { ...base, ...rebuild } : base;
    }),

  peekVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  addVehicle: (vehicle) =>
    set((s) => {
      const instanceId = `${vehicle.id}_${Date.now()}`;
      const newEntry = { instanceId, vehicle };
      const newList = [...s.selectedVehicles, newEntry];
      if (!s.selectedVehicle) {
        const rebuild = rebuildForVehicle(vehicle, s);
        return rebuild
          ? { selectedVehicle: vehicle, selectedVehicles: newList, ...rebuild }
          : { selectedVehicle: vehicle, selectedVehicles: newList };
      }
      return { selectedVehicles: newList };
    }),

  removeVehicle: (instanceId) =>
    set((s) => {
      const remaining = s.selectedVehicles.filter((e) => e.instanceId !== instanceId);
      const isFirst = s.selectedVehicles[0]?.instanceId === instanceId;
      if (!isFirst) return { selectedVehicles: remaining };
      const next = remaining[0] ?? null;
      if (!next)
        return { selectedVehicle: null, selectedVehicles: [], placements: [], unfitItems: [] };
      if (next.vehicle.id === s.selectedVehicle?.id) return { selectedVehicles: remaining };
      const rebuild = rebuildForVehicle(next.vehicle, s);
      return rebuild
        ? { selectedVehicle: next.vehicle, selectedVehicles: remaining, ...rebuild }
        : { selectedVehicle: next.vehicle, selectedVehicles: remaining };
    }),

  setActiveVehicle: (instanceId) =>
    set((s) => {
      if (s.selectedVehicles[0]?.instanceId === instanceId) return {};
      const entry = s.selectedVehicles.find((e) => e.instanceId === instanceId);
      if (!entry) return {};
      const reordered = [entry, ...s.selectedVehicles.filter((e) => e.instanceId !== instanceId)];
      if (entry.vehicle.id === s.selectedVehicle?.id) return { selectedVehicles: reordered };
      const rebuild = rebuildForVehicle(entry.vehicle, s);
      return rebuild
        ? { selectedVehicle: entry.vehicle, selectedVehicles: reordered, ...rebuild }
        : { selectedVehicle: entry.vehicle, selectedVehicles: reordered };
    }),

  updateVehicle: (instanceId, vehicle) =>
    set((s) => {
      const updated = s.selectedVehicles.map((e) =>
        e.instanceId === instanceId ? { ...e, vehicle } : e,
      );
      const isFirst = s.selectedVehicles[0]?.instanceId === instanceId;
      if (!isFirst) return { selectedVehicles: updated };
      const rebuild = rebuildForVehicle(vehicle, s);
      return rebuild
        ? { selectedVehicle: vehicle, selectedVehicles: updated, ...rebuild }
        : { selectedVehicle: vehicle, selectedVehicles: updated };
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
      const { placed, unfitByReason } = buildPlacements(
        item,
        qty,
        color,
        s.selectedVehicle,
        s.placements,
      );
      const next = [...s.placements, ...placed];
      return {
        selectedItems: [...s.selectedItems, { item, quantity: qty }],
        skuColorMap: updatedColorMap,
        placements: computeViolations(next),
        unfitItems: mergeUnfitItem(s.unfitItems, item, unfitByReason),
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
      const { placed, unfitByReason } = buildPlacements(
        item,
        qty,
        color,
        s.selectedVehicle,
        otherPlacements,
      );
      const next = [...otherPlacements, ...placed];
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
        unfitItems: mergeUnfitItem(s.unfitItems, item, unfitByReason),
      };
    }),

  removeItem: (itemId) =>
    set((s) => ({
      selectedItems: s.selectedItems.filter((si) => si.item.id !== itemId),
      placements: s.placements.filter((p) => p.itemId !== itemId),
      unfitItems: s.unfitItems.filter((u) => u.item.id !== itemId),
    })),

  togglePlacement: (itemId) =>
    set((s) => {
      const alreadyPlaced = s.placements.some((p) => p.itemId === itemId);
      if (alreadyPlaced) {
        return {
          placements: s.placements.filter((p) => p.itemId !== itemId),
          unfitItems: s.unfitItems.filter((u) => u.item.id !== itemId),
        };
      }
      if (!s.selectedVehicle) return {};
      const entry = s.selectedItems.find((si) => si.item.id === itemId);
      if (!entry) return {};
      const color = s.skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
      const { placed, unfitByReason } = buildPlacements(
        entry.item,
        entry.quantity,
        color,
        s.selectedVehicle,
        s.placements,
      );
      if (placed.length === 0) {
        return { unfitItems: mergeUnfitItem(s.unfitItems, entry.item, unfitByReason) };
      }
      const next = [...s.placements, ...placed];
      return {
        placements: computeViolations(next),
        unfitItems: mergeUnfitItem(s.unfitItems, entry.item, unfitByReason),
      };
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
      const insertIdx = oldIdx < newIdx ? newIdx - 1 : newIdx;
      items.splice(insertIdx, 0, removed);
      return { selectedItems: items };
    }),

  removeUnfitItem: (itemId) =>
    set((s) => ({
      unfitItems: s.unfitItems.filter((u) => u.item.id !== itemId),
    })),

  retryUnfitItem: (itemId) =>
    set((s) => {
      if (!s.selectedVehicle) return {};
      const unfitEntry = s.unfitItems.find((u) => u.item.id === itemId);
      if (!unfitEntry) return {};
      const color = s.skuColorMap[unfitEntry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
      const { placed, unfitByReason } = buildPlacements(
        unfitEntry.item,
        unfitEntry.quantity,
        color,
        s.selectedVehicle,
        s.placements,
      );
      if (placed.length === 0) return {};
      const next = [...s.placements, ...placed];
      return {
        placements: computeViolations(next),
        unfitItems: mergeUnfitItem(s.unfitItems, unfitEntry.item, unfitByReason),
      };
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
          const { placed } = buildPlacements(
            item,
            qty - existing.length,
            color,
            s.selectedVehicle,
            [...others, ...previewBoxes],
          );
          previewBoxes = [...previewBoxes, ...placed];
        }
      } else {
        const { placed } = buildPlacements(item, qty, color, s.selectedVehicle, others);
        previewBoxes = placed;
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
      selectedVehicles: [],
      selectedItems: [],
      skuColorMap: {},
      criteria: 0,
      placements: [],
      unfitItems: [],
      previewItemId: null,
      previewPlacements: [],
    }),
}));
