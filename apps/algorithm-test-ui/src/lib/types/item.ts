/**
 * Motorun okuduğu ürün alanları.
 *
 * Doğrulama sınırda, `lib/api/itemMappers.ts`'te yapılır; burası yalnızca tip.
 * Motorun dallanmadığı alanlar (ERP kaynağı, serbest notlar, kategori, eksen
 * bazlı rotasyon bayrakları) bilinçli olarak yok — tip katmanında tutmak
 * olmayan bir kapsama iddiası yaratıyordu.
 */
export interface Item {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  isStackable: boolean;
  /** Motor `<= 0` değerini SINIRSIZ sayar (PlacementValidator.cs:127). */
  maxStackCount: number;
  maxWeightOnTop: number | null;
  /**
   * FragilityType.cs 0-9. Motor yalnızca 1 (Fragile) için dallanır; 2-9
   * ayrıştırma sınıflarıdır ve stackGroup/incompatibleGroups üzerinden işler.
   */
  fragility: number;
  /**
   * Backend `AllowedRotations` enum'u (0-5) ham hâliyle. Motorun yönelim üretimi
   * doğrudan bu değere dallanır (PlacementValidator.GetOrientations).
   */
  allowedRotations: number;
  stackGroup: string | null;
  incompatibleGroups: string[];
}
