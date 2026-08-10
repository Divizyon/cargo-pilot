import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DoorDirection } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/vehicles/schemas/vehicleSchema';
import {
  LOADING_TYPE_FROM_INT,
  resolveLoadingType,
  buildCreateVehiclePayload,
  fromApiVehicle,
  type VehicleApi,
} from './vehicleMappers';

function makeApiVehicle(overrides: Partial<VehicleApi> = {}): VehicleApi {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    vehicleName: 'Test Aracı',
    vehicleType: 0,
    internalLength: 1000,
    internalWidth: 240,
    internalHeight: 260,
    maxWeightCapacity: 24000,
    isFavorite: false,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function makeFormValues(overrides: Partial<VehicleFormValues> = {}): VehicleFormValues {
  return {
    vehicleType: 'Tir',
    name: 'Test Aracı',
    length: 1000,
    width: 240,
    height: 260,
    maxCargoWeight: 24000,
    doorDirection: 'rear',
    isActive: true,
    ...overrides,
  } as VehicleFormValues;
}

describe('LOADING_TYPE_FROM_INT — backend LoadingType enum ile hizalama', () => {
  it('Rear=0 → { direction: rear }', () => {
    expect(LOADING_TYPE_FROM_INT[0]).toEqual({ direction: DoorDirection.Rear });
  });

  it('SideRight=1 → { direction: side, doorSide: right }', () => {
    expect(LOADING_TYPE_FROM_INT[1]).toEqual({
      direction: DoorDirection.Side,
      doorSide: 'right',
    });
  });

  it('SideLeft=2 → { direction: side, doorSide: left }', () => {
    expect(LOADING_TYPE_FROM_INT[2]).toEqual({
      direction: DoorDirection.Side,
      doorSide: 'left',
    });
  });

  it('SideBoth=3 → { direction: side }, doorSide belirsiz bırakılır', () => {
    expect(LOADING_TYPE_FROM_INT[3]).toEqual({ direction: DoorDirection.Side });
    expect(LOADING_TYPE_FROM_INT[3].doorSide).toBeUndefined();
  });

  it('Top=4 → { direction: top }', () => {
    expect(LOADING_TYPE_FROM_INT[4]).toEqual({ direction: DoorDirection.Top });
  });
});

describe('resolveLoadingType', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('null/undefined için undefined döner, uyarı basmaz', () => {
    expect(resolveLoadingType(null)).toBeUndefined();
    expect(resolveLoadingType(undefined)).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('bilinmeyen int için undefined döner ve konsola uyarı basar (sessizce yutmaz)', () => {
    expect(resolveLoadingType(99)).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('99');
  });

  it('geçerli int için uyarı basmadan doğru eşlemeyi döner', () => {
    expect(resolveLoadingType(2)).toEqual({ direction: DoorDirection.Side, doorSide: 'left' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('fromApiVehicle — backend loadingType int → Vehicle.doorDirection/doorSide', () => {
  it.each([
    [0, DoorDirection.Rear, undefined],
    [1, DoorDirection.Side, 'right'],
    [2, DoorDirection.Side, 'left'],
    [3, DoorDirection.Side, undefined],
    [4, DoorDirection.Top, undefined],
  ] as const)('loadingType=%i → direction=%s doorSide=%s', (loadingType, direction, doorSide) => {
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType }));
    expect(vehicle.doorDirection).toBe(direction);
    expect(vehicle.doorSide).toBe(doorSide);
  });

  it('bilinmeyen loadingType için Front varsayılanına düşer', () => {
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType: 42 }));
    expect(vehicle.doorDirection).toBe(DoorDirection.Front);
    expect(vehicle.doorSide).toBeUndefined();
  });

  it('loadingType null için Front varsayılanına düşer', () => {
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType: null }));
    expect(vehicle.doorDirection).toBe(DoorDirection.Front);
  });
});

describe('buildCreateVehiclePayload — frontend DoorDirection → backend loadingType int', () => {
  it('rear → 0', () => {
    const payload = buildCreateVehiclePayload(makeFormValues({ doorDirection: 'rear' }));
    expect(payload.loadingType).toBe(0);
  });

  it('side + doorSide=right → 1 (SideRight)', () => {
    const payload = buildCreateVehiclePayload(
      makeFormValues({ doorDirection: 'side', doorSide: 'right' }),
    );
    expect(payload.loadingType).toBe(1);
  });

  it('side + doorSide=left → 2 (SideLeft)', () => {
    const payload = buildCreateVehiclePayload(
      makeFormValues({ doorDirection: 'side', doorSide: 'left' }),
    );
    expect(payload.loadingType).toBe(2);
  });

  it('side + doorSide belirtilmemiş → 1 (SideRight varsayılanı)', () => {
    const payload = buildCreateVehiclePayload(makeFormValues({ doorDirection: 'side' }));
    expect(payload.loadingType).toBe(1);
  });

  it('top → 4', () => {
    const payload = buildCreateVehiclePayload(makeFormValues({ doorDirection: 'top' }));
    expect(payload.loadingType).toBe(4);
  });

  it.each([0, 1, 2, 4] as const)(
    'round-trip: backend int %i → frontend değerler → tekrar aynı backend int',
    (loadingType) => {
      const vehicle = fromApiVehicle(makeApiVehicle({ loadingType }));
      const payload = buildCreateVehiclePayload(
        makeFormValues({ doorDirection: vehicle.doorDirection, doorSide: vehicle.doorSide }),
      );
      expect(payload.loadingType).toBe(loadingType);
    },
  );

  it('SideBoth=3 round-trip: doorSide belirsiz kaldığı için SideRight (1) olarak geri döner (bilinçli basitleştirme)', () => {
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType: 3 }));
    const payload = buildCreateVehiclePayload(
      makeFormValues({ doorDirection: vehicle.doorDirection, doorSide: vehicle.doorSide }),
    );
    expect(payload.loadingType).toBe(1);
  });
});
