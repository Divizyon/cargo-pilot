import { describe, it, expect } from 'vitest';
import { parseDecimalInput } from './parseDecimalInput';

describe('parseDecimalInput', () => {
  it('nokta ile yazilan ondalik degeri cevirir', () => {
    expect(parseDecimalInput('15.5')).toBe(15.5);
  });

  it('virgul ile yazilan ondalik degeri kirpmadan cevirir', () => {
    expect(parseDecimalInput('15,5')).toBe(15.5);
  });

  it('tam sayiyi cevirir', () => {
    expect(parseDecimalInput('42')).toBe(42);
  });

  it('bos ve yalnizca bosluk iceren girdide undefined doner', () => {
    expect(parseDecimalInput('')).toBeUndefined();
    expect(parseDecimalInput('   ')).toBeUndefined();
  });

  it('bozuk girdiyi sessizce kirpmaz, undefined doner', () => {
    expect(parseDecimalInput('15.5.5')).toBeUndefined();
    expect(parseDecimalInput('abc')).toBeUndefined();
    expect(parseDecimalInput('12kg')).toBeUndefined();
  });

  it('bastaki ve sondaki bosluklari yok sayar', () => {
    expect(parseDecimalInput('  7,25  ')).toBe(7.25);
  });

  it('negatif degeri korur', () => {
    expect(parseDecimalInput('-3,5')).toBe(-3.5);
  });
});
