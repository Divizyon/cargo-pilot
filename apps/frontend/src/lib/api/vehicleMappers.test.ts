import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DoorType, DoorFace, type VehicleDoor } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/vehicles/schemas/vehicleSchema';
import {
  doorsFromLoadingType,
  resolveDoors,
  loadingTypeFromDoors,
  buildCreateVehiclePayload,
  fromApiVehicle,
  type VehicleApi,
} from './vehicleMappers';

const REAR: VehicleDoor = { type: DoorType.Small, face: DoorFace.LengthZ };
const SIDE_RIGHT: VehicleDoor = { type: DoorType.Big, face: DoorFace.WidthX };
const SIDE_LEFT: VehicleDoor = { type: DoorType.Big, face: DoorFace.ZeroX };
const TOP: VehicleDoor = { type: DoorType.Top, face: DoorFace.HeightY };

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
    doors: [REAR],
    isActive: true,
    ...overrides,
  } as VehicleFormValues;
}

describe('doorsFromLoadingType — eski tekil alandan kapı listesi', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each([
    [0, [REAR]],
    [1, [SIDE_RIGHT]],
    [2, [SIDE_LEFT]],
    [4, [TOP]],
  ] as const)('loadingType=%i → %o', (loadingType, expected) => {
    expect(doorsFromLoadingType(loadingType)).toEqual(expected);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('null/undefined için boş liste döner, uyarı basmaz', () => {
    expect(doorsFromLoadingType(null)).toEqual([]);
    expect(doorsFromLoadingType(undefined)).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('kaldırılan SideBoth=3 için kapı uydurmaz, uyarı basar', () => {
    expect(doorsFromLoadingType(3)).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('3');
  });

  it('bilinmeyen int için boş liste döner ve sessizce yutmaz', () => {
    expect(doorsFromLoadingType(99)).toEqual([]);
    expect(warnSpy.mock.calls[0][0]).toContain('99');
  });
});

describe('resolveDoors — liste varsa liste, yoksa eski alan', () => {
  it('kapı listesi doluysa loadingType yok sayılır', () => {
    // Çelişkili veri: liste yan kapı der, eski alan arka kapı (0) der.
    expect(resolveDoors([SIDE_LEFT], 0)).toEqual([SIDE_LEFT]);
  });

  it('liste boş/null ise eski alandan türetilir', () => {
    expect(resolveDoors([], 1)).toEqual([SIDE_RIGHT]);
    expect(resolveDoors(null, 1)).toEqual([SIDE_RIGHT]);
    expect(resolveDoors(undefined, 4)).toEqual([TOP]);
  });
});

describe('loadingTypeFromDoors — geçiş boyunca tekil alanı besler', () => {
  it('yan kapı varsa yüzüne göre SideLeft/SideRight', () => {
    expect(loadingTypeFromDoors([REAR, SIDE_LEFT])).toBe(2);
    expect(loadingTypeFromDoors([REAR, SIDE_RIGHT])).toBe(1);
  });

  it('yan kapı yoksa arka kapı (Rear=0) baskındır', () => {
    expect(loadingTypeFromDoors([REAR])).toBe(0);
    expect(loadingTypeFromDoors([REAR, TOP])).toBe(0);
  });

  it('yalnızca üst kapı varsa Top=4', () => {
    expect(loadingTypeFromDoors([TOP])).toBe(4);
  });

  it('kapı yoksa Rear=0 varsayılanına düşer', () => {
    expect(loadingTypeFromDoors([])).toBe(0);
  });
});

describe('fromApiVehicle — kapı listesi çözümü', () => {
  it('API kapı listesi gönderdiyse doğrudan kullanılır', () => {
    const vehicle = fromApiVehicle(makeApiVehicle({ doors: [REAR, SIDE_LEFT], loadingType: 0 }));
    expect(vehicle.doors).toEqual([REAR, SIDE_LEFT]);
  });

  it('kapı listesi yoksa loadingType üzerinden türetilir', () => {
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType: 2 }));
    expect(vehicle.doors).toEqual([SIDE_LEFT]);
  });

  it('iki alan da yoksa kapı listesi boş kalır — varsayılan kapı uydurulmaz', () => {
    expect(fromApiVehicle(makeApiVehicle()).doors).toEqual([]);
  });
});

describe('buildCreateVehiclePayload — kapı listesi asıl alandır', () => {
  it('kapı listesi payload’a olduğu gibi girer', () => {
    const payload = buildCreateVehiclePayload(makeFormValues({ doors: [REAR, SIDE_RIGHT] }));
    expect(payload.doors).toEqual([REAR, SIDE_RIGHT]);
  });

  it('loadingType listeden türetilir (geriye dönük uyumluluk)', () => {
    expect(buildCreateVehiclePayload(makeFormValues({ doors: [REAR] })).loadingType).toBe(0);
    expect(
      buildCreateVehiclePayload(makeFormValues({ doors: [REAR, SIDE_LEFT] })).loadingType,
    ).toBe(2);
    expect(buildCreateVehiclePayload(makeFormValues({ doors: [TOP] })).loadingType).toBe(4);
  });

  /**
   * Ad "round-trip" ama kaybın oluştuğu yolu geçmiyor: `doors` alanı dolu
   * döndüğü için `loadingType` hiç okunmuyor. Kayıplı yol ayrıca test edildi
   * (`resolveDoors` — liste boşsa tekil alandan türetiliyor). İki testin
   * neyi kapsadığı ayrı yazıldı ki biri diğerinin güvencesi sanılmasın
   * (denetim S-64).
   */
  it('round-trip: kapı listesi dolu dönünce olduğu gibi korunur', () => {
    const doors = [REAR, SIDE_LEFT];
    const payload = buildCreateVehiclePayload(makeFormValues({ doors }));
    const vehicle = fromApiVehicle(
      makeApiVehicle({ doors: payload.doors, loadingType: payload.loadingType }),
    );
    expect(vehicle.doors).toEqual(doors);
  });

  it('round-trip: kapı listesi boş dönerse ikinci kapı kaybolur (kayıplı yol)', () => {
    const doors = [REAR, SIDE_LEFT];
    const payload = buildCreateVehiclePayload(makeFormValues({ doors }));

    // Kapı listesi taşımayan eski bir uç: tekil alandan yalnızca yan kapı türetilir.
    const vehicle = fromApiVehicle(makeApiVehicle({ loadingType: payload.loadingType }));

    expect(vehicle.doors).toEqual([SIDE_LEFT]);
    expect(vehicle.doors).not.toEqual(doors);
  });
});
