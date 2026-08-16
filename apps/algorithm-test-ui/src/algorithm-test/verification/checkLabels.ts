import type { CheckId } from './types';

/**
 * Kural adlarının tek kaynağı.
 *
 * Etiketler eskiden her kural fonksiyonunun içinde ayrı ayrı yazılıydı; toplu
 * koşu panelleri o etiketlere erişemediği için ham kimlik basıyordu
 * (`stackWeight`). Aynı kural iki ekranda iki isimle görünüyordu. Harita hem o
 * ayrışmayı kapatıyor hem de kural kimliği ile adının birlikte değişmesini
 * zorunlu kılıyor: `CheckId` genişlediğinde burası derlenmez.
 */
export const CHECK_LABEL: Record<CheckId, string> = {
  conservation: 'Kutu korunumu',
  bounds: 'Konteyner sınırları',
  overlap: 'Kutu çakışması',
  support: '%80 zemin desteği',
  stackable: 'İstiflenemez ürün üstü',
  stackCount: 'Azami istif adedi',
  weightOnTop: 'Üste binen ağırlık',
  fragility: 'Kırılgan ürün üstü',
  rotation: 'Rotasyon izinleri',
  lifoVertical: 'LIFO dikey kuralı',
  totalWeight: 'Araç ağırlık kapasitesi',
  cogMismatch: 'CoG çapraz kontrolü',
  lifoZone: 'LIFO bölge uyumu',
  loadingCorner: 'Yükleme başlangıç köşesi',
};
