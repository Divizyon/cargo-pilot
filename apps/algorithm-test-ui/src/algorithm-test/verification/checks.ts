import { boxesIntersect } from '@/lib/utils/geometry/geometry';
import { OptimizationCriteria, type Placement } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import {
  CONTACT_EPSILON_CM,
  footprintOverlapArea,
  indicesAbove,
  restsDirectlyOn,
  topY,
} from './geometryPredicates';
import { measureZoneOverflow } from './lifoZones';
import type { CheckInput, CheckResult } from './types';
import { CHECK_LABEL } from './checkLabels';

/**
 * Motorun sert kısıtlarının istemci aynası. Her fonksiyon, bitmiş bir yerleşim
 * listesini o kuralın değişmezine karşı denetler; motoru çağırmaz, kuralı
 * yeniden ifade eder. Kaynak satır aralıkları her kuralın `sourceRef`'inde.
 *
 * Motorda kural "aday pozisyon reddedilir mi" biçiminde yazılıdır; burada aynı
 * kural "bitmiş yerleşim bu değişmezi bozuyor mu" biçimine çevrilir. Fark tek
 * yerde önemli: motor aday henüz listede olmadığı için `+1` ekler
 * (PlacementValidator.cs:139), bitmiş listede aday zaten sayıldığı için `+1` yok.
 */

/** %80 zemin desteği eşiği — PlacementValidator.cs:79. */
const SUPPORT_RATIO_THRESHOLD = 0.8;

/** Backend CoG'si ile istemci hesabı bu cm farkını aşarsa metrik şüphelidir. */
const COG_MISMATCH_THRESHOLD_CM = 0.5;

/**
 * `AllowedRotations` → motorun üreteceği rotasyon enum'ları. Kaynak:
 * PlacementValidator.GetOrientations:215-260. Sıra motorun döndürdüğü sıradır
 * ama denetim için yalnızca küme üyeliği önemlidir.
 *
 * AllowedRotations: 0=All 1=NoVertical 2=Fixed/AllLocked 3=NoYaw 4=PitchOnly 5=RollOnly
 * Rotation:         0=NoRotation 1=Yaw 2=Pitch 3=Roll 4=YawPitch 5=RollYaw
 */
const ALLOWED_ROTATION_SET: Record<number, readonly number[]> = {
  0: [0, 1, 3, 2, 4, 5],
  1: [0, 1],
  2: [0],
  3: [0, 3, 2],
  4: [0, 2],
  5: [0, 3],
};

function skipped(
  id: CheckResult['id'],
  label: string,
  sourceRef: string,
  detail: string,
  severity: CheckResult['severity'] = 'hard',
): CheckResult {
  return { id, label, status: 'skipped', severity, failedPlacementIndices: [], detail, sourceRef };
}

/**
 * Tek bir kutuya bağlanamayan ihlaller için. Korunum gibi kurallarda suçlu
 * yerleşen kutu değil, dönmeyen kutudur; canvas'ta boyanacak indeks yoktur.
 */
function globalVerdict(
  id: CheckResult['id'],
  label: string,
  sourceRef: string,
  failed: boolean,
  detail: string,
): CheckResult {
  return {
    id,
    label,
    status: failed ? 'fail' : 'pass',
    severity: 'hard',
    failedPlacementIndices: [],
    detail,
    sourceRef,
  };
}

function verdict(
  id: CheckResult['id'],
  label: string,
  sourceRef: string,
  failed: number[],
  detail?: string,
  severity: CheckResult['severity'] = 'hard',
): CheckResult {
  return {
    id,
    label,
    status: failed.length > 0 ? 'fail' : 'pass',
    severity,
    failedPlacementIndices: failed,
    detail,
    sourceRef,
  };
}

function itemOf(placement: Placement, itemsById: Map<string, Item>): Item | undefined {
  return itemsById.get(placement.itemId);
}

/** Ağırlığı bilinmeyen yerleşim varsa ağırlık temelli kurallar koşulamaz. */
function missingWeightCount(input: CheckInput): number {
  return input.placements.filter((p) => !input.itemsById.has(p.itemId)).length;
}

// ── Konteyner sınırları ───────────────────────────────────────────────────────
// OptimizationEngine.cs:90-92 — aday pozisyon araç iç ölçülerini aşarsa reddedilir.
export function checkBounds(input: CheckInput): CheckResult {
  const id = 'bounds' as const;
  const label = CHECK_LABEL.bounds;
  const sourceRef = 'OptimizationEngine.cs:90-92';
  const { vehicle, placements } = input;

  if (!vehicle) return skipped(id, label, sourceRef, 'Araç bilgisi yok');

  const failed: number[] = [];
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const overflows =
      p.positionX < -CONTACT_EPSILON_CM ||
      p.positionY < -CONTACT_EPSILON_CM ||
      p.positionZ < -CONTACT_EPSILON_CM ||
      p.positionX + p.width > vehicle.width + CONTACT_EPSILON_CM ||
      p.positionY + p.height > vehicle.height + CONTACT_EPSILON_CM ||
      p.positionZ + p.depth > vehicle.length + CONTACT_EPSILON_CM;
    if (overflows) failed.push(i);
  }

  return verdict(id, label, sourceRef, failed);
}

// ── Çakışma ───────────────────────────────────────────────────────────────────
// PlacementValidator.cs:22-47 — kesin eşitsizlik; yüzey teması çakışma değil.
export function checkOverlap(input: CheckInput): CheckResult {
  const id = 'overlap' as const;
  const label = CHECK_LABEL.overlap;
  const sourceRef = 'PlacementValidator.cs:22-47';
  const { placements } = input;

  const failed = new Set<number>();
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (boxesIntersect(placements[i], placements[j])) {
        failed.add(i);
        failed.add(j);
      }
    }
  }

  return verdict(id, label, sourceRef, [...failed].sort((a, b) => a - b));
}

// ── %80 zemin desteği ─────────────────────────────────────────────────────────
// PlacementValidator.cs:60-80 — y=0 her zaman destekli; yalnızca üst yüzü tam
// olarak o y'de olan kutular destek sayılır.
export function checkSupport(input: CheckInput): CheckResult {
  const id = 'support' as const;
  const label = CHECK_LABEL.support;
  const sourceRef = 'PlacementValidator.cs:60-80';
  const { placements } = input;

  const failed: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    if (p.positionY <= CONTACT_EPSILON_CM) continue;

    const footprint = p.width * p.depth;
    if (footprint === 0) continue;

    let supported = 0;
    for (const other of placements) {
      if (other === p) continue;
      if (Math.abs(topY(other) - p.positionY) > CONTACT_EPSILON_CM) continue;
      supported += footprintOverlapArea(p, other);
    }

    const ratio = supported / footprint;
    if (ratio < SUPPORT_RATIO_THRESHOLD) {
      failed.push(i);
      if (details.length < 3) details.push(`#${i} %${(ratio * 100).toFixed(0)}`);
    }
  }

  return verdict(
    id,
    label,
    sourceRef,
    failed,
    failed.length > 0 ? `En kötüler: ${details.join(', ')}` : undefined,
  );
}

// ── İstiflenebilirlik ─────────────────────────────────────────────────────────
// PlacementValidator.cs:92-116 — doğrudan alttaki kutu istiflenemezse reddedilir.
export function checkStackable(input: CheckInput): CheckResult {
  const id = 'stackable' as const;
  const label = CHECK_LABEL.stackable;
  const sourceRef = 'PlacementValidator.cs:92-116';
  const { placements, itemsById } = input;

  const hasNonStackable = placements.some((p) => itemOf(p, itemsById)?.isStackable === false);
  if (!hasNonStackable)
    return skipped(id, label, sourceRef, 'Senaryoda istiflenemez ürün yok');

  const failed: number[] = [];
  for (let i = 0; i < placements.length; i++) {
    const above = placements[i];
    const blocked = placements.some(
      (below) => restsDirectlyOn(above, below) && itemOf(below, itemsById)?.isStackable === false,
    );
    if (blocked) failed.push(i);
  }

  return verdict(id, label, sourceRef, failed);
}

// ── Azami istif adedi ─────────────────────────────────────────────────────────
// PlacementValidator.cs:120-142 — MaxStackCount<=0 sınırsız; üstteki TÜM kutular
// sayılır. Bitmiş listede aday zaten sayıldığı için motorun +1'i yok.
export function checkStackCount(input: CheckInput): CheckResult {
  const id = 'stackCount' as const;
  const label = CHECK_LABEL.stackCount;
  const sourceRef = 'PlacementValidator.cs:120-142';
  const { placements, itemsById } = input;

  const limited = placements.some((p) => (itemOf(p, itemsById)?.maxStackCount ?? 0) > 0);
  if (!limited) return skipped(id, label, sourceRef, 'Senaryoda istif adedi sınırlı ürün yok');

  const failed: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < placements.length; i++) {
    const limit = itemOf(placements[i], itemsById)?.maxStackCount ?? 0;
    if (limit <= 0) continue;

    const above = indicesAbove(placements, i).length;
    if (above > limit) {
      failed.push(i);
      if (details.length < 3) details.push(`#${i}: ${above} > ${limit}`);
    }
  }

  return verdict(id, label, sourceRef, failed, details.length > 0 ? details.join(', ') : undefined);
}

// ── Üste binen azami ağırlık ──────────────────────────────────────────────────
// PlacementValidator.cs:147-172 — MaxWeightOnTop<=0 sınırsız; üstteki TÜM
// kutuların ağırlığı toplanır.
export function checkWeightOnTop(input: CheckInput): CheckResult {
  const id = 'weightOnTop' as const;
  const label = CHECK_LABEL.weightOnTop;
  const sourceRef = 'PlacementValidator.cs:147-172';
  const { placements, itemsById } = input;

  const missing = missingWeightCount(input);
  if (missing > 0)
    return skipped(id, label, sourceRef, `${missing} yerleşimin ürün kaydı bulunamadı`);

  const limited = placements.some((p) => (itemOf(p, itemsById)?.maxWeightOnTop ?? 0) > 0);
  if (!limited) return skipped(id, label, sourceRef, 'Senaryoda üst ağırlık sınırı olan ürün yok');

  const failed: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < placements.length; i++) {
    const limit = itemOf(placements[i], itemsById)?.maxWeightOnTop ?? 0;
    if (limit <= 0) continue;

    const weightAbove = indicesAbove(placements, i).reduce(
      (sum, index) => sum + (itemOf(placements[index], itemsById)?.weight ?? 0),
      0,
    );
    if (weightAbove > limit) {
      failed.push(i);
      if (details.length < 3) details.push(`#${i}: ${weightAbove.toFixed(1)} > ${limit} kg`);
    }
  }

  return verdict(id, label, sourceRef, failed, details.length > 0 ? details.join(', ') : undefined);
}

// ── Kırılganlık ───────────────────────────────────────────────────────────────
// PlacementValidator.cs:188-207 — yalnızca FragilityType.Fragile (1) okunur;
// kırılgan kutunun üstüne hiçbir şey konamaz. Kural tek yönlüdür.
const FRAGILITY_FRAGILE = 1;

export function checkFragility(input: CheckInput): CheckResult {
  const id = 'fragility' as const;
  const label = CHECK_LABEL.fragility;
  const sourceRef = 'PlacementValidator.cs:188-207';
  const { placements, itemsById } = input;

  const hasFragile = placements.some((p) => itemOf(p, itemsById)?.fragility === FRAGILITY_FRAGILE);
  if (!hasFragile)
    return skipped(id, label, sourceRef, 'Senaryoda FragilityType=1 (Fragile) ürün yok');

  const failed: number[] = [];
  for (let i = 0; i < placements.length; i++) {
    if (itemOf(placements[i], itemsById)?.fragility !== FRAGILITY_FRAGILE) continue;
    if (indicesAbove(placements, i).length > 0) failed.push(i);
  }

  return verdict(id, label, sourceRef, failed);
}

// ── Rotasyon izinleri ─────────────────────────────────────────────────────────
// PlacementValidator.GetOrientations:215-260 — motor yalnızca izin verilen
// yönelimleri üretir, dolayısıyla çıktıdaki her rotasyon o kümede olmalı.
export function checkRotation(input: CheckInput): CheckResult {
  const id = 'rotation' as const;
  const label = CHECK_LABEL.rotation;
  const sourceRef = 'PlacementValidator.cs:215-260';
  const { placements, itemsById } = input;

  const known = placements.filter((p) => itemsById.has(p.itemId));
  if (known.length === 0) return skipped(id, label, sourceRef, 'Ürün kayıtları bulunamadı');

  const restricted = known.some((p) => (itemOf(p, itemsById)?.allowedRotations ?? 0) !== 0);
  if (!restricted)
    return skipped(id, label, sourceRef, 'Tüm ürünlerde tüm rotasyonlar serbest (All)');

  const failed: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < placements.length; i++) {
    const item = itemOf(placements[i], itemsById);
    if (!item) continue;
    const allowed = ALLOWED_ROTATION_SET[item.allowedRotations] ?? ALLOWED_ROTATION_SET[0];
    if (!allowed.includes(placements[i].rotation)) {
      failed.push(i);
      if (details.length < 3)
        details.push(`#${i}: rotasyon ${placements[i].rotation}, izin ${item.allowedRotations}`);
    }
  }

  return verdict(id, label, sourceRef, failed, details.length > 0 ? details.join(', ') : undefined);
}

// ── LIFO dikey kuralı ─────────────────────────────────────────────────────────
// PlacementValidator.cs:107-113 — daha geç inen, daha erken inenin üstüne
// konamaz. Motor bunu yalnızca Lifo kriterinde uygular (OptimizationEngine.cs:96-97).
export function checkLifoVertical(input: CheckInput): CheckResult {
  const id = 'lifoVertical' as const;
  const label = CHECK_LABEL.lifoVertical;
  const sourceRef = 'PlacementValidator.cs:107-113';
  const { placements, criteria, unloadingOrderByItemId } = input;

  if (criteria !== OptimizationCriteria.Lifo)
    return skipped(id, label, sourceRef, 'Yalnızca LIFO kriterinde uygulanır');

  const orders = new Set(
    placements.map((p) => unloadingOrderByItemId.get(p.itemId)).filter((o) => o !== undefined),
  );
  if (orders.size < 2)
    return skipped(id, label, sourceRef, 'En az 2 farklı boşaltma sırası gerekir');

  const failed: number[] = [];
  for (let i = 0; i < placements.length; i++) {
    const aboveOrder = unloadingOrderByItemId.get(placements[i].itemId);
    if (aboveOrder === undefined) continue;

    const violates = placements.some((below) => {
      if (!restsDirectlyOn(placements[i], below)) return false;
      const belowOrder = unloadingOrderByItemId.get(below.itemId);
      return belowOrder !== undefined && aboveOrder > belowOrder;
    });
    if (violates) failed.push(i);
  }

  return verdict(id, label, sourceRef, failed);
}

// ── Toplam ağırlık ────────────────────────────────────────────────────────────
// OptimizationEngine.cs:64-68 — kümülatif ağırlık araç kapasitesini aşarsa kutu
// yerleştirilmez.
// ── Korunum ───────────────────────────────────────────────────────────────────
// OptimizationEngine.cs:122-131 — motor her kutu için ya `placements`a ya
// `unplaced`a yazar; üçüncü bir yol yoktur. Bu kural o değişmezi dışarıdan
// doğrular: kutu sessizce düşerse başka hiçbir denetim kırmızıya dönmez, çünkü
// diğer on iki kural yalnızca DÖNEN yerleşimlere bakar.
export function checkConservation(input: CheckInput): CheckResult {
  const id = 'conservation' as const;
  const label = CHECK_LABEL.conservation;
  const sourceRef = 'OptimizationEngine.cs:122-131';
  const { placements, requestedCount, unplacedCount, backendPlacedQuantity } = input;

  if (requestedCount <= 0) return skipped(id, label, sourceRef, 'Senaryoda istenen kutu yok');
  if (unplacedCount === null)
    return skipped(id, label, sourceRef, 'Kaynak yerleşemeyen adedini bildirmiyor');

  const accounted = placements.length + unplacedCount;
  const lost = requestedCount - accounted;

  if (lost !== 0) {
    return globalVerdict(
      id,
      label,
      sourceRef,
      true,
      `${requestedCount} istendi, ${placements.length} yerleşti, ${unplacedCount} raporlandı — ` +
        `${Math.abs(lost)} kutu ${lost > 0 ? 'kayboldu' : 'fazladan döndü'}`,
    );
  }

  // Metrik ile satırların ayrışması da korunum ihlalidir: biri diğerini yalanlıyor.
  if (backendPlacedQuantity !== null && backendPlacedQuantity !== placements.length) {
    return globalVerdict(
      id,
      label,
      sourceRef,
      true,
      `Backend ${backendPlacedQuantity} yerleşti diyor ama ${placements.length} yerleşim satırı döndü`,
    );
  }

  return globalVerdict(
    id,
    label,
    sourceRef,
    false,
    `${requestedCount} = ${placements.length} yerleşen + ${unplacedCount} yerleşemeyen`,
  );
}

export function checkTotalWeight(input: CheckInput): CheckResult {
  const id = 'totalWeight' as const;
  const label = CHECK_LABEL.totalWeight;
  const sourceRef = 'OptimizationEngine.cs:64-68';
  const { placements, itemsById, vehicle } = input;

  if (!vehicle) return skipped(id, label, sourceRef, 'Araç bilgisi yok');

  const missing = missingWeightCount(input);
  if (missing > 0)
    return skipped(id, label, sourceRef, `${missing} yerleşimin ürün kaydı bulunamadı`);

  const total = placements.reduce((sum, p) => sum + (itemOf(p, itemsById)?.weight ?? 0), 0);
  const exceeded = total > vehicle.maxCargoWeight + CONTACT_EPSILON_CM;

  return verdict(
    id,
    label,
    sourceRef,
    exceeded ? placements.map((_, i) => i) : [],
    `${total.toFixed(1)} / ${vehicle.maxCargoWeight} kg`,
  );
}

// ── CoG çapraz kontrolü ───────────────────────────────────────────────────────
// OptimizationEngine.cs:161-177 — cog = Σ(w·merkez)/Σw; denge offseti YARIM
// açıklığa göre normalize edilip yüzdeye çevrilir ve 1 haneye yuvarlanır.
export function checkCogMismatch(input: CheckInput): CheckResult {
  const id = 'cogMismatch' as const;
  const label = CHECK_LABEL.cogMismatch;
  const sourceRef = 'OptimizationEngine.cs:161-177';
  const { placements, itemsById, vehicle, backendCog } = input;

  if (!backendCog) return skipped(id, label, sourceRef, 'Backend CoG bildirmedi');
  if (!vehicle) return skipped(id, label, sourceRef, 'Araç bilgisi yok');

  const missing = missingWeightCount(input);
  if (missing > 0)
    return skipped(id, label, sourceRef, `${missing} yerleşimin ürün kaydı bulunamadı`);

  const totalWeight = placements.reduce((sum, p) => sum + (itemOf(p, itemsById)?.weight ?? 0), 0);
  if (totalWeight <= 0) return skipped(id, label, sourceRef, 'Toplam ağırlık sıfır');

  const moment = { x: 0, y: 0, z: 0 };
  for (const p of placements) {
    const weight = itemOf(p, itemsById)?.weight ?? 0;
    moment.x += weight * (p.positionX + p.width / 2);
    moment.y += weight * (p.positionY + p.height / 2);
    moment.z += weight * (p.positionZ + p.depth / 2);
  }

  const clientCog = {
    x: moment.x / totalWeight,
    y: moment.y / totalWeight,
    z: moment.z / totalWeight,
  };

  const deltas = {
    x: Math.abs(clientCog.x - backendCog.x),
    y: Math.abs(clientCog.y - backendCog.y),
    z: Math.abs(clientCog.z - backendCog.z),
  };
  const worst = Math.max(deltas.x, deltas.y, deltas.z);

  // Denge offseti YARIM açıklığa göre normalize edilip yüzdeye çevrilir; bu,
  // yuvarlamayı da kapsayan ikinci bir bağımsız kontroldür.
  const offsetDeltas = [
    offsetDelta(clientCog.x, vehicle.width / 2, input.backendBalanceOffsetX),
    offsetDelta(clientCog.z, vehicle.length / 2, input.backendBalanceOffsetZ),
  ].filter((value): value is number => value !== null);

  const details = [
    `CoG sapması X ${deltas.x.toFixed(2)} · Y ${deltas.y.toFixed(2)} · Z ${deltas.z.toFixed(2)} cm`,
  ];
  if (offsetDeltas.length > 0) {
    details.push(`denge offseti sapması en çok ${Math.max(...offsetDeltas).toFixed(2)} puan`);
  }

  return {
    id,
    label,
    status: worst > COG_MISMATCH_THRESHOLD_CM ? 'fail' : 'pass',
    severity: 'hard',
    // Tüm yerleşimler hesaba girdiği için ihlal tek bir kutuya atfedilemez.
    failedPlacementIndices: [],
    detail: details.join(' · '),
    sourceRef,
  };
}

/** Yuvarlamayı da kapsayan denge offseti farkı; backend değeri yoksa null. */
function offsetDelta(cogAxis: number, halfSpan: number, backendOffset: number | null): number | null {
  if (backendOffset === null || halfSpan <= 0) return null;
  const clientOffset = Math.round((Math.abs(cogAxis - halfSpan) / halfSpan) * 100 * 10) / 10;
  return Math.abs(clientOffset - backendOffset);
}

// ── LIFO bölge uyumu (yumuşak) ────────────────────────────────────────────────
// LifoPlacement.cs:44-90 — bölge dışına çıkmak SKOR CEZASIDIR, yasak değil.
// Boş yer kalmadığında motor bilinçli olarak taşırır; bu yüzden ihlal değil
// ölçüt olarak raporlanır.
export function checkLifoZone(input: CheckInput): CheckResult {
  const id = 'lifoZone' as const;
  const label = CHECK_LABEL.lifoZone;
  const sourceRef = 'LifoPlacement.cs:44-90';
  const { placements, zones, unloadingOrderByItemId } = input;

  if (zones.length === 0)
    return skipped(id, label, sourceRef, 'Bu koşuda bölge oluşmadı', 'soft');

  const { overflowingIndices: overflowing, totalOverflowCm: totalOverflow } = measureZoneOverflow(
    placements,
    zones,
    unloadingOrderByItemId,
    CONTACT_EPSILON_CM,
  );

  return {
    id,
    label,
    // Yumuşak kural: taşma "fail" olarak işaretlenir ama severity 'soft' olduğu
    // için arayüzde ihlal değil uyarı olarak gösterilir.
    status: overflowing.length > 0 ? 'fail' : 'pass',
    severity: 'soft',
    failedPlacementIndices: overflowing,
    detail:
      overflowing.length > 0
        ? `${overflowing.length} kutu bölge dışında, toplam ${totalOverflow.toFixed(0)} cm taşma`
        : 'Tüm gruplar kendi bölgesinde',
    sourceRef,
  };
}
