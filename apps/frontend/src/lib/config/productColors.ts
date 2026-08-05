// ─── Cargo Pilot Renk Standartı ──────────────────────────────────────────────
// Renk; (ürün tipi × yük grubu) kombinasyonuna göre belirlenir.
// Aynı kombinasyon 3D sahnede ve ürün yönetimi ekranında aynı rengi kullanır.

export type ProductType = 'koli' | 'varil' | 'palet';

// (productType, loadGroup) → hex renk
const PRODUCT_GROUP_COLOR: Record<ProductType, Record<string, string>> = {
  koli: {
    Gıda: '#34D399', // Cargo Emerald
    Kimya: '#FBBF24', // Modern Amber
    'Tehlikeli Madde': '#FB923C', // Safety Orange
    Elektronik: '#A855F7', // Cyber Violet
    Tekstil: '#D97706', // Desert Sand
    Genel: '#94A3B8', // Slate 400
  },
  varil: {
    Gıda: '#A7F3D0', // Mint Frost
    Kimya: '#2DD4BF', // Industrial Teal
    'Tehlikeli Madde': '#E11D48', // Crimson Edge
    Elektronik: '#84CC16', // Electric Lime
    Tekstil: '#818CF8', // Logistics Indigo
    Genel: '#2DD4BF', // Industrial Teal
  },
  palet: {
    // Palet için yük grubundan bağımsız tek renk
    _default: '#4338CA', // Midnight Cobalt
  },
};

// Bilinmeyen kombinasyonlar için fallback
export const COLOR_FALLBACK = '#FB7185'; // Steel Rose
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function resolveProductColor(
  productType: string | null | undefined,
  groupName: string | null | undefined,
): string {
  const type = normalize(productType ?? '') as ProductType;
  const group = groupName?.trim() ?? '';

  if (type === 'palet') return PRODUCT_GROUP_COLOR.palet._default;

  const typeMap = type === 'varil' ? PRODUCT_GROUP_COLOR.varil : PRODUCT_GROUP_COLOR.koli; // koli + bilinmeyen tipler

  if (!group) return COLOR_FALLBACK;

  // Tam eşleşme
  if (typeMap[group]) return typeMap[group];

  // Büyük/küçük harf toleransı
  const lowerGroup = normalize(group);
  const match = Object.entries(typeMap).find(([k]) => normalize(k) === lowerGroup);
  if (match) return match[1];

  return COLOR_FALLBACK;
}
