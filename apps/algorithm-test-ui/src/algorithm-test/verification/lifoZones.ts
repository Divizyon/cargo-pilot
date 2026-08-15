import { DoorDirection } from '@/lib/types/vehicle';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';

/**
 * Motorun LIFO grup bölgelerinin istemci aynası — `LifoPlacement.ComputeGroupZones`
 * (apps/backend/CargoPilot.Application/Common/Optimization/LifoPlacement.cs:44-73).
 *
 * Arka kapı Z=0'dadır. UnloadingOrder=1 ilk inecek gruptur, bu yüzden kapıya en
 * yakın (en küçük Z) bölgeye düşer. Distinct değerler ASC sıralanır ve araç
 * uzunluğu eşit bölümlere ayrılır.
 */
export interface LifoZone {
  unloadingOrder: number;
  zStart: number;
  zEnd: number;
}

/**
 * Bölgeler yalnızca üç koşul birlikte sağlandığında oluşur (motorla aynı kapı):
 * modül açık (varsayılan türetmede yalnızca Lifo kriteri), arka kapı yüklemesi,
 * ve en az 2 farklı unloadingOrder. Aksi hâlde boş sözlük — ne bölge tohumlaması
 * ne bölge cezası oluşur.
 */
export function computeGroupZones(
  unloadingOrders: readonly number[],
  vehicleLength: number,
  doorDirection: DoorDirection,
  criteria: OptimizationCriteria,
): LifoZone[] {
  if (criteria !== OptimizationCriteria.Lifo) return [];
  if (doorDirection !== DoorDirection.Rear) return [];

  const orders = [...new Set(unloadingOrders)].sort((a, b) => a - b);
  if (orders.length <= 1) return [];

  const zoneSize = vehicleLength / orders.length;

  return orders.map((unloadingOrder, index) => ({
    unloadingOrder,
    zStart: index * zoneSize,
    zEnd: (index + 1) * zoneSize,
  }));
}

/**
 * Bölge dışına taşma miktarı (cm), iki uçta ayrı ayrı ölçülüp toplanır —
 * `LifoPlacement.ZonePenalty:79-90` ile aynı hesap, ceza katsayısı olmadan.
 *
 * DİKKAT: bu bir sert kısıt DEĞİL. Motor bölge dışına çıkmayı skor cezasıyla
 * caydırır ama yasaklamaz; boş yer kalmadığında kutu bilinçli olarak başka
 * bölgeye taşar. Bu yüzden taşma bir ihlal olarak raporlanmaz, ölçüt olarak
 * raporlanır.
 */
export function zoneOverflowCm(positionZ: number, depth: number, zone: LifoZone): number {
  const overStart = Math.max(0, zone.zStart - positionZ);
  const overEnd = Math.max(0, positionZ + depth - zone.zEnd);
  return overStart + overEnd;
}

export interface ZoneOverflowMeasurement {
  /** Kendi bölgesinin dışına taşan yerleşimlerin indeksleri. */
  overflowingIndices: number[];
  totalOverflowCm: number;
}

/**
 * Tüm yerleşimlerin bölge taşmasını ölçer.
 *
 * Hem denetim kuralı (`checkLifoZone`) hem toplu koşu kaydı aynı sayıyı
 * kullanıyor: kural ekranda uyarı gösteriyor, kayıt LIFO kalitesinin sürümler
 * arası eğrisini çiziyor. İki yerde ayrı hesaplanırsa rapor ile ekran ayrışır.
 */
export function measureZoneOverflow(
  placements: readonly { positionZ: number; depth: number; itemId: string }[],
  zones: readonly LifoZone[],
  unloadingOrderByItemId: ReadonlyMap<string, number>,
  epsilonCm: number,
): ZoneOverflowMeasurement {
  const zoneByOrder = new Map(zones.map((z) => [z.unloadingOrder, z]));
  const overflowingIndices: number[] = [];
  let totalOverflowCm = 0;

  for (let i = 0; i < placements.length; i++) {
    const order = unloadingOrderByItemId.get(placements[i].itemId);
    if (order === undefined) continue;
    const zone = zoneByOrder.get(order);
    if (!zone) continue;

    const overflow = zoneOverflowCm(placements[i].positionZ, placements[i].depth, zone);
    if (overflow > epsilonCm) {
      overflowingIndices.push(i);
      totalOverflowCm += overflow;
    }
  }

  return { overflowingIndices, totalOverflowCm };
}
