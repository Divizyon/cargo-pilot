/**
 * ERP akışının tek sözlüğü. Zincir her yüzeyde aynı üç terimle anlatılır:
 * "ERP ile Senkronize Et" → "Bekleyen Ürünler" → "Ürünlere Aktar".
 * Yeni eşanlamlı ("sync", "çek", "içe aktar") arayüze girmez.
 */
export const ERP_TERM = {
  sync: 'ERP ile Senkronize Et',
  syncRunning: 'Senkronize ediliyor…',
  pending: 'Bekleyen Ürünler',
  approve: 'Ürünlere Aktar',
  clearSelection: 'Seçimi Temizle',
  connect: 'ERP Bağlantısı Kur',
  settings: 'ERP Ayarları',
} as const;

/** ERP ayar ekranına köprü; üç sekme tek sekmede birleştiği için tek rota kaldı. */
export const ERP_SETTINGS_ROUTE = {
  connection: '/settings?tab=erp',
} as const;

/** ERP kaynağında karşılığı olmayan alan uydurma varsayılanla değil bu işaretle gösterilir. */
export const ERP_SOURCE_MISSING = { label: '?', hint: 'ERP kaynağında bu alan yok' } as const;

/**
 * Kutu kenarları sahne sözleşmesiyle aynı adla anılır (scene-config: X = genişlik,
 * Y = yükseklik, Z = derinlik); ekranlar ve Excel şablonu bu adlardan beslenir.
 */
export const DIMENSION_LABEL = {
  width: 'Genişlik (X)',
  height: 'Yükseklik (Y)',
  length: 'Uzunluk (Z)',
} as const;

/** Ölçü adının eksen harfsiz hâli; rozet ve hata metinlerinde kullanılır. */
export const DIMENSION_SHORT_LABEL = {
  width: 'Genişlik',
  height: 'Yükseklik',
  length: 'Uzunluk',
  weight: 'Ağırlık',
} as const;
