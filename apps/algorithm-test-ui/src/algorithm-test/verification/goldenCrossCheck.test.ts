import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import { OptimizationCriteria, type Placement } from '@/lib/types/loadingPlan';
import { DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import { computeGroupZones } from './lifoZones';
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

/** LoadingType.cs → DoorDirection; yan kapı varyantları tek yöne iner. */
const DOOR_BY_LOADING_TYPE: Record<string, DoorDirection> = {
  Rear: DoorDirection.Rear,
  SideRight: DoorDirection.Side,
  SideLeft: DoorDirection.Side,
  SideBoth: DoorDirection.Side,
  Top: DoorDirection.Top,
};

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

interface SnapshotItem {
  ItemId: string;
  Sku: string;
  Width: number;
  Height: number;
  Length: number;
  Weight: number;
  IsStackable: boolean;
  MaxStackCount: number;
  MaxWeightOnTop: number;
  AllowedRotations: string;
  Quantity: number;
  GroupId: string | null;
  UnloadingOrder: number | null;
}

interface SnapshotPlacement {
  Order: number;
  ItemId: string;
  X: number;
  Y: number;
  Z: number;
  Width: number;
  Height: number;
  Depth: number;
  Rotation: string;
  Weight: number;
}

interface Snapshot {
  Scenario: string;
  Vehicle: {
    Width: number;
    Height: number;
    Length: number;
    MaxWeight: number;
    Criteria: string;
    LoadingType: string;
    ClusterGroups: boolean;
  };
  Items: SnapshotItem[];
  Outcome: {
    TotalWeight: number;
    CenterOfGravityX: number | null;
    CenterOfGravityY: number | null;
    CenterOfGravityZ: number | null;
    WeightBalanceOffsetX: number | null;
    WeightBalanceOffsetZ: number | null;
    Placements: SnapshotPlacement[];
  };
}

function toVehicle(snapshot: Snapshot): Vehicle {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: snapshot.Scenario,
    width: snapshot.Vehicle.Width,
    height: snapshot.Vehicle.Height,
    length: snapshot.Vehicle.Length,
    maxCargoWeight: snapshot.Vehicle.MaxWeight,
    doorDirection: DOOR_BY_LOADING_TYPE[snapshot.Vehicle.LoadingType] ?? DoorDirection.Rear,
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
    depth: p.Depth,
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
    vehicle.doorDirection,
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
    .map((file) => JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, file), 'utf8')) as Snapshot);
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
