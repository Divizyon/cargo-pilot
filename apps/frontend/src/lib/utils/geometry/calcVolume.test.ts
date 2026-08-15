import { describe, expect, it } from 'vitest';
import { calcVolume } from './calcVolume';

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
