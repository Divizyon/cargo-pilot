import type { Item } from '@/lib/types/item';
import type { OptimizationCriteria, Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import type { LifoZone } from './lifoZones';

/**
 * Kural kimlikleri dizi olarak: tip birleşimi bunun üzerinden türetilir ve aynı
 * liste toplu koşu kaydının zod şemasında (`suiteStorage`) da kullanılır. Kural
 * eklendiğinde tek yer güncellenir, rapor şeması kendiliğinden takip eder.
 */
export const CHECK_IDS = [
  'conservation',
  'bounds',
  'overlap',
  'support',
  'stackable',
  'stackCount',
  'weightOnTop',
  'fragility',
  'rotation',
  'lifoVertical',
  'totalWeight',
  'cogMismatch',
  'lifoZone',
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

/**
 * `skipped`, `pass`'ten ayrı tutulur: senaryoda o kısıtı taşıyan ürün yoksa
 * kural hiç koşmamıştır. Hiç koşmamış bir yeşil, kırmızıdan daha yanıltıcıdır —
 * araç aksi hâlde sahte güven üretir.
 */
export type CheckStatus = 'pass' | 'fail' | 'skipped';

/**
 * `hard`: motorun aday pozisyonu reddettiği kural — ihlali gerçek hatadır.
 * `soft`: motorun skor cezasıyla caydırdığı ama yasaklamadığı tercih; ihlal
 * değil, ölçüttür. LIFO bölge taşması bunun tek örneği (LifoPlacement.ZonePenalty).
 */
export type CheckSeverity = 'hard' | 'soft';

export interface CheckResult {
  id: CheckId;
  label: string;
  status: CheckStatus;
  severity: CheckSeverity;
  /** İhlale karışan yerleşim indeksleri; canvas vurgulaması bunu kullanır. */
  failedPlacementIndices: number[];
  /** Neden atlandı, ne kadar sapma var, hangi sınır aşıldı. */
  detail?: string;
  /** Motordaki karşılığı, ör. "PlacementValidator.cs:120-142". */
  sourceRef: string;
}

/**
 * Formun sağladığı kısıt bağlamı. İstek şeması (`algorithmTestRequestSchema`)
 * yalnızca itemId/quantity/groupId taşır; kısıt bayrakları katalogdan gelir ve
 * denetim için ayrıca aktarılmak zorundadır.
 */
export interface RunContext {
  itemsById: Map<string, Item>;
  /** itemId → unloadingOrder (grup numarası). LIFO dikey kuralı için. */
  unloadingOrderByItemId: Map<string, number>;
}

/** Denetleyicilerin tek girdisi; koşu hook'unda birleştirilir. */
export interface CheckInput extends RunContext {
  placements: Placement[];
  vehicle: Vehicle | null;
  criteria: OptimizationCriteria;
  zones: readonly LifoZone[];
  /** Backend'in bildirdiği CoG (cm); çapraz kontrol için. */
  backendCog: { x: number; y: number; z: number } | null;
  backendBalanceOffsetX: number | null;
  backendBalanceOffsetZ: number | null;
  /** Senaryoda istenen toplam kutu adedi; korunum kuralının sol tarafı. */
  requestedCount: number;
  /**
   * Backend'in yerleşemeyen olarak raporladığı toplam adet. `null` = kaynak bu
   * sayıyı hiç taşımıyor (golden fixture'lar taşımaz); korunum kuralı o zaman
   * atlanır, uydurulmuş bir değerle sahte `pass` üretmez.
   */
  unplacedCount: number | null;
  /** Backend `PlanMetrics.PlacedQuantity`; dönen yerleşim satırlarıyla karşılaştırılır. */
  backendPlacedQuantity: number | null;
}
