import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import {
  BOX_ORIENTATIONS,
  allowedOrientations,
  isOrientationAllowed,
  rotatedDimensions,
} from './boxOrientations';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Kutusu',
    sku: 'SKU-TEST',
    productType: 'koli',
    width: 100,
    height: 50,
    length: 200,
    weight: 10,
    isStackable: true,
    maxStackCount: 5,
    fragility: 0,
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    ...overrides,
  };
}

describe('BOX_ORIENTATIONS', () => {
  it('6 face-down sabiti tanımlanmış', () => {
    expect(BOX_ORIENTATIONS).toHaveLength(6);
  });

  it('idx 0 identity Euler taşır', () => {
    expect(BOX_ORIENTATIONS[0].euler).toEqual([0, 0, 0]);
  });

  it('X rotasyonu gerektiren orientation set: 1, 2, 3', () => {
    const xAxisIndices = BOX_ORIENTATIONS.filter((o) => o.requiredAxis === 'x').map((o) => o.idx);
    expect(xAxisIndices).toEqual([1, 2, 3]);
  });

  it('Z rotasyonu gerektiren orientation set: 4, 5', () => {
    const zAxisIndices = BOX_ORIENTATIONS.filter((o) => o.requiredAxis === 'z').map((o) => o.idx);
    expect(zAxisIndices).toEqual([4, 5]);
  });
});

describe('rotatedDimensions', () => {
  const W = 100;
  const H = 50;
  const L = 200;

  it('idx 0: base dims aynı kalır', () => {
    expect(rotatedDimensions(W, H, L, 0)).toEqual({ width: W, height: H, length: L });
  });

  it('idx 1: 180° X dönüşü dims aynı bırakır', () => {
    expect(rotatedDimensions(W, H, L, 1)).toEqual({ width: W, height: H, length: L });
  });

  it('idx 2: ön yüz altta — height ile length takas', () => {
    expect(rotatedDimensions(W, H, L, 2)).toEqual({ width: W, height: L, length: H });
  });

  it('idx 3: arka yüz altta — height ile length takas', () => {
    expect(rotatedDimensions(W, H, L, 3)).toEqual({ width: W, height: L, length: H });
  });

  it('idx 4: sol yüz altta — width ile height takas', () => {
    expect(rotatedDimensions(W, H, L, 4)).toEqual({ width: H, height: W, length: L });
  });

  it('idx 5: sağ yüz altta — width ile height takas', () => {
    expect(rotatedDimensions(W, H, L, 5)).toEqual({ width: H, height: W, length: L });
  });
});

describe('isOrientationAllowed', () => {
  it('idx 0 her kısıt setinde izinli', () => {
    const item = makeItem({ allowRotateX: false, allowRotateZ: false });
    expect(isOrientationAllowed(item, 0)).toBe(true);
  });

  it('allowRotateX=false iken X rotasyonu gereken indexler reddedilir', () => {
    const item = makeItem({ allowRotateX: false });
    expect(isOrientationAllowed(item, 1)).toBe(false);
    expect(isOrientationAllowed(item, 2)).toBe(false);
    expect(isOrientationAllowed(item, 3)).toBe(false);
  });

  it('allowRotateZ=false iken Z rotasyonu gereken indexler reddedilir', () => {
    const item = makeItem({ allowRotateZ: false });
    expect(isOrientationAllowed(item, 4)).toBe(false);
    expect(isOrientationAllowed(item, 5)).toBe(false);
  });

  it('allowRotateY kısıtı 6 face-down preset için filtre uygulamaz', () => {
    const item = makeItem({ allowRotateY: false });
    for (let idx = 0; idx < 6; idx++) {
      expect(isOrientationAllowed(item, idx as 0 | 1 | 2 | 3 | 4 | 5)).toBe(true);
    }
  });

  it.each([
    [0, 'allowFaceBottom'],
    [1, 'allowFaceTop'],
    [2, 'allowFaceFront'],
    [3, 'allowFaceBack'],
    [4, 'allowFaceLeft'],
    [5, 'allowFaceRight'],
  ] as const)('idx %i → %s=false o orientation için reddeder', (idx, faceKey) => {
    const item = makeItem({ [faceKey]: false });
    expect(isOrientationAllowed(item, idx)).toBe(false);
  });

  it('allowFace*=false diğer indexleri etkilemez', () => {
    const item = makeItem({ allowFaceTop: false });
    expect(isOrientationAllowed(item, 0)).toBe(true);
    expect(isOrientationAllowed(item, 2)).toBe(true);
    expect(isOrientationAllowed(item, 3)).toBe(true);
    expect(isOrientationAllowed(item, 4)).toBe(true);
    expect(isOrientationAllowed(item, 5)).toBe(true);
  });

  it('eksen izinli olsa da yüz kısıtı reddederse orientation izinsizdir', () => {
    const item = makeItem({ allowRotateX: true, allowFaceFront: false });
    expect(isOrientationAllowed(item, 2)).toBe(false);
  });

  it('yüz izinli olsa da eksen kısıtı reddederse orientation izinsizdir', () => {
    const item = makeItem({ allowRotateX: false, allowFaceFront: true });
    expect(isOrientationAllowed(item, 2)).toBe(false);
  });
});

describe('allowedOrientations', () => {
  it('hepsi açıkken 6 index döner', () => {
    expect(allowedOrientations(makeItem())).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('allowRotateX=false → sadece 0, 4, 5', () => {
    expect(allowedOrientations(makeItem({ allowRotateX: false }))).toEqual([0, 4, 5]);
  });

  it('allowRotateZ=false → sadece 0, 1, 2, 3', () => {
    expect(allowedOrientations(makeItem({ allowRotateZ: false }))).toEqual([0, 1, 2, 3]);
  });

  it('hepsi kapalı → sadece identity (idx 0)', () => {
    const item = makeItem({ allowRotateX: false, allowRotateZ: false });
    expect(allowedOrientations(item)).toEqual([0]);
  });

  it('allowFaceTop=false → idx 1 hariç tüm eksen-izinli set döner', () => {
    const item = makeItem({ allowFaceTop: false });
    expect(allowedOrientations(item)).toEqual([0, 2, 3, 4, 5]);
  });

  it('allowRotateX=false + allowFaceLeft=false birlikte → sadece 0, 5', () => {
    const item = makeItem({ allowRotateX: false, allowFaceLeft: false });
    expect(allowedOrientations(item)).toEqual([0, 5]);
  });
});
