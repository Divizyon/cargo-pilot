import type { DimensionUnit, VolumeUnit, WeightUnit } from '@/lib/store/useUnitStore';

/** Converts a cm value to the preferred display unit. Display-only — does NOT mutate stored data. */
export function formatDimensionDisplay(cm: number, unit: DimensionUnit): string {
  if (unit === 'mm') return `${(cm * 10).toFixed(0)} mm`;
  return `${cm.toFixed(0)} cm`;
}

/** Converts a kg value to the preferred display unit. Display-only — does NOT mutate stored data. */
export function formatWeightDisplay(kg: number, unit: WeightUnit): string {
  if (unit === 'ton') return `${(kg / 1_000).toFixed(3)} ton`;
  return `${kg.toFixed(1)} kg`;
}

/** Formats a volume value (stored in cm³) into the user's preferred display unit. Display-only — does NOT mutate stored data. */
export function formatVolumeDisplay(cm3: number, unit: VolumeUnit): string {
  if (unit === 'm³') return `${(cm3 / 1_000_000).toFixed(2)} m³`;
  return `${(cm3 / 1_000).toFixed(1)} dm³`;
}
