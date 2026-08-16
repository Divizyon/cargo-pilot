/**
 * Kapı tipi boyuta göre sınıflanır, yöne göre değil
 * (docs/COORDINATE_STANDARD.md §4). "ön kapı" / "sağ kapı" diye bir kavram yoktur.
 */
export const DoorType = {
  /** Kısa yüzde, width x height. Referans kapı. */
  Small: 'Small',
  /** Uzun yan yüzde, length x height. */
  Big: 'Big',
  /** Tavanda, width x length. */
  Top: 'Top',
} as const;

export type DoorType = (typeof DoorType)[keyof typeof DoorType];

/** Kapının bulunduğu yüz, eksen değeriyle yazılır. */
export const DoorFace = {
  /** Referans kapı yüzü. */
  LengthZ: 'LengthZ',
  /** Origin'in bulunduğu uzun yan yüz. */
  ZeroX: 'ZeroX',
  /** Karşı uzun yan yüz. */
  WidthX: 'WidthX',
  /** Tavan. */
  HeightY: 'HeightY',
} as const;

export type DoorFace = (typeof DoorFace)[keyof typeof DoorFace];

export interface VehicleDoor {
  type: DoorType;
  face: DoorFace;
}

/**
 * Araçta referans kapı (small door, z = length) var mı.
 *
 * `LoadingCorner.HasReferenceDoor` aynası: LIFO bölge ayrımının ön koşulu.
 * Eski `DoorDirection` modeli bunu ifade edemiyordu — arka + yan kapılı araç
 * tek bir "side" değerine iniyor ve bölgeler yanlışlıkla kapanıyordu.
 */
export function hasReferenceDoor(doors: readonly VehicleDoor[]): boolean {
  return doors.some((door) => door.type === DoorType.Small);
}

/**
 * Yükleme x = width tarafından mı başlıyor.
 *
 * `LoadingCorner.FillFromMaxX` aynası. Eski modelde `Side` tek değerdi, yani
 * x = 0 ile x = width ayrımı tamamen kayboluyordu; oysa motor için başlangıç
 * köşesini belirleyen tam olarak bu ayrım (docs/COORDINATE_STANDARD.md §7).
 */
export function fillsFromMaxX(doors: readonly VehicleDoor[]): boolean {
  const big = doors.find((door) => door.type === DoorType.Big);
  return big?.face === DoorFace.ZeroX;
}

/** Kapı kümesini kullanıcıya gösterilecek tek satıra indirger. */
export function formatDoorSummary(doors: readonly VehicleDoor[]): string {
  if (doors.length === 0) return 'kapı tanımsız';

  const parts: string[] = [];
  if (doors.some((d) => d.type === DoorType.Small)) parts.push('arka kapı');

  const big = doors.find((d) => d.type === DoorType.Big);
  if (big) parts.push(big.face === DoorFace.ZeroX ? 'yan kapı (sol)' : 'yan kapı (sağ)');

  if (doors.some((d) => d.type === DoorType.Top)) parts.push('üst kapı');

  return parts.join(' + ');
}

/**
 * Motorun okuduğu araç alanları.
 *
 * `CreatePlanCommandHandler.BuildInput` motora yalnızca iç ölçüler, azami
 * ağırlık ve kapı listesini geçirir; dingil yükleri, katman sınırı ve envanter
 * alanları (durum, sahip, tarih) motoru hiç etkilemez ve burada tutulmaz.
 */
export interface Vehicle {
  id: string;
  name: string;
  plate?: string;
  width: number;
  height: number;
  length: number;
  maxCargoWeight: number;
  doors: VehicleDoor[];
}
