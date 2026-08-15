import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { MAX_TOTAL_BOX_COUNT } from '../schemas/algorithmTestRequestSchema';
import { isConstrainedItem } from './catalogCoverage';
import { createRng, type Rng } from './seededRandom';

/**
 * Tohumdan senaryo varyasyonu üretimi.
 *
 * Motor deterministik olduğu için aynı senaryoyu tekrar koşmak bilgi üretmez;
 * anlamlı olan çok sayıda FARKLI senaryo koşup toplamı karşılaştırmak. Üretim
 * tohumlu: aynı tohum + aynı katalog her zaman aynı listeyi verir, böylece
 * motorun iki sürümü birebir aynı yüke karşı ölçülür.
 *
 * Adetler kör rastgele değil, araç hacmine göre hedeflenir. Kör rastgele
 * verildiğinde senaryoların çoğu ya neredeyse boş ya tamamen taşan çıkıyor ve
 * ikisi de motoru zorlamıyor; hedefli dağılım doluluğu ilginç aralıkta tutar ve
 * bir kısmını kasten taşırır (yerleşememe yolunu da sınamak için).
 */

/**
 * Üretim mantığının sürümü.
 *
 * Karşılaştırmanın ön koşulu "aynı tohum = aynı senaryo listesi". Üretim mantığı
 * değişirse bu artık doğru değildir; eski koşularla kıyaslamak motorun değil
 * girdinin farkını ölçer. Sürüm kayda yazılır ve `findComparable` eşitliği
 * arar — sessiz yanlış karşılaştırma yerine "kıyaslanacak koşu yok" denir.
 *
 * 1 → ilk sürüm (kör rastgele ürün seçimi)
 * 2 → kısıtlı ürünleri kasten senaryoya sokan seçim (aşağıda)
 */
export const GENERATOR_VERSION = 2;

/** Kaç ürün çeşidi bir senaryoda yan yana gelsin. */
const MAX_DISTINCT_ITEMS = 5;

/** Hedeflenen doluluk oranı aralığı; üst sınır 1'i aşıyor ki taşma da denensin. */
const MIN_TARGET_FILL = 0.25;
const MAX_TARGET_FILL = 1.25;

/** Senaryonun gruplu olma olasılığı (yüzde). LIFO dalını besleyen şey bu. */
const GROUPED_SCENARIO_PERCENT = 40;

/**
 * Senaryonun en az bir kısıtlı ürün taşımaya zorlanma olasılığı (yüzde).
 *
 * Katalogda kısıtlı ürün azınlıktaysa (tipik durum: birkaç kırılgan ürün, yüzlerce
 * düz koli) kör rastgele seçim istif, kırılganlık ve rotasyon dallarını neredeyse
 * hiç koşturmuyor — toplu koşu yüzlerce senaryo boyunca motorun yalnızca en kolay
 * yolunu ölçüyordu. Tamamı zorlanmıyor: kısıtsız senaryolar da temel dalın
 * gerilemesini yakalamak için gerekli.
 */
const CONSTRAINED_SCENARIO_PERCENT = 60;

export interface SuiteScenarioItem {
  itemId: string;
  quantity: number;
  /** 0 = gruba dahil değil. Aksi hâlde boşaltma sırası. */
  groupNumber: number;
}

export interface SuiteScenario {
  /** 1'den başlayan sıra; yalnızca gösterim ve kayıt eşleşmesi için. */
  index: number;
  vehicleId: string;
  vehicleName: string;
  clusterGroups: boolean;
  items: SuiteScenarioItem[];
  totalBoxes: number;
  /** Kaç farklı boşaltma sırası var; 2+ ise LIFO bölgeleri oluşabilir. */
  groupCount: number;
  /** Motorun kısıt dallarını tetikleyebilecek ürün çeşidi sayısı. */
  constrainedItemCount: number;
}

function volumeOf(dims: { width: number; height: number; length: number }): number {
  return dims.width * dims.height * dims.length;
}

/** Seçilen ürünlerin ortalama hacmi; hedef adet bunun üzerinden bulunur. */
function averageItemVolume(items: readonly Item[]): number {
  const total = items.reduce((sum, item) => sum + volumeOf(item), 0);
  return items.length > 0 ? total / items.length : 0;
}

function distributeQuantities(total: number, count: number, rng: Rng): number[] {
  if (count <= 1) return [total];

  // Her ürüne en az 1 kutu; kalanı jitter'lı olarak paylaştır.
  const quantities = Array<number>(count).fill(1);
  let remaining = total - count;

  for (let i = 0; i < count - 1 && remaining > 0; i++) {
    const share = rng.int(0, remaining);
    quantities[i] += share;
    remaining -= share;
  }
  quantities[count - 1] += remaining;

  return quantities;
}

/**
 * Senaryonun ürün çeşitlerini seçer.
 *
 * Rastgele seçim korunur; yalnızca hiç kısıtlı ürün düşmediğinde son sıradaki
 * ürün kısıtlı bir ürünle değiştirilir. Karar kurası her çağrıda çekilir (koşullu
 * değil) — aksi hâlde rastgele dizinin ilerleyişi katalog içeriğine bağlı olur ve
 * aynı tohum farklı kataloglarda farklı ilerlerdi.
 */
function chooseItems(catalog: readonly Item[], distinctCount: number, rng: Rng): Item[] {
  const shuffled = rng.shuffle(catalog);
  const forceConstrained = rng.int(1, 100) <= CONSTRAINED_SCENARIO_PERCENT;
  const chosen = shuffled.slice(0, distinctCount);

  if (!forceConstrained || chosen.some(isConstrainedItem)) return chosen;

  const constrained = shuffled.find(isConstrainedItem);
  // Katalogda kısıtlı ürün yoksa yapacak bir şey yok; CoveragePanel bunu söyler.
  if (!constrained) return chosen;

  return [...chosen.slice(0, -1), constrained];
}

function buildScenario(
  index: number,
  vehicles: readonly Vehicle[],
  catalog: readonly Item[],
  rng: Rng,
): SuiteScenario | null {
  const vehicle = rng.pick(vehicles);
  if (!vehicle) return null;

  const distinctCount = rng.int(1, Math.min(MAX_DISTINCT_ITEMS, catalog.length));
  const chosen = chooseItems(catalog, distinctCount, rng);
  if (chosen.length === 0) return null;

  const averageVolume = averageItemVolume(chosen);
  if (averageVolume <= 0) return null;

  const targetFill =
    MIN_TARGET_FILL + rng.next() * (MAX_TARGET_FILL - MIN_TARGET_FILL);
  const targetBoxes = Math.round((volumeOf(vehicle) * targetFill) / averageVolume);
  const totalBoxes = Math.min(Math.max(targetBoxes, chosen.length), MAX_TOTAL_BOX_COUNT);

  const quantities = distributeQuantities(totalBoxes, chosen.length, rng);

  const grouped = rng.int(1, 100) <= GROUPED_SCENARIO_PERCENT && chosen.length > 1;
  // En çok 3 grup: motorun bölge hesabı aracı grup sayısına bölüyor, daha
  // fazlası dilimleri kutu boyunun altına indirip senaryoyu anlamsızlaştırıyor.
  const groupCount = grouped ? rng.int(2, Math.min(3, chosen.length)) : 0;

  const items: SuiteScenarioItem[] = chosen.map((item, i) => ({
    itemId: item.id,
    quantity: quantities[i],
    // İlk `groupCount` ürün grupları garanti doldurur; kalanı serbest dağılır.
    groupNumber: groupCount === 0 ? 0 : i < groupCount ? i + 1 : rng.int(1, groupCount),
  }));

  return {
    index,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    clusterGroups: groupCount > 0 ? rng.int(0, 1) === 1 : true,
    items,
    totalBoxes: quantities.reduce((sum, q) => sum + q, 0),
    groupCount,
    constrainedItemCount: chosen.filter(isConstrainedItem).length,
  };
}

/**
 * `count` adet senaryo üretir. Saf fonksiyon: aynı (seed, count, vehicles,
 * catalog) her zaman aynı listeyi verir. Katalog boşsa boş liste döner.
 */
export function generateSuite(
  seed: number,
  count: number,
  vehicles: readonly Vehicle[],
  catalog: readonly Item[],
): SuiteScenario[] {
  if (vehicles.length === 0 || catalog.length === 0) return [];

  const rng = createRng(seed);
  const scenarios: SuiteScenario[] = [];

  for (let i = 0; i < count; i++) {
    const scenario = buildScenario(i + 1, vehicles, catalog, rng);
    if (scenario) scenarios.push(scenario);
  }

  return scenarios;
}
