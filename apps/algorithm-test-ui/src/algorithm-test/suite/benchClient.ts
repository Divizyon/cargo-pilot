import { z } from 'zod';
import type { Item } from '@/lib/types/item';
import { DoorFace, DoorType, fillsFromMaxX, type Vehicle, type VehicleDoor } from '@/lib/types/vehicle';
import type { SuiteClient } from './suiteClient';

/**
 * Motorun geliştirme ucuna konuşan `SuiteClient`.
 *
 * Neden var: canlı yol her senaryoda giriş + katalog + plan yaz + oku + sil
 * yapıyordu; ölçülen ~1,3 sn'nin büyük kısmı motor değil bu katmanlardı. Bench
 * ucu kimlik doğrulaması ve veritabanı taşımaz, aynı senaryo ~20 ms'de döner.
 *
 * "Çevrimdışı" iddiasının tanımı: dış ağ ve kimlik doğrulama yok — loopback var.
 * Motor C# olduğu için TypeScript içinde "yerinde motor" kurmak motoru yeniden
 * yazmak olurdu; ölçülen şey motor olmazdı.
 *
 * Katalog da bu uçtan gelir. Sentetik kataloğun ikinci bir kopyasını burada
 * tutmak, biri güncellenip diğeri unutulduğunda sessizce farklı senaryolar
 * üretirdi.
 */

export const DEFAULT_BENCH_URL = 'http://127.0.0.1:5099';

const doorSchema = z.object({
  type: z.enum(Object.values(DoorType) as [DoorType, ...DoorType[]]),
  face: z.enum(Object.values(DoorFace) as [DoorFace, ...DoorFace[]]),
});

const catalogSchema = z.object({
  version: z.number().int(),
  vehicles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      width: z.number(),
      height: z.number(),
      length: z.number(),
      maxCargoWeight: z.number(),
      doors: z.array(doorSchema),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sku: z.string(),
      width: z.number(),
      height: z.number(),
      length: z.number(),
      weight: z.number(),
      isStackable: z.boolean(),
      maxStackCount: z.number().int(),
      maxWeightOnTop: z.number(),
      fragility: z.number().int(),
      allowedRotations: z.number().int(),
      stackGroup: z.string().nullable(),
      incompatibleGroups: z.array(z.string()),
    }),
  ),
});

const engineResultSchema = z.object({
  result: z.object({
    placements: z.array(
      z.object({
        itemId: z.string(),
        x: z.number(),
        y: z.number(),
        z: z.number(),
        rotation: z.number().int(),
      }),
    ),
    unplacedItems: z.array(
      z.object({
        itemId: z.string(),
        quantity: z.number().int(),
        reason: z.number().int(),
      }),
    ),
    totalWeight: z.number(),
    fillRate: z.number(),
    centerOfGravityX: z.number().nullable(),
    centerOfGravityY: z.number().nullable(),
    centerOfGravityZ: z.number().nullable(),
    weightBalanceOffsetX: z.number().nullable(),
    weightBalanceOffsetZ: z.number().nullable(),
  }),
  durationMs: z.number(),
});

export interface BenchCatalog {
  version: number;
  vehicles: Vehicle[];
  items: Item[];
}

/** Motorun kabul ettiği plan gövdesi; `runSuite.buildPlanBody` bunu üretir. */
interface PlanBody {
  vehicleId: string;
  optimizationCriteria: number;
  clusterGroups: boolean;
  placementStrategy?: number;
  sequencer?: number;
  seed?: number;
  items: Array<{ itemId: string; quantity: number; groupId?: string }>;
  groups?: Array<{ clientGroupId: string; unloadingOrder: number }>;
}

export async function loadBenchCatalog(baseUrl = DEFAULT_BENCH_URL): Promise<BenchCatalog> {
  const response = await fetch(`${baseUrl}/engine/catalog`);
  if (!response.ok) throw new Error(`Bench kataloğu okunamadı: HTTP ${response.status}`);

  const raw = catalogSchema.parse(await response.json());

  return {
    version: raw.version,
    vehicles: raw.vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      width: v.width,
      height: v.height,
      length: v.length,
      maxCargoWeight: v.maxCargoWeight,
      doors: v.doors as VehicleDoor[],
    })),
    items: raw.items.map((i) => ({
      id: i.id,
      name: i.sku,
      sku: i.sku,
      width: i.width,
      height: i.height,
      length: i.length,
      weight: i.weight,
      isStackable: i.isStackable,
      maxStackCount: i.maxStackCount,
      maxWeightOnTop: i.maxWeightOnTop,
      fragility: i.fragility,
      allowedRotations: i.allowedRotations,
      stackGroup: i.stackGroup,
      incompatibleGroups: i.incompatibleGroups,
    })),
  };
}

export function createBenchSuiteClient(catalog: BenchCatalog, baseUrl = DEFAULT_BENCH_URL): SuiteClient {
  const vehiclesById = new Map(catalog.vehicles.map((v) => [v.id, v]));
  const itemsById = new Map(catalog.items.map((i) => [i.id, i]));

  // Plan kalıcılığı yok; sonuç bellekte tutulur ve `getPlanDetail` onu okur.
  // Kimlik yalnızca bu iki çağrıyı eşleştirmek için üretilir — ama UUID olmak
  // zorunda: plan yanıtı şeması (`planDetailResponseSchema`) canlı uçtan gelen
  // gövdeyi doğruluyor ve `bench-1` gibi bir kimliği reddediyor. Bench yolu o
  // şemayı gevşetemez; gevşetirse üretimde bozuk gövdeyi de kabul ederdi.
  const plans = new Map<string, unknown>();

  return {
    async createPlan(body) {
      const plan = body as PlanBody;
      const vehicle = vehiclesById.get(plan.vehicleId);
      if (!vehicle) throw new Error(`Bench kataloğunda araç yok: ${plan.vehicleId}`);

      const response = await fetch(`${baseUrl}/engine/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toOptimizationInput(plan, vehicle, itemsById)),
      });

      if (!response.ok) throw new Error(`Motor ucu hata döndü: HTTP ${response.status}`);

      const engine = engineResultSchema.parse(await response.json());
      const planId = crypto.randomUUID();
      plans.set(planId, toPlanDetail(planId, plan, vehicle, itemsById, engine));

      return planId;
    },

    async getPlanDetail(planId) {
      const detail = plans.get(planId);
      if (!detail) throw new Error(`Bellekte plan yok: ${planId}`);

      return detail;
    },

    async deletePlan(planId) {
      plans.delete(planId);
    },
  };
}

function toOptimizationInput(
  plan: PlanBody,
  vehicle: Vehicle,
  itemsById: ReadonlyMap<string, Item>,
): unknown {
  const unloadingOrderByGroup = new Map(
    (plan.groups ?? []).map((g) => [g.clientGroupId, g.unloadingOrder]),
  );

  return {
    vehicleWidth: vehicle.width,
    vehicleHeight: vehicle.height,
    vehicleLength: vehicle.length,
    vehicleMaxWeight: vehicle.maxCargoWeight,
    criteria: plan.optimizationCriteria,
    clusterGroups: plan.clusterGroups,
    // Strateji alanlarını taşımamak sessiz bir hataydı: koşu "wallbuilder" diye
    // raporlanırken motor greedy koşuyordu ve iki ölçüm birebir aynı çıkıyordu.
    strategy: plan.placementStrategy ?? 0,
    sequencer: plan.sequencer ?? 0,
    seed: plan.seed ?? 0,
    // Yükleme başlangıç köşesi kapı listesinden türetilir; tekil `loadingType`
    // alanı yalnızca kapı listesi yokken devreye giren yedektir.
    fillFromMaxX: fillsFromMaxX(vehicle.doors),
    items: plan.items.map((line) => {
      const item = itemsById.get(line.itemId);
      if (!item) throw new Error(`Bench kataloğunda ürün yok: ${line.itemId}`);

      return {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        width: item.width,
        height: item.height,
        length: item.length,
        weight: item.weight,
        isStackable: item.isStackable,
        maxStackCount: item.maxStackCount,
        maxWeightOnTop: item.maxWeightOnTop ?? 0,
        allowedRotations: item.allowedRotations,
        quantity: line.quantity,
        groupId: line.groupId ?? null,
        unloadingOrder: line.groupId ? (unloadingOrderByGroup.get(line.groupId) ?? null) : null,
        stackGroup: item.stackGroup,
        incompatibleGroups: item.incompatibleGroups,
        fragilityType: item.fragility,
      };
    }),
  };
}

/**
 * Motor çıktısını plan API'sinin gövdesine çevirir.
 *
 * Kenar uzunlukları bilinçli olarak DÖNDÜRÜLMEMİŞ hâlleriyle yazılır: üretimde
 * de repository yalnızca rotasyon enum'unu saklıyor ve istemci kenarları
 * `placedDimensions` ile yeniden türetiyor. Burada döndürülmüş ölçüyü yazmak,
 * bench yolunu üretimden ayırır ve o türetmeyi test dışı bırakırdı.
 */
function toPlanDetail(
  planId: string,
  plan: PlanBody,
  vehicle: Vehicle,
  itemsById: ReadonlyMap<string, Item>,
  engine: z.infer<typeof engineResultSchema>,
): unknown {
  const itemPayload = (itemId: string) => {
    const item = itemsById.get(itemId);

    return {
      id: itemId,
      name: item?.name ?? '',
      width: item?.width ?? 0,
      height: item?.height ?? 0,
      length: item?.length ?? 0,
      weight: item?.weight ?? 0,
    };
  };

  const placedQuantity = engine.result.placements.length;
  const unplacedQuantity = engine.result.unplacedItems.reduce((sum, u) => sum + u.quantity, 0);

  return {
    isSuccess: true,
    data: {
      id: planId,
      planName: planId,
      vehicle: {
        id: vehicle.id,
        vehicleName: vehicle.name,
        internalWidth: vehicle.width,
        internalHeight: vehicle.height,
        internalLength: vehicle.length,
        maxWeightCapacity: vehicle.maxCargoWeight,
        doors: vehicle.doors,
      },
      placements: engine.result.placements.map((p) => ({
        itemId: p.itemId,
        positionX: p.x,
        positionY: p.y,
        positionZ: p.z,
        rotation: p.rotation,
        item: itemPayload(p.itemId),
      })),
      inputItems: plan.items.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        item: itemPayload(line.itemId),
      })),
      unplacedItems: engine.result.unplacedItems.map((u) => ({
        itemId: u.itemId,
        quantity: u.quantity,
        reason: u.reason,
        item: { name: itemsById.get(u.itemId)?.name ?? '' },
      })),
      fillRate: engine.result.fillRate,
      totalWeight: engine.result.totalWeight,
      placedQuantity,
      unplacedQuantity,
      centerOfGravityX: engine.result.centerOfGravityX,
      centerOfGravityY: engine.result.centerOfGravityY,
      centerOfGravityZ: engine.result.centerOfGravityZ,
      weightBalanceOffsetX: engine.result.weightBalanceOffsetX,
      weightBalanceOffsetZ: engine.result.weightBalanceOffsetZ,
    },
  };
}
