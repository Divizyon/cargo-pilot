export type DimensionUnit = 'cm' | 'mm';

const CM_TO_MM = 10;

export function calcVolume(lengthCm: number, widthCm: number, heightCm: number): number {
  return lengthCm * widthCm * heightCm;
}

export function formatDimension(valueCm: number, unit: DimensionUnit): string {
  if (unit === 'mm') return String(Math.round(valueCm * CM_TO_MM));
  return String(valueCm);
}

export function formatVolume(volumeCm3: number): string {
  if (volumeCm3 >= 1_000_000) return `${(volumeCm3 / 1_000_000).toFixed(2)} m³`;
  if (volumeCm3 >= 1_000) return `${parseFloat((volumeCm3 / 1_000).toFixed(1))} dm³`;
  return `${Math.round(volumeCm3)} cm³`;
}
