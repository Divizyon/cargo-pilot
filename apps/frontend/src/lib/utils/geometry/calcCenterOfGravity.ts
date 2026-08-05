import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

export interface CogInput {
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  weight: number;
}

export interface CogResult {
  x: number;
  y: number;
  z: number;
  totalWeight: number;
}

/** 4-level tolerance per PO spec: 0-5% ideal, 5-10% dikkat, 10-15% riskli, >15% kritik */
export type BalanceLevel = 'ideal' | 'dikkat' | 'riskli' | 'kritik';

export const COG_THRESHOLDS = {
  DIKKAT: 0.05,
  RISKLI: 0.1,
  KRITIK: 0.15,
} as const;

/** Backward-compat alias — equals the kritik threshold */
export const COG_BALANCE_THRESHOLD = COG_THRESHOLDS.KRITIK;

export interface BalanceResult {
  cog: CogResult;
  /** CoG X offset from container center, as fraction of container width (−1..1) */
  lateralBias: number;
  /** CoG Z offset from container center, as fraction of container length (−1..1) */
  longitudinalBias: number;
  /** Front axle load share (0..1) — Z=0 is rear, Z=containerLength is front */
  frontAxleShare: number;
  rearAxleShare: number;
  lateralLevel: BalanceLevel;
  longitudinalLevel: BalanceLevel;
  isLateralWarning: boolean;
  isLongitudinalWarning: boolean;
}

/**
 * Calculates center of gravity from a list of placements with weight.
 * Positions are bottom-left-rear (BLR); CoG is computed at box center.
 */
export function calcCenterOfGravity(inputs: CogInput[]): CogResult | null {
  if (inputs.length === 0) return null;

  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (const p of inputs) {
    const w = p.weight;
    totalWeight += w;
    sumX += (p.positionX + p.width / 2) * w;
    sumY += (p.positionY + p.height / 2) * w;
    sumZ += (p.positionZ + p.depth / 2) * w;
  }

  if (totalWeight === 0) return null;

  return {
    x: sumX / totalWeight,
    y: sumY / totalWeight,
    z: sumZ / totalWeight,
    totalWeight,
  };
}

/**
 * Builds CogInput array by joining placements with their item weights.
 * Uses itemId → weight lookup map so no O(n²) join.
 */
export function buildCogInputs(
  placements: PlacementWithDimensions[],
  weightByItemId: Record<string, number>,
): CogInput[] {
  return placements.map((p) => ({
    positionX: p.positionX,
    positionY: p.positionY,
    positionZ: p.positionZ,
    width: p.width,
    height: p.height,
    depth: p.depth,
    weight: weightByItemId[p.itemId] ?? 0,
  }));
}

function toBalanceLevel(absBias: number): BalanceLevel {
  if (absBias <= COG_THRESHOLDS.DIKKAT) return 'ideal';
  if (absBias <= COG_THRESHOLDS.RISKLI) return 'dikkat';
  if (absBias <= COG_THRESHOLDS.KRITIK) return 'riskli';
  return 'kritik';
}

/**
 * Computes full balance analysis for a given CoG and container dimensions.
 * containerLength: Z axis (rear=0, front=containerLength).
 * containerWidth: X axis.
 */
export function calcBalance(
  cog: CogResult,
  containerWidth: number,
  containerLength: number,
): BalanceResult {
  const centerX = containerWidth / 2;
  const centerZ = containerLength / 2;

  const lateralBias = containerWidth > 0 ? (cog.x - centerX) / containerWidth : 0;
  const longitudinalBias = containerLength > 0 ? (cog.z - centerZ) / containerLength : 0;

  const lateralLevel = toBalanceLevel(Math.abs(lateralBias));
  const longitudinalLevel = toBalanceLevel(Math.abs(longitudinalBias));

  // Moment-based axle shares: rear axle at Z=0, front axle at Z=containerLength
  const frontAxleShare = containerLength > 0 ? cog.z / containerLength : 0.5;
  const rearAxleShare = 1 - frontAxleShare;

  return {
    cog,
    lateralBias,
    longitudinalBias,
    frontAxleShare,
    rearAxleShare,
    lateralLevel,
    longitudinalLevel,
    isLateralWarning: lateralLevel !== 'ideal',
    isLongitudinalWarning: longitudinalLevel !== 'ideal',
  };
}
