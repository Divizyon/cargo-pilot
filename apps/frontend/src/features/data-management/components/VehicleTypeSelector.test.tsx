import { describe, it, expect } from 'vitest';
import { VehicleType } from '@/lib/types/vehicle';

describe('VehicleType', () => {
  it('has exactly four vehicle types', () => {
    const values = Object.values(VehicleType);
    expect(values).toHaveLength(4);
  });

  it('has all expected vehicle type values', () => {
    expect(VehicleType.Tir).toBe('Tir');
    expect(VehicleType.Kamyon).toBe('Kamyon');
    expect(VehicleType.Kamposet).toBe('Kamposet');
    expect(VehicleType.Konteyner).toBe('Konteyner');
  });

  it('has unique values', () => {
    const values = Object.values(VehicleType);
    expect(new Set(values).size).toBe(values.length);
  });

  it('keys match values (string const pattern)', () => {
    for (const [key, value] of Object.entries(VehicleType)) {
      expect(key).toBe(value);
    }
  });
});
