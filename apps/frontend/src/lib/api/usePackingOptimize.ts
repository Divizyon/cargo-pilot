import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import type { Vehicle } from '@/lib/types/vehicle';
import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';
import { axiosInstance } from './axiosInstance';

// ─── Backend response schema ──────────────────────────────────────────────────

const placementDtoSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation: z.object({ l: z.number(), w: z.number(), h: z.number() }),
});

const packingResultSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    placements: z.array(placementDtoSchema),
    fillRatePercent: z.number(),
    totalWeight: z.number(),
    placedCount: z.number(),
    unplacedCount: z.number(),
  }),
});

// ─── Request building ─────────────────────────────────────────────────────────

function toAllowedRotations(item: Item): 0 | 1 | 2 {
  if (!item.allowRotateX && !item.allowRotateY && !item.allowRotateZ) return 2; // Fixed
  if (!item.allowRotateX && !item.allowRotateY) return 1; // NoVertical
  return 0; // All
}

export interface OptimizeInput {
  vehicle: Vehicle;
  items: Array<{ item: Item; quantity: number }>;
  skuColorMap: Record<string, string>;
}

function buildRequest(input: OptimizeInput) {
  const { vehicle, items } = input;
  return {
    container: {
      length: vehicle.length,
      width: vehicle.width,
      height: vehicle.height,
      maxWeight: vehicle.maxCargoWeight,
    },
    items: items.flatMap(({ item, quantity }) =>
      Array.from({ length: quantity }, () => ({
        id: item.id,
        name: item.name,
        length: item.length,
        width: item.width,
        height: item.height,
        weight: item.weight,
        isStackable: item.isStackable,
        maxWeightOnTop: item.maxWeightOnTop ?? 0,
        lifoIndex: null,
        allowedRotations: toAllowedRotations(item),
      })),
    ),
    parameters: {
      lifoEnabled: false,
      cgThresholdPercent: 15,
    },
  };
}

// ─── Response mapping ─────────────────────────────────────────────────────────

function mapToPlacementWithDimensions(
  data: z.infer<typeof packingResultSchema>['data'],
  input: OptimizeInput,
): PlacementWithDimensions[] {
  const { vehicle, items, skuColorMap } = input;
  const itemLookup = new Map(items.map(({ item }) => [item.id, item]));

  return data.placements.map((p) => {
    const item = itemLookup.get(p.itemId);
    const color = item
      ? (skuColorMap[item.sku] ?? SCENE.COLORS.NORMAL_STR)
      : SCENE.COLORS.NORMAL_STR;

    const { l: rotL, w: rotW, h: rotH } = p.rotation;

    // Backend:  X = derinlik (kapı=0→arka), Y = genişlik, Z = yükseklik
    // Frontend: X = genişlik, Y = yükseklik, Z = derinlik (arka=0→kapı)
    const positionX = p.y;
    const positionY = p.z;
    const positionZ = vehicle.length - p.x - rotL;

    return {
      itemId: p.itemId,
      positionX,
      positionY,
      positionZ,
      orientationIndex: 0,
      layer: Math.floor(positionY / rotH) + 1,
      isViolation: false,
      width: rotW,
      height: rotH,
      depth: rotL,
      weight: item?.weight ?? 0,
      color,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePackingOptimize() {
  return useMutation({
    mutationFn: async (input: OptimizeInput): Promise<PlacementWithDimensions[]> => {
      const { data } = await axiosInstance.post<unknown>(
        '/api/packing/optimize',
        buildRequest(input),
      );
      const parsed = packingResultSchema.parse(data);
      return mapToPlacementWithDimensions(parsed.data, input);
    },
  });
}
