/**
 * ERP akışının tek sözlüğü. Zincir her yüzeyde aynı üç terimle anlatılır:
 * "ERP'den Ürün Çek" → "Bekleyen Ürünler" → "Ürünlere Aktar".
 * Yeni eşanlamlı ("sync", "senkronize et", "içe aktar") arayüze girmez.
 */
export const ERP_TERM = {
  sync: "ERP'den Ürün Çek",
  syncRunning: 'Ürünler çekiliyor…',
  pending: 'Bekleyen Ürünler',
  approve: 'Ürünlere Aktar',
  clearSelection: 'Seçimi Temizle',
  connect: 'ERP Bağlantısı Kur',
  syncSettings: 'Senkronizasyon Ayarları',
} as const;

/** ERP yüzeylerinin ayarlar sekmelerine köprüsü; rota dizesi tek yerde tutulur. */
export const ERP_SETTINGS_ROUTE = {
  connection: '/settings?tab=erp-baglanti',
  sync: '/settings?tab=erp-senkronizasyon',
} as const;

/**
 * Kutu kenarları sahne sözleşmesiyle aynı adla anılır (scene-config: X = genişlik,
 * Y = yükseklik, Z = derinlik); ekranlar ve Excel şablonu bu adlardan beslenir.
 */
export const DIMENSION_LABEL = {
  width: 'Genişlik (X)',
  height: 'Yükseklik (Y)',
  length: 'Derinlik (Z)',
} as const;

/** Ölçü adının eksen harfsiz hâli; rozet ve hata metinlerinde kullanılır. */
export const DIMENSION_SHORT_LABEL = {
  width: 'Genişlik',
  height: 'Yükseklik',
  length: 'Derinlik',
  weight: 'Ağırlık',
} as const;
