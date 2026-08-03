import { describe, expect, it } from 'vitest';
import {
  calcCenterOfGravity,
  calcBalance,
  buildCogInputs,
  COG_BALANCE_THRESHOLD,
  COG_THRESHOLDS,
  type CogInput,
} from './calcCenterOfGravity';

const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  weight: number,
): CogInput => ({
  positionX: x,
  positionY: y,
  positionZ: z,
  width: w,
  height: h,
  depth: d,
  weight,
});

describe('calcCenterOfGravity', () => {
  it('returns null for empty input', () => {
    expect(calcCenterOfGravity([])).toBeNull();
  });

  it('returns null when all weights are zero', () => {
    expect(calcCenterOfGravity([box(0, 0, 0, 10, 10, 10, 0)])).toBeNull();
  });

  it('single box CoG is its geometric center', () => {
    const result = calcCenterOfGravity([box(0, 0, 0, 100, 50, 200, 10)]);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(50);
    expect(result!.y).toBeCloseTo(25);
    expect(result!.z).toBeCloseTo(100);
    expect(result!.totalWeight).toBe(10);
  });

  it('two equal boxes: CoG is midpoint', () => {
    const inputs = [box(0, 0, 0, 100, 50, 100, 10), box(100, 0, 0, 100, 50, 100, 10)];
    const result = calcCenterOfGravity(inputs);
    expect(result!.x).toBeCloseTo(100);
    expect(result!.z).toBeCloseTo(50);
  });

  it('heavier box pulls CoG toward itself', () => {
    // light box at Z=0..100, heavy box at Z=200..300
    const inputs = [box(0, 0, 0, 10, 10, 100, 10), box(0, 0, 200, 10, 10, 100, 90)];
    const result = calcCenterOfGravity(inputs);
    // CoG Z: (50*10 + 250*90) / 100 = (500 + 22500) / 100 = 230
    expect(result!.z).toBeCloseTo(230);
  });

  it('accumulates totalWeight correctly', () => {
    const inputs = [box(0, 0, 0, 10, 10, 10, 30), box(0, 0, 10, 10, 10, 10, 70)];
    expect(calcCenterOfGravity(inputs)!.totalWeight).toBe(100);
  });
});

describe('calcBalance', () => {
  it('centered CoG produces zero bias', () => {
    const cog = { x: 100, y: 50, z: 200, totalWeight: 100 };
    const result = calcBalance(cog, 200, 400);
    expect(result.lateralBias).toBeCloseTo(0);
    expect(result.longitudinalBias).toBeCloseTo(0);
    expect(result.isLateralWarning).toBe(false);
    expect(result.isLongitudinalWarning).toBe(false);
    expect(result.frontAxleShare).toBeCloseTo(0.5);
    expect(result.rearAxleShare).toBeCloseTo(0.5);
  });

  it('issues lateral warning when bias exceeds dikkat threshold', () => {
    // Container 200 cm wide, center at 100, CoG at X=160 → bias = (160-100)/200 = 0.3 > 0.15 → kritik
    const cog = { x: 160, y: 50, z: 200, totalWeight: 100 };
    const result = calcBalance(cog, 200, 400);
    expect(result.isLateralWarning).toBe(true);
    expect(result.lateralBias).toBeCloseTo(0.3);
    expect(result.lateralLevel).toBe('kritik');
  });

  it('issues longitudinal warning when bias exceeds kritik threshold', () => {
    // Container 400 cm long, center at 200, CoG at Z=270 → bias = 70/400 = 0.175 > 0.15 → kritik
    const cog = { x: 100, y: 50, z: 270, totalWeight: 100 };
    const result = calcBalance(cog, 200, 400);
    expect(result.isLongitudinalWarning).toBe(true);
    expect(result.longitudinalLevel).toBe('kritik');
  });

  it('does not warn when bias is within ideal range', () => {
    // bias = 0.04 < 0.05 → ideal
    const cog = { x: 100 + 200 * 0.04, y: 0, z: 200, totalWeight: 100 };
    const result = calcBalance(cog, 200, 400);
    expect(result.isLateralWarning).toBe(false);
    expect(result.lateralLevel).toBe('ideal');
  });

  it('COG_BALANCE_THRESHOLD equals kritik threshold (0.15)', () => {
    expect(COG_BALANCE_THRESHOLD).toBe(0.15);
    expect(COG_BALANCE_THRESHOLD).toBe(COG_THRESHOLDS.KRITIK);
  });

  it('classifies levels correctly per PO spec', () => {
    const containerWidth = 200;
    const containerLength = 400;
    // ideal: bias 0.03 (3%)
    expect(
      calcBalance(
        { x: 100 + 200 * 0.03, y: 0, z: 200, totalWeight: 10 },
        containerWidth,
        containerLength,
      ).lateralLevel,
    ).toBe('ideal');
    // dikkat: bias 0.07 (7%)
    expect(
      calcBalance(
        { x: 100 + 200 * 0.07, y: 0, z: 200, totalWeight: 10 },
        containerWidth,
        containerLength,
      ).lateralLevel,
    ).toBe('dikkat');
    // riskli: bias 0.12 (12%)
    expect(
      calcBalance(
        { x: 100 + 200 * 0.12, y: 0, z: 200, totalWeight: 10 },
        containerWidth,
        containerLength,
      ).lateralLevel,
    ).toBe('riskli');
    // kritik: bias 0.20 (20%)
    expect(
      calcBalance(
        { x: 100 + 200 * 0.2, y: 0, z: 200, totalWeight: 10 },
        containerWidth,
        containerLength,
      ).lateralLevel,
    ).toBe('kritik');
  });

  it('handles zero container dimensions without throwing', () => {
    const cog = { x: 0, y: 0, z: 0, totalWeight: 10 };
    const result = calcBalance(cog, 0, 0);
    expect(result.lateralBias).toBe(0);
    expect(result.longitudinalBias).toBe(0);
  });
});

describe('buildCogInputs', () => {
  it('maps placement weight via itemId lookup', () => {
    const placements = [
      {
        itemId: 'abc',
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        width: 10,
        height: 10,
        depth: 10,
        orientationIndex: 0 as const,
        layer: 1,
        isViolation: false,
        color: '#fff',
      },
    ];
    const inputs = buildCogInputs(placements, { abc: 50 });
    expect(inputs[0].weight).toBe(50);
  });

  it('defaults weight to 0 for unknown itemId', () => {
    const placements = [
      {
        itemId: 'unknown',
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        width: 10,
        height: 10,
        depth: 10,
        orientationIndex: 0 as const,
        layer: 1,
        isViolation: false,
      },
    ];
    const inputs = buildCogInputs(placements, {});
    expect(inputs[0].weight).toBe(0);
  });
});
