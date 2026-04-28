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

export const BOX_ORIENTATIONS: readonly OrientationDef[] = [
  { idx: 0, label: 'Alt yüz altta', euler: [0, 0, 0], requiredAxis: null },
  { idx: 1, label: 'Üst yüz altta', euler: [Math.PI, 0, 0], requiredAxis: 'x' },
  { idx: 2, label: 'Ön yüz altta', euler: [HALF_PI, 0, 0], requiredAxis: 'x' },
  { idx: 3, label: 'Arka yüz altta', euler: [-HALF_PI, 0, 0], requiredAxis: 'x' },
  { idx: 4, label: 'Sol yüz altta', euler: [0, 0, HALF_PI], requiredAxis: 'z' },
  { idx: 5, label: 'Sağ yüz altta', euler: [0, 0, -HALF_PI], requiredAxis: 'z' },
] as const;

const ALL_INDICES: readonly OrientationIndex[] = [0, 1, 2, 3, 4, 5] as const;

type RotateConstraints = Pick<Item, 'allowRotateX' | 'allowRotateZ'>;

export function isOrientationAllowed(item: RotateConstraints, idx: OrientationIndex): boolean {
  const def = BOX_ORIENTATIONS[idx];
  if (def.requiredAxis === null) return true;
  if (def.requiredAxis === 'x') return item.allowRotateX;
  return item.allowRotateZ;
}

export function allowedOrientations(item: RotateConstraints): OrientationIndex[] {
  return ALL_INDICES.filter((idx) => isOrientationAllowed(item, idx));
}

export interface RotatedDimensions {
  width: number;
  height: number;
  depth: number;
}

// Rotasyon sonrası kutunun world eksenlerinde kapladığı boyut.
// idx 0,1: değişmez · idx 2,3: H↔L (X rotasyonu) · idx 4,5: W↔H (Z rotasyonu).
export function rotatedDimensions(
  baseWidth: number,
  baseHeight: number,
  baseDepth: number,
  idx: OrientationIndex,
): RotatedDimensions {
  switch (idx) {
    case 0:
    case 1:
      return { width: baseWidth, height: baseHeight, depth: baseDepth };
    case 2:
    case 3:
      return { width: baseWidth, height: baseDepth, depth: baseHeight };
    case 4:
    case 5:
      return { width: baseHeight, height: baseWidth, depth: baseDepth };
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
