import * as THREE from 'three';
import type { Item } from '@/lib/types/item';

const HALF_PI = Math.PI / 2;

export type OrientationIndex = 0 | 1 | 2 | 3 | 4 | 5;

interface OrientationDef {
  idx: OrientationIndex;
  label: string;
  euler: readonly [number, number, number];
  // Hangi eksen rotasyonu gerekli — null = identity, kısıt aranmaz.
  // Y rotasyonu 6 face-down preset'inde kullanılmaz; allowRotateY filtrelemez.
  requiredAxis: 'x' | 'z' | null;
}

/**
 * Etiketlerdeki yüz adları kutunun KENDİ yüzleridir, aracın değil:
 * "ön" = kutunun z ekseninde küçük değerdeki yüzü (`allowFaceFront`),
 * "arka" = büyük değerdeki yüzü (`allowFaceBack`). Araç koordinatlarındaki
 * uzak yüz / referans kapı ayrımıyla karıştırılmamalı.
 *
 * Eşleme bugün etkisiz: `allowFace*` alanları her yerde `true` (isOrientationAllowed
 * yoksa true kabul ediyor), yani hiçbir yönelim bu bayrakla elenmiyor. Ürün
 * yüzey kısıtları uygulandığında (F2.1) burası kilit noktası olacak — o yüzden
 * eşleme belirsiz bırakılmadı (denetim S-59).
 */
export const BOX_ORIENTATIONS: readonly OrientationDef[] = [
  { idx: 0, label: 'Alt yüz altta', euler: [0, 0, 0], requiredAxis: null },
  { idx: 1, label: 'Üst yüz altta', euler: [Math.PI, 0, 0], requiredAxis: 'x' },
  { idx: 2, label: 'Ön yüz altta', euler: [HALF_PI, 0, 0], requiredAxis: 'x' },
  { idx: 3, label: 'Arka yüz altta', euler: [-HALF_PI, 0, 0], requiredAxis: 'x' },
  { idx: 4, label: 'Sol yüz altta', euler: [0, 0, HALF_PI], requiredAxis: 'z' },
  { idx: 5, label: 'Sağ yüz altta', euler: [0, 0, -HALF_PI], requiredAxis: 'z' },
] as const;

type RotateConstraints = Pick<Item, 'allowRotateX' | 'allowRotateZ'>;

// allowFace* alanları opsiyonel — mevcut eski item'larda olmayabilir, yoksa true kabul edilir.
type FaceConstraints = {
  allowFaceBottom?: boolean;
  allowFaceTop?: boolean;
  allowFaceFront?: boolean;
  allowFaceBack?: boolean;
  allowFaceLeft?: boolean;
  allowFaceRight?: boolean;
};

const FACE_KEYS: readonly (keyof FaceConstraints)[] = [
  'allowFaceBottom',
  'allowFaceTop',
  'allowFaceFront',
  'allowFaceBack',
  'allowFaceLeft',
  'allowFaceRight',
] as const;

export function isOrientationAllowed(
  item: RotateConstraints & FaceConstraints,
  idx: OrientationIndex,
): boolean {
  const def = BOX_ORIENTATIONS[idx];
  if (def.requiredAxis === 'x' && !item.allowRotateX) return false;
  if (def.requiredAxis === 'z' && !item.allowRotateZ) return false;
  return item[FACE_KEYS[idx]] !== false;
}

const ALL_INDICES: readonly OrientationIndex[] = [0, 1, 2, 3, 4, 5] as const;

export function allowedOrientations(item: RotateConstraints): OrientationIndex[] {
  return ALL_INDICES.filter((idx) => isOrientationAllowed(item, idx));
}

export interface RotatedDimensions {
  width: number;
  height: number;
  length: number;
}

// Rotasyon sonrası kutunun world eksenlerinde kapladığı boyut.
// idx 0,1: değişmez · idx 2,3: H↔L (X rotasyonu) · idx 4,5: W↔H (Z rotasyonu).
export function rotatedDimensions(
  baseWidth: number,
  baseHeight: number,
  baseLength: number,
  idx: OrientationIndex,
): RotatedDimensions {
  switch (idx) {
    case 0:
    case 1:
      return { width: baseWidth, height: baseHeight, length: baseLength };
    case 2:
    case 3:
      return { width: baseWidth, height: baseLength, length: baseHeight };
    case 4:
    case 5:
      return { width: baseHeight, height: baseWidth, length: baseLength };
  }
}

const eulerCache = new THREE.Euler();

// Quaternion'a yaz — useFrame içinde de güvenli, allocation yok.
export function applyOrientationQuaternion(
  target: THREE.Quaternion,
  idx: OrientationIndex,
): THREE.Quaternion {
  const [x, y, z] = BOX_ORIENTATIONS[idx].euler;
  eulerCache.set(x, y, z);
  return target.setFromEuler(eulerCache);
}
