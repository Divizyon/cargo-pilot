import { z } from 'zod';

export const VehicleType = {
  Tir: 'Tir',
  Kamyon: 'Kamyon',
  Kamposet: 'Kamposet',
  Konteyner: 'Konteyner',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

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
  // Uzak yüz (z = 0) bilinçli olarak yok: hiçbir kapı tipi orada bulunamaz.
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

export const vehicleDoorSchema = z.object({
  type: z.enum(Object.values(DoorType) as [DoorType, ...DoorType[]]),
  face: z.enum(Object.values(DoorFace) as [DoorFace, ...DoorFace[]]),
});

export type VehicleDoor = z.infer<typeof vehicleDoorSchema>;

/** Her kapı tipinin bulunabileceği yüzler — backend VehicleDoorRules ile aynı. */
export const ALLOWED_DOOR_FACES: Record<DoorType, readonly DoorFace[]> = {
  [DoorType.Small]: [DoorFace.LengthZ],
  [DoorType.Big]: [DoorFace.ZeroX, DoorFace.WidthX],
  [DoorType.Top]: [DoorFace.HeightY],
};

const DOOR_TYPE_LABELS: Record<DoorType, string> = {
  [DoorType.Small]: 'arka kapı',
  [DoorType.Big]: 'yan kapı',
  [DoorType.Top]: 'üst kapı',
};

/**
 * Kapı listesini doğrular; sorun varsa mesajı, yoksa null döner.
 * Backend'deki VehicleDoorRules ile aynı kurallar — form, sunucuya gitmeden
 * aynı cevabı verir.
 */
export function validateDoors(doors: readonly VehicleDoor[]): string | null {
  if (doors.length === 0) return 'Araçta en az bir kapı bulunmalıdır.';

  const seen = new Set<DoorType>();
  for (const door of doors) {
    if (seen.has(door.type)) {
      return `Aynı tipten birden fazla kapı tanımlanamaz: ${DOOR_TYPE_LABELS[door.type]}.`;
    }
    seen.add(door.type);

    if (!ALLOWED_DOOR_FACES[door.type].includes(door.face)) {
      return `${DOOR_TYPE_LABELS[door.type]} bu yüze yerleştirilemez.`;
    }
  }

  return null;
}

/**
 * Kapı listesini kullanıcıya gösterilecek tek satıra indirger.
 * "sol/sağ" yalnızca arayüz metnidir; kayıtta yüz değeri (ZeroX/WidthX) durur.
 */
export function formatDoorSummary(doors: readonly VehicleDoor[] | undefined): string {
  if (!doors || doors.length === 0) return '—';

  const parts: string[] = [];
  if (doors.some((door) => door.type === DoorType.Small)) parts.push('Arka');

  const side = doors.find((door) => door.type === DoorType.Big);
  if (side) parts.push(side.face === DoorFace.ZeroX ? 'Yan (sol)' : 'Yan (sağ)');

  if (doors.some((door) => door.type === DoorType.Top)) parts.push('Üst');

  return parts.length > 0 ? parts.join(' + ') : '—';
}

/**
 * Büyük kapının varsayılan yüzü: origin'e değmeyen taraf.
 *
 * Origin (0,0,0) x = 0 yüzündedir. Kapı oraya konursa yükleme kapının dibinden
 * başlar; x = width yüzü seçilince origin köşesi serbest kalır ve motor
 * yüklemeyi oradan başlatır (docs/COORDINATE_STANDARD.md §7).
 */
export const DEFAULT_BIG_DOOR_FACE: DoorFace = DoorFace.WidthX;

export function findDoor(doors: readonly VehicleDoor[], type: DoorType): VehicleDoor | undefined {
  return doors.find((door) => door.type === type);
}

/**
 * Yüklemenin başladığı köşe x = width tarafında mı?
 *
 * Yükleme kapıya değmeyen köşeden başlar (§7). Yan kapı x = 0'daysa serbest
 * köşe karşı tarafta kalır, doldurma ters yönde ilerler.
 */
export function fillsFromMaxX(doors: readonly VehicleDoor[]): boolean {
  // Backend (`LoadingCorner.FillFromMaxX`) ayrıca "x = width'te de big door var
  // mı" diye bakar; burada gerek yok çünkü her tipten tek kapı kuralı
  // veritabanında zorlanıyor (IX_VehicleDoors_TekKapiTipi) ve iki big door'lu
  // liste bu katmana hiç ulaşamaz. Backend'deki koruma kısıt gevşerse
  // davranışın tanımsız kalmaması için duruyor (denetim S-65).
  return findDoor(doors, DoorType.Big)?.face === DoorFace.ZeroX;
}

/** Araçta referans kapı (arka kapı) var mı? LIFO bölge ayrımının ön koşulu. */
export function hasReferenceDoor(doors: readonly VehicleDoor[]): boolean {
  return doors.some((door) => door.type === DoorType.Small);
}

const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as [VehicleType, ...VehicleType[]];

const axleSchema = z.object({
  distance: z.number().positive(),
  tareWeight: z.number().min(0),
  maxLoad: z.number().positive(),
});

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPE_VALUES),
  description: z.string().optional(),
  plate: z.string().optional(),
  serialNumber: z.string().optional(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  maxCargoWeight: z.number().positive(),
  grossWeight: z.number().positive().optional(),
  tareWeight: z.number().min(0).optional(),
  maxLayerCount: z.number().int().positive().optional(),
  doors: z.array(vehicleDoorSchema).default([]),
  kingpin: axleSchema.optional(),
  axleB: axleSchema.optional(),
  axles: z.array(axleSchema).optional(),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  status: z.enum(['active', 'draft', 'taslak']).optional(),
  createdAt: z.string().datetime(),
  createdBy: z.object({ id: z.string(), fullName: z.string() }),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.object({ id: z.string(), fullName: z.string() }).optional(),
  payload: z.number().positive().optional(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
