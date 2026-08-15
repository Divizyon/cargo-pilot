import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface PositionedBox {
  positionZ: number;
  length: number;
  itemId: string;
}

/**
 * Ghost mode filtresi — iki ayrı koşuldan biri ghost'u tetikler:
 *
 * 1. Grup fokus: focusedGroupItemIds dolu ise, grupta olmayan kutular ghost olur.
 * 2. Layer filtresi: activeLayer > 0 ise, positionZ < activeLayer olan kutular ghost olur.
 *
 * Grup fokus, layer filtresinden önce değerlendirilir.
 */
export function isGhosted(
  box: PositionedBox,
  activeLayer: number,
  focusedGroupItemIds: string[] | null = null,
): boolean {
  if (focusedGroupItemIds !== null) {
    return !focusedGroupItemIds.includes(box.itemId);
  }
  if (activeLayer <= 0) return false;
  return box.positionZ < activeLayer;
}

/**
 * Seçim dim modu — seçim veya grup fokus aktifken seçili olmayan kutular için true döner.
 *
 * Koşullar:
 * 1. selectedInstanceId dolu → sadece o index seçili, diğerleri dim
 * 2. selectedItemId dolu → aynı itemId seçili, diğerleri dim
 * 3. focusedGroupItemIds dolu → gruptaki itemId'ler aktif, dışındakiler dim
 *    (bu durum isGhosted ile çakışır; dim öncelikli — wireframe yerine yarı saydam render)
 */
export function isSelectionDimmed(
  p: PositionedBox,
  index: number,
  state: {
    selectedInstanceId: number | null;
    selectedItemId: string | null;
    focusedGroupItemIds: string[] | null;
  },
): boolean {
  const { selectedInstanceId, selectedItemId, focusedGroupItemIds } = state;

  if (focusedGroupItemIds !== null) {
    return !focusedGroupItemIds.includes(p.itemId);
  }
  if (selectedInstanceId !== null) {
    return selectedInstanceId !== index;
  }
  if (selectedItemId !== null) {
    return p.itemId !== selectedItemId;
  }
  return false;
}

/**
 * Bir placement'ın InstancedMesh'te scale=0 ile tamamen gizlenip gizlenmeyeceğini hesaplar.
 *
 * Gizleme nedenleri:
 *  - hiddenItemIds: kullanıcı SKU bazında gizledi
 *  - selectedInstanceId: glow için BoxWrapper olarak ayrı render edilecek
 *  - selectedItemId: aynı SKU'nun tüm instance'ları glow'a düşer
 *
 * NOT: Ghost mode (activeLayer) burada kontrol edilmez — ghost kutular hâlâ
 * sahneye render edilir, sadece ghost InstancedMesh'e taşınır.
 */
export function isPlacementVisible(
  p: PlacementWithDimensions,
  index: number,
  state: {
    selectedInstanceId: number | null;
    selectedItemId: string | null;
    hiddenItemIds: readonly string[];
  },
): boolean {
  if (state.hiddenItemIds.includes(p.itemId)) return false;
  if (state.selectedInstanceId === index) return false;
  if (state.selectedInstanceId === null && state.selectedItemId === p.itemId) return false;
  return true;
}
