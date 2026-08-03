import { describe, expect, it } from 'vitest';
import { calcVolume, formatDimension, formatVolume } from './calcVolume';

describe('calcVolume', () => {
  it('returns L × W × H product', () => {
    expect(calcVolume(10, 20, 30)).toBe(6000);
  });

  it('handles equal dimensions', () => {
    expect(calcVolume(5, 5, 5)).toBe(125);
  });

  it('handles single-unit cube', () => {
    expect(calcVolume(1, 1, 1)).toBe(1);
  });
});

describe('formatVolume', () => {
  it('formats values below 1000 as cm³', () => {
    expect(formatVolume(500, 'cm')).toBe('500 cm³');
  });

  it('formats values >= 1000 as dm³', () => {
    expect(formatVolume(2500, 'cm')).toBe('2.5 dm³');
  });

  it('formats values >= 1_000_000 as m³', () => {
    expect(formatVolume(2_000_000, 'cm')).toBe('2.00 m³');
  });

  it('converts to in³ when unit is inch', () => {
    const result = formatVolume(1000, 'inch');
    expect(result).toContain('in³');
  });

  it('inch volume is smaller than cm³ equivalent', () => {
    const cm3 = 1000;
    const in3 = parseFloat(formatVolume(cm3, 'inch'));
    expect(in3).toBeLessThan(cm3);
  });
});

describe('formatDimension', () => {
  it('returns string number for cm unit', () => {
    expect(formatDimension(30, 'cm')).toBe('30');
  });

  it('converts 2.54 cm to 1.0 inch', () => {
    expect(formatDimension(2.54, 'inch')).toBe('1.0');
  });

  it('converts 25.4 cm to 10.0 inch', () => {
    expect(formatDimension(25.4, 'inch')).toBe('10.0');
  });
});
