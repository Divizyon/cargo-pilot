export type DimensionUnit = 'cm' | 'mm' | 'inch';

const CM_TO_INCH = 1 / 2.54;
const CM_TO_MM = 10;

export function calcVolume(lengthCm: number, widthCm: number, heightCm: number): number {
  return lengthCm * widthCm * heightCm;
}

export function formatDimension(valueCm: number, unit: DimensionUnit): string {
  if (unit === 'inch') return (valueCm * CM_TO_INCH).toFixed(1);
  if (unit === 'mm') return String(Math.round(valueCm * CM_TO_MM));
  return String(Math.round(valueCm));
}

export function formatVolume(volumeCm3: number, unit: DimensionUnit): string {
  if (unit === 'inch') {
    const in3 = volumeCm3 * CM_TO_INCH ** 3;
    return `${in3.toFixed(1)} in³`;
  }
  if (volumeCm3 >= 1_000_000) return `${(volumeCm3 / 1_000_000).toFixed(2)} m³`;
  if (volumeCm3 >= 1_000) return `${(volumeCm3 / 1_000).toFixed(1)} dm³`;
  return `${Math.round(volumeCm3)} cm³`;
}
