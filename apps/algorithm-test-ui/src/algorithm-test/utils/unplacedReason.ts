import { UnplacedReason } from '@/lib/types/loadingPlan';

/**
 * Backend `UnplacedItemDto.Reason` alanını sayı olarak döner. Bilinmeyen bir kod
 * gelirse sessizce başka bir sebebe yazmak yerine Unknown'a düşer — eski sürüm
 * "tanımadığın her şeyi Hacim Yetersiz say" dediği için kırılganlık redleri (kod 5)
 * hacim yetersizliği gibi görünüyordu.
 */
export function toUnplacedReason(raw: number): UnplacedReason {
  return isKnownReason(raw) ? raw : UnplacedReason.Unknown;
}

function isKnownReason(raw: number): raw is UnplacedReason {
  return (Object.values(UnplacedReason) as number[]).includes(raw);
}

/**
 * `InsufficientSpace` motorun çöp kutusu sebebidir: aday konum × izinli rotasyon
 * kombinasyonlarının HİÇBİRİ sert kısıtları geçemediğinde yazılır
 * (OptimizationEngine.cs:122-129). Gerçekten yer kalmamış olabilir, ama destek,
 * istif, üst ağırlık ve rotasyon redleri de aynı koda düşer — yalnızca
 * kırılganlığın kendi kodu var. "Hacim Yetersiz" bu yüzden aktif olarak yanlış
 * yönlendiriyordu; etiket sebebi değil sonucu söylüyor.
 */
export const UNPLACED_REASON_TOOLTIP: Partial<Record<UnplacedReason, string>> = {
  [UnplacedReason.InsufficientSpace]:
    'Motor hiçbir aday konumda geçerli yerleşim bulamadı: yer, %80 destek, istif, ' +
    'üst ağırlık ya da rotasyon kısıtı olabilir — hepsi tek kodla raporlanıyor. ' +
    'Doluluk düşükken görülüyorsa sebep hacim değil, bir kısıttır.',
};

export const UNPLACED_REASON_LABEL: Record<UnplacedReason, string> = {
  [UnplacedReason.Unknown]: 'Bilinmeyen Sebep',
  [UnplacedReason.InsufficientSpace]: 'Uygun Konum Yok',
  [UnplacedReason.WeightLimitExceeded]: 'Ağırlık Limiti Aşıldı',
  [UnplacedReason.StackingNotAllowed]: 'İstif Kısıtı',
  [UnplacedReason.SegregationOrCompatibility]: 'Uyumsuz Yük Grubu',
  [UnplacedReason.FragilityOrHandlingConstraint]: 'Kırılganlık / Elleçleme Kısıtı',
  [UnplacedReason.RotationOrGeometryConstraint]: 'Rotasyon / Geometri Kısıtı',
  [UnplacedReason.Other]: 'Diğer',
};

/**
 * Motorun bugün HİÇ üretmediği sebep kodları. Bunlarda sıfır görmek "böyle bir
 * red olmadı" anlamına gelmez — istif ve rotasyon redleri `InsufficientSpace`'e
 * düşüyor, çünkü motor aday pozisyonu eleyip aramaya devam ediyor ve hiçbir
 * pozisyon bulunamadığında tek bir sebep koduyla raporluyor
 * (OptimizationEngine.cs:128-129).
 */
const NEVER_EMITTED_REASONS: readonly UnplacedReason[] = [
  UnplacedReason.Unknown,
  UnplacedReason.StackingNotAllowed,
  UnplacedReason.RotationOrGeometryConstraint,
  UnplacedReason.Other,
];

export function isNeverEmittedReason(reason: UnplacedReason): boolean {
  return NEVER_EMITTED_REASONS.includes(reason);
}

export type UnplacedReasonTotals = Record<UnplacedReason, number>;

export function emptyReasonTotals(): UnplacedReasonTotals {
  return {
    [UnplacedReason.Unknown]: 0,
    [UnplacedReason.InsufficientSpace]: 0,
    [UnplacedReason.WeightLimitExceeded]: 0,
    [UnplacedReason.StackingNotAllowed]: 0,
    [UnplacedReason.SegregationOrCompatibility]: 0,
    [UnplacedReason.FragilityOrHandlingConstraint]: 0,
    [UnplacedReason.RotationOrGeometryConstraint]: 0,
    [UnplacedReason.Other]: 0,
  };
}

/** Sıfır olmayan sebepleri etiketleriyle döner — rozet/satır üretimi için. */
export function listNonZeroReasons(
  totals: UnplacedReasonTotals,
): Array<{ reason: UnplacedReason; label: string; count: number }> {
  return (Object.values(UnplacedReason) as UnplacedReason[])
    .filter((reason) => totals[reason] > 0)
    .map((reason) => ({ reason, label: UNPLACED_REASON_LABEL[reason], count: totals[reason] }));
}
