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
 * 2. X-Ray: `peelFromDoorCm > 0` ise, referans kapıdan itibaren o kadar
 *    santimetrelik dilim ghost olur.
 *
 * Grup fokus, X-Ray'den önce değerlendirilir.
 *
 * Soyma yönü kapı tarafındandır (z = length). Eskiden uzak yüzden (z = 0)
 * soyuyordu: kamera kapı tarafında olduğu için kullanıcı zaten gördüğü kutuları
 * yerinde bırakıp arkadakileri siliyordu, yani X-Ray hiçbir şeyi açığa
 * çıkarmıyordu (denetim S-31).
 *
 * `vehicleLength` verilmezse eski (uzak yüzden) davranış korunur; araç bilgisi
 * olmayan çağrı yolları sessizce yanlış yöne dönmesin diye açık parametre.
 */
export function isGhosted(
  box: PositionedBox,
  peelFromDoorCm: number,
  focusedGroupItemIds: string[] | null = null,
  vehicleLength?: number,
): boolean {
  if (focusedGroupItemIds !== null) {
    return !focusedGroupItemIds.includes(box.itemId);
  }
  if (peelFromDoorCm <= 0) return false;
  if (vehicleLength === undefined) return box.positionZ < peelFromDoorCm;

  // Kapıya en yakın dilim önce soyulur: kutunun kapıya bakan yüzü eşiği aşıyorsa.
  return box.positionZ + box.length > vehicleLength - peelFromDoorCm;
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
