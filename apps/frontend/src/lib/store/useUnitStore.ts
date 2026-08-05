import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DimensionUnit = 'cm' | 'mm';
export type WeightUnit = 'kg' | 'ton';
export type VolumeUnit = 'm³' | 'dm³';
export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type AppLanguage = 'tr' | 'en';

interface UnitState {
  language: AppLanguage;
  timezone: string;
  dimensionUnit: DimensionUnit;
  weightUnit: WeightUnit;
  volumeUnit: VolumeUnit;
  dateFormat: DateFormat;
  setUnits: (
    units: Partial<
      Pick<
        UnitState,
        'language' | 'timezone' | 'dimensionUnit' | 'weightUnit' | 'volumeUnit' | 'dateFormat'
      >
    >,
  ) => void;
}

export const useUnitStore = create<UnitState>()(
  persist(
    (set) => ({
      language: 'tr',
      timezone: 'Europe/Istanbul',
      dimensionUnit: 'cm',
      weightUnit: 'kg',
      volumeUnit: 'm³',
      dateFormat: 'DD.MM.YYYY',
      setUnits: (units) => set((s) => ({ ...s, ...units })),
    }),
    { name: 'cargo-pilot-units' },
  ),
);
