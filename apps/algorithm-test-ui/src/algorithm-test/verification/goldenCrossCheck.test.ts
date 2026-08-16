import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Item } from '@/lib/types/item';
import { OptimizationCriteria, type Placement } from '@/lib/types/loadingPlan';
import { DoorFace, DoorType, type Vehicle, type VehicleDoor } from '@/lib/types/vehicle';
import { computeGroupZones, measureZoneOverflow } from './lifoZones';
import { runChecks } from './runChecks';
import type { CheckInput } from './types';

/**
 * Denetleyicilerin motora uyumluluk kanıtı.
 *
 * `apps/backend/CargoPilot.Engine.Tests/Snapshots/*.json` dosyaları motorun
 * girdi+çıktı çiftlerini pinler (GoldenMaster.cs). Motor bu çıktıları kendi sert
 * kısıtlarına uyarak üretmiş olduğuna göre, istemci denetleyicileri de hepsini
 * `pass` ya da `skipped` vermek zorundadır.
 *
 * Bir `fail` çıkarsa iki olasılık var ve ikisi de bilinmeli:
 *   1) denetleyici motoru yanlış aynalıyor,
 *   2) fixture gerçek bir motor hatasını pinliyor.
 * Snapshot dosyaları burada yalnızca okunur; test onları güncellemez.
 */

const SNAPSHOT_DIR = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../../backend/CargoPilot.Engine.Tests/Snapshots',
);

const CRITERIA_BY_NAME: Record<string, OptimizationCriteria> = {
  Lifo: OptimizationCriteria.Lifo,
  WeightBalance: OptimizationCriteria.WeightBalance,
  VolumeFirst: OptimizationCriteria.VolumeFirst,
};

/**
 * LoadingType.cs → kapı listesi. Yan kapı varyantları artık tek değere inmiyor:
 * x = 0 ile x = width ayrımı başlangıç köşesini belirliyor.
 * Snapshot `FillFromMaxX`/`HasReferenceDoor` de taşıdığı için senaryonun gerçek
 * kapı kümesi bu iki alandan kurulur; `LoadingType` yalnızca geri uyum.
 */
const DOORS_BY_LOADING_TYPE: Record<string, readonly VehicleDoor[]> = {
  Rear: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
  SideRight: [{ type: DoorType.Big, face: DoorFace.WidthX }],
  SideLeft: [{ type: DoorType.Big, face: DoorFace.ZeroX }],
  Top: [{ type: DoorType.Top, face: DoorFace.HeightY }],
};

/**
 * Snapshot'ın kapı kümesi: motor kararını `FillFromMaxX` ve `HasReferenceDoor`
 * üzerinden verdiği için ayna da bu iki alandan kurulur.
 */
function doorsFromSnapshot(vehicle: Snapshot['Vehicle']): VehicleDoor[] {
  const doors: VehicleDoor[] = [];

  const referenceDoor = vehicle.HasReferenceDoor ?? vehicle.LoadingType === 'Rear';
  if (referenceDoor) doors.push({ type: DoorType.Small, face: DoorFace.LengthZ });

  if (vehicle.FillFromMaxX) {
    doors.push({ type: DoorType.Big, face: DoorFace.ZeroX });
  } else if (!referenceDoor) {
    doors.push(...(DOORS_BY_LOADING_TYPE[vehicle.LoadingType] ?? []));
  }

  return doors;
}

/** LoadingPlanPlacementRotation.cs sırası. */
const ROTATION_BY_NAME: Record<string, number> = {
  NoRotation: 0,
  Yaw: 1,
  Pitch: 2,
  Roll: 3,
  YawPitch: 4,
  RollYaw: 5,
};

/** AllowedRotations.cs sırası; 2 hem `Fixed` hem `AllLocked` adıyla geçiyor. */
const ALLOWED_ROTATIONS_BY_NAME: Record<string, number> = {
  All: 0,
  NoVertical: 1,
  Fixed: 2,
  AllLocked: 2,
  NoYaw: 3,
  PitchOnly: 4,
  RollOnly: 5,
};

/**
 * Snapshot şeması zod ile doğrulanır.
 *
 * Önceden yapısal `interface` + `as Snapshot` cast'i vardı: fixture `Length`
 * yazarken test `Depth` okuyordu ve TypeScript uyarmıyordu. Her yerleştirme
 * `length: undefined` ile giriyor, tüm Z tabanlı karşılaştırmalar `NaN` üretiyor
 * ve `NaN > eşik` her zaman `false` döndüğü için çakışma, Z taşması, ağırlık
 * merkezi ve bölge kuralları sessizce "pass" veriyordu (denetim S-07).
 * Şema artık alan adı kaymasını yükleme anında yakalar.
 */
const snapshotItemSchema = z.object({
  ItemId: z.string(),
  Sku: z.string(),
  Width: z.number(),
  Height: z.number(),
  Length: z.number(),
  Weight: z.number(),
  IsStackable: z.boolean(),
  MaxStackCount: z.number(),
  MaxWeightOnTop: z.number(),
  AllowedRotations: z.string(),
  Quantity: z.number(),
  GroupId: z.string().nullable(),
  UnloadingOrder: z.number().nullable(),
});

const snapshotPlacementSchema = z.object({
  Order: z.number(),
  ItemId: z.string(),
  X: z.number(),
  Y: z.number(),
  Z: z.number(),
  Width: z.number(),
  Height: z.number(),
  Length: z.number(),
  Rotation: z.string(),
  Weight: z.number(),
});

const snapshotSchema = z.object({
  Scenario: z.string(),
  Vehicle: z.object({
    Width: z.number(),
    Height: z.number(),
    Length: z.number(),
    MaxWeight: z.number(),
    Criteria: z.string(),
    LoadingType: z.string(),
    ClusterGroups: z.boolean(),
    FillFromMaxX: z.boolean(),
    HasReferenceDoor: z.boolean().nullable(),
  }),
  Items: z.array(snapshotItemSchema),
  Outcome: z.object({
    TotalWeight: z.number(),
    CenterOfGravityX: z.number().nullable(),
    CenterOfGravityY: z.number().nullable(),
    CenterOfGravityZ: z.number().nullable(),
    WeightBalanceOffsetX: z.number().nullable(),
    WeightBalanceOffsetZ: z.number().nullable(),
    Placements: z.array(snapshotPlacementSchema),
  }),
});

type SnapshotItem = z.infer<typeof snapshotItemSchema>;
type Snapshot = z.infer<typeof snapshotSchema>;

function toVehicle(snapshot: Snapshot): Vehicle {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: snapshot.Scenario,
    width: snapshot.Vehicle.Width,
    height: snapshot.Vehicle.Height,
    length: snapshot.Vehicle.Length,
    maxCargoWeight: snapshot.Vehicle.MaxWeight,
    doors: doorsFromSnapshot(snapshot.Vehicle),
  };
}

function toItem(raw: SnapshotItem): Item {
  return {
    id: raw.ItemId,
    name: raw.Sku,
    sku: raw.Sku,
    width: raw.Width,
    height: raw.Height,
    length: raw.Length,
    weight: raw.Weight,
    isStackable: raw.IsStackable,
    maxStackCount: raw.MaxStackCount,
    // Motorda `<= 0` sınırsız demek; istemci tarafı da aynı eşiği uyguluyor.
    maxWeightOnTop: raw.MaxWeightOnTop,
    // EngineScenario kırılganlık ve ayrışım alanlarını kurmuyor; bu fixture'larda
    // ilgili kurallar `skipped` verecek.
    fragility: 0,
    allowedRotations: ALLOWED_ROTATIONS_BY_NAME[raw.AllowedRotations] ?? 0,
    stackGroup: null,
    incompatibleGroups: [],
  };
}

function toCheckInput(snapshot: Snapshot): CheckInput {
  const vehicle = toVehicle(snapshot);
  const criteria = CRITERIA_BY_NAME[snapshot.Vehicle.Criteria] ?? OptimizationCriteria.VolumeFirst;

  const placements: Placement[] = snapshot.Outcome.Placements.map((p) => ({
    itemId: p.ItemId,
    positionX: p.X,
    positionY: p.Y,
    positionZ: p.Z,
    width: p.Width,
    height: p.Height,
    length: p.Length,
    rotation: ROTATION_BY_NAME[p.Rotation] ?? 0,
    isViolation: false,
  }));

  const itemsById = new Map(snapshot.Items.map((raw) => [raw.ItemId, toItem(raw)]));

  const unloadingOrderByItemId = new Map<string, number>();
  for (const raw of snapshot.Items) {
    if (raw.GroupId !== null && raw.UnloadingOrder !== null) {
      unloadingOrderByItemId.set(raw.ItemId, raw.UnloadingOrder);
    }
  }

  const zones = computeGroupZones(
    [...unloadingOrderByItemId.values()],
    vehicle.length,
    vehicle.doors,
    criteria,
  );

  const { CenterOfGravityX, CenterOfGravityY, CenterOfGravityZ } = snapshot.Outcome;
  const backendCog =
    CenterOfGravityX !== null && CenterOfGravityY !== null && CenterOfGravityZ !== null
      ? { x: CenterOfGravityX, y: CenterOfGravityY, z: CenterOfGravityZ }
      : null;

  return {
    placements,
    vehicle,
    criteria,
    zones,
    itemsById,
    unloadingOrderByItemId,
    backendCog,
    backendBalanceOffsetX: snapshot.Outcome.WeightBalanceOffsetX,
    backendBalanceOffsetZ: snapshot.Outcome.WeightBalanceOffsetZ,
    requestedCount: snapshot.Items.reduce((sum, i) => sum + i.Quantity, 0),
    // Fixture yalnızca yerleşenleri kaydediyor; yerleşemeyenlerin adedi yok.
    // Farktan türetmek korunum kuralını kendi kendini doğrular hâle getirirdi.
    unplacedCount: null,
    backendPlacedQuantity: null,
  };
}

function loadSnapshots(): Snapshot[] {
  return readdirSync(SNAPSHOT_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => snapshotSchema.parse(JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, file), 'utf8'))));
}

const snapshots = loadSnapshots();

describe('golden fixture çapraz kontrolü', () => {
  it('fixture dizini bulunur ve boş değildir', () => {
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it.each(snapshots.map((s) => [s.Scenario, s] as const))(
    '%s — sert kuralların hiçbiri ihlal edilmemiş',
    (_scenario, snapshot) => {
      const results = runChecks(toCheckInput(snapshot));

      const hardFailures = results
        .filter((r) => r.status === 'fail' && r.severity === 'hard')
        .map((r) => `${r.id} (${r.failedPlacementIndices.length} kutu): ${r.detail ?? ''}`);

      expect(hardFailures).toEqual([]);
    },
  );

  /**
   * LIFO bölge aynasının yön doğrulaması.
   *
   * `checkLifoZone` soft severity taşıdığı için yukarıdaki "sert kural ihlali
   * yok" testi bölge yönünü hiç ölçmüyor: ayna ters kurulsa da golden yeşil
   * kalıyordu (denetim S-05/S-06). Motor bu fixture'ları kendi bölge disiplinine
   * uyarak ürettiğine göre taşma tam olarak 0 olmalı.
   */
  it.each(
    snapshots
      .filter((s) => s.Scenario.startsWith('Lifo_') && s.Scenario.includes('Bolge'))
      .map((s) => [s.Scenario, s] as const),
  )('%s — bölge taşması yok (ayna yönü motorla aynı)', (_scenario, snapshot) => {
    const input = toCheckInput(snapshot);
    if (input.zones.length === 0) return; // bölge kurulmayan senaryo

    const { totalOverflowCm, overflowingIndices } = measureZoneOverflow(
      input.placements,
      input.zones,
      input.unloadingOrderByItemId,
      0,
    );

    expect({ totalOverflowCm, tasanKutuSayisi: overflowingIndices.length }).toEqual({
      totalOverflowCm: 0,
      tasanKutuSayisi: 0,
    });
  });

  it('en az bir fixture istif adedi kuralını gerçekten koşturur', () => {
    // Hiçbir fixture kuralı tetiklemiyorsa çapraz kontrol boş güvence verir.
    const exercised = snapshots.some((snapshot) =>
      runChecks(toCheckInput(snapshot)).some((r) => r.id === 'stackCount' && r.status !== 'skipped'),
    );
    expect(exercised).toBe(true);
  });

  it('en az bir fixture rotasyon kuralını gerçekten koşturur', () => {
    const exercised = snapshots.some((snapshot) =>
      runChecks(toCheckInput(snapshot)).some((r) => r.id === 'rotation' && r.status !== 'skipped'),
    );
    expect(exercised).toBe(true);
  });
});
