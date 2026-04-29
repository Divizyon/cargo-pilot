import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface PositionedBox {
  positionY: number;
  height: number;
}

/**
 * Aktif katman üstünde kalan kutuları filtreler — kutunun TAVANI activeLayer'ı geçiyorsa gizli.
 *
 * AC1 (US-OPT-10): Y eksenindeki "level filter" mantığı.
 * activeLayer = +Infinity (default) → tüm kutular görünür.
 */
export function isAboveActiveLayer(box: PositionedBox, activeLayer: number): boolean {
  if (!Number.isFinite(activeLayer)) return false;
  return box.positionY + box.height > activeLayer;
}

/**
 * Bir placement'ın InstancedMesh'te `scale=0` ile gizlenip gizlenmeyeceğini hesaplar.
 *
 * Gizleme nedenleri:
 *  - hiddenItemIds: kullanıcı SKU bazında gizledi
 *  - selectedInstanceId: glow için BoxWrapper olarak ayrı render edilecek
 *  - selectedItemId: aynı SKU'nun tüm instance'ları glow'a düşer
 *  - activeLayer üstünde kalmak (level filter)
 */
export function isPlacementVisible(
  p: PlacementWithDimensions,
  index: number,
  state: {
    activeLayer: number;
    selectedInstanceId: number | null;
    selectedItemId: string | null;
    hiddenItemIds: readonly string[];
  },
): boolean {
  if (state.hiddenItemIds.includes(p.itemId)) return false;
  if (state.selectedInstanceId === index) return false;
  if (state.selectedInstanceId === null && state.selectedItemId === p.itemId) return false;
  if (isAboveActiveLayer(p, state.activeLayer)) return false;
  return true;
}
