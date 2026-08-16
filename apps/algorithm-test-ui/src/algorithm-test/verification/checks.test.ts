import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import { OptimizationCriteria, type Placement } from '@/lib/types/loadingPlan';
import { DoorFace, DoorType, type Vehicle } from '@/lib/types/vehicle';
import {
  checkBounds,
  checkCogMismatch,
  checkConservation,
  checkFragility,
  checkLifoVertical,
  checkLifoZone,
  checkLoadingCorner,
  checkOverlap,
  checkRotation,
  checkStackCount,
  checkStackable,
  checkSupport,
  checkTotalWeight,
  checkWeightOnTop,
} from './checks';
import type { CheckInput } from './types';

/**
 * Denetleyiciler sentetik yerleşim listeleriyle sınanır — motorun gerçek bir
 * ihlal üretmesini beklemek yerine. Amaç motoru değil denetleyiciyi doğrulamak;
 * motora uyumluluk ayrıca goldenCrossCheck.test.ts'te sınanıyor.
 */

const vehicle: Vehicle = {
  id: '00000000-0000-0000-0000-0000000000v1',
  name: 'Test Aracı',
  width: 100,
  height: 100,
  length: 300,
  maxCargoWeight: 1000,
  doors: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
};

function box(overrides: Partial<Placement> = {}): Placement {
  return {
    itemId: 'a',
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    width: 10,
    height: 10,
    length: 10,
    rotation: 0,
    isViolation: false,
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'a',
    name: 'Ürün',
    sku: 'SKU',
    width: 10,
    height: 10,
    length: 10,
    weight: 10,
    isStackable: true,
    maxStackCount: 0,
    maxWeightOnTop: null,
    fragility: 0,
    allowedRotations: 0,
    stackGroup: null,
    incompatibleGroups: [],
    ...overrides,
  };
}

function input(overrides: Partial<CheckInput> = {}): CheckInput {
  return {
    placements: [],
    vehicle,
    criteria: OptimizationCriteria.VolumeFirst,
    zones: [],
    itemsById: new Map([['a', item()]]),
    unloadingOrderByItemId: new Map(),
    backendCog: null,
    backendBalanceOffsetX: null,
    backendBalanceOffsetZ: null,
    requestedCount: 0,
    unplacedCount: null,
    backendPlacedQuantity: null,
    ...overrides,
  };
}

describe('checkConservation', () => {
  it('istenen adet bilinmiyorsa atlanır', () => {
    expect(checkConservation(input({ requestedCount: 0 })).status).toBe('skipped');
  });

  it('yerleşemeyen adedi bildirilmemişse atlanır', () => {
    const result = checkConservation(input({ requestedCount: 3, unplacedCount: null }));
    expect(result.status).toBe('skipped');
  });

  it('istenen = yerleşen + yerleşemeyen ise geçer', () => {
    const result = checkConservation(
      input({ placements: [box(), box({ positionY: 10 })], requestedCount: 3, unplacedCount: 1 }),
    );
    expect(result.status).toBe('pass');
  });

  it('sessizce düşen kutuyu yakalar', () => {
    const result = checkConservation(
      input({ placements: [box()], requestedCount: 5, unplacedCount: 1 }),
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('3 kutu kayboldu');
  });

  it('beklenenden fazla dönen yerleşimi yakalar', () => {
    const result = checkConservation(
      input({ placements: [box(), box({ positionY: 10 })], requestedCount: 1, unplacedCount: 0 }),
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('fazladan döndü');
  });

  it('metrik ile yerleşim satırı sayısı ayrışırsa başarısız olur', () => {
    const result = checkConservation(
      input({
        placements: [box()],
        requestedCount: 1,
        unplacedCount: 0,
        backendPlacedQuantity: 7,
      }),
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('7 yerleşti diyor');
  });

  // İhlal tek bir kutuya ait değil; canvas'ta boyanacak indeks olmamalı.
  it('başarısızlıkta yerleşim indeksi işaretlemez', () => {
    const result = checkConservation(
      input({ placements: [box()], requestedCount: 5, unplacedCount: 1 }),
    );
    expect(result.failedPlacementIndices).toEqual([]);
  });
});

describe('checkBounds', () => {
  it('araç içinde kalan kutuyu geçirir', () => {
    const result = checkBounds(input({ placements: [box(), box({ positionZ: 290 })] }));
    expect(result.status).toBe('pass');
  });

  it('araç boyunu aşan kutuyu yakalar', () => {
    const result = checkBounds(input({ placements: [box(), box({ positionZ: 295 })] }));
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([1]);
  });

  it('araç yoksa atlanır', () => {
    expect(checkBounds(input({ vehicle: null })).status).toBe('skipped');
  });
});

describe('checkOverlap', () => {
  it('yüzey teması çakışma sayılmaz', () => {
    const result = checkOverlap(input({ placements: [box(), box({ positionX: 10 })] }));
    expect(result.status).toBe('pass');
  });

  it('iç içe geçen iki kutuyu da işaretler', () => {
    const result = checkOverlap(input({ placements: [box(), box({ positionX: 5 })] }));
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([0, 1]);
  });
});

describe('checkSupport', () => {
  it('zemindeki kutu her zaman desteklidir', () => {
    expect(checkSupport(input({ placements: [box()] })).status).toBe('pass');
  });

  it('tam üstüne oturan kutuyu geçirir', () => {
    const result = checkSupport(input({ placements: [box(), box({ positionY: 10 })] }));
    expect(result.status).toBe('pass');
  });

  it('havada duran kutuyu yakalar', () => {
    const result = checkSupport(input({ placements: [box(), box({ positionY: 50 })] }));
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([1]);
  });

  it('%80 eşiğinin altındaki kısmi desteği yakalar', () => {
    // Alttaki kutuyla yalnızca yarısı örtüşüyor → %50 destek.
    const result = checkSupport(input({ placements: [box(), box({ positionY: 10, positionX: 5 })] }));
    expect(result.status).toBe('fail');
  });
});

describe('checkStackable', () => {
  it('istiflenemez ürün yoksa atlanır', () => {
    const result = checkStackable(input({ placements: [box(), box({ positionY: 10 })] }));
    expect(result.status).toBe('skipped');
  });

  it('istiflenemez kutunun üstündeki kutuyu yakalar', () => {
    const result = checkStackable(
      input({
        placements: [box(), box({ positionY: 10 })],
        itemsById: new Map([['a', item({ isStackable: false })]]),
      }),
    );
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([1]);
  });
});

describe('checkStackCount', () => {
  it('sınır yoksa atlanır', () => {
    expect(checkStackCount(input({ placements: [box()] })).status).toBe('skipped');
  });

  it('sınırı aşan istifi yakalar', () => {
    const result = checkStackCount(
      input({
        placements: [box(), box({ positionY: 10 }), box({ positionY: 20 })],
        itemsById: new Map([['a', item({ maxStackCount: 1 })]]),
      }),
    );
    expect(result.status).toBe('fail');
    // En alttaki kutunun üstünde 2 kutu var, sınır 1.
    expect(result.failedPlacementIndices).toContain(0);
  });

  it('sınıra tam oturan istifi geçirir', () => {
    const result = checkStackCount(
      input({
        placements: [box(), box({ positionY: 10 })],
        itemsById: new Map([['a', item({ maxStackCount: 1 })]]),
      }),
    );
    expect(result.status).toBe('pass');
  });
});

describe('checkWeightOnTop', () => {
  it('sınır yoksa atlanır', () => {
    expect(checkWeightOnTop(input({ placements: [box()] })).status).toBe('skipped');
  });

  it('üst ağırlık sınırını aşan istifi yakalar', () => {
    const result = checkWeightOnTop(
      input({
        placements: [box(), box({ positionY: 10 }), box({ positionY: 20 })],
        itemsById: new Map([['a', item({ maxWeightOnTop: 15, weight: 10 })]]),
      }),
    );
    expect(result.status).toBe('fail');
  });
});

describe('checkFragility', () => {
  it('kırılgan ürün yoksa atlanır', () => {
    expect(checkFragility(input({ placements: [box()] })).status).toBe('skipped');
  });

  it('kırılgan kutunun üstündeki yükü yakalar', () => {
    const result = checkFragility(
      input({
        placements: [box(), box({ positionY: 10 })],
        itemsById: new Map([['a', item({ fragility: 1 })]]),
      }),
    );
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([0]);
  });

  it('kırılgan kutunun kendisi istiflenebilir — kural tek yönlü', () => {
    const result = checkFragility(
      input({
        placements: [box({ itemId: 'b' }), box({ itemId: 'a', positionY: 10 })],
        itemsById: new Map([
          ['a', item({ fragility: 1 })],
          ['b', item({ id: 'b' })],
        ]),
      }),
    );
    expect(result.status).toBe('pass');
  });
});

describe('checkRotation', () => {
  it('tüm rotasyonlar serbestse atlanır', () => {
    expect(checkRotation(input({ placements: [box({ rotation: 4 })] })).status).toBe('skipped');
  });

  it('Fixed üründe NoRotation dışı rotasyonu yakalar', () => {
    const result = checkRotation(
      input({
        placements: [box({ rotation: 1 })],
        itemsById: new Map([['a', item({ allowedRotations: 2 })]]),
      }),
    );
    expect(result.status).toBe('fail');
  });

  it('PitchOnly üründe Pitch rotasyonunu geçirir', () => {
    const result = checkRotation(
      input({
        placements: [box({ rotation: 2 })],
        itemsById: new Map([['a', item({ allowedRotations: 4 })]]),
      }),
    );
    expect(result.status).toBe('pass');
  });
});

describe('checkLifoVertical', () => {
  const twoOrders = new Map([
    ['a', 1],
    ['b', 2],
  ]);

  it('LIFO dışı kriterde atlanır', () => {
    const result = checkLifoVertical(
      input({ placements: [box()], unloadingOrderByItemId: twoOrders }),
    );
    expect(result.status).toBe('skipped');
  });

  it('tek boşaltma sırasında atlanır', () => {
    const result = checkLifoVertical(
      input({
        placements: [box()],
        criteria: OptimizationCriteria.Lifo,
        unloadingOrderByItemId: new Map([['a', 1]]),
      }),
    );
    expect(result.status).toBe('skipped');
  });

  it('geç inenin erken inenin üstüne konmasını yakalar', () => {
    const result = checkLifoVertical(
      input({
        placements: [box({ itemId: 'a' }), box({ itemId: 'b', positionY: 10 })],
        criteria: OptimizationCriteria.Lifo,
        unloadingOrderByItemId: twoOrders,
      }),
    );
    expect(result.status).toBe('fail');
    expect(result.failedPlacementIndices).toEqual([1]);
  });

  it('erken inenin geç inenin üstünde olması serbesttir', () => {
    const result = checkLifoVertical(
      input({
        placements: [box({ itemId: 'b' }), box({ itemId: 'a', positionY: 10 })],
        criteria: OptimizationCriteria.Lifo,
        unloadingOrderByItemId: twoOrders,
      }),
    );
    expect(result.status).toBe('pass');
  });
});

describe('checkTotalWeight', () => {
  it('kapasite içindeki yükü geçirir', () => {
    expect(checkTotalWeight(input({ placements: [box(), box()] })).status).toBe('pass');
  });

  it('kapasiteyi aşan yükü yakalar', () => {
    const result = checkTotalWeight(
      input({
        placements: Array.from({ length: 5 }, () => box()),
        itemsById: new Map([['a', item({ weight: 500 })]]),
      }),
    );
    expect(result.status).toBe('fail');
  });

  it('ürün kaydı eksikse atlanır', () => {
    const result = checkTotalWeight(input({ placements: [box({ itemId: 'yok' })] }));
    expect(result.status).toBe('skipped');
  });
});

describe('checkCogMismatch', () => {
  const placements = [box(), box({ positionX: 10 })];
  // İki eşit ağırlıklı 10³ kutu: merkezler x=5 ve x=15 → cogX=10, cogY=cogZ=5.
  const trueCog = { x: 10, y: 5, z: 5 };

  it('backend CoG yoksa atlanır', () => {
    expect(checkCogMismatch(input({ placements })).status).toBe('skipped');
  });

  it('uyuşan CoG değerini geçirir', () => {
    const result = checkCogMismatch(input({ placements, backendCog: trueCog }));
    expect(result.status).toBe('pass');
  });

  it('sapan CoG değerini yakalar', () => {
    const result = checkCogMismatch(
      input({ placements, backendCog: { ...trueCog, x: trueCog.x + 5 } }),
    );
    expect(result.status).toBe('fail');
  });
});

describe('checkLifoZone', () => {
  const zones = [
    { unloadingOrder: 1, zStart: 0, zEnd: 150 },
    { unloadingOrder: 2, zStart: 150, zEnd: 300 },
  ];

  it('bölge yoksa atlanır', () => {
    expect(checkLifoZone(input({ placements: [box()] })).status).toBe('skipped');
  });

  it('kendi bölgesinde duran kutuyu geçirir', () => {
    const result = checkLifoZone(
      input({
        placements: [box({ positionZ: 10 })],
        zones,
        unloadingOrderByItemId: new Map([['a', 1]]),
      }),
    );
    expect(result.status).toBe('pass');
  });

  it('bölge dışına taşmayı yumuşak kural olarak raporlar', () => {
    const result = checkLifoZone(
      input({
        placements: [box({ positionZ: 145 })],
        zones,
        unloadingOrderByItemId: new Map([['a', 1]]),
      }),
    );
    expect(result.status).toBe('fail');
    // Motor bölge dışına çıkmayı yasaklamaz, skor cezasıyla caydırır.
    expect(result.severity).toBe('soft');
  });
});

describe('checkLoadingCorner', () => {
  const SIDE_LEFT = { type: DoorType.Big, face: DoorFace.ZeroX } as const;
  const SIDE_RIGHT = { type: DoorType.Big, face: DoorFace.WidthX } as const;
  const REAR = { type: DoorType.Small, face: DoorFace.LengthZ } as const;

  function withDoors(doors: Vehicle['doors'], placements: Placement[]): CheckInput {
    return input({ vehicle: { ...vehicle, doors }, placements });
  }

  it('yan kapı yokken x = 0 duvarına dayanan kutu yeterli', () => {
    const result = checkLoadingCorner(withDoors([REAR], [box({ positionX: 0 })]));
    expect(result.status).toBe('pass');
  });

  it('yan kapı x = 0 iken yükleme karşı duvardan başlamalı', () => {
    // Araç 100 geniş, kutu 10 geniş → sağ kenar 90 + 10 = 100.
    const dogru = checkLoadingCorner(withDoors([REAR, SIDE_LEFT], [box({ positionX: 90 })]));
    expect(dogru.status).toBe('pass');

    const yanlis = checkLoadingCorner(withDoors([REAR, SIDE_LEFT], [box({ positionX: 0 })]));
    expect(yanlis.status).toBe('fail');
    expect(yanlis.severity).toBe('hard');
  });

  it('yan kapı x = width iken yükleme origin köşesinden başlamalı', () => {
    expect(checkLoadingCorner(withDoors([REAR, SIDE_RIGHT], [box({ positionX: 0 })])).status).toBe(
      'pass',
    );
    expect(checkLoadingCorner(withDoors([REAR, SIDE_RIGHT], [box({ positionX: 90 })])).status).toBe(
      'fail',
    );
  });

  it('karşı tarafa da kutu konması ihlal değil — ölçülen başlangıç ucudur', () => {
    const result = checkLoadingCorner(
      withDoors([REAR, SIDE_LEFT], [box({ positionX: 90 }), box({ positionX: 0 })]),
    );
    expect(result.status).toBe('pass');
  });

  it('yerleşim yoksa atlanır, sahte geçer vermez', () => {
    expect(checkLoadingCorner(withDoors([REAR], [])).status).toBe('skipped');
  });
});
