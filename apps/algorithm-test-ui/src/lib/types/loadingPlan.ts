/**
 * Backend yerleştirmeyi bottom-left-rear köşe konumu + rotasyon enum'u olarak döner;
 * gerçek kenar uzunlukları `loadingPlanMappers.placedDimensions` ile türetilir.
 * Bu yüzden burada rotasyon değil, doğrudan yerleşmiş boyutlar tutulur.
 */
export interface Placement {
  itemId: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  /**
   * Motorun seçtiği rotasyon (0-5). Kenar uzunlukları buna göre türetilmiş
   * olsa da enum ayrıca tutulur: hangi yönelimin seçildiği algoritma testinde
   * doğrudan incelenen bir çıktıdır.
   */
  rotation: number;
  isViolation: boolean;
  color?: string;
}

/** LoadingPlanPlacementRotation.cs sırası; kenar eşlemesi placedDimensions'ta. */
export const ROTATION_LABEL: Record<number, string> = {
  0: 'NoRotation (W,H,L)',
  1: 'Yaw (L,H,W)',
  2: 'Pitch (W,L,H)',
  3: 'Roll (H,W,L)',
  4: 'YawPitch (H,L,W)',
  5: 'RollYaw (L,W,H)',
};

export const OptimizationCriteria = {
  Lifo: 0,
  WeightBalance: 1,
  VolumeFirst: 2,
} as const;

export type OptimizationCriteria = (typeof OptimizationCriteria)[keyof typeof OptimizationCriteria];

/**
 * CargoPilot.Domain/Enums/UnplacedReason.cs ile birebir. Sayı olarak serileşir
 * (WebAPI'de JsonStringEnumConverter kayıtlı değil).
 *
 * Motor bugün yalnızca 1, 2, 4 ve 5'i üretiyor:
 *   1 → OptimizationEngine.cs:129   2 → OptimizationEngine.cs:66
 *   4 → ContaminationFilter.cs:96   5 → OptimizationEngine.cs:128
 * 0, 3, 6 ve 7 hiç üretilmiyor ama backend değişirse sessizce yanlış
 * etiketlenmesinler diye burada tutuluyor.
 */
export const UnplacedReason = {
  Unknown: 0,
  InsufficientSpace: 1,
  WeightLimitExceeded: 2,
  StackingNotAllowed: 3,
  SegregationOrCompatibility: 4,
  FragilityOrHandlingConstraint: 5,
  RotationOrGeometryConstraint: 6,
  Other: 7,
} as const;

export type UnplacedReason = (typeof UnplacedReason)[keyof typeof UnplacedReason];
