/**
 * Canvas'ın renkleri, arayüzün okuduğu CSS token'larından gelir.
 *
 * Daha önce çizim kendi ham hex'lerini taşıyordu; bu, aynı anlamın (ör. "sert
 * kural ihlali") DOM'da `--destructive`, canvas'ta `#E11D48` olarak iki ayrı
 * yerde tanımlanması demekti. Token okumak ikisini tek kaynağa bağlar ve koyu
 * tema açıldığında çizimin de dönmesini sağlar.
 *
 * Ürün renkleri aşağıda ayrı durur: onlar tema değil
 * veri — her ürünü ayırt etmeye yarayan kategorik bir palet.
 */
export interface DrawPalette {
  /** Kutu konturu ve araç çerçevesi. */
  ink: string;
  /** Cetvel çizgileri ve araç merkezi referansı. */
  grid: string;
  /** LIFO bölge sınırları. */
  zone: string;
  /** Cetvel sayıları ve eksen etiketleri. */
  label: string;
  /** Seçili kutunun konturu. */
  selected: string;
  /** Ürün rengi bilinmeyen kutunun dolgusu. */
  box: string;
  pass: string;
  warn: string;
  fail: string;
}

/**
 * Token bulunamazsa (test ortamı, stil henüz yüklenmemiş) açık tema değerlerine
 * düşülür; çizim renksiz kalmaz.
 */
const FALLBACK: DrawPalette = {
  ink: '#334155',
  grid: '#CBD5E1',
  zone: '#7C3AED',
  label: '#64748B',
  selected: '#0F172A',
  box: '#2DD4BF',
  pass: '#16A34A',
  warn: '#D97706',
  fail: '#DC2626',
};

/** `--x: 210 40% 98%` biçimindeki HSL üçlüsünü canvas'ın anladığı renge çevirir. */
function readToken(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const raw = styles.getPropertyValue(name).trim();
  return raw ? `hsl(${raw})` : fallback;
}

/**
 * Her çizimde yeniden okunur. `getComputedStyle` çağrısı çizim başına birdir ve
 * kutu döngüsünün yanında ihmal edilebilir; karşılığında tema değişikliği bir
 * sonraki çizimde kendiliğinden yansır.
 */
export function readDrawPalette(): DrawPalette {
  if (typeof document === 'undefined') return FALLBACK;

  const styles = getComputedStyle(document.documentElement);
  return {
    ink: readToken(styles, '--draw-ink', FALLBACK.ink),
    grid: readToken(styles, '--draw-grid', FALLBACK.grid),
    zone: readToken(styles, '--draw-zone', FALLBACK.zone),
    label: readToken(styles, '--muted-foreground', FALLBACK.label),
    selected: readToken(styles, '--foreground', FALLBACK.selected),
    box: readToken(styles, '--draw-box', FALLBACK.box),
    pass: readToken(styles, '--state-pass', FALLBACK.pass),
    warn: readToken(styles, '--state-warn', FALLBACK.warn),
    fail: readToken(styles, '--state-fail', FALLBACK.fail),
  };
}

/**
 * Ürünleri birbirinden ayıran ton dizisi. Renk burada tek bir soruyu yanıtlar:
 * "bu kutu komşusuyla aynı ürün mü". Ürünün kimliğini değil, ayrımını taşır.
 *
 * Eskiden on iki ayrı renkti (kırmızı, mor, pembe…). İki sorunu vardı: kırmızı
 * ürün ile kırmızı ihlal dolgusu aynı çizimde yan yana düşüyordu ve arayüzün
 * geri kalanı üç durum rengiyle çalışırken çizim gökkuşağına dönüyordu. Tek
 * aile içinde koyu–açık dönüşümlü ilerlemek komşu tonları ayırt edilebilir
 * tutuyor, kırmızıyı ise yalnız ihlale bırakıyor.
 *
 * Sekizden fazla ürün varsa dizi başa sarar; iki ürünün aynı tonu paylaşması
 * konum bilgisini bozmaz, seçilen kutunun adı zaten altta yazıyor.
 */
const PRODUCT_TONES = [
  '#0E7490', '#5EEAD4', '#0D9488', '#67E8F9',
  '#0891B2', '#2DD4BF', '#155E75', '#99F6E4',
];

export function assignProductColors(itemIds: readonly string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  [...new Set(itemIds)].forEach((id, index) => {
    colors[id] = PRODUCT_TONES[index % PRODUCT_TONES.length];
  });
  return colors;
}
