/**
 * Tohumlu sözde-rastgele üreteç (mulberry32).
 *
 * `Math.random()` kullanılamaz: toplu koşunun tüm değeri, aynı 100 senaryonun
 * motorun iki sürümüne karşı BİREBİR tekrar koşulabilmesinde. Tohum aynıysa
 * üretilen senaryo listesi de aynı olmak zorunda — yoksa karşılaştırılan şey
 * motorun değişimi değil, girdinin değişimi olur.
 *
 * Mulberry32 seçildi çünkü 32-bit durumla tek satırda ifade ediliyor, bağımlılık
 * gerektirmiyor ve dağılımı senaryo üretimi için fazlasıyla yeterli. Kriptografik
 * bir amaç yok.
 */
export interface Rng {
  /** [0, 1) aralığında sonraki değer. */
  next(): number;
  /** [min, max] aralığında tam sayı, iki uç dahil. */
  int(min: number, max: number): number;
  /** Diziden bir eleman; dizi boşsa undefined. */
  pick<T>(items: readonly T[]): T | undefined;
  /** Diziyi bozmadan karıştırılmış bir kopyasını döner (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  // Tohum 0 olduğunda mulberry32 sabit dizi üretir; kullanıcı 0 yazabilir.
  let state = (seed | 0) === 0 ? 0x9e3779b9 : seed | 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max <= min) return min;
    return min + Math.floor(next() * (max - min + 1));
  };

  return {
    next,
    int,
    pick: <T,>(items: readonly T[]): T | undefined =>
      items.length === 0 ? undefined : items[int(0, items.length - 1)],
    shuffle: <T,>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
