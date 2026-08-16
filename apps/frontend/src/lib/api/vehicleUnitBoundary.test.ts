import { describe, expect, it, beforeEach } from 'vitest';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { DoorType, DoorFace, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/vehicles/schemas/vehicleSchema';
import {
  buildCreateVehiclePayload,
  buildUpdateVehiclePayloadFromVehicle,
  vehicleToFormValues,
} from './vehicleMappers';

/**
 * Denetim S-10/S-11/S-25: birim dönüşümü tek sınırda değildi. Aynı fonksiyon
 * hem "form değeri" hem "kayıtlı değer" girdileriyle çağrılıyor, bazı alanlar
 * iki kez çevriliyor, bazıları hiç çevrilmiyordu.
 *
 * Kayıt birimi her zaman cm/kg (docs/COORDINATE_STANDARD.md); dönüşüm yalnızca
 * API sınırında yapılır.
 */

const KAYITLI_ARAC: Vehicle = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Ana Dorse',
  vehicleType: 'Tir',
  plate: '34ABC123',
  length: 1360,
  width: 248,
  height: 270,
  maxCargoWeight: 26_000,
  maxLayerCount: 3,
  doors: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
  kingpin: { distance: 360, tareWeight: 8_000, maxLoad: 12_000 },
  axleB: { distance: 900, tareWeight: 2_000, maxLoad: 24_000 },
  axles: [{ distance: 1_100, tareWeight: 1_000, maxLoad: 9_000 }],
  isFavorite: false,
  isActive: true,
  isDeleted: false,
  createdAt: new Date(0).toISOString(),
  createdBy: { id: '', fullName: '' },
};

function formValues(overrides: Partial<VehicleFormValues> = {}): VehicleFormValues {
  return {
    vehicleType: 'Tir',
    name: 'Ana Dorse',
    length: 1360,
    width: 248,
    height: 270,
    maxCargoWeight: 26_000,
    doors: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
    isActive: true,
    ...overrides,
  } as VehicleFormValues;
}

describe('buildUpdateVehiclePayloadFromVehicle — kayıtlı değer dönüştürülmez', () => {
  beforeEach(() => {
    useUnitStore.setState({ dimensionUnit: 'mm', weightUnit: 'ton' });
  });

  it('mm/ton ayarında bile ölçüler olduğu gibi gider', () => {
    const payload = buildUpdateVehiclePayloadFromVehicle(KAYITLI_ARAC, { isActive: false });

    expect(payload.internalLength).toBe(1360);
    expect(payload.internalWidth).toBe(248);
    expect(payload.internalHeight).toBe(270);
    expect(payload.maxWeightCapacity).toBe(26_000);
  });

  /** Şemadaki alan `layerCount`; eskiden `maxLayerCount` gönderilip 1'e düşüyordu. */
  it('katman sayısı korunur', () => {
    expect(buildUpdateVehiclePayloadFromVehicle(KAYITLI_ARAC).layerCount).toBe(3);
  });

  it('kingpin ve aks alanları null’lanmaz', () => {
    const payload = buildUpdateVehiclePayloadFromVehicle(KAYITLI_ARAC);

    expect(payload.kingPinDistanceMm).toBe(360);
    expect(payload.kingPinMaxLoadKg).toBe(12_000);
    expect(payload.mainAxleDistanceMm).toBe(900);
    expect(payload.additionalAxleMaxLoadKg).toBe(9_000);
  });

  it('yalnızca istenen alan değişir', () => {
    const payload = buildUpdateVehiclePayloadFromVehicle(KAYITLI_ARAC, { isActive: false });

    expect(payload.isActive).toBe(false);
    expect(payload.vehicleName).toBe('Ana Dorse');
  });

  it('arşivleme turu ölçüleri değiştirmez (round-trip)', () => {
    const payload = buildUpdateVehiclePayloadFromVehicle(KAYITLI_ARAC, { isActive: false });

    expect({
      length: payload.internalLength,
      width: payload.internalWidth,
      height: payload.internalHeight,
      weight: payload.maxWeightCapacity,
      layers: payload.layerCount,
    }).toEqual({
      length: KAYITLI_ARAC.length,
      width: KAYITLI_ARAC.width,
      height: KAYITLI_ARAC.height,
      weight: KAYITLI_ARAC.maxCargoWeight,
      layers: KAYITLI_ARAC.maxLayerCount,
    });
  });
});

describe('buildCreateVehiclePayload — form değeri görüntü biriminde', () => {
  it('mm ayarında ölçüler cm’e çevrilir', () => {
    useUnitStore.setState({ dimensionUnit: 'mm', weightUnit: 'kg' });

    const payload = buildCreateVehiclePayload(formValues({ length: 13_600 }));

    expect(payload.internalLength).toBe(1360);
  });

  it('ton ayarında ağırlık kg’a çevrilir', () => {
    useUnitStore.setState({ dimensionUnit: 'cm', weightUnit: 'ton' });

    expect(buildCreateVehiclePayload(formValues({ maxCargoWeight: 26 })).maxWeightCapacity).toBe(
      26_000,
    );
  });

  /** Denetim S-25: aks/kingpin alanları hiç çevrilmiyordu. */
  it('kingpin ve aks uzaklıkları da aynı sınırda çevrilir', () => {
    useUnitStore.setState({ dimensionUnit: 'mm', weightUnit: 'kg' });

    const payload = buildCreateVehiclePayload(
      formValues({ kingpin: { distance: 3_600, tareWeight: 8_000, maxLoad: 12_000 } }),
    );

    expect(payload.kingPinDistanceMm).toBe(360);
  });

  /** Denetim S-10: toplu içe aktarma satırları zaten cm/kg. */
  it('unitsAreStorage açıkken ikinci dönüşüm yapılmaz', () => {
    useUnitStore.setState({ dimensionUnit: 'mm', weightUnit: 'ton' });

    const payload = buildCreateVehiclePayload(
      formValues({ length: 1360, maxCargoWeight: 26_000, unitsAreStorage: true }),
    );

    expect(payload.internalLength).toBe(1360);
    expect(payload.maxWeightCapacity).toBe(26_000);
  });
});

describe('vehicleToFormValues — okuma yazmanın aynası', () => {
  it('kayıttan forma, formdan payload’a giden değer değişmez', () => {
    useUnitStore.setState({ dimensionUnit: 'mm', weightUnit: 'ton' });

    const values = vehicleToFormValues(KAYITLI_ARAC);
    const payload = buildCreateVehiclePayload(values as VehicleFormValues);

    expect(payload.internalLength).toBe(KAYITLI_ARAC.length);
    expect(payload.maxWeightCapacity).toBe(KAYITLI_ARAC.maxCargoWeight);
    expect(payload.kingPinDistanceMm).toBe(KAYITLI_ARAC.kingpin!.distance);
    expect(payload.mainAxleDistanceMm).toBe(KAYITLI_ARAC.axleB!.distance);
  });
});
