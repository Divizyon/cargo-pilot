import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface PositionedBox {
  positionZ: number;
  depth: number;
  itemId: string;
}

/**
 * Ghost mode filtresi — yalnızca layer filtresi: activeLayer > 0 ise,
 * positionZ < activeLayer olan kutular ghost olur.
 *
 * Grup fokus artık ghost etmez; parlaklık farkı renk üzerinden sağlanır.
 */
export function isGhosted(
  box: PositionedBox,
  activeLayer: number,
  _focusedGroupItemIds: string[] | null = null,
): boolean {
  if (activeLayer <= 0) return false;
  return box.positionZ < activeLayer;
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
